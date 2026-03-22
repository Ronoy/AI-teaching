import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, PracticeProject, PracticeSession, ProjectStep } from '../types';
import { getProjects, createPracticeSession, updateStepProgress, completeSession } from '../services/practiceService';
import { generateAIResponse } from '../services/geminiService';
import { addNotification } from '../services/memoryService';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { Play, CheckCircle2, Clock, Camera, ChevronRight, ArrowLeft, Info, AlertTriangle, Edit, BookOpen, Link as LinkIcon, Sparkles, Bot } from 'lucide-react';
import { AI_AVATAR_URL } from '../constants';
import ProjectEditor from './ProjectEditor';

import Markdown from 'react-markdown';

interface PracticeModuleProps {
  profile: UserProfile | null;
}

export default function PracticeModule({ profile }: PracticeModuleProps) {
  const { t } = useLanguage();
  const [projects, setProjects] = useState<PracticeProject[]>([]);
  const [activeSession, setActiveSession] = useState<PracticeSession | null>(null);
  const [activeProject, setActiveProject] = useState<PracticeProject | null>(null);
  const [editingProject, setEditingProject] = useState<PracticeProject | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submissionText, setSubmissionText] = useState('');
  const [chatHistory, setChatHistory] = useState<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    attachments?: { name: string; data: string; type: string }[];
  }[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<{ name: string; data: string; type: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);
  
  // Timers for alerts
  const stepStartTimeRef = useRef<number>(Date.now());
  const lastInteractionTimeRef = useRef<number>(Date.now());
  const stepAlertSentRef = useRef<boolean>(false);
  const idleAlertSentRef = useRef<boolean>(false);

  useEffect(() => {
    getProjects()
      .then(data => {
        setProjects(data);
      })
      .catch(err => {
        console.error("PracticeModule error:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleStartProject = async (project: PracticeProject) => {
    if (!profile) return;
    const session = await createPracticeSession(profile.uid, project.id);
    setActiveSession(session);
    setActiveProject(project);
    setCurrentStepIndex(0);
    stepStartTimeRef.current = Date.now();
    lastInteractionTimeRef.current = Date.now();
    stepAlertSentRef.current = false;
    idleAlertSentRef.current = false;
  };

  const handleInteraction = () => {
    lastInteractionTimeRef.current = Date.now();
    idleAlertSentRef.current = false;
  };

  useEffect(() => {
    if (!activeSession || !activeProject || !profile) return;

    const interval = setInterval(() => {
      const now = Date.now();
      
      // Check for step timeout (> 15 mins)
      if (!stepAlertSentRef.current && now - stepStartTimeRef.current > 15 * 60 * 1000) {
        const allSteps = activeProject.tasks 
          ? activeProject.tasks.flatMap(t => t.steps.map(s => ({ ...s, taskName: t.name })))
          : activeProject.steps || [];
        const currentStep = allSteps[currentStepIndex];
        
        addNotification(
          profile.uid,
          'warning',
          `Student has been on step "${currentStep?.name || 'Unknown'}" for over 15 minutes.`,
          activeSession.id
        );
        stepAlertSentRef.current = true;
      }

      // Check for idle timeout (> 10 mins)
      if (!idleAlertSentRef.current && now - lastInteractionTimeRef.current > 10 * 60 * 1000) {
        addNotification(
          profile.uid,
          'warning',
          `系统检测到您已超过10分钟未活动。`,
          activeSession.id
        );
        idleAlertSentRef.current = true;
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [activeSession, activeProject, currentStepIndex, profile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFiles(prev => [...prev, {
          name: file.name,
          data: reader.result as string,
          type: file.type
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAISubmit = async () => {
    if ((!submissionText.trim() && selectedFiles.length === 0) || !activeProject || !activeSession) return;
    
    const newUserMessage = {
      role: 'user' as const,
      content: submissionText,
      timestamp: new Date().toISOString(),
      attachments: selectedFiles.length > 0 ? [...selectedFiles] : undefined
    };

    const updatedHistory = [...chatHistory, newUserMessage];
    setChatHistory(updatedHistory);
    setSubmissionText('');
    setSelectedFiles([]);
    setIsSubmitting(true);

    try {
      const allSteps = activeProject.tasks 
        ? activeProject.tasks.flatMap(t => t.steps.map(s => ({ ...s, taskName: t.name })))
        : activeProject.steps || [];
      const currentStep = allSteps[currentStepIndex];

      const systemInstruction = `你是一个${profile?.displayName ? profile.displayName + '的专属' : ''}AI评估助手，正在评估学生提交的实践任务。
任务名称: ${currentStep.name}
检查清单项: ${currentStep.checkItems?.map(i => i.name).join(', ') || '无'}

根据检查清单项评估学生的提交内容。提供建设性的反馈。保持简洁和鼓励。
你处于多轮对话中。利用历史记录提供上下文相关的反馈。所有回复必须使用中文。`;

      // Prepare contents for Gemini API
      const contents = updatedHistory.map(msg => {
        const parts: any[] = [{ text: msg.content || (msg.attachments ? "Sent attachments" : "") }];
        
        if (msg.attachments) {
          msg.attachments.forEach(att => {
            parts.push({
              inlineData: {
                mimeType: att.type,
                data: att.data.split(',')[1] // Remove data:image/png;base64,
              }
            });
          });
        }
        
        return {
          role: msg.role === 'user' ? 'user' : 'model',
          parts
        };
      });

      const response = await generateAIResponse("gemini-3-flash-preview", systemInstruction, contents);
      
      // Extract grounding links if any
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const links = groundingChunks?.map(chunk => ({
        uri: chunk.web?.uri || chunk.maps?.uri,
        title: chunk.web?.title || chunk.maps?.title
      })).filter(link => link.uri) || [];

      let finalContent = response.text || '未收到反馈。';
      if (links.length > 0) {
        finalContent += "\n\n**参考资源:**\n" + links.map(l => `- [${l.title || l.uri}](${l.uri})`).join('\n');
      }

      const aiMessage = {
        role: 'assistant' as const,
        content: finalContent,
        timestamp: new Date().toISOString()
      };
      
      setChatHistory(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("AI Evaluation error:", error);
      const errorMessage = {
        role: 'assistant' as const,
        content: "生成反馈时出错，请重试。",
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextStep = async () => {
    if (!activeSession || !activeProject) return;
    
    const allSteps = activeProject.tasks 
      ? activeProject.tasks.flatMap(t => t.steps.map(s => ({ ...s, taskName: t.name })))
      : activeProject.steps || [];

    handleInteraction();
    // Mark current step as completed
    await updateStepProgress(activeSession.id, currentStepIndex, {
      endTime: new Date().toISOString()
    });

    if (currentStepIndex < allSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      setSubmissionText('');
      setChatHistory([]);
      setSelectedFiles([]);
      stepStartTimeRef.current = Date.now();
      stepAlertSentRef.current = false;
      // Start next step
      await updateStepProgress(activeSession.id, currentStepIndex + 1, {
        startTime: new Date().toISOString()
      });
    } else {
      await completeSession(activeSession.id);
      setActiveSession(null);
      setActiveProject(null);
      alert(t("projectCompleted"));
    }
  };

  if (loading) return <div>{t('loading')}</div>;

  if (editingProject) {
    return (
      <ProjectEditor 
        project={editingProject} 
        onClose={() => setEditingProject(null)} 
        onSave={(updatedProject) => {
          setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
          setEditingProject(null);
        }}
      />
    );
  }

  if (activeProject && activeSession) {
    const allSteps = activeProject.tasks 
      ? activeProject.tasks.flatMap(t => t.steps.map(s => ({ ...s, taskName: t.name })))
      : activeProject.steps || [];
    const currentStep = allSteps[currentStepIndex] as ProjectStep & { taskName?: string };
    
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button 
            onClick={() => { setActiveProject(null); setActiveSession(null); }}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-medium transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("backToProjects")}
          </button>
          
          <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("progress")}</p>
              <p className="text-lg font-black text-slate-900 leading-none">{currentStepIndex + 1} <span className="text-slate-300 font-normal mx-1">/</span> {allSteps.length}</p>
            </div>
            <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${((currentStepIndex + 1) / allSteps.length) * 100}%` }}
                className="h-full bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.4)]"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Task Details */}
          <motion.div 
            key={`left-${currentStepIndex}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-7 space-y-6"
            onClick={handleInteraction}
          >
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="p-8 border-b border-slate-100 bg-slate-50/30">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-indigo-200">
                    {t("step")} {currentStepIndex + 1}
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-500 text-xs font-bold bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    {currentStep.estimatedTime} {t("mins")}
                  </span>
                  {currentStep.taskName && (
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-full uppercase tracking-widest border border-emerald-100">
                      {currentStep.taskName}
                    </span>
                  )}
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t(currentStep.name)}</h2>
              </div>

              <div className="p-8 space-y-10">
                {/* Instructions */}
                <section className="space-y-4">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-600" />
                    {t("instructions")}
                  </h3>
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-slate-600 leading-relaxed font-medium">
                      {t("instructionsDesc")}
                    </p>
                  </div>
                </section>

                {/* Resources */}
                {currentStep.resources && currentStep.resources.length > 0 && (
                  <section className="space-y-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      学习资源
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {currentStep.resources.map((res, i) => (
                        <a 
                          key={i} 
                          href={res.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 p-4 bg-white hover:bg-indigo-50 rounded-2xl border border-slate-200 hover:border-indigo-200 transition-all group"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 group-hover:bg-white flex items-center justify-center text-indigo-600 shadow-sm shrink-0 transition-colors">
                            <LinkIcon className="w-6 h-6" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{res.name}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{res.type}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </section>
                )}

                {/* Checklist */}
                {currentStep.checkItems && (
                  <section className="space-y-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      {t("checklist")}
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {currentStep.checkItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                          <div className="w-6 h-6 rounded-lg border-2 border-slate-200 flex items-center justify-center shrink-0">
                            <div className="w-3 h-3 rounded-sm bg-slate-100" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-800">{t(item.name)}</p>
                          </div>
                          {item.isCritical && (
                            <span className="px-2 py-1 bg-rose-50 text-rose-600 text-[9px] font-black uppercase tracking-tighter rounded-md border border-rose-100 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> {t("critical")}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={handleNextStep}
                  className="px-10 py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 flex items-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {currentStepIndex === allSteps.length - 1 ? t("completeProject") : t("nextStep")}
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Right Column: AI Evaluator */}
          <motion.div 
            key={`right-${currentStepIndex}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-5 sticky top-6"
          >
            <div className="relative group h-[750px]">
              {/* AI Glow Effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[36px] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
              
              <div className="relative h-full bg-white rounded-[32px] border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
                {/* AI Panel Header */}
                <div className="p-6 bg-white border-b border-slate-100 relative overflow-hidden shrink-0">
                  {/* Soft Indigo Glow Background */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -mr-16 -mt-16" />
                  
                  <div className="relative flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 overflow-hidden">
                          <img src={AI_AVATAR_URL} alt="AI" className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-black tracking-tight text-slate-900">AI实训代教</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">神经链路：已激活</span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4].map(i => (
                              <motion.div 
                                key={i}
                                animate={{ height: [4, 8, 4] }}
                                transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                                className="w-0.5 bg-indigo-500 rounded-full"
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">系统状态</p>
                      <p className="text-xs font-bold text-emerald-600">运行良好</p>
                    </div>
                  </div>
                </div>

                {/* Chat Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30 scroll-smooth">
                      {!chatHistory.length && !isSubmitting && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6 px-8">
                          <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100 overflow-hidden">
                              <img src={AI_AVATAR_URL} alt="AI" className="w-14 h-14 animate-pulse" />
                            </div>
                            <motion.div 
                              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                              transition={{ repeat: Infinity, duration: 2 }}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white"
                            >
                              <Sparkles className="w-3 h-3" />
                            </motion.div>
                          </div>
                          <div className="space-y-3">
                            <h4 className="text-lg font-black text-slate-900 tracking-tight">准备好评估了吗？</h4>
                            <p className="text-sm text-slate-500 leading-relaxed">
                              请在下方输入框中<span className="text-indigo-600 font-bold">描述你的操作过程</span>或<span className="text-indigo-600 font-bold">上传实操照片</span>。
                              我将根据检查清单为你提供即时反馈。
                            </p>
                          </div>
                          <motion.div 
                            animate={{ y: [0, 5, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="flex flex-col items-center gap-2 text-indigo-400"
                          >
                            <span className="text-[10px] font-black uppercase tracking-widest">在此处提交</span>
                            <ChevronRight className="w-5 h-5 rotate-90" />
                          </motion.div>
                        </div>
                      )}

                  {chatHistory.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] space-y-1 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                          msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-100' 
                            : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'
                        }`}>
                          <div className="markdown-body prose prose-sm max-w-none prose-slate">
                            <Markdown components={{
                              a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-1 font-bold" />
                            }}>
                              {msg.content}
                            </Markdown>
                          </div>
                          
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {msg.attachments.map((att, i) => (
                                <div key={i} className="relative group/att">
                                  {att.type.startsWith('image/') ? (
                                    <img src={att.data} alt={att.name} className="w-full h-24 object-cover rounded-lg border border-white/20" />
                                  ) : (
                                    <div className="w-full h-24 bg-slate-100 rounded-lg flex items-center justify-center p-2 text-center">
                                      <span className="text-[10px] font-bold text-slate-500 truncate w-full">{att.name}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter">
                          {msg.role === 'user' ? '学生' : 'AI实训代教'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </motion.div>
                  ))}

                  {isSubmitting && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-indigo-50 text-indigo-600 p-4 rounded-2xl rounded-tl-none flex items-center gap-3 border border-indigo-100 shadow-sm">
                        <div className="flex gap-1">
                          {[0, 1, 2].map(i => (
                            <motion.div 
                              key={i}
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                              className="w-1.5 h-1.5 bg-indigo-500 rounded-full"
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest font-mono">分析中...</span>
                      </div>
                    </motion.div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-6 bg-white border-t border-slate-100 space-y-4 shrink-0">
                  {/* Selected Files Preview */}
                  {selectedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedFiles.map((file, i) => (
                        <div key={i} className="relative group">
                          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-600 truncate max-w-[100px]">{file.name}</span>
                            <button 
                              onClick={() => removeFile(i)}
                              className="w-4 h-4 bg-slate-300 hover:bg-rose-500 text-white rounded-full flex items-center justify-center transition-colors"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-end gap-3">
                    <div className="flex-1 relative">
                      <textarea
                        value={submissionText}
                        onChange={(e) => setSubmissionText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAISubmit();
                          }
                        }}
                        placeholder="输入消息或上传附件进行评估..."
                        className="w-full max-h-32 min-h-[56px] p-4 pr-12 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none resize-none transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400"
                        rows={1}
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute right-3 bottom-3 p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                        title="上传附件"
                      >
                        <Camera className="w-5 h-5" />
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileSelect} 
                        className="hidden" 
                        multiple 
                        accept="image/*,.pdf,.doc,.docx,.txt"
                      />
                    </div>
                    <button
                      onClick={handleAISubmit}
                      disabled={isSubmitting || (!submissionText.trim() && selectedFiles.length === 0)}
                      className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center transition-all disabled:opacity-50 disabled:shadow-none shrink-0"
                    >
                      <Sparkles className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* AI Footer Decoration */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">核心引擎 v3.1.0</span>
                  </div>
                  <div className="flex gap-4">
                    <div className="h-1 w-12 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div animate={{ x: [-48, 48] }} transition={{ repeat: Infinity, duration: 2 }} className="h-full w-1/2 bg-indigo-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {projects.map((project) => (
          <motion.div
            key={project.id}
            whileHover={{ y: -5 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
          >
            <div className="p-8 flex-1">
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full uppercase tracking-wider">
                  {project.courseId}
                </span>
                <span className="flex items-center gap-1 text-slate-500 text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  {project.duration} {t("mins")}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{t(project.name)}</h3>
              <p className="text-slate-500 text-sm line-clamp-3 leading-relaxed">
                {t(project.description)}
              </p>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => handleStartProject(project)}
                className="flex-1 py-3 bg-white hover:bg-indigo-600 hover:text-white text-indigo-600 border border-indigo-100 font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                {t("startProject")}
              </button>
              {profile?.role === 'teacher' && (
                <button
                  onClick={() => setEditingProject(project)}
                  className="px-4 py-3 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-bold rounded-xl shadow-sm transition-all flex items-center justify-center"
                  title="编辑项目"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
