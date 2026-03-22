import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, Sparkles, Loader2, BarChart2, FileText, Search, Activity } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { AI_AVATAR_URL } from '../constants';
import { UserProfile, ConversationMessage } from '../types';
import { generateAssistantResponse } from '../services/geminiService';
import { addConversationMessage, getConversationHistory } from '../services/memoryService';

interface TeacherAssistantProps {
  profile: UserProfile;
}

const TeacherAssistant: React.FC<TeacherAssistantProps> = ({ profile }) => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(`teacher_assistant_${profile.uid}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadHistory = async () => {
      const history = await getConversationHistory(sessionId);
      if (history.length === 0) {
        const welcomeMsg = await addConversationMessage(
          sessionId,
          'ai',
          t('teacher_assistant_desc')
        );
        setMessages([welcomeMsg]);
      } else {
        setMessages(history);
      }
    };
    loadHistory();
  }, [sessionId, t]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = await addConversationMessage(sessionId, 'teacher_visible', input);
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const systemInstruction = `你是一个教师 AI 助手。
你的目标是帮助老师分析班级数据、监控学生进度并生成报告。
你可以访问专门的工具来查询数据库。
      
      强制要求：
      - 在回答有关学生或班级的查询之前，必须使用函数调用来获取真实数据。
      - 如果未提供班级 ID，请询问。
      - 提供结构化、专业的分析。
      - 生成报告时，使用 Markdown 进行清晰的格式化。
      - 所有回复必须使用中文。
      
      当前教师：${profile.displayName} (${profile.email})`;

      const contents = messages.concat(userMsg).map(msg => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const aiResponseText = await generateAssistantResponse(profile.email, systemInstruction, contents);
      const aiMsg = await addConversationMessage(sessionId, 'ai', aiResponseText);
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('Error in Teacher Assistant:', error);
      const errorMsg = await addConversationMessage(sessionId, 'ai', t('aiError'));
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { id: 'progress', icon: <BarChart2 className="w-4 h-4" />, label: t('analyze_class'), prompt: t('promptAnalyzeClass') },
    { id: 'report', icon: <FileText className="w-4 h-4" />, label: t('generate_report'), prompt: t('promptGenerateReport') },
    { id: 'deepdive', icon: <Search className="w-4 h-4" />, label: t('student_deep_dive'), prompt: t('promptStudentDeepDive') },
    { id: 'student_progress', icon: <Activity className="w-4 h-4" />, label: t('student_progress'), prompt: t('promptStudentProgress') },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-bottom border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 overflow-hidden">
            <img src={AI_AVATAR_URL} alt="AI" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">{t('teacher_assistant')}</h2>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-slate-500 font-medium">{t('online')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`flex gap-3 max-w-[80%] ${msg.role === 'ai' ? 'flex-row' : 'flex-row-reverse'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden ${
                  msg.role === 'ai' ? 'bg-indigo-100' : 'bg-slate-100 text-slate-600'
                }`}>
                  {msg.role === 'ai' ? <img src={AI_AVATAR_URL} alt="AI" className="w-full h-full object-cover" /> : <User size={18} />}
                </div>
                <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'ai' 
                    ? 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-100' 
                    : 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-100'
                }`}>
                  <div className="prose prose-sm max-w-none prose-slate">
                    {msg.content.split('\n').map((line, i) => (
                      <p key={i} className="mb-1 last:mb-0">{line}</p>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="flex gap-3 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
              <span className="text-xs text-slate-500 font-medium">{t('aiAnalyzing')}</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar border-t border-slate-50">
        {quickActions.map(action => (
          <button
            key={action.id}
            onClick={() => setInput(action.prompt)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg text-xs font-medium transition-colors border border-slate-100 whitespace-nowrap"
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="relative flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('type_message')}
            className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
          <Sparkles size={10} />
          <span>{t('ai_mistakes')}</span>
        </div>
      </div>
    </div>
  );
};

export default TeacherAssistant;
