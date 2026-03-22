import React, { useState, useEffect } from 'react';
import { PracticeProject, ProjectTask, Course, LearningActivity } from '../types';
import { getProjects, updateProject, deleteProject } from '../services/practiceService';
import { getCourses, createCourse, deleteCourse } from '../services/courseService';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Plus, Edit, BookOpen, Clock, CheckCircle2, Link as LinkIcon, Info, Sparkles, Layout, ArrowLeft, Search, GraduationCap, FileText, FileCode, MessageSquare, Target, HelpCircle, Zap, ClipboardCheck, PencilLine, Trash2, MoreVertical, ChevronDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import ProjectEditor from './ProjectEditor';
import AITaskGenerator from './AITaskGenerator';
import { AI_AVATAR_URL } from '../constants';
import { auth } from '../firebase';

export default function TaskPreparation() {
  const { t } = useLanguage();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [projects, setProjects] = useState<PracticeProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [showCourseCreate, setShowCourseCreate] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseCollege, setNewCourseCollege] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'course' | 'project' | 'task', id: string, projectId?: string } | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleAddActivity = async (type: LearningActivity['type']) => {
    if (!selectedProjectId || !selectedTaskId) return;

    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return;

    const taskIndex = project.tasks.findIndex(t => t.id === selectedTaskId);
    if (taskIndex === -1) return;

    const task = project.tasks[taskIndex];
    const activities = task.learningActivities || [];

    // Constraint: Only one Ability Training
    if (type === 'ability_training' && activities.some(a => a.type === 'ability_training')) {
      setAlertMessage('每个任务只能添加一个能力训练');
      return;
    }

    const newActivity: LearningActivity = {
      id: `activity_${Date.now()}`,
      type,
      name: `新${getActivityLabel(type)}`,
      description: '',
    };

    const updatedTasks = [...project.tasks];
    updatedTasks[taskIndex] = {
      ...task,
      learningActivities: [...activities, newActivity]
    };

    const updatedProject = {
      ...project,
      tasks: updatedTasks
    };

    try {
      await updateProject(updatedProject);
      setProjects(prev => prev.map(p => p.id === selectedProjectId ? updatedProject : p));
      setShowAddMenu(false);
    } catch (error) {
      console.error('Failed to add activity:', error);
    }
  };

  const handleRemoveActivity = async (activityId: string) => {
    if (!selectedProjectId || !selectedTaskId) return;

    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return;

    const taskIndex = project.tasks.findIndex(t => t.id === selectedTaskId);
    if (taskIndex === -1) return;

    const task = project.tasks[taskIndex];
    const updatedTasks = [...project.tasks];
    updatedTasks[taskIndex] = {
      ...task,
      learningActivities: (task.learningActivities || []).filter(a => a.id !== activityId)
    };

    const updatedProject = {
      ...project,
      tasks: updatedTasks
    };

    try {
      await updateProject(updatedProject);
      setProjects(prev => prev.map(p => p.id === selectedProjectId ? updatedProject : p));
    } catch (error) {
      console.error('Failed to remove activity:', error);
    }
  };

  const getActivityLabel = (type: LearningActivity['type']) => {
    switch (type) {
      case 'courseware': return '课件/资料';
      case 'document': return '在线文档';
      case 'link': return '网页链接';
      case 'quiz': return '作业测验';
      case 'discussion': return '讨论';
      case 'adaptive_practice': return '自适应练习';
      case 'adaptive_quiz': return '自适应测验';
      case 'ability_training': return '能力训练';
      default: return '活动';
    }
  };

  const getActivityIcon = (type: LearningActivity['type']) => {
    switch (type) {
      case 'courseware': return <FileText className="w-5 h-5 text-orange-500" />;
      case 'document': return <FileCode className="w-5 h-5 text-rose-500" />;
      case 'link': return <LinkIcon className="w-5 h-5 text-blue-500" />;
      case 'quiz': return <PencilLine className="w-5 h-5 text-indigo-500" />;
      case 'discussion': return <MessageSquare className="w-5 h-5 text-slate-700" />;
      case 'adaptive_practice': return <Zap className="w-5 h-5 text-slate-700" />;
      case 'adaptive_quiz': return <Search className="w-5 h-5 text-slate-700" />;
      case 'ability_training': return <Target className="w-5 h-5 text-indigo-600" />;
      default: return <BookOpen className="w-5 h-5" />;
    }
  };

  const handleDeleteCourse = async (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation();
    setConfirmDelete({ type: 'course', id: courseId });
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setConfirmDelete({ type: 'project', id: projectId });
  };

  const handleDeleteTask = async (e: React.MouseEvent, projectId: string, taskId: string) => {
    e.stopPropagation();
    setConfirmDelete({ type: 'task', id: taskId, projectId });
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;

    try {
      if (confirmDelete.type === 'course') {
        await deleteCourse(confirmDelete.id);
        fetchCourses();
        if (selectedCourseId === confirmDelete.id) {
          setSelectedCourseId(null);
        }
      } else if (confirmDelete.type === 'project') {
        await deleteProject(confirmDelete.id);
        setProjects(prev => prev.filter(p => p.id !== confirmDelete.id));
        if (selectedProjectId === confirmDelete.id) {
          setSelectedProjectId(null);
          setSelectedTaskId(null);
        }
      } else if (confirmDelete.type === 'task' && confirmDelete.projectId) {
        const project = projects.find(p => p.id === confirmDelete.projectId);
        if (project) {
          const updatedTasks = project.tasks.filter(t => t.id !== confirmDelete.id);
          const updatedProject = { ...project, tasks: updatedTasks };
          await updateProject(updatedProject);
          setProjects(prev => prev.map(p => p.id === confirmDelete.projectId ? updatedProject : p));
          if (selectedTaskId === confirmDelete.id) {
            setSelectedTaskId(updatedTasks.length > 0 ? updatedTasks[0].id : null);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to delete ${confirmDelete.type}:`, error);
    } finally {
      setConfirmDelete(null);
    }
  };

  const fetchCourses = async () => {
    setLoading(true);
    const data = await getCourses();
    setCourses(data);
    setLoading(false);
  };

  useEffect(() => {
    if (selectedCourseId) {
      setLoading(true);
      getProjects().then(data => {
        const courseProjects = data.filter(p => p.courseId === selectedCourseId);
        setProjects(courseProjects);
        if (courseProjects.length > 0) {
          setSelectedProjectId(courseProjects[0].id);
          if (courseProjects[0].tasks && courseProjects[0].tasks.length > 0) {
            setSelectedTaskId(courseProjects[0].tasks[0].id);
          } else {
            setSelectedTaskId(null);
          }
        } else {
          setSelectedProjectId(null);
          setSelectedTaskId(null);
        }
        setLoading(false);
      });
    }
  }, [selectedCourseId]);

  const handleCreateCourse = async () => {
    const user = auth.currentUser;
    if (!user || !newCourseName.trim()) return;

    await createCourse({
      name: newCourseName,
      code: newCourseCode,
      college: newCourseCollege,
      description: '',
      teacherId: user.uid
    });
    setNewCourseName('');
    setNewCourseCode('');
    setNewCourseCollege('');
    setShowCourseCreate(false);
    fetchCourses();
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedTask = selectedProject?.tasks?.find(t => t.id === selectedTaskId);

  if (loading && !selectedCourseId) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  if (!selectedCourseId) {
    return (
      <div className="p-12 max-w-6xl mx-auto space-y-10">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <GraduationCap className="w-10 h-10 text-indigo-600" />
              课程任务备课
            </h2>
            <p className="text-slate-500 font-medium">选择或创建一个课程开始任务设计</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsGeneratorOpen(true)}
              className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-black border border-indigo-100 hover:bg-indigo-100 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-6 h-6" /> AI 智能建课
            </button>
            <button 
              onClick={() => setShowCourseCreate(true)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
              <Plus className="w-6 h-6" /> 创建新课程
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <motion.div 
              key={course.id}
              whileHover={{ y: -5 }}
              onClick={() => setSelectedCourseId(course.id)}
              className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all cursor-pointer group relative"
            >
              <button 
                onClick={(e) => handleDeleteCourse(e, course.id)}
                className="absolute top-6 right-6 p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-50 transition-colors">
                <BookOpen className="w-8 h-8 text-slate-400 group-hover:text-indigo-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-1">{course.name}</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {course.code && (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase tracking-wider border border-slate-200">
                    {course.code}
                  </span>
                )}
                {course.college && (
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-black uppercase tracking-wider border border-indigo-100">
                    {course.college}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mb-6 line-clamp-2">{course.description || '暂无描述'}</p>
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                <span>任务备课</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          ))}
        </div>

        {showCourseCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-3xl p-8 space-y-6 shadow-2xl">
              <h3 className="text-2xl font-black text-slate-900">创建新课程</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">课程名称</label>
                  <input 
                    type="text"
                    placeholder="例如：Python 基础编程"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">课程编码</label>
                    <input 
                      type="text"
                      placeholder="例如：CS101"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                      value={newCourseCode}
                      onChange={(e) => setNewCourseCode(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">开课学院</label>
                    <input 
                      type="text"
                      placeholder="例如：计算机学院"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                      value={newCourseCollege}
                      onChange={(e) => setNewCourseCollege(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowCourseCreate(false)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200"
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleCreateCourse}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
                  >
                    确认创建
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isGeneratorOpen && (
          <AITaskGenerator 
            courseId={selectedCourseId || undefined}
            onClose={() => setIsGeneratorOpen(false)}
            onGenerated={(courseId) => {
              fetchCourses();
              if (courseId) {
                setSelectedCourseId(courseId);
                getProjects().then(data => {
                  const courseProjects = data.filter(p => p.courseId === courseId);
                  setProjects(courseProjects);
                });
              }
            }}
          />
        )}

        {/* Custom Confirmation Modal */}
        <AnimatePresence>
          {confirmDelete && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white w-full max-w-md rounded-3xl p-8 space-y-6 shadow-2xl"
              >
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto">
                  <Trash2 className="w-8 h-8 text-rose-500" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black text-slate-900">确认删除？</h3>
                  <p className="text-slate-500">
                    确定要删除该{confirmDelete.type === 'course' ? '课程' : confirmDelete.type === 'project' ? '项目' : '任务'}吗？此操作不可撤销。
                  </p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setConfirmDelete(null)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    onClick={executeDelete}
                    className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all"
                  >
                    确认删除
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Custom Alert Modal */}
        <AnimatePresence>
          {alertMessage && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white w-full max-w-md rounded-3xl p-8 space-y-6 shadow-2xl"
              >
                <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto">
                  <Info className="w-8 h-8 text-amber-500" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black text-slate-900">提示</h3>
                  <p className="text-slate-500">{alertMessage}</p>
                </div>
                <button 
                  onClick={() => setAlertMessage(null)}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                >
                  我知道了
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-200 bg-slate-50/50 flex flex-col overflow-y-auto">
        <div className="p-6 border-b border-slate-200 space-y-4">
          <button 
            onClick={() => setSelectedCourseId(null)}
            className="text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 uppercase tracking-widest transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> 返回课程列表
          </button>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Layout className="w-6 h-6 text-indigo-600" />
              {courses.find(c => c.id === selectedCourseId)?.name}
            </h2>
            <div className="flex gap-2 pl-8">
              {courses.find(c => c.id === selectedCourseId)?.code && (
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {courses.find(c => c.id === selectedCourseId)?.code}
                </span>
              )}
              {courses.find(c => c.id === selectedCourseId)?.college && (
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                  {courses.find(c => c.id === selectedCourseId)?.college}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-4 space-y-6">
          {projects.map((project, pIndex) => (
            <div key={project.id} className="space-y-2">
              <div 
                className={`group/proj font-bold text-sm px-2 py-1 rounded-lg cursor-pointer flex items-center justify-between ${selectedProjectId === project.id ? 'text-indigo-700 bg-indigo-50' : 'text-slate-700 hover:bg-slate-100'}`}
                onClick={() => {
                  setSelectedProjectId(project.id);
                  if (project.tasks && project.tasks.length > 0) {
                    setSelectedTaskId(project.tasks[0].id);
                  } else {
                    setSelectedTaskId(null);
                  }
                }}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-xs font-mono">项目{pIndex + 1}</span>
                  <span className="truncate">{project.name}</span>
                </div>
                <button 
                  onClick={(e) => handleDeleteProject(e, project.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 opacity-0 group-hover/proj:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              
              {selectedProjectId === project.id && project.tasks && (
                <div className="pl-4 space-y-1">
                  {project.tasks.map((task, tIndex) => (
                    <div 
                      key={task.id}
                      className={`group/task text-sm px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${selectedTaskId === task.id ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="border border-slate-300 text-slate-500 px-1.5 py-0.5 rounded text-xs font-mono bg-white">任务{tIndex + 1}</span>
                        <span className="truncate">{task.name}</span>
                      </div>
                      <button 
                        onClick={(e) => handleDeleteTask(e, project.id, task.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 opacity-0 group-hover/task:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-slate-200 mt-auto space-y-2">
          <button 
            onClick={() => setIsGeneratorOpen(true)}
            className="w-full py-3 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-sm font-black flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all"
          >
            <Sparkles className="w-4 h-4" /> AI 智能生成任务
          </button>
          <div className="flex gap-2">
            <button className="flex-1 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">添加项目</button>
            <button className="flex-1 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">批量导入</button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-white">
        {selectedTask ? (
          <div className="max-w-4xl mx-auto p-8 space-y-10">
            <div className="space-y-2 border-b border-slate-200 pb-6">
              <div className="flex items-center gap-2 text-sm font-bold text-indigo-600 uppercase tracking-wider">
                {selectedProject?.name}
                <button 
                  onClick={() => setIsEditorOpen(true)}
                  className="text-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  编辑
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">{selectedTask.name}</h1>
                  <div className="flex gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${(selectedTask as any).type === 'practical' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {(selectedTask as any).type === 'practical' ? '实训' : '理论'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsEditorOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                >
                  <Edit className="w-4 h-4" /> 编辑任务
                </button>
              </div>
            </div>

            {/* Tabs (Visual only for now) */}
            <div className="flex gap-8 border-b border-slate-200 text-sm font-medium">
              <button className="pb-4 border-b-2 border-indigo-600 text-indigo-600">任务情景描述</button>
              <button className="pb-4 border-b-2 border-transparent text-slate-500 hover:text-slate-700">任务目标</button>
              <button className="pb-4 border-b-2 border-transparent text-slate-500 hover:text-slate-700">能力训练</button>
              <button className="pb-4 border-b-2 border-transparent text-slate-500 hover:text-slate-700">任务学习活动</button>
              <button className="pb-4 border-b-2 border-transparent text-slate-500 hover:text-slate-700">任务步骤</button>
            </div>

            <div className="space-y-10">
              {/* Scenario */}
              <section className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-1 h-5 bg-indigo-600 rounded-full" />
                  任务情景描述
                  <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1 ml-2">
                    <Edit className="w-4 h-4" /> 编辑
                  </button>
                </h3>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {selectedTask.scenarioDescription || '暂无描述'}
                </p>
              </section>

              {/* Objectives */}
              <section className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-1 h-5 bg-indigo-600 rounded-full" />
                  任务目标
                  <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1 ml-2">
                    <Edit className="w-4 h-4" /> 编辑
                  </button>
                </h3>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {selectedTask.objectives || '暂无目标'}
                </p>
              </section>

              {/* Learning Activities */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <div className="w-1 h-5 bg-indigo-600 rounded-full" />
                    任务学习活动
                  </h3>
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        setAddMenuAnchor(e.currentTarget);
                        setShowAddMenu(!showAddMenu);
                      }}
                      className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> 添加
                    </button>
                    
                    <AnimatePresence>
                      {showAddMenu && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setShowAddMenu(false)} 
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="absolute right-0 top-full mt-2 w-[480px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex"
                          >
                            {/* Resources Column */}
                            <div className="flex-1 p-4 border-r border-slate-100 bg-slate-50/30">
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">资源</h4>
                              <div className="space-y-1">
                                <button onClick={() => handleAddActivity('courseware')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white hover:shadow-sm transition-all text-left">
                                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-orange-500" />
                                  </div>
                                  <span className="text-slate-700 font-medium">课件/资料</span>
                                </button>
                                <button onClick={() => handleAddActivity('document')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white hover:shadow-sm transition-all text-left">
                                  <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                                    <FileCode className="w-5 h-5 text-rose-500" />
                                  </div>
                                  <span className="text-slate-700 font-medium">在线文档</span>
                                </button>
                                <button onClick={() => handleAddActivity('link')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white hover:shadow-sm transition-all text-left">
                                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <LinkIcon className="w-5 h-5 text-blue-500" />
                                  </div>
                                  <span className="text-slate-700 font-medium">网页链接</span>
                                </button>
                              </div>
                            </div>

                            {/* Activities Column */}
                            <div className="flex-1 p-4">
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">活动</h4>
                              <div className="space-y-1">
                                <div className="group relative">
                                  <button onClick={() => handleAddActivity('quiz')} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-all text-left">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                        <PencilLine className="w-5 h-5 text-indigo-500" />
                                      </div>
                                      <span className="text-slate-700 font-medium">作业测验</span>
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                  </button>
                                </div>
                                <button onClick={() => handleAddActivity('discussion')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all text-left">
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5 text-slate-700" />
                                  </div>
                                  <span className="text-slate-700 font-medium">讨论</span>
                                </button>
                                <button onClick={() => handleAddActivity('adaptive_practice')} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-all text-left">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                      <Zap className="w-5 h-5 text-slate-700" />
                                    </div>
                                    <span className="text-slate-700 font-medium">自适应练习</span>
                                  </div>
                                  <HelpCircle className="w-4 h-4 text-slate-300" />
                                </button>
                                <button onClick={() => handleAddActivity('adaptive_quiz')} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-all text-left">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                      <Search className="w-5 h-5 text-slate-700" />
                                    </div>
                                    <span className="text-slate-700 font-medium">自适应测验</span>
                                  </div>
                                  <HelpCircle className="w-4 h-4 text-slate-300" />
                                </button>
                                <button 
                                  onClick={() => handleAddActivity('ability_training')} 
                                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 transition-all text-left group"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200">
                                    <Target className="w-5 h-5 text-indigo-600" />
                                  </div>
                                  <span className="text-slate-700 font-medium group-hover:text-indigo-700">能力训练</span>
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {selectedTask.learningActivities && selectedTask.learningActivities.length > 0 ? (
                  <div className="space-y-3">
                    {selectedTask.learningActivities.map((activity) => (
                      <div key={activity.id} className="group flex items-center gap-4 p-4 border border-slate-200 rounded-2xl bg-white hover:shadow-sm transition-all">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 truncate">{activity.name}</h4>
                            {activity.type === 'ability_training' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold">
                                <Sparkles className="w-3 h-3" /> AI
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            {getActivityLabel(activity.type)} • {activity.type === 'ability_training' ? '智能生成' : '赵老师拥有'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleRemoveActivity(activity.id)}
                            className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                    <Layout className="w-8 h-8 opacity-20" />
                    暂无任务学习活动
                  </div>
                )}
              </section>

              {/* Steps */}
              <section className="space-y-4">
                <h3 className="text-xl font-bold text-slate-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-indigo-600 rounded-full" />
                    任务步骤
                  </div>
                  <button 
                    onClick={() => setIsEditorOpen(true)}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
                  >
                    <Edit className="w-4 h-4" /> 编辑
                  </button>
                </h3>
                {selectedTask.steps && selectedTask.steps.length > 0 ? (
                  <div className="space-y-4">
                    {selectedTask.steps.map((step, sIndex) => (
                      <div key={sIndex} className="p-4 border border-slate-200 rounded-xl bg-white">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-slate-900">步骤 {sIndex + 1}: {step.name}</h4>
                          <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {step.estimatedTime} 分钟</span>
                        </div>
                        {step.checkItems && step.checkItems.length > 0 && (
                          <div className="mt-3 pl-4 border-l-2 border-indigo-100 space-y-2">
                            {step.checkItems.map((item, cIndex) => (
                              <div key={cIndex} className="flex items-center gap-2 text-sm text-slate-600">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                <span>{item.name}</span>
                                {item.isCritical && <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded uppercase font-bold">关键</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 flex items-center text-slate-500 text-sm">
                    暂无任务步骤
                    <button className="text-indigo-600 hover:text-indigo-700 ml-4 flex items-center gap-1">
                      <Plus className="w-4 h-4" /> 添加
                    </button>
                  </div>
                )}
              </section>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
              <Search className="w-10 h-10 text-slate-300" />
            </div>
            <p className="font-medium">请在左侧选择一个任务，或点击下方按钮开始智能生成</p>
            <button 
              onClick={() => setIsGeneratorOpen(true)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-6 h-6" /> 智能生成任务
            </button>
          </div>
        )}
      </div>
      {isEditorOpen && selectedProject && (
        <ProjectEditor 
          project={selectedProject}
          onClose={() => setIsEditorOpen(false)}
          onSave={(updatedProject) => {
            setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
            setIsEditorOpen(false);
          }}
        />
      )}
      {isGeneratorOpen && (
        <AITaskGenerator 
          courseId={selectedCourseId || undefined}
          onClose={() => setIsGeneratorOpen(false)}
          onGenerated={(courseId) => {
            fetchCourses();
            if (courseId) {
              setSelectedCourseId(courseId);
              getProjects().then(data => {
                const courseProjects = data.filter(p => p.courseId === courseId);
                setProjects(courseProjects);
              });
            }
          }}
        />
      )}

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl p-8 space-y-6 shadow-2xl"
            >
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8 text-rose-500" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-slate-900">确认删除？</h3>
                <p className="text-slate-500">
                  确定要删除该{confirmDelete.type === 'course' ? '课程' : confirmDelete.type === 'project' ? '项目' : '任务'}吗？此操作不可撤销。
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={executeDelete}
                  className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all"
                >
                  确认删除
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Alert Modal */}
      <AnimatePresence>
        {alertMessage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl p-8 space-y-6 shadow-2xl"
            >
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto">
                <Info className="w-8 h-8 text-amber-500" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-slate-900">提示</h3>
                <p className="text-slate-500">{alertMessage}</p>
              </div>
              <button 
                onClick={() => setAlertMessage(null)}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
              >
                我知道了
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

