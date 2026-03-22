import React, { useState, useEffect } from 'react';
import { UserProfile, KnowledgeNode, Question } from '../types';
import { getKnowledgeNodes, getAdaptiveQuestion, recordAnswer } from '../services/theoryService';
import { addNotification } from '../services/memoryService';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, CheckCircle2, ChevronRight, ArrowLeft, HelpCircle, Trophy, AlertCircle } from 'lucide-react';

interface TheoryModuleProps {
  profile: UserProfile | null;
}

export default function TheoryModule({ profile }: TheoryModuleProps) {
  const { t } = useLanguage();
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [activeNode, setActiveNode] = useState<KnowledgeNode | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [difficulty, setDifficulty] = useState(1);
  const [history, setHistory] = useState<{ isCorrect: boolean; difficulty: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  useEffect(() => {
    getKnowledgeNodes('ROBOT101')
      .then(data => {
        setNodes(data);
      })
      .catch(err => {
        console.error("TheoryModule error:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleStartNode = async (node: KnowledgeNode) => {
    setActiveNode(node);
    setHistory([]);
    setDifficulty(1);
    const { question, nextDifficulty } = await getAdaptiveQuestion(node.id, 1, []);
    setCurrentQuestion(question);
    setDifficulty(nextDifficulty);
  };

  const handleSubmitAnswer = async () => {
    if (!profile || !activeNode || !currentQuestion || !selectedOption) return;
    
    const isCorrect = selectedOption === currentQuestion.answer;
    const newHistory = [...history, { isCorrect, difficulty }];
    setHistory(newHistory);
    setIsAnswered(true);

    // Check for 3 consecutive wrong answers
    if (newHistory.length >= 3) {
      const lastThree = newHistory.slice(-3);
      if (lastThree.every(h => !h.isCorrect)) {
        addNotification(
          profile.uid,
          'warning',
          `Student answered incorrectly 3 times in a row on knowledge node "${activeNode.name}".`
        );
      }
    }

    await recordAnswer(
      profile.uid,
      activeNode.id,
      currentQuestion.id,
      selectedOption,
      isCorrect,
      10 // Placeholder time spent
    );
  };

  const handleNextQuestion = async () => {
    if (!activeNode) return;
    
    setIsAnswered(false);
    setSelectedOption(null);
    
    const { question, nextDifficulty } = await getAdaptiveQuestion(activeNode.id, difficulty, history);
    if (!question) {
      alert(t("nodeMastered"));
      setActiveNode(null);
    } else {
      setCurrentQuestion(question);
      setDifficulty(nextDifficulty);
    }
  };

  if (loading) return <div>{t('loading')}</div>;

  if (activeNode && currentQuestion) {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => { setActiveNode(null); setCurrentQuestion(null); }}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("backToMap")}
          </button>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-500">{t("difficulty")}</p>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3].map(d => (
                  <div key={d} className={`w-6 h-1.5 rounded-full ${d <= difficulty ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <motion.div 
          key={currentQuestion.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden"
        >
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-wider">
                {t("question")} {history.length + 1}
              </span>
              <span className="flex items-center gap-1 text-slate-500 text-sm font-medium">
                <HelpCircle className="w-4 h-4" />
                {currentQuestion.type}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 leading-relaxed">{t(currentQuestion.content)}</h2>
          </div>

          <div className="p-8 space-y-4">
            {currentQuestion.options?.map((option, i) => (
              <button
                key={i}
                disabled={isAnswered}
                onClick={() => setSelectedOption(option)}
                className={`w-full p-5 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${
                  selectedOption === option 
                    ? (isAnswered 
                        ? (option === currentQuestion.answer ? 'border-emerald-500 bg-emerald-50' : 'border-rose-500 bg-rose-50')
                        : 'border-indigo-600 bg-indigo-50')
                    : (isAnswered && option === currentQuestion.answer ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50')
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                    selectedOption === option ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className={`font-medium ${selectedOption === option ? 'text-indigo-900' : 'text-slate-700'}`}>
                    {t(option)}
                  </span>
                </div>
                {isAnswered && option === currentQuestion.answer && (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                )}
                {isAnswered && selectedOption === option && option !== currentQuestion.answer && (
                  <AlertCircle className="w-6 h-6 text-rose-500" />
                )}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {isAnswered && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="px-8 pb-8"
              >
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="font-bold text-slate-900 mb-2">{t("explanation")}</h4>
                  <p className="text-slate-600 text-sm leading-relaxed">{t(currentQuestion.explanation)}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
            {!isAnswered ? (
              <button
                disabled={!selectedOption}
                onClick={handleSubmitAnswer}
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 transition-all"
              >
                {t("submitAnswer")}
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all"
              >
                {t("nextQuestion")}
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {nodes.map((node) => (
          <motion.div
            key={node.id}
            whileHover={{ y: -5 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
          >
            <div className="p-8 flex-1">
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full uppercase tracking-wider">
                  {node.courseId}
                </span>
                <span className="flex items-center gap-1 text-slate-500 text-sm font-medium">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  {node.masteryThreshold * 100}%
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{t(node.name)}</h3>
              <p className="text-slate-500 text-sm line-clamp-3 leading-relaxed">
                {t(node.description)}
              </p>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => handleStartNode(node)}
                className="w-full py-3 bg-white hover:bg-indigo-600 hover:text-white text-indigo-600 border border-indigo-100 font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                {t("startLearning")}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
