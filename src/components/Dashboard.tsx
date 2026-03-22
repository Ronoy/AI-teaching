import React, { useState, useEffect } from 'react';
import { UserProfile, PracticeSession } from '../types';
import { getStudentSessions } from '../services/practiceService';
import { motion } from 'motion/react';
import { TrendingUp, CheckCircle2, Clock, AlertCircle, ArrowRight, PenTool, BarChart3 } from 'lucide-react';

import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useLanguage } from '../context/LanguageContext';

interface DashboardProps {
  profile: UserProfile | null;
}

export default function Dashboard({ profile }: DashboardProps) {
  const { t, language } = useLanguage();
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAlerts, setHasAlerts] = useState(false);

  useEffect(() => {
    if (!profile) return;

    if (profile.role === 'teacher' || profile.role === 'admin') {
      const q = query(
        collection(db, 'notifications'),
        where('status', '==', 'unread')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setHasAlerts(!snapshot.empty);
      });
      return () => unsubscribe();
    }
  }, [profile]);

  useEffect(() => {
    if (profile && profile.role === 'student') {
      getStudentSessions(profile.uid)
        .then(data => {
          setSessions(data);
        })
        .catch(err => {
          console.error("Dashboard error:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [profile]);

  if (loading) return <div>{t('loading')}</div>;

  const stats = [
    { label: t('completed_projects'), value: sessions.filter(s => s.status === 'completed' || s.status === 'graded').length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: t('active_sessions'), value: sessions.filter(s => s.status === 'active').length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: t('avg_score'), value: sessions.filter(s => s.totalScore).length > 0 ? (sessions.reduce((acc, s) => acc + (s.totalScore || 0), 0) / sessions.filter(s => s.totalScore).length).toFixed(1) : 'N/A', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: t('pending_feedback'), value: sessions.filter(s => s.status === 'completed').length, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            {t('welcome')}, {profile?.displayName}!
            {(profile?.role === 'teacher' || profile?.role === 'admin') && (
              <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full shadow-sm">
                <div className={`w-2 h-2 rounded-full ${hasAlerts ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {t('ai_status')}: {hasAlerts ? t('status_alert') : t('status_normal')}
                </span>
              </div>
            )}
          </h1>
          <p className="text-slate-500 mt-1">{t('journey_desc')}</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200">
          <Clock className="w-4 h-4" />
          <span>{new Date().toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
          >
            <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center mb-4`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">{t('recent_activity')}</h2>
            <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              {t('view_all')} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {sessions.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {sessions.slice(0, 5).map((session) => (
                  <div key={session.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                        <PenTool className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{t('practice')}: {session.projectId}</p>
                        <p className="text-sm text-slate-500">{new Date(session.startTime).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        session.status === 'active' ? 'bg-amber-100 text-amber-700' :
                        session.status === 'completed' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {t(`status_${session.status}`)}
                      </span>
                      {session.totalScore && (
                        <span className="font-bold text-slate-900">{session.totalScore}%</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PenTool className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500">{t('no_recent_activity')}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">{t('competence_overview')}</h2>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[400px] flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 text-sm">{t('competence_radar_placeholder')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
