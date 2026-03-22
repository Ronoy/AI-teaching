import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, Activity, TrendingUp, TrendingDown, Minus, AlertCircle, MessageSquare, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { UserProfile } from '../types';
import { getAITeamDashboardData, StudentDashboardCard } from '../services/aiTeamService';
import { TeacherInterventionPanel } from './TeacherInterventionPanel';

interface AITeamDashboardProps {
  user: UserProfile;
  classId: string;
  onStudentSelect: (studentId: string) => void;
}

export const AITeamDashboard: React.FC<AITeamDashboardProps> = ({ user, classId, onStudentSelect }) => {
  const { t } = useLanguage();
  const [students, setStudents] = useState<StudentDashboardCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'alert' | 'active'>('all');
  const [interventionStudent, setInterventionStudent] = useState<{ id: string, mode: 'silent' | 'transparent' } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getAITeamDashboardData(user.uid, classId);
        setStudents(data);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // In a real app, we'd set up listeners here for real-time updates
  }, [user.uid, classId]);

  const filteredStudents = students.filter(s => {
    if (filter === 'alert') return s.alertLevel === 'red' || s.alertLevel === 'yellow';
    if (filter === 'active') return s.activityStatus !== 'idle';
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'practicing': return 'text-blue-500 bg-blue-50';
      case 'training': return 'text-purple-500 bg-purple-50';
      case 'assessing': return 'text-orange-500 bg-orange-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'red': return 'bg-red-500';
      case 'yellow': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Users className="w-6 h-6 mr-2 text-indigo-600" />
          {t('aiTeamDashboard')}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              const fetchData = async () => {
                setLoading(true);
                try {
                  const data = await getAITeamDashboardData(user.uid, classId);
                  setStudents(data);
                } catch (error) {
                  console.error("Failed to fetch dashboard data:", error);
                } finally {
                  setLoading(false);
                }
              };
              fetchData();
            }}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            {t('refresh')}
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            {t('allStudents')}
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            {t('activeOnly')}
          </button>
          <button
            onClick={() => setFilter('alert')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'alert' ? 'bg-red-100 text-red-700' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            {t('needsAttention')}
          </button>
        </div>
      </div>

      {filteredStudents.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <Users className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('noStudentsFound')}</h3>
          <p className="text-gray-500 max-w-sm mb-8">
            {t('noStudentsDesc')}
          </p>
          {(user.role === 'admin' || user.role === 'teacher') && (
            <button
              onClick={async () => {
                setLoading(true);
                const { seedData } = await import('../seed');
                await seedData(user.uid);
                const data = await getAITeamDashboardData(user.uid, classId);
                setStudents(data);
                setLoading(false);
              }}
              className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Activity className="w-5 h-5" />
              {t('generateSampleData')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pb-6">
          {filteredStudents.map((student) => (
            <motion.div
              key={student.userId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-xl shadow-sm border-l-4 p-5 cursor-pointer hover:shadow-md transition-shadow ${
                student.alertLevel === 'red' ? 'border-red-500' : 
                student.alertLevel === 'yellow' ? 'border-yellow-500' : 'border-green-500'
              }`}
              onClick={() => onStudentSelect(student.userId)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    {student.avatarUrl ? (
                      <img src={student.avatarUrl} alt={student.name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                        {student.name.charAt(0)}
                      </div>
                    )}
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${getAlertColor(student.alertLevel)}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{student.name === 'Unknown Student' ? t('unknownStudent') : student.name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(student.activityStatus)}`}>
                        {t(student.activityStatus)}
                      </span>
                      {getTrendIcon(student.competencyTrend)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 line-clamp-2 h-12">
                {student.recentSummary === 'No recent interactions.' ? t('noRecentInteractions') : student.recentSummary}
              </div>

              <div className="mt-4 flex justify-end space-x-2">
                <button 
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title={t('silentIntervention')}
                  onClick={(e) => { e.stopPropagation(); setInterventionStudent({ id: student.userId, mode: 'silent' }); }}
                >
                  <EyeOff className="w-4 h-4" />
                </button>
                <button 
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title={t('transparentIntervention')}
                  onClick={(e) => { e.stopPropagation(); setInterventionStudent({ id: student.userId, mode: 'transparent' }); }}
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {interventionStudent && (
        <TeacherInterventionPanel
          studentId={interventionStudent.id}
          teacherProfile={user}
          initialMode={interventionStudent.mode}
          onClose={() => setInterventionStudent(null)}
        />
      )}
    </div>
  );
};
