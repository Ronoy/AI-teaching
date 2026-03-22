import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Notification, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, AlertCircle, AlertTriangle, CheckCircle2, Clock, X, MessageSquare } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface NotificationCenterProps {
  profile: UserProfile | null;
}

export default function NotificationCenter({ profile }: NotificationCenterProps) {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) return;

    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const notifData = await Promise.all(snapshot.docs.map(async (d) => {
        const data = d.data() as Notification;
        // Fetch student name if not present
        if (!data.studentName) {
          const studentSnap = await getDoc(doc(db, 'users', data.studentId));
          return {
            ...data,
            studentName: studentSnap.exists() ? (studentSnap.data() as UserProfile).displayName : t("unknownStudent")
          };
        }
        return data;
      }));
      setNotifications(notifData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return () => unsubscribe();
  }, [profile]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { status: 'read' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const markAsProcessed = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { status: 'processed' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const unreadCount = notifications.filter(n => n.status === 'unread').length;
  const hasEscalation = notifications.some(n => n.type === 'escalation' && n.status !== 'processed');

  if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) return null;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-all shadow-sm"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white animate-pulse">
            {unreadCount}
          </span>
        )}
        {hasEscalation && (
          <span className="absolute -bottom-1 -left-1 w-3 h-3 bg-rose-600 rounded-full border-2 border-white" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-30" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-3 w-96 bg-white rounded-3xl border border-slate-200 shadow-2xl z-40 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  {t('notifications')}
                  {unreadCount > 0 && <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black uppercase rounded-full">{unreadCount} {t('new_notif')}</span>}
                </h3>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[480px] overflow-y-auto divide-y divide-slate-50">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`p-5 transition-colors ${notif.status === 'unread' ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}
                    >
                      <div className="flex gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          notif.type === 'escalation' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                          {notif.type === 'escalation' ? <AlertCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-slate-900 truncate">{notif.studentName}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{notif.reason}</p>
                          <div className="flex items-center gap-3 pt-2">
                            {notif.status !== 'processed' ? (
                              <>
                                <button 
                                  onClick={() => markAsProcessed(notif.id)}
                                  className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700"
                                >
                                  {t('mark_processed')}
                                </button>
                                {notif.status === 'unread' && (
                                  <button 
                                    onClick={() => markAsRead(notif.id)}
                                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600"
                                  >
                                    {t('mark_read')}
                                  </button>
                                )}
                              </>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                                <CheckCircle2 className="w-3 h-3" />
                                {t('processed')}
                              </span>
                            )}
                            {notif.sessionId && (
                              <button className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 ml-auto">
                                <MessageSquare className="w-3 h-3" />
                                {t('view_chat')}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bell className="w-8 h-8 text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-medium">{t('no_notif')}</p>
                  </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                  <button className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors">
                    {t('view_all')}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
