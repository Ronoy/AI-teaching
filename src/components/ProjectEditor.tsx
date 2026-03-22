import React, { useState, useEffect } from 'react';
import { PracticeProject, ProjectTask, ProjectStep, ProjectResource, KnowledgeNode, CompetencePoint } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { Save, X, Plus, Trash2, CheckCircle2, BookOpen, Target, AlertTriangle, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { recommendStepAttributes } from '../services/geminiService';

interface ProjectEditorProps {
  project: PracticeProject;
  onClose: () => void;
  onSave: (project: PracticeProject) => void;
}

export default function ProjectEditor({ project, onClose, onSave }: ProjectEditorProps) {
  const { t } = useLanguage();
  const [knowledgeNodes, setKnowledgeNodes] = useState<KnowledgeNode[]>([]);
  const [competencePoints, setCompetencePoints] = useState<CompetencePoint[]>([]);
  const [editedProject, setEditedProject] = useState<PracticeProject>({
    ...project,
    tasks: project.tasks || (project.steps ? [{
      id: 'task1',
      name: 'Default Task',
      order: 0,
      type: 'practical',
      description: 'Migrated from steps',
      steps: project.steps
    }] : [])
  });
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const [recommendingStepId, setRecommendingStepId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const knSnap = await getDocs(collection(db, 'knowledge_nodes'));
      const cpSnap = await getDocs(collection(db, 'competence_points'));
      setKnowledgeNodes(knSnap.docs.map(d => ({ id: d.id, ...d.data() } as KnowledgeNode)));
      setCompetencePoints(cpSnap.docs.map(d => ({ id: d.id, ...d.data() } as CompetencePoint)));
    };
    fetchData();
  }, []);

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const handleSave = async () => {
    try {
      await setDoc(doc(db, 'projects', editedProject.id), editedProject);
      onSave(editedProject);
      onClose();
    } catch (error) {
      console.error("Error saving project:", error);
      alert("Failed to save project");
    }
  };

  const addTask = () => {
    setEditedProject(prev => ({
      ...prev,
      tasks: [...(prev.tasks || []), {
        id: `task_${Date.now()}`,
        name: 'New Task',
        order: (prev.tasks?.length || 0),
        type: 'practical',
        description: '',
        steps: []
      }]
    }));
  };

  const removeTask = (tIndex: number) => {
    const newTasks = [...(editedProject.tasks || [])];
    newTasks.splice(tIndex, 1);
    setEditedProject({ ...editedProject, tasks: newTasks });
  };

  const addStep = (taskId: string) => {
    setEditedProject(prev => ({
      ...prev,
      tasks: prev.tasks?.map(t => {
        if (t.id === taskId) {
          const newStepId = `step_${Date.now()}`;
          return {
            ...t,
            steps: [...t.steps, {
              id: newStepId,
              name: 'New Step',
              order: t.steps.length,
              type: 'standardized',
              estimatedTime: 10,
              maxScore: 10,
              resources: [],
              checkItems: [],
              knowledgeNodeIds: [],
              competenceMapping: []
            }]
          };
        }
        return t;
      })
    }));
  };

  const removeStep = (taskId: string, sIndex: number) => {
    setEditedProject(prev => ({
      ...prev,
      tasks: prev.tasks?.map(t => {
        if (t.id === taskId) {
          const newSteps = [...t.steps];
          newSteps.splice(sIndex, 1);
          return { ...t, steps: newSteps };
        }
        return t;
      })
    }));
  };

  const updateStep = (taskId: string, sIndex: number, updates: Partial<ProjectStep>) => {
    setEditedProject(prev => ({
      ...prev,
      tasks: prev.tasks?.map(t => {
        if (t.id === taskId) {
          const newSteps = [...t.steps];
          newSteps[sIndex] = { ...newSteps[sIndex], ...updates };
          return { ...t, steps: newSteps };
        }
        return t;
      })
    }));
  };

  const addResource = (taskId: string, stepIndex: number) => {
    setEditedProject(prev => ({
      ...prev,
      tasks: prev.tasks?.map(t => {
        if (t.id === taskId) {
          const newSteps = [...t.steps];
          newSteps[stepIndex] = {
            ...newSteps[stepIndex],
            resources: [...(newSteps[stepIndex].resources || []), {
              id: `res_${Date.now()}`,
              name: 'New Resource',
              type: 'link',
              url: ''
            }]
          };
          return { ...t, steps: newSteps };
        }
        return t;
      })
    }));
  };

  const handleAIRecommend = async (taskId: string, stepIndex: number) => {
    const task = editedProject.tasks?.find(t => t.id === taskId);
    if (!task) return;
    const step = task.steps[stepIndex];
    if (!step.name) {
      alert("请先输入步骤名称");
      return;
    }

    setRecommendingStepId(step.id);
    try {
      const recommendation = await recommendStepAttributes(
        step.name,
        task.description,
        knowledgeNodes,
        competencePoints
      );

      updateStep(taskId, stepIndex, recommendation);
    } catch (error) {
      console.error("AI Recommendation error:", error);
      alert("AI 推荐失败，请重试");
    } finally {
      setRecommendingStepId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">项目结构编辑器</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Project Structure Architect</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl font-bold transition-colors">
              取消
            </button>
            <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">
              <Save className="w-4 h-4" /> 保存项目
            </button>
          </div>
        </div>
        
        <div className="p-8 overflow-y-auto flex-1 space-y-8">
          {/* Project Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">项目名称</label>
              <input 
                type="text" 
                value={editedProject.name}
                onChange={e => setEditedProject({...editedProject, name: e.target.value})}
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800"
                placeholder="输入项目标题..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">课程 ID</label>
              <input 
                type="text" 
                value={editedProject.courseId}
                onChange={e => setEditedProject({...editedProject, courseId: e.target.value})}
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800"
                placeholder="COURSE_001"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-600" />
                任务与步骤管理
              </h3>
              <button onClick={addTask} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-xs hover:bg-indigo-100 transition-colors">
                <Plus className="w-4 h-4" /> 添加任务
              </button>
            </div>

            {editedProject.tasks?.map((task, tIndex) => (
              <div key={task.id} className="bg-white border-2 border-slate-100 rounded-[28px] p-6 space-y-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-4">
                    <div className="flex gap-4">
                      <input 
                        type="text" 
                        value={task.name}
                        onChange={e => {
                          const newTasks = [...(editedProject.tasks || [])];
                          newTasks[tIndex].name = e.target.value;
                          setEditedProject({...editedProject, tasks: newTasks});
                        }}
                        className="flex-1 p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-slate-800 focus:border-indigo-500 outline-none"
                        placeholder="任务名称 (e.g. 机器人组装)"
                      />
                      <select 
                        value={task.type}
                        onChange={e => {
                          const newTasks = [...(editedProject.tasks || [])];
                          newTasks[tIndex].type = e.target.value as 'theoretical' | 'practical';
                          setEditedProject({...editedProject, tasks: newTasks});
                        }}
                        className="p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-600 focus:border-indigo-500 outline-none"
                      >
                        <option value="theoretical">理论</option>
                        <option value="practical">实训</option>
                      </select>
                      <button 
                        onClick={() => removeTask(tIndex)}
                        className="p-3 text-rose-400 hover:bg-rose-50 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <textarea 
                      value={task.description}
                      onChange={e => {
                        const newTasks = [...(editedProject.tasks || [])];
                        newTasks[tIndex].description = e.target.value;
                        setEditedProject({...editedProject, tasks: newTasks});
                      }}
                      className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-medium text-slate-600 focus:border-indigo-500 outline-none h-20 resize-none"
                      placeholder="任务描述..."
                    />
                  </div>
                  <button 
                    onClick={() => addStep(task.id)} 
                    className="px-4 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black hover:bg-slate-800 transition-all flex items-center gap-2 shrink-0"
                  >
                    <Plus className="w-4 h-4" /> 添加步骤
                  </button>
                </div>

                <div className="space-y-4 pl-6 border-l-4 border-slate-100">
                  {task.steps.map((step, sIndex) => {
                    const isExpanded = expandedSteps[step.id || `step-${sIndex}`];
                    return (
                      <div key={step.id || sIndex} className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm">
                        <div 
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                          onClick={() => toggleStep(step.id || `step-${sIndex}`)}
                        >
                          <div className="flex items-center gap-4">
                            <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                              {sIndex + 1}
                            </span>
                            <h4 className="font-bold text-slate-800">{step.name || '未命名步骤'}</h4>
                            <div className="flex gap-2">
                              {step.checkItems && step.checkItems.length > 0 && (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-md border border-emerald-100">
                                  {step.checkItems.length} 考核项
                                </span>
                              )}
                              {step.knowledgeNodeIds && step.knowledgeNodeIds.length > 0 && (
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-md border border-blue-100">
                                  {step.knowledgeNodeIds.length} 知识点
                                </span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAIRecommend(task.id, sIndex);
                                }}
                                disabled={recommendingStepId === step.id}
                                className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-black rounded-md shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-1 disabled:opacity-50"
                              >
                                {recommendingStepId === step.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3 h-3" />
                                )}
                                AI 智能推荐
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeStep(task.id, sIndex); }}
                              className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-6 border-t-2 border-slate-50 space-y-6 bg-slate-50/30">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">步骤名称</label>
                                <input 
                                  type="text" 
                                  value={step.name}
                                  onChange={e => updateStep(task.id, sIndex, { name: e.target.value })}
                                  className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">预计用时 (分)</label>
                                  <input 
                                    type="number" 
                                    value={step.estimatedTime}
                                    onChange={e => updateStep(task.id, sIndex, { estimatedTime: parseInt(e.target.value) || 0 })}
                                    className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">最高分</label>
                                  <input 
                                    type="number" 
                                    value={step.maxScore}
                                    onChange={e => updateStep(task.id, sIndex, { maxScore: parseInt(e.target.value) || 0 })}
                                    className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Assessment Items (Check Items) */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> 考核项设置 / Assessment Items
                                </label>
                                <button 
                                  onClick={() => {
                                    const items = [...(step.checkItems || [])];
                                    items.push({ name: '', weight: 1, isCritical: false });
                                    updateStep(task.id, sIndex, { checkItems: items });
                                  }}
                                  className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest"
                                >
                                  + 添加考核项
                                </button>
                              </div>
                              <div className="space-y-2">
                                {step.checkItems?.map((item, cIndex) => (
                                  <div key={cIndex} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                    <input 
                                      type="text" 
                                      value={item.name}
                                      onChange={e => {
                                        const items = [...(step.checkItems || [])];
                                        items[cIndex].name = e.target.value;
                                        updateStep(task.id, sIndex, { checkItems: items });
                                      }}
                                      className="flex-1 text-sm font-bold text-slate-700 outline-none"
                                      placeholder="考核项描述..."
                                    />
                                    <div className="flex items-center gap-4">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase">权重</span>
                                        <input 
                                          type="number" 
                                          value={item.weight}
                                          onChange={e => {
                                            const items = [...(step.checkItems || [])];
                                            items[cIndex].weight = parseInt(e.target.value) || 0;
                                            updateStep(task.id, sIndex, { checkItems: items });
                                          }}
                                          className="w-12 text-center text-sm font-black text-indigo-600 bg-indigo-50 rounded-md py-0.5"
                                        />
                                      </div>
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                          type="checkbox"
                                          checked={item.isCritical}
                                          onChange={e => {
                                            const items = [...(step.checkItems || [])];
                                            items[cIndex].isCritical = e.target.checked;
                                            updateStep(task.id, sIndex, { checkItems: items });
                                          }}
                                          className="w-4 h-4 rounded border-slate-200 text-rose-500 focus:ring-rose-500"
                                        />
                                        <span className="text-[10px] font-black text-rose-500 uppercase">关键项</span>
                                      </label>
                                      <button 
                                        onClick={() => {
                                          const items = [...(step.checkItems || [])];
                                          items.splice(cIndex, 1);
                                          updateStep(task.id, sIndex, { checkItems: items });
                                        }}
                                        className="p-1 text-slate-300 hover:text-rose-500"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Knowledge Points Mapping */}
                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <BookOpen className="w-3 h-3 text-blue-500" /> 关联知识点 / Knowledge Points
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {knowledgeNodes.map(node => {
                                  const isSelected = step.knowledgeNodeIds?.includes(node.id);
                                  return (
                                    <button
                                      key={node.id}
                                      onClick={() => {
                                        const currentIds = step.knowledgeNodeIds || [];
                                        const newIds = isSelected 
                                          ? currentIds.filter(id => id !== node.id)
                                          : [...currentIds, node.id];
                                        updateStep(task.id, sIndex, { knowledgeNodeIds: newIds });
                                      }}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 ${
                                        isSelected 
                                          ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' 
                                          : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200'
                                      }`}
                                    >
                                      {node.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Competence Mapping */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                  <Target className="w-3 h-3 text-purple-500" /> 关联能力点 / Competence Points
                                </label>
                                <button 
                                  onClick={() => {
                                    const mapping = [...(step.competenceMapping || [])];
                                    mapping.push({ competenceId: competencePoints[0]?.id || '', confidence: 1.0 });
                                    updateStep(task.id, sIndex, { competenceMapping: mapping });
                                  }}
                                  className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest"
                                >
                                  + 添加能力点
                                </button>
                              </div>
                              <div className="space-y-2">
                                {step.competenceMapping?.map((mapping, mIndex) => (
                                  <div key={mIndex} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                    <select
                                      value={mapping.competenceId}
                                      onChange={e => {
                                        const newMapping = [...(step.competenceMapping || [])];
                                        newMapping[mIndex].competenceId = e.target.value;
                                        updateStep(task.id, sIndex, { competenceMapping: newMapping });
                                      }}
                                      className="flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none"
                                    >
                                      <option value="">选择能力点...</option>
                                      {competencePoints.map(cp => (
                                        <option key={cp.id} value={cp.id}>{cp.name}</option>
                                      ))}
                                    </select>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-black text-slate-400 uppercase">置信度</span>
                                      <input 
                                        type="number" 
                                        step="0.1"
                                        min="0"
                                        max="1"
                                        value={mapping.confidence}
                                        onChange={e => {
                                          const newMapping = [...(step.competenceMapping || [])];
                                          newMapping[mIndex].confidence = parseFloat(e.target.value) || 0;
                                          updateStep(task.id, sIndex, { competenceMapping: newMapping });
                                        }}
                                        className="w-16 text-center text-sm font-black text-purple-600 bg-purple-50 rounded-md py-0.5"
                                      />
                                      <button 
                                        onClick={() => {
                                          const newMapping = [...(step.competenceMapping || [])];
                                          newMapping.splice(mIndex, 1);
                                          updateStep(task.id, sIndex, { competenceMapping: newMapping });
                                        }}
                                        className="p-1 text-slate-300 hover:text-rose-500"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
