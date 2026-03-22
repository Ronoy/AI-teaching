import React, { useState, useEffect } from 'react';
import { auth, signInWithGoogle, db } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile, UserRole } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, BookOpen, PenTool, BarChart3, MessageSquare, LogOut, User as UserIcon, Settings, Menu, X, Languages, Bot, Users } from 'lucide-react';
import { useLanguage } from './context/LanguageContext';

// Components
import Dashboard from './components/Dashboard';
import PracticeModule from './components/PracticeModule';
import TheoryModule from './components/TheoryModule';
import AssessmentModule from './components/AssessmentModule';
import CompetencePortrait from './components/CompetencePortrait';
import AIChat from './components/AIChat';
import NotificationCenter from './components/NotificationCenter';
import TeacherAssistant from './components/TeacherAssistant';
import { AITeamDashboard } from './components/AITeamDashboard';
import TaskPreparation from './components/TaskPreparation';

import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

import { seedData } from './seed';

function AppContent() {
  const { t, language, setLanguage } = useLanguage();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          let currentProfile: UserProfile;
          if (docSnap.exists()) {
            currentProfile = docSnap.data() as UserProfile;
            // Force admin role for the specific user if not already
            if (firebaseUser.email === "huizhiruronoy@gmail.com" && currentProfile.role !== 'admin') {
              currentProfile.role = 'admin';
              await setDoc(docRef, currentProfile);
            }
          } else {
            // Create default profile for new user
            currentProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              role: firebaseUser.email === "huizhiruronoy@gmail.com" ? 'admin' : 'student',
              tenantId: 'default',
              avatarUrl: firebaseUser.photoURL || ''
            };
            await setDoc(docRef, currentProfile);
          }
          setProfile(currentProfile);

          // Seed data if admin and no data exists or wrong teacherId
          if (firebaseUser.email === "huizhiruronoy@gmail.com") {
            try {
              const classSnap = await getDoc(doc(db, 'classes', 'class1'));
              if (!classSnap.exists() || (classSnap.data() as any).teacherId !== firebaseUser.uid) {
                console.log("Auto-seeding data for admin (missing or wrong teacherId)...");
                await seedData(firebaseUser.uid);
              }
            } catch (e) {
              console.error("Seed check failed", e);
            }
          }
        } catch (error) {
          console.error("Error fetching profile", error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleRole = async () => {
    if (!profile || !user) return;
    const roles: UserRole[] = ['student', 'teacher', 'admin'];
    const currentIndex = roles.indexOf(profile.role);
    const nextRole = roles[(currentIndex + 1) % roles.length];
    
    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, { ...profile, role: nextRole });
      setProfile({ ...profile, role: nextRole });
      alert(`${t('roleSwitched')}${nextRole}`);
    } catch (error) {
      console.error("Error switching role", error);
      alert(t('roleSwitchFailed'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('appTitle')}</h1>
          <p className="text-slate-500 mb-8">{t('appSubtitle')}</p>
          <button
            onClick={signInWithGoogle}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-3"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" alt="Google" className="w-5 h-5" />
            {t('login_google')}
          </button>
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard, roles: ['student', 'teacher', 'admin'] },
    { id: 'task-prep', label: '任务备课', icon: BookOpen, roles: ['teacher', 'admin'] },
    { id: 'practice', label: t('practice'), icon: PenTool, roles: ['student', 'teacher', 'admin'] },
    { id: 'theory', label: t('theory'), icon: BookOpen, roles: ['student', 'teacher', 'admin'] },
    { id: 'assessment', label: t('assessment'), icon: BarChart3, roles: ['teacher', 'admin'] },
    { id: 'portrait', label: t('portrait'), icon: UserIcon, roles: ['student', 'teacher', 'admin'] },
    { id: 'ai-chat', label: t('chat'), icon: MessageSquare, roles: ['student', 'teacher', 'admin'] },
    { id: 'ai-team', label: t('ai_team'), icon: Users, roles: ['teacher', 'admin'] },
    { id: 'teacher-assistant', label: t('teacher_assistant'), icon: Bot, roles: ['teacher', 'admin'] },
  ];

  const filteredNavItems = navItems.filter(item => profile && item.roles.includes(profile.role));

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="bg-white border-r border-slate-200 flex flex-col sticky top-0 h-screen z-20"
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 font-bold text-indigo-600 text-xl"
            >
              <BookOpen className="w-6 h-6" />
              <span>{t('aiLearn')}</span>
            </motion.div>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className={`flex items-center gap-3 px-4 py-3 ${isSidebarOpen ? '' : 'justify-center'}`}>
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
              <img src={profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} alt="Avatar" />
            </div>
                {isSidebarOpen && (
                  <div className="flex-1 min-w-0 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 truncate">{profile?.displayName}</p>
                      <p className="text-xs text-slate-500 truncate capitalize">{t(`role_${profile?.role}`)}</p>
                    </div>
                    {user?.email === 'huizhiruronoy@gmail.com' && (
                      <button 
                        onClick={toggleRole}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Switch Role"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
          </div>
          <button
            onClick={() => auth.signOut()}
            className={`w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all mt-2 ${isSidebarOpen ? '' : 'justify-center'}`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="font-medium">{t('logout')}</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 capitalize">
            {navItems.find(i => i.id === activeTab)?.label}
          </h2>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
              className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-white hover:text-indigo-600 transition-all text-xs font-bold uppercase tracking-wider"
            >
              <Languages className="w-4 h-4" />
              {language === 'zh' ? 'English' : '中文'}
            </button>
            <NotificationCenter profile={profile} />
            {user?.email === 'huizhiruronoy@gmail.com' && (
              <button 
                onClick={toggleRole}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-all flex items-center gap-2"
                title={t('switch_role')}
              >
                <Settings className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">{t('switch_role')}</span>
              </button>
            )}
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <Dashboard profile={profile} />}
              {activeTab === 'task-prep' && <TaskPreparation />}
              {activeTab === 'practice' && <PracticeModule profile={profile} />}
              {activeTab === 'theory' && <TheoryModule profile={profile} />}
              {activeTab === 'assessment' && <AssessmentModule profile={profile} />}
              {activeTab === 'portrait' && <CompetencePortrait profile={profile} />}
              {activeTab === 'ai-chat' && <AIChat profile={profile} />}
              {activeTab === 'ai-team' && profile && <AITeamDashboard user={profile} classId="class1" onStudentSelect={(id) => console.log(id)} />}
              {activeTab === 'teacher-assistant' && profile && <TeacherAssistant profile={profile} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
