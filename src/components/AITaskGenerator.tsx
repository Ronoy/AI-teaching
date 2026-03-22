import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send, Loader2, Check, AlertCircle, FileText, RefreshCcw, Upload, FileUp, Trash2, Plus, Edit3, ChevronDown, ChevronUp, BookOpen, Target, Zap, Link as LinkIcon } from 'lucide-react';
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { PracticeProject, ProjectTask } from '../types';
import { addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../firebase';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set worker path for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface AITaskGeneratorProps {
  courseId?: string; // Optional courseId
  onClose: () => void;
  onGenerated: (courseId?: string) => void;
}

interface GeneratedCourse {
  name: string;
  code: string;
  college: string;
  description: string;
  projects: GeneratedProject[];
}

interface GeneratedProject {
  id: string;
  name: string;
  description: string;
  jobTitle?: string;
  typicalJobTask?: string;
  jobCompetencies?: string[];
  tasks?: GeneratedTask[];
}

interface GeneratedTask {
  name: string;
  description: string;
  type: 'theoretical' | 'practical';
  learningActivities?: {
    type: 'courseware' | 'document' | 'link' | 'quiz' | 'discussion' | 'adaptive_practice' | 'adaptive_quiz' | 'ability_training';
    name: string;
    description: string;
  }[];
  steps: GeneratedStep[];
}

interface GeneratedStep {
  name: string;
  requirement: string;
  resources: { name: string; type: 'video' | 'document' | 'link' | 'tool'; url: string }[];
  knowledgePoints: string[];
  competencies: string[];
  skills: string[];
}

type GeneratorStep = 'input' | 'generating' | 'step1_outline' | 'step2_job' | 'step3_learning' | 'step4_resources' | 'step5_confirm';

