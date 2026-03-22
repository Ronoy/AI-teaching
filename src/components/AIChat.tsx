import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, ConversationSession, ConversationMessage, StudentMemory } from '../types';
import { getStudentMemory, addConversationMessage, getConversationHistory, addNotification } from '../services/memoryService';
import { assemblePrompt, generateAIResponse, evaluateConversation } from '../services/geminiService';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, setDoc, query, where, getDocs, limit, orderBy, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Send, MessageSquare, User as UserIcon, Bot, Sparkles, Clock, AlertCircle, RefreshCcw, ExternalLink, Video, Image as ImageIcon, BookOpen } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { AI_AVATAR_URL } from '../constants';
import { GenerateContentResponse } from '@google/genai';

interface AIChatProps {
  profile: UserProfile | null;
}

import Markdown from 'react-markdown';

export default function AIChat({ profile }: AIChatProps) {
  const { t } = useLanguage();
  const [session, setSession] = useState<ConversationSession | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [memory, setMemory] = useState<StudentMemory | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      if (!profile) return;
      
      try {
        // Get or create session
        const q = query(
          collection(db, 'conversations'), 
          where('studentId', '==', profile.uid),
          where('status', '==', 'active'),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        let activeSession: ConversationSession;
        
        if (querySnapshot.empty) {
          const sessionRef = doc(collection(db, 'conversations'));
          activeSession = {
            id: sessionRef.id,
            studentId: profile.uid,
            sceneMode: 'coach', // Default
            status: 'active'
          };
          await setDoc(sessionRef, activeSession);
        } else {
          activeSession = querySnapshot.docs[0].data() as ConversationSession;
        }
        
        setSession(activeSession);
        
        // Load history
        const history = await getConversationHistory(activeSession.id);
        setMessages(history);
        
        // Load memory
        const studentMemory = await getStudentMemory(profile.uid);
        setMemory(studentMemory);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'conversations/messages');
      }
    };
    initChat();
  }, [profile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !session || !profile || !memory) return;
    
    const studentMsg = await addConversationMessage(session.id, 'student', input);
    setMessages(prev => [...prev, studentMsg]);
    setInput('');
    setLoading(true);

    try {
      const { systemInstruction, contents } = assemblePrompt(
        session.sceneMode,
        memory,
        "General inquiry",
        messages,
        profile.displayName
      );
      
      const response = await generateAIResponse("gemini-3-flash-preview", systemInstruction, contents);
      
      // Extract grounding links if any
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const links = groundingChunks?.map(chunk => ({
        uri: chunk.web?.uri || chunk.maps?.uri,
        title: chunk.web?.title || chunk.maps?.title
      })).filter(link => link.uri) || [];

      let finalContent = response.text || t("aiProcessError");
      if (links.length > 0) {
        finalContent += "\n\n**参考资源:**\n" + links.map(l => `- [${l.title || l.uri}](${l.uri})`).join('\n');
      }

      const aiMsg = await addConversationMessage(session.id, 'ai', finalContent);
      setMessages(prev => [...prev, aiMsg]);

      // AI Self-Evaluation
      const evaluation = await evaluateConversation([...messages, studentMsg, aiMsg]);
      if (evaluation.needsAttention) {
        await addNotification(profile.uid, evaluation.type, evaluation.reason, session.id);
        if (evaluation.type === 'escalation') {
          // Update session status to escalated
          await setDoc(doc(db, 'conversations', session.id), { ...session, status: 'escalated' });
          setSession(prev => prev ? { ...prev, status: 'escalated' } : null);
          
          // Send escalation message
          const escalationMsg = await addConversationMessage(session.id, 'ai', t("escalationMessage"));
          setMessages(prev => [...prev, escalationMsg]);
        }
      }
    } catch (error) {
      console.error("AI Error:", error);
      const errorMsg = await addConversationMessage(session.id, 'system', t("aiCommError"));
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-200px)] flex flex-col bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 overflow-hidden">
            <img src={AI_AVATAR_URL} alt="AI" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              AI实训代教
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase rounded-full">{t('online')}</span>
            </h3>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              {t('mode_prefix')} {session?.sceneMode} {t('mode_suffix')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2.5 hover:bg-white rounded-xl text-slate-400 hover:text-indigo-600 transition-all border border-transparent hover:border-slate-100">
            <RefreshCcw className="w-5 h-5" />
          </button>
          <button className="p-2.5 hover:bg-white rounded-xl text-slate-400 hover:text-indigo-600 transition-all border border-transparent hover:border-slate-100">
            <Clock className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <MessageSquare className="w-10 h-10 text-slate-200" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">{t('start_chat')}</h4>
            <p className="text-slate-500 text-sm">{t('chat_desc')}</p>
          </div>
        )}
        
        {messages.filter(msg => msg.role !== 'teacher_silent').map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-4 ${msg.role === 'student' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm overflow-hidden ${
              msg.role === 'ai' ? 'bg-indigo-600' : 
              msg.role === 'student' ? 'bg-white border border-slate-200 text-slate-600' : 
              msg.role === 'teacher_visible' ? 'bg-blue-600 text-white' :
              'bg-rose-100 text-rose-600'
            }`}>
              {msg.role === 'ai' ? <img src={AI_AVATAR_URL} alt="AI" className="w-full h-full object-cover" /> : 
               msg.role === 'student' ? <UserIcon className="w-5 h-5" /> : 
               msg.role === 'teacher_visible' ? <MessageSquare className="w-5 h-5" /> :
               <AlertCircle className="w-5 h-5" />}
            </div>
            <div className={`max-w-[75%] space-y-1 ${msg.role === 'student' ? 'text-right' : ''}`}>
              <div className={`p-5 rounded-3xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'ai' ? 'bg-slate-50 text-slate-900 rounded-tl-none border border-slate-100' : 
                msg.role === 'student' ? 'bg-indigo-600 text-white rounded-tr-none' : 
                msg.role === 'teacher_visible' ? 'bg-blue-50 text-blue-900 rounded-tl-none border border-blue-100' :
                'bg-rose-50 text-rose-900 rounded-tl-none border border-rose-100'
              }`}>
                {msg.role === 'teacher_visible' && <div className="text-[10px] font-bold text-blue-500 uppercase mb-1">{t("teacherMessage")}</div>}
                <div className="markdown-body prose prose-sm max-w-none prose-slate">
                  <Markdown components={{
                    a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-1 font-bold" />
                  }}>
                    {msg.content}
                  </Markdown>
                </div>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
              <img src={AI_AVATAR_URL} alt="AI" className="w-full h-full object-cover animate-pulse" />
            </div>
            <div className="bg-slate-50 p-5 rounded-3xl rounded-tl-none border border-slate-100 flex gap-1">
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t border-slate-100 bg-slate-50/50">
        {session?.status === 'escalated' ? (
          <div className="text-center p-4 bg-rose-50 border border-rose-100 rounded-2xl">
            <p className="text-sm font-bold text-rose-600">{t("teacherNotified")}</p>
          </div>
        ) : (
          <div className="relative flex items-center gap-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={t('type_message')}
              className="flex-1 bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="p-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl shadow-lg shadow-indigo-100 transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        )}
        <p className="text-[10px] text-center text-slate-400 mt-4 font-bold uppercase tracking-widest">
          {t('ai_mistakes')}
        </p>
      </div>
    </div>
  );
}
