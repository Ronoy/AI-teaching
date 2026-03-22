import React, { useState, useEffect } from 'react';
import { UserProfile, PracticeSession, PracticeProject } from '../types';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { gradeSession } from '../services/practiceService';
import { motion } from 'motion/react';
import { CheckCircle2, Clock, AlertCircle, User as UserIcon, Star, Filter, Search, ChevronRight } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

interface AssessmentModuleProps {
  profile: UserProfile | null;
}

export default function AssessmentModule({ profile }: AssessmentModuleProps) {
  const { t, language } = useLanguage();
  const [sessions, setSessions] = useState<(PracticeSession & { studentName?: string, projectName?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<(PracticeSession & { studentName?: string, projectName?: string }) | null>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const q = query(collection(db, 'practice_sessions'), where('status', '==', 'completed'));
        const querySnapshot = await getDocs(q);
        const sessionData = await Promise.all(querySnapshot.docs.map(async (d) => {
          const data = d.data() as PracticeSession;
          // Fetch student name
          const studentSnap = await getDoc(doc(db, 'users', data.studentId));
          const projectSnap = await getDoc(doc(db, 'projects', data.projectId));
          return {
            ...data,
            studentName: studentSnap.exists() ? (studentSnap.data() as UserProfile).displayName : 'Unknown',
            projectName: projectSnap.exists() ? (projectSnap.data() as PracticeProject).name : 'Unknown'
          };
        }));
        setSessions(sessionData);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'practice_sessions');
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  const handleGrade = async () => {
    if (!selectedSession) return;
    await gradeSession(selectedSession.id, score);
    setSessions(sessions.filter(s => s.id !== selectedSession.id));
    setSelectedSession(null);
    alert(t("gradingSubmitted"));
  };

  if (loading) return <div>{t('loading')}</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder={t("searchStudents")} 
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4" />
            {t("filter")}
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100">
            <Star className="w-4 h-4" />
            {t("configureWeights")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-slate-900">{t("pendingAssessments")}</h2>
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            {sessions.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {sessions.map((session) => (
                  <div 
                    key={session.id} 
                    onClick={() => setSelectedSession(session)}
                    className={`p-6 flex items-center justify-between hover:bg-slate-50 transition-all cursor-pointer group ${selectedSession?.id === session.id ? 'bg-indigo-50/50 border-l-4 border-l-indigo-600' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0">
                        <UserIcon className="w-6 h-6 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{session.studentName}</p>
                        <p className="text-sm text-slate-500">{session.projectName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t("submitted")}</p>
                        <p className="text-sm font-medium text-slate-700">{new Date(session.endTime || '').toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US')}</p>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-all ${selectedSession?.id === session.id ? 'translate-x-1 text-indigo-600' : ''}`} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-16 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-slate-200" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{t("allCaughtUp")}</h3>
                <p className="text-slate-500">{t("noPendingAssessments")}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">{t("gradingPanel")}</h2>
          <AnimatePresence mode="wait">
            {selectedSession ? (
              <motion.div
                key={selectedSession.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-8"
              >
                <div className="text-center">
                  <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <Star className="w-10 h-10 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedSession.studentName}</h3>
                  <p className="text-sm text-slate-500 mt-1">{selectedSession.projectName}</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">{t("finalScore")}</label>
                    <span className="text-2xl font-black text-indigo-600">{score}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={score} 
                    onChange={(e) => setScore(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>0</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">{t("teachersFeedback")}</label>
                  <textarea 
                    placeholder={t("addComments")} 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px]"
                  />
                </div>

                <button 
                  onClick={handleGrade}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 transition-all"
                >
                  {t("submitGrade")}
                </button>
              </motion.div>
            ) : (
              <div className="bg-slate-50 p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">{t("selectStudentToGrade")}</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