export default function AITaskGenerator({ courseId, onClose, onGenerated }: AITaskGeneratorProps) {
  const [currentStep, setCurrentStep] = useState<GeneratorStep>('input');
  const [outline, setOutline] = useState('');
  const [feedback, setFeedback] = useState('');
  const [generatedCourse, setGeneratedCourse] = useState<GeneratedCourse | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTextFromPDF = async (file: File) => {
    setIsParsing(true);
    setError(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = (textContent.items || []).map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      setOutline(fullText);
      setUploadedFileName(file.name);
    } catch (err) {
      console.error('PDF parsing error:', err);
      setError('PDF 解析失败，请尝试手动粘贴内容。');
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      extractTextFromPDF(file);
    } else if (file) {
      setError('请上传 PDF 格式的文档。');
    }
  };

  const generateStep1 = async (userOutline: string) => {
    setCurrentStep('generating');
    setError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const systemInstruction = `你是一位顶级的课程设计师。请根据用户提供的大纲，解析并生成课程基本信息和项目大纲。
      要求：
      1. 解析课程名称、课程编号、开课单位、课程描述。
      2. 解析项目编号、项目名称、项目描述。
      
      输出格式必须是 JSON：
      {
        "name": "课程名称",
        "code": "课程编号",
        "college": "开课单位",
        "description": "课程描述",
        "projects": [
          {
            "id": "项目编号",
            "name": "项目名称",
            "description": "项目描述"
          }
        ]
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `大纲内容：\n${userOutline}`,
        config: { systemInstruction, responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text);
      setGeneratedCourse(result);
      setCurrentStep('step1_outline');
    } catch (err) {
      console.error('Step 1 error:', err);
      setError('生成失败，请重试。');
      setCurrentStep('input');
    }
  };

  const generateStep2JobTasks = async () => {
    if (!generatedCourse) return;
    setIsRefining(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const systemInstruction = `你是一位职业教育专家。请为当前的课程项目关联“岗位名称”、“岗位典型工作任务”和“岗位能力项”。
      
      要求：
      1. jobTitle：搜索并返回最适合大专生（Junior College）的互联网相关岗位名称。
      2. typicalJobTask：描述该项目对应的真实职业岗位中的【唯一一个】具体工作任务。
      3. jobCompetencies：列出完成该任务所需的 3-5 个核心能力项（如：系统架构设计能力、前端开发能力等）。
      
      请基于当前项目内容，返回完整的 JSON，包含原有的信息并补充 jobTitle, typicalJobTask 和 jobCompetencies。`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: JSON.stringify(generatedCourse),
        config: { 
          systemInstruction, 
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
      });

      const result = JSON.parse(response.text);
      setGeneratedCourse(result);
      setCurrentStep('step2_job');
    } catch (err) {
      console.error('Step 2 error:', err);
      setError('关联岗位任务失败，请重试。');
    } finally {
      setIsRefining(false);
    }
  };

  const generateStep3LearningTasks = async () => {
    if (!generatedCourse) return;
    setIsRefining(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const systemInstruction = `你是一位教学设计专家。请基于“岗位典型工作任务”和“岗位能力项”，为每个任务生成详细的“学习性任务”步骤。
      
      要求：
      1. 每个任务细化为 3-5 个步骤 (steps)。
      2. 每个步骤包含：name (步骤名称), requirement (操作要求), competencies (关联的能力项)。
      3. 自动根据步骤内容关联对应的岗位能力项。
      4. 确定任务类型 (type: theoretical/practical) 和学习活动 (learningActivities)。
      
      请返回完整的 JSON，保持与输入相同的 projects 和 tasks 结构，但只包含 tasks 的 steps、type 和 learningActivities 字段，不要返回其他无关字段以节省长度。`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: JSON.stringify(generatedCourse),
        config: { systemInstruction, responseMimeType: "application/json", thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
      });

      let responseText = response.text || '';
      try {
        const result = JSON.parse(responseText);
        
        // Merge the generated steps back into the original course
        const updatedCourse = { ...generatedCourse };
        if (result.projects && Array.isArray(result.projects)) {
          updatedCourse.projects = updatedCourse.projects.map((p, pIdx) => {
            const resultProject = result.projects[pIdx];
            if (!resultProject || !resultProject.tasks) return p;
            
            return {
              ...p,
              tasks: p.tasks?.map((t, tIdx) => {
                const resultTask = resultProject.tasks[tIdx];
                if (!resultTask) return t;
                
                return {
                  ...t,
                  type: resultTask.type || t.type || 'practical',
                  learningActivities: resultTask.learningActivities || t.learningActivities || [],
                  steps: resultTask.steps || t.steps || []
                };
              })
            };
          });
        }
        
        setGeneratedCourse(updatedCourse);
        setCurrentStep('step3_learning');
      } catch (parseErr) {
        console.error('JSON Parse Error in Step 3:', parseErr);
        console.error('Raw Response:', responseText);
        setError('生成学习任务失败：返回的数据格式错误。');
      }
    } catch (err: any) {
      console.error('Step 3 error:', err);
      setError(`生成学习任务失败: ${err.message || '未知错误'}`);
    } finally {
      setIsRefining(false);
    }
  };

  const generateStep4Resources = async () => {
    if (!generatedCourse) return;
    setIsRefining(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const systemInstruction = `你是一位数字化教学资源专家。请为每个任务步骤匹配学习资源、知识点和技能点。
      
      要求：
      1. resources：根据步骤内容推荐 1-2 个资源（如：XX教学视频、XX操作手册），包含 name 和 type (video/document/link/tool)。
      2. knowledgePoints：提取该步骤涉及的 2-3 个核心知识点。
      3. skills：匹配 skills 库中的具体技能描述（如：熟练使用 Git、掌握 React 组件开发等）。
      
      请返回完整的 JSON，保持与输入相同的 projects、tasks 和 steps 结构，但只包含 steps 的 resources、knowledgePoints 和 skills 字段，不要返回其他无关字段以节省长度。`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: JSON.stringify(generatedCourse),
        config: { systemInstruction, responseMimeType: "application/json", thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
      });

      let responseText = response.text || '';
      try {
        const result = JSON.parse(responseText);
        
        // Merge the generated resources back into the original course
        const updatedCourse = { ...generatedCourse };
        if (result.projects && Array.isArray(result.projects)) {
          updatedCourse.projects = updatedCourse.projects.map((p, pIdx) => {
            const resultProject = result.projects[pIdx];
            if (!resultProject || !resultProject.tasks) return p;
            
            return {
              ...p,
              tasks: p.tasks?.map((t, tIdx) => {
                const resultTask = resultProject.tasks[tIdx];
                if (!resultTask || !resultTask.steps) return t;
                
                return {
                  ...t,
                  steps: t.steps?.map((s, sIdx) => {
                    const resultStep = resultTask.steps[sIdx];
                    if (!resultStep) return s;
                    
                    return {
                      ...s,
                      resources: resultStep.resources || s.resources || [],
                      knowledgePoints: resultStep.knowledgePoints || s.knowledgePoints || [],
                      skills: resultStep.skills || s.skills || []
                    };
                  }) || []
                };
              })
            };
          });
        }
        
        setGeneratedCourse(updatedCourse);
        setCurrentStep('step4_resources');
      } catch (parseErr) {
        console.error('JSON Parse Error in Step 4:', parseErr);
        console.error('Raw Response:', responseText);
        setError('资源匹配失败：返回的数据格式错误。');
      }
    } catch (err: any) {
      console.error('Step 4 error:', err);
      setError(`资源匹配失败: ${err.message || '未知错误'}`);
    } finally {
      setIsRefining(false);
    }
  };

  const addResource = (pIdx: number, tIdx: number, sIdx: number) => {
    if (!generatedCourse) return;
    const newCourse = { ...generatedCourse };
    const step = newCourse.projects[pIdx].tasks[tIdx].steps[sIdx];
    if (!step.resources) step.resources = [];
    step.resources.push({ name: '新资源', type: 'document', url: '#' });
    setGeneratedCourse(newCourse);
  };

  const removeResource = (pIdx: number, tIdx: number, sIdx: number, rIdx: number) => {
    if (!generatedCourse) return;
    const newCourse = { ...generatedCourse };
    newCourse.projects[pIdx].tasks[tIdx].steps[sIdx].resources.splice(rIdx, 1);
    setGeneratedCourse(newCourse);
  };

  const addKnowledgePoint = (pIdx: number, tIdx: number, sIdx: number) => {
    if (!generatedCourse) return;
    const newCourse = { ...generatedCourse };
    const step = newCourse.projects[pIdx].tasks[tIdx].steps[sIdx];
    if (!step.knowledgePoints) step.knowledgePoints = [];
    step.knowledgePoints.push('新知识点');
    setGeneratedCourse(newCourse);
  };

  const removeKnowledgePoint = (pIdx: number, tIdx: number, sIdx: number, kpIdx: number) => {
    if (!generatedCourse) return;
    const newCourse = { ...generatedCourse };
    newCourse.projects[pIdx].tasks[tIdx].steps[sIdx].knowledgePoints.splice(kpIdx, 1);
    setGeneratedCourse(newCourse);
  };

  const addSkill = (pIdx: number, tIdx: number, sIdx: number) => {
    if (!generatedCourse) return;
    const newCourse = { ...generatedCourse };
    const step = newCourse.projects[pIdx].tasks[tIdx].steps[sIdx];
    if (!step.skills) step.skills = [];
    step.skills.push('新技能');
    setGeneratedCourse(newCourse);
  };

  const removeSkill = (pIdx: number, tIdx: number, sIdx: number, skIdx: number) => {
    if (!generatedCourse) return;
    const newCourse = { ...generatedCourse };
    newCourse.projects[pIdx].tasks[tIdx].steps[sIdx].skills.splice(skIdx, 1);
    setGeneratedCourse(newCourse);
  };

  const updateResource = (pIdx: number, tIdx: number, sIdx: number, rIdx: number, field: string, value: string) => {
    if (!generatedCourse) return;
    const newCourse = { ...generatedCourse };
    const resource = newCourse.projects[pIdx].tasks[tIdx].steps[sIdx].resources[rIdx];
    (resource as any)[field] = value;
    setGeneratedCourse(newCourse);
  };

  const updateKnowledgePoint = (pIdx: number, tIdx: number, sIdx: number, kpIdx: number, value: string) => {
    if (!generatedCourse) return;
    const newCourse = { ...generatedCourse };
    newCourse.projects[pIdx].tasks[tIdx].steps[sIdx].knowledgePoints[kpIdx] = value;
    setGeneratedCourse(newCourse);
  };

  const updateSkill = (pIdx: number, tIdx: number, sIdx: number, skIdx: number, value: string) => {
    if (!generatedCourse) return;
    const newCourse = { ...generatedCourse };
    newCourse.projects[pIdx].tasks[tIdx].steps[sIdx].skills[skIdx] = value;
    setGeneratedCourse(newCourse);
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user || !generatedCourse || isSaving) return;
    setIsSaving(true);
    setError(null);

    try {
      let finalCourseId = courseId;

      // If no courseId provided, create a new course first
      if (!finalCourseId) {
        const courseDoc = await addDoc(collection(db, 'courses'), {
          name: generatedCourse.name,
          code: generatedCourse.code || '',
          college: generatedCourse.college || '',
          description: generatedCourse.description,
          teacherId: user.uid,
          createdAt: new Date().toISOString()
        });
        finalCourseId = courseDoc.id;
      }

      for (const [pIdx, p] of generatedCourse.projects.entries()) {
        const projectData: Omit<PracticeProject, 'id'> = {
          name: p.name,
          description: p.description,
          courseId: finalCourseId,
          duration: 0,
          acceptanceCriteria: '',
          typicalJobTask: p.typicalJobTask,
          jobCompetencies: p.jobCompetencies,
          tasks: (p.tasks || []).map((t, idx) => ({
            id: `task-${Date.now()}-${pIdx}-${idx}`,
            name: t.name,
            description: t.description,
            order: idx + 1,
            type: t.type,
            learningActivities: t.learningActivities?.map((la, laIdx) => ({
              id: `activity-${Date.now()}-${pIdx}-${idx}-${laIdx}`,
              type: la.type,
              name: la.name,
              description: la.description
            })),
            steps: (t.steps || []).map((s, sIdx) => ({
              id: `step-${Date.now()}-${pIdx}-${idx}-${sIdx}`,
              name: s.name,
              requirement: s.requirement,
              order: sIdx + 1,
              type: 'standardized',
              estimatedTime: 10,
              maxScore: 10,
              resources: (s.resources || []).map((res, rIdx) => ({
                id: `res-${Date.now()}-${pIdx}-${idx}-${sIdx}-${rIdx}`,
                name: res.name,
                type: res.type,
                url: res.url
              })),
              knowledgeNodeIds: s.knowledgePoints,
              competenceMapping: [
                ...((s.competencies || []).map(c => ({ competenceId: c, confidence: 0.9 }))),
                ...((s.skills || []).map(sk => ({ competenceId: `skill-${sk}`, confidence: 0.9 })))
              ]
            }))
          } as any))
        };
        await addDoc(collection(db, 'projects'), projectData);
      }
      onGenerated(finalCourseId);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const updateCourse = (field: keyof GeneratedCourse, value: any) => {
    if (!generatedCourse) return;
    setGeneratedCourse({ ...generatedCourse, [field]: value });
  };

  const updateProject = (idx: number, field: keyof GeneratedProject, value: any) => {
    if (!generatedCourse) return;
    const newProjects = [...generatedCourse.projects];
    newProjects[idx] = { ...newProjects[idx], [field]: value };
    setGeneratedCourse({ ...generatedCourse, projects: newProjects });
  };

  const updateTask = (pIdx: number, tIdx: number, field: string, value: any) => {
    if (!generatedCourse) return;
    const newProjects = [...generatedCourse.projects];
    const newTasks = [...(newProjects[pIdx].tasks || [])];
    newTasks[tIdx] = { ...newTasks[tIdx], [field]: value };
    newProjects[pIdx] = { ...newProjects[pIdx], tasks: newTasks };
    setGeneratedCourse({ ...generatedCourse, projects: newProjects });
  };

  const updateStep = (pIdx: number, tIdx: number, sIdx: number, field: string, value: any) => {
    if (!generatedCourse) return;
    const newProjects = [...generatedCourse.projects];
    const newTasks = [...(newProjects[pIdx].tasks || [])];
    const newSteps = [...(newTasks[tIdx].steps || [])];
    newSteps[sIdx] = { ...newSteps[sIdx], [field]: value };
    newTasks[tIdx] = { ...newTasks[tIdx], steps: newSteps };
    newProjects[pIdx] = { ...newProjects[pIdx], tasks: newTasks };
    setGeneratedCourse({ ...generatedCourse, projects: newProjects });
  };

  const removeProject = (idx: number) => {
    if (!generatedCourse) return;
    setGeneratedCourse({
      ...generatedCourse,
      projects: generatedCourse.projects.filter((_, i) => i !== idx)
    });
  };

  const removeTask = (pIdx: number, tIdx: number) => {
    if (!generatedCourse) return;
    const newProjects = [...generatedCourse.projects];
    const newTasks = (generatedCourse.projects[pIdx].tasks || []).filter((_, i) => i !== tIdx);
    newProjects[pIdx] = { ...newProjects[pIdx], tasks: newTasks };
    setGeneratedCourse({ ...generatedCourse, projects: newProjects });
  };

  const removeStep = (pIdx: number, tIdx: number, sIdx: number) => {
    if (!generatedCourse) return;
    const newProjects = [...generatedCourse.projects];
    const newTasks = [...(newProjects[pIdx].tasks || [])];
    const newSteps = (newTasks[tIdx].steps || []).filter((_, i) => i !== sIdx);
    newTasks[tIdx] = { ...newTasks[tIdx], steps: newSteps };
    newProjects[pIdx] = { ...newProjects[pIdx], tasks: newTasks };
    setGeneratedCourse({ ...generatedCourse, projects: newProjects });
  };

  const addTask = (pIdx: number) => {
    if (!generatedCourse) return;
    const newProjects = [...generatedCourse.projects];
    const newTasks = [...(newProjects[pIdx].tasks || []), {
      name: '新任务',
      description: '任务描述',
      type: 'practical' as const,
      steps: []
    }];
    newProjects[pIdx] = { ...newProjects[pIdx], tasks: newTasks };
    setGeneratedCourse({ ...generatedCourse, projects: newProjects });
  };

  const addStep = (pIdx: number, tIdx: number) => {
    if (!generatedCourse) return;
    const newProjects = [...generatedCourse.projects];
    const newTasks = [...(newProjects[pIdx].tasks || [])];
    const newSteps = [...(newTasks[tIdx].steps || []), {
      name: '新步骤',
      requirement: '步骤要求',
      resources: [],
      knowledgePoints: [],
      competencies: [],
      skills: []
    }];
    newTasks[tIdx] = { ...newTasks[tIdx], steps: newSteps };
    newProjects[pIdx] = { ...newProjects[pIdx], tasks: newTasks };
    setGeneratedCourse({ ...generatedCourse, projects: newProjects });
  };

  const refineStep = async (step: GeneratorStep) => {
    if (!generatedCourse) return;
    setIsRefining(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      let systemInstruction = '';
      
      if (step === 'step1_outline') {
        systemInstruction = `请根据用户反馈优化课程大纲和项目任务。反馈：${feedback}`;
      } else if (step === 'step2_job') {
        systemInstruction = `请根据用户反馈优化岗位任务和能力项关联。反馈：${feedback}`;
      } else if (step === 'step3_learning') {
        systemInstruction = `请根据用户反馈优化学习性任务和步骤。反馈：${feedback}`;
      } else if (step === 'step4_resources') {
        systemInstruction = `请根据用户反馈优化资源、知识点和技能匹配。反馈：${feedback}`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: JSON.stringify(generatedCourse),
        config: { systemInstruction, responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text);
      setGeneratedCourse(result);
      setFeedback('');
    } catch (err) {
      console.error('Refine error:', err);
      setError('优化失败，请重试。');
    } finally {
      setIsRefining(false);
    }
  };

  const addJobCompetency = (pIdx: number) => {
    const comp = prompt('请输入新的能力项名称：');
    if (comp && generatedCourse) {
      const newProjects = [...generatedCourse.projects];
      const newComps = [...(newProjects[pIdx].jobCompetencies || []), comp];
      newProjects[pIdx] = { ...newProjects[pIdx], jobCompetencies: newComps };
      setGeneratedCourse({ ...generatedCourse, projects: newProjects });
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: 'input', label: '输入大纲' },
      { id: 'step1_outline', label: '基本信息' },
      { id: 'step2_job', label: '关联岗位' },
      { id: 'step3_learning', label: '学习任务' },
      { id: 'step4_resources', label: '资源匹配' },
      { id: 'step5_confirm', label: '确认完成' }
    ];

    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex === -1 && currentStep === 'generating') return null;

    return (
      <div className="px-8 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        {(steps || []).map((s, idx) => (
          <React.Fragment key={s.id}>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                idx <= currentIndex ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {idx + 1}
              </div>
              <span className={`text-xs font-bold ${
                idx <= currentIndex ? 'text-indigo-600' : 'text-slate-400'
              }`}>
                {s.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-px mx-4 ${
                idx < currentIndex ? 'bg-indigo-600' : 'bg-slate-200'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">AI 智能任务生成</h3>
              <p className="text-xs text-slate-500 font-medium">分步引导，精准生成课程体系</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {renderStepIndicator()}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {currentStep === 'input' && (
            <div className="space-y-6">
              {/* File Upload Area */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                  uploadedFileName 
                    ? 'border-emerald-200 bg-emerald-50/30' 
                    : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf"
                  className="hidden"
                />
                {isParsing ? (
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                ) : uploadedFileName ? (
                  <FileUp className="w-10 h-10 text-emerald-600" />
                ) : (
                  <Upload className="w-10 h-10 text-slate-400" />
                )}
                <div className="text-center">
                  <p className="font-bold text-slate-700">
                    {isParsing ? '正在解析 PDF...' : uploadedFileName ? `已上传: ${uploadedFileName}` : '点击或拖拽上传 PDF 课程大纲'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">支持解析 PDF 文档中的文字内容</p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-400 font-bold">或者直接粘贴文本</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  课程大纲 / 教学计划
                </label>
                <textarea 
                  className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-slate-700 leading-relaxed"
                  placeholder="请在此处粘贴课程大纲内容，或描述课程结构..."
                  value={outline}
                  onChange={(e) => {
                    setOutline(e.target.value);
                    if (uploadedFileName) setUploadedFileName(null);
                  }}
                />
              </div>
              <button 
                onClick={() => generateStep1(outline)}
                disabled={!outline.trim() || isParsing}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-6 h-6" /> 开始智能解析
              </button>
            </div>
          )}

          {currentStep === 'generating' && (
            <div className="h-full flex flex-col items-center justify-center space-y-6 py-20">
              <div className="relative">
                <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-indigo-600 animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <h4 className="text-xl font-black text-slate-900">AI 正在深度解析中...</h4>
                <p className="text-slate-500">正在识别项目结构、匹配任务类型并生成描述</p>
              </div>
            </div>
          )}

          {currentStep === 'step1_outline' && generatedCourse && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  第一步：确认课程与项目大纲
                </h4>
                <div className="flex items-center gap-2">
                  <input 
                    type="text"
                    placeholder="输入优化建议..."
                    className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 w-48 outline-none focus:ring-1 focus:ring-indigo-500"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                  <button 
                    onClick={() => refineStep('step1_outline')}
                    disabled={isRefining || !feedback.trim()}
                    className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
                  >
                    <RefreshCcw className={`w-4 h-4 ${isRefining ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">课程名称</label>
                    <input 
                      type="text"
                      className="w-full bg-white border border-slate-100 rounded-xl text-lg font-black text-slate-900 px-3 py-2"
                      value={generatedCourse.name}
                      onChange={(e) => updateCourse('name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">课程编号</label>
                    <input 
                      type="text"
                      className="w-full bg-white border border-slate-100 rounded-xl text-lg font-black text-slate-900 px-3 py-2"
                      value={generatedCourse.code}
                      onChange={(e) => updateCourse('code', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">开课单位</label>
                    <input 
                      type="text"
                      className="w-full bg-white border border-slate-100 rounded-xl text-lg font-black text-slate-900 px-3 py-2"
                      value={generatedCourse.college}
                      onChange={(e) => updateCourse('college', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">课程描述</label>
                  <textarea 
                    className="w-full bg-white border border-slate-100 rounded-xl text-sm text-slate-600 px-3 py-2 resize-none h-20"
                    value={generatedCourse.description}
                    onChange={(e) => updateCourse('description', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                {(generatedCourse.projects || []).map((p, pIdx) => (
                  <div key={pIdx} className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-xs font-black">{pIdx + 1}</span>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input 
                          type="text"
                          className="bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-900 px-3 py-2"
                          value={p.id}
                          onChange={(e) => updateProject(pIdx, 'id', e.target.value)}
                          placeholder="项目编号"
                        />
                        <input 
                          type="text"
                          className="bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-900 px-3 py-2"
                          value={p.name}
                          onChange={(e) => updateProject(pIdx, 'name', e.target.value)}
                          placeholder="项目名称"
                        />
                      </div>
                    </div>
                    <textarea 
                      className="w-full bg-white border border-slate-100 rounded-xl text-xs text-slate-600 px-3 py-2 resize-none h-16 mb-4"
                      value={p.description}
                      onChange={(e) => updateProject(pIdx, 'description', e.target.value)}
                      placeholder="项目描述"
                    />
                    <div className="pl-11 space-y-2">
                      {(p.tasks || []).map((t, tIdx) => (
                        <div key={tIdx} className="flex flex-col gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">
                          <input 
                            type="text"
                            className="flex-1 bg-transparent border-none focus:ring-0 p-0 text-sm font-bold text-slate-900"
                            value={t.name}
                            onChange={(e) => updateTask(pIdx, tIdx, 'name', e.target.value)}
                          />
                          <input 
                            type="text"
                            className="flex-1 bg-transparent border-none focus:ring-0 p-0 text-xs text-slate-500"
                            value={t.description}
                            onChange={(e) => updateTask(pIdx, tIdx, 'description', e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button 
                  onClick={() => generateStep1(outline)}
                  className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50"
                >
                  重新生成
                </button>
                <button 
                  onClick={generateStep2JobTasks}
                  disabled={isRefining}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isRefining ? <Loader2 className="w-5 h-5 animate-spin" /> : '下一步：关联岗位任务'}
                </button>
              </div>
            </div>
          )}

          {currentStep === 'step2_job' && generatedCourse && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-600" />
                  第二步：关联岗位典型工作任务
                </h4>
                <div className="flex items-center gap-2">
                  <input 
                    type="text"
                    placeholder="输入优化建议..."
                    className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 w-48 outline-none focus:ring-1 focus:ring-indigo-500"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                  <button 
                    onClick={() => refineStep('step2_job')}
                    disabled={isRefining || !feedback.trim()}
                    className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
                  >
                    <RefreshCcw className={`w-4 h-4 ${isRefining ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {(generatedCourse.projects || []).map((p, pIdx) => (
                  <div key={pIdx} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">项目 {pIdx + 1}：{p.name}</span>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                            岗位名称
                          </label>
                          <input 
                            type="text"
                            className="w-full bg-white border border-slate-100 rounded-xl text-sm font-bold text-slate-900 px-3 py-2"
                            value={p.jobTitle || ''}
                            onChange={(e) => updateProject(pIdx, 'jobTitle', e.target.value)}
                            placeholder="输入岗位名称..."
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">岗位典型工作任务</label>
                          <input 
                            type="text"
                            className="w-full bg-white border border-slate-100 rounded-xl text-sm font-bold text-slate-900 px-3 py-2"
                            value={p.typicalJobTask || ''}
                            onChange={(e) => updateProject(pIdx, 'typicalJobTask', e.target.value)}
                            placeholder="输入典型工作任务..."
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">岗位能力项</label>
                        <div className="flex flex-wrap gap-2 p-2 bg-white border border-slate-100 rounded-xl min-h-[40px]">
                          {p.jobCompetencies?.map((c, cIdx) => (
                            <span key={cIdx} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold flex items-center gap-1">
                              {c}
                              <X className="w-3 h-3 cursor-pointer" onClick={() => {
                                const newComps = p.jobCompetencies?.filter((_, i) => i !== cIdx);
                                updateProject(pIdx, 'jobCompetencies', newComps);
                              }} />
                            </span>
                          ))}
                          <button 
                            onClick={() => addJobCompetency(pIdx)}
                            className="text-xs text-slate-400 hover:text-indigo-600 font-bold px-2"
                          >
                            + 添加
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button 
                  onClick={() => setCurrentStep('step1_outline')}
                  className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50"
                >
                  上一步
                </button>
                <button 
                  onClick={generateStep3LearningTasks}
                  disabled={isRefining}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isRefining ? <Loader2 className="w-5 h-5 animate-spin" /> : '下一步：生成学习性任务'}
                </button>
              </div>
            </div>
          )}

          {currentStep === 'step3_learning' && generatedCourse && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-indigo-600" />
                  第三步：确认学习性任务与能力关联
                </h4>
                <div className="flex items-center gap-2">
                  <input 
                    type="text"
                    placeholder="输入优化建议..."
                    className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 w-48 outline-none focus:ring-1 focus:ring-indigo-500"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                  <button 
                    onClick={() => refineStep('step3_learning')}
                    disabled={isRefining || !feedback.trim()}
                    className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
                  >
                    <RefreshCcw className={`w-4 h-4 ${isRefining ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {(generatedCourse?.projects || []).map((p, pIdx) => (
                  <div key={pIdx} className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      <div className="w-1 h-4 bg-indigo-600 rounded-full" />
                      <h5 className="text-sm font-black text-slate-900 uppercase tracking-widest">{p.name}</h5>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {(p.tasks || []).map((t, tIdx) => (
                        <div key={tIdx} className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4 hover:border-indigo-200 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <select 
                                className="bg-slate-100 border-none rounded text-[10px] font-black uppercase px-2 py-1 outline-none"
                                value={t.type}
                                onChange={(e) => updateTask(pIdx, tIdx, 'type', e.target.value)}
                              >
                                <option value="practical">实训</option>
                                <option value="theoretical">理论</option>
                              </select>
                              <input 
                                type="text"
                                className="text-base font-bold text-slate-900 border-none focus:ring-0 p-0 w-full"
                                value={t.name}
                                onChange={(e) => updateTask(pIdx, tIdx, 'name', e.target.value)}
                              />
                            </div>
                            <button 
                              onClick={() => removeTask(pIdx, tIdx)}
                              className="text-slate-300 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                              {t.learningActivities?.map((la, laIdx) => (
                                <span key={laIdx} className="px-2 py-1 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-bold border border-slate-100">
                                  {la.name}
                                </span>
                              ))}
                            </div>

                            <div className="space-y-3">
                              {(t.steps || []).map((s, sIdx) => (
                                <div key={sIdx} className="group relative pl-6 border-l-2 border-slate-100 space-y-2 py-1">
                                  <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-slate-200 group-hover:bg-indigo-400 transition-colors" />
                                  <div className="flex items-center justify-between">
                                    <input 
                                      type="text"
                                      className="text-xs font-bold text-slate-700 border-none focus:ring-0 p-0 bg-transparent w-full"
                                      value={s.name}
                                      onChange={(e) => updateStep(pIdx, tIdx, sIdx, 'name', e.target.value)}
                                    />
                                    <button 
                                      onClick={() => removeStep(pIdx, tIdx, sIdx)}
                                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <textarea 
                                    className="w-full text-[10px] text-slate-500 bg-transparent border-none focus:ring-0 p-0 resize-none h-8"
                                    value={s.requirement}
                                    onChange={(e) => updateStep(pIdx, tIdx, sIdx, 'requirement', e.target.value)}
                                  />
                                  <div className="flex flex-wrap gap-1">
                                    {(s.competencies || []).map((c, cIdx) => (
                                      <span key={cIdx} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-medium">
                                        {c}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                              <button 
                                onClick={() => addStep(pIdx, tIdx)}
                                className="w-full py-2 border border-dashed border-slate-200 rounded-xl text-[10px] font-bold text-slate-400 hover:border-indigo-400 hover:text-indigo-600 transition-all"
                              >
                                + 添加步骤
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      <button 
                        onClick={() => addTask(pIdx)}
                        className="w-full py-4 border-2 border-dashed border-slate-100 rounded-2xl text-sm font-bold text-slate-400 hover:bg-slate-50 transition-all"
                      >
                        + 添加新任务
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button 
                  onClick={() => setCurrentStep('step2_job')}
                  className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50"
                >
                  上一步
                </button>
                <button 
                  onClick={generateStep4Resources}
                  disabled={isRefining}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isRefining ? <Loader2 className="w-5 h-5 animate-spin" /> : '下一步：匹配资源与技能'}
                </button>
              </div>
            </div>
          )}

          {currentStep === 'step4_resources' && generatedCourse && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <LinkIcon className="w-5 h-5 text-indigo-600" />
                  第四步：资源、知识与技能匹配
                </h4>
                <div className="flex items-center gap-2">
                  <input 
                    type="text"
                    placeholder="输入优化建议..."
                    className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 w-48 outline-none focus:ring-1 focus:ring-indigo-500"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                  <button 
                    onClick={() => refineStep('step4_resources')}
                    disabled={isRefining || !feedback.trim()}
                    className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
                  >
                    <RefreshCcw className={`w-4 h-4 ${isRefining ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {(generatedCourse?.projects || []).map((p, pIdx) => (
                  <div key={pIdx} className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      <div className="w-1 h-4 bg-indigo-600 rounded-full" />
                      <h5 className="text-sm font-black text-slate-900 uppercase tracking-widest">{p.name}</h5>
                    </div>
                    {(p.tasks || []).map((t, tIdx) => (
                      <div key={tIdx} className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                          <h6 className="text-sm font-black text-slate-900 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-500" />
                            {t.name}
                          </h6>
                        </div>
                        
                        <div className="space-y-8">
                          {(t.steps || []).map((s, sIdx) => (
                            <div key={sIdx} className="space-y-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">
                                  {sIdx + 1}
                                </span>
                                <span className="text-xs font-bold text-slate-700">{s.name}</span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                      <FileText className="w-3 h-3" /> 资源匹配
                                    </label>
                                    <button onClick={() => addResource(pIdx, tIdx, sIdx)} className="text-[10px] text-indigo-600 font-bold hover:underline">+ 添加</button>
                                  </div>
                                  <div className="space-y-2">
                                    {s.resources?.map((r, rIdx) => (
                                      <div key={rIdx} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-100 group">
                                        <select 
                                          className="bg-slate-50 border-none rounded text-[10px] p-1 outline-none"
                                          value={r.type}
                                          onChange={(e) => updateResource(pIdx, tIdx, sIdx, rIdx, 'type', e.target.value)}
                                        >
                                          <option value="video">视频</option>
                                          <option value="document">文档</option>
                                          <option value="link">链接</option>
                                          <option value="tool">工具</option>
                                        </select>
                                        <input 
                                          type="text"
                                          className="flex-1 text-[10px] font-medium text-slate-600 border-none focus:ring-0 p-0 bg-transparent"
                                          value={r.name}
                                          onChange={(e) => updateResource(pIdx, tIdx, sIdx, rIdx, 'name', e.target.value)}
                                        />
                                        <button onClick={() => removeResource(pIdx, tIdx, sIdx, rIdx)} className="opacity-0 group-hover:opacity-100 text-rose-500">
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                      <BookOpen className="w-3 h-3" /> 知识点
                                    </label>
                                    <button onClick={() => addKnowledgePoint(pIdx, tIdx, sIdx)} className="text-[10px] text-emerald-600 font-bold hover:underline">+ 添加</button>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {s.knowledgePoints?.map((kp, kpIdx) => (
                                      <div key={kpIdx} className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold border border-emerald-100/50 group">
                                        <input 
                                          type="text"
                                          className="bg-transparent border-none focus:ring-0 p-0 w-16"
                                          value={kp}
                                          onChange={(e) => updateKnowledgePoint(pIdx, tIdx, sIdx, kpIdx, e.target.value)}
                                        />
                                        <X className="w-3 h-3 cursor-pointer opacity-0 group-hover:opacity-100" onClick={() => removeKnowledgePoint(pIdx, tIdx, sIdx, kpIdx)} />
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                      <Target className="w-3 h-3" /> Skills 匹配
                                    </label>
                                    <button onClick={() => addSkill(pIdx, tIdx, sIdx)} className="text-[10px] text-violet-600 font-bold hover:underline">+ 添加</button>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {s.skills?.map((skill, skIdx) => (
                                      <div key={skIdx} className="flex items-center gap-1 px-2 py-1 bg-violet-50 text-violet-600 rounded-lg text-[10px] font-bold border border-violet-100/50 group">
                                        <input 
                                          type="text"
                                          className="bg-transparent border-none focus:ring-0 p-0 w-16"
                                          value={skill}
                                          onChange={(e) => updateSkill(pIdx, tIdx, sIdx, skIdx, e.target.value)}
                                        />
                                        <X className="w-3 h-3 cursor-pointer opacity-0 group-hover:opacity-100" onClick={() => removeSkill(pIdx, tIdx, sIdx, skIdx)} />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button 
                  onClick={() => setCurrentStep('step3_learning')}
                  className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50"
                >
                  上一步
                </button>
                <button 
                  onClick={() => setCurrentStep('step5_confirm')}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                  下一步：最终确认
                </button>
              </div>
            </div>
          )}

          {currentStep === 'step5_confirm' && generatedCourse && (
            <div className="space-y-8">
              <div className="text-center py-10 space-y-4">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-10 h-10 text-emerald-600" />
                </div>
                <h4 className="text-2xl font-black text-slate-900">课程体系生成完成！</h4>
                <p className="text-slate-500 max-w-md mx-auto">
                  已根据您的教学大纲、岗位任务及能力要求，完整构建了课程、项目、任务及资源匹配体系。
                </p>
              </div>

              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <h5 className="text-lg font-black text-slate-900">生成摘要</h5>
                  <div className="flex gap-4">
                    <div className="text-center">
                      <div className="text-xl font-black text-indigo-600">{generatedCourse.projects.length}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase">项目数量</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-black text-indigo-600">
                        {generatedCourse.projects.reduce((acc, p) => acc + p.tasks.length, 0)}
                      </div>
                      <div className="text-[10px] font-black text-slate-400 uppercase">任务总数</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600 font-bold">课程名称：{generatedCourse.name}</p>
                  <p className="text-xs text-slate-500">{generatedCourse.description}</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button 
                  onClick={() => setCurrentStep('step4_resources')}
                  className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50"
                >
                  上一步
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 text-lg"
                >
                  {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Check className="w-6 h-6" /> 确认并发布课程</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
      </motion.div>
    </div>
  );
}

