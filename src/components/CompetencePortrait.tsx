import React, { useState, useEffect } from 'react';
import { UserProfile, CompetencePoint } from '../types';
import { getCompetencePoints, calculateCompetencePortrait } from '../services/competenceService';
import { motion } from 'motion/react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, Target, Award, AlertCircle, ChevronRight, Info, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface CompetencePortraitProps {
  profile: UserProfile | null;
}

export default function CompetencePortrait({ profile }: CompetencePortraitProps) {
  const { t } = useLanguage();
  const [competencePoints, setCompetencePoints] = useState<CompetencePoint[]>([]);
  const [portraitData, setPortraitData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      const points = await getCompetencePoints();
      setCompetencePoints(points);
      
      const portrait = await calculateCompetencePortrait(profile.uid, points);
      const data = points.map(p => ({
        subject: p.name,
        A: portrait[p.id] || 0,
        fullMark: 100
      }));
      setPortraitData(data);
      setLoading(false);
    };
    fetchData();
  }, [profile]);

  if (loading) return <div>{t('loading')}</div>;

  const weakPoints = portraitData.filter(d => d.A < 60).sort((a, b) => a.A - b.A);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t("competencePortraitTitle")}</h1>
          <p className="text-slate-500 mt-1">{t("competencePortraitDesc")}</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            {t("downloadReport")}
          </button>
          <button className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100">
            {t("sharePortfolio")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[500px]"
        >
          <h3 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-2">
            <Target className="w-6 h-6 text-indigo-600" />
            {t("skillRadar")}
          </h3>
          <div className="w-full h-full max-h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={portraitData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Competence"
                  dataKey="A"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  fill="#4f46e5"
                  fillOpacity={0.3}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-4">
                <Award className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t("overallMastery")}</p>
              <p className="text-3xl font-black text-slate-900 mt-1">
                {(portraitData.reduce((acc, d) => acc + d.A, 0) / portraitData.length).toFixed(1)}%
              </p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t("growthRate")}</p>
              <p className="text-3xl font-black text-slate-900 mt-1">+12.5%</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-rose-500" />
              {t("weakAreasInsights")}
            </h3>
            <div className="space-y-4">
              {weakPoints.length > 0 ? (
                weakPoints.map((point, i) => (
                  <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-indigo-200 transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-bold text-rose-600 border border-slate-100">
                        {point.A.toFixed(0)}%
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{t(point.subject)}</p>
                        <p className="text-xs text-slate-500">{t("needsImprovement")}</p>
                      </div>
                    </div>
                    <button className="p-2 text-slate-400 group-hover:text-indigo-600 transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-slate-400">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-200" />
                  <p className="font-medium">{t("allOnTrack")}</p>
                </div>
              )}
            </div>
            <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-4">
              <Info className="w-6 h-6 text-indigo-600 shrink-0 mt-1" />
              <div>
                <p className="font-bold text-indigo-900 text-sm">{t("aiSuggestion")}</p>
                <p className="text-indigo-700 text-sm mt-1 leading-relaxed">
                  {t("aiSuggestionPrefix")} <strong>{t(weakPoints[0]?.subject || "advancedModules")}</strong>{t("aiSuggestionSuffix")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
