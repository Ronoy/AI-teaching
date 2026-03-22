import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Send, EyeOff, MessageSquare, User as UserIcon, Bot, AlertCircle, CheckCircle2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AI_AVATAR_URL } from '../constants';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, setDoc, updateDoc, getDocs } from 'firebase/firestore';
import { ConversationMessage, ConversationSession, UserProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { addConversationMessage } from '../services/memoryService';

interface TeacherInterventionPanelProps {
  studentId: string;
  teacherProfile: UserProfile;
  onClose: () => void;
  initialMode?: 'silent' | 'transparent';
}

export const TeacherInterventionPanel: React.FC<TeacherInterventionPanelProps> = ({ studentId, teacherProfile, onClose, initialMode = 'silent' }) => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [session, setSession] = useState<ConversationSession | null>(null);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'silent' | 'transparent'>(initialMode);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sessionQuery = query(
      collection(db, 'conversations'),
      where('studentId', '==', studentId),
      where('status', 'in', ['active', 'escalated'])
    );

    const unsubSession = onSnapshot(sessionQuery, (snapshot) => {
      if (!snapshot.empty) {
        setSession(snapshot.docs[0].data() as ConversationSession);
      } else {
        setSession(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'conversations');
    });

    return () => unsubSession();
  }, [studentId]);

  useEffect(() => {
    if (!session) return;

    const messagesQuery = query(
      collection(db, 'messages'),
      where('sessionId', '==', session.id),
      orderBy('createdAt', 'asc')
    );

    const unsubMessages = onSnapshot(messagesQuery, (snapshot) => {
      setMessages(snapshot.docs.map(d => d.data() as ConversationMessage));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    });

    return () => unsubMessages();
  }, [session]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !session) return;

    const role = mode === 'silent' ? 'teacher_silent' : 'teacher_visible';
    await addConversationMessage(session.id, role, input, { teacherId: teacherProfile.uid });
    setInput('');
  };

  const handleResolve = async () => {
    if (!session) return;
    try {
      await updateDoc(doc(db, 'conversations', session.id), { status: 'active' });
      // Also update alert_records to resolved
      const alertsQuery = query(
        collection(db, 'alert_records'),
        where('studentId', '==', studentId),
        where('status', 'in', ['pending', 'acknowledged'])
      );
      const alertsSnap = await getDocs(alertsQuery);
      alertsSnap.docs.forEach(async (d) => {
        await updateDoc(doc(db, 'alert_records', d.id), { status: 'resolved', resolvedAt: new Date().toISOString() });
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `conversations/${session.id}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-slate-900">{t("interventionStudent")} {studentId.substring(0, 6)}</h3>
            {session?.status === 'escalated' && (
              <button
                onClick={handleResolve}
                className="px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                {t("resolveEscalation")}
              </button>
            )}
            <div className="flex bg-white rounded-lg p-1 border border-slate-200">
              <button
                onClick={() => setMode('silent')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${mode === 'silent' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <EyeOff className="w-4 h-4" />
                {t('silentIntervention')}
              </button>
              <button
                onClick={() => setMode('transparent')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${mode === 'transparent' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <MessageSquare className="w-4 h-4" />
                {t('transparentIntervention')}
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {!session ? (
            <div className="h-full flex items-center justify-center text-slate-500">
              {t("noActiveSession")}
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'student' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden ${
                  msg.role === 'ai' ? 'bg-indigo-600' :
                  msg.role === 'student' ? 'bg-white border border-slate-200 text-slate-600' :
                  msg.role === 'teacher_silent' ? 'bg-purple-100 text-purple-600 border border-purple-200' :
                  msg.role === 'teacher_visible' ? 'bg-blue-600 text-white' :
                  'bg-slate-200 text-slate-600'
                }`}>
                  {msg.role === 'ai' ? <img src={AI_AVATAR_URL} alt="AI" className="w-full h-full object-cover" /> :
                   msg.role === 'student' ? <UserIcon className="w-4 h-4" /> :
                   msg.role === 'teacher_silent' ? <EyeOff className="w-4 h-4" /> :
                   msg.role === 'teacher_visible' ? <MessageSquare className="w-4 h-4" /> :
                   <AlertCircle className="w-4 h-4" />}
                </div>
                <div className={`max-w-[70%] ${msg.role === 'student' ? 'text-right' : ''}`}>
                  <div className={`p-3 rounded-2xl text-sm ${
                    msg.role === 'ai' ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-none' :
                    msg.role === 'student' ? 'bg-indigo-600 text-white rounded-tr-none' :
                    msg.role === 'teacher_silent' ? 'bg-purple-50 border border-purple-100 text-purple-900 rounded-tl-none' :
                    msg.role === 'teacher_visible' ? 'bg-blue-50 border border-blue-100 text-blue-900 rounded-tl-none' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {msg.role === 'teacher_silent' && <div className="text-[10px] font-bold text-purple-500 uppercase mb-1">{t("hiddenInstruction")}</div>}
                    {msg.role === 'teacher_visible' && <div className="text-[10px] font-bold text-blue-500 uppercase mb-1">{t("teacherMessage")}</div>}
                    {msg.content}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={mode === 'silent' ? t("enterHiddenInstruction") : t("typeMessageToStudent")}
              className={`flex-1 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all ${
                mode === 'silent' ? 'border-purple-200 focus:ring-purple-500 bg-purple-50/30' : 'border-blue-200 focus:ring-blue-500 bg-blue-50/30'
              }`}
              disabled={!session}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || !session}
              className={`p-3 text-white rounded-xl transition-all disabled:opacity-50 ${
                mode === 'silent' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
