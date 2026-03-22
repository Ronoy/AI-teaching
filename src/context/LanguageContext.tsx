import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'zh' | 'en';

interface Translations {
  [key: string]: {
    zh: string;
    en: string;
  };
}

export const translations: Translations = {
  // Sidebar & Navigation
  dashboard: { zh: '仪表盘', en: 'Dashboard' },
  theory: { zh: '理论学习', en: 'Theory' },
  practice: { zh: '实践项目', en: 'Practice' },
  portrait: { zh: '个人画像', en: 'Portrait' },
  chat: { zh: 'AI 助手', en: 'AI Chat' },
  assessment: { zh: '评估', en: 'Assessment' },
  logout: { zh: '退出登录', en: 'Logout' },
  
  // Dashboard
  welcome: { zh: '欢迎回来', en: 'Welcome back' },
  journey_desc: { zh: '这是你今天的学习旅程动态。', en: "Here's what's happening with your learning journey today." },
  completed_projects: { zh: '已完成项目', en: 'Completed Projects' },
  active_sessions: { zh: '进行中会话', en: 'Active Sessions' },
  avg_score: { zh: '平均分', en: 'Average Score' },
  pending_feedback: { zh: '待反馈', en: 'Pending Feedback' },
  recent_activity: { zh: '最近活动', en: 'Recent Activity' },
  view_all: { zh: '查看全部', en: 'View All' },
  competence_overview: { zh: '能力概览', en: 'Competence Overview' },
  ai_status: { zh: 'AI 团队状态', en: 'AI Team Status' },
  status_normal: { zh: '正常', en: 'Normal' },
  status_alert: { zh: '预警', en: 'Alert' },

  // Chat
  start_chat: { zh: '开始对话', en: 'Start a conversation' },
  chat_desc: { zh: '问我任何关于实践项目或理论练习的问题。', en: 'Ask me anything about your practice project or theory exercises.' },
  type_message: { zh: '输入消息...', en: 'Type your message here...' },
  ai_mistakes: { zh: 'AI 可能会犯错。请核实重要信息。', en: 'AI can make mistakes. Check important info.' },
  online: { zh: '在线', en: 'Online' },
  mode_prefix: { zh: '当前处于', en: 'Currently in' },
  mode_suffix: { zh: '模式', en: 'mode' },

  // Auth & Roles
  switch_role: { zh: '切换角色', en: 'Switch Role' },
  login_google: { zh: '使用 Google 登录', en: 'Sign in with Google' },
  role_student: { zh: '学生', en: 'Student' },
  role_teacher: { zh: '教师', en: 'Teacher' },
  role_admin: { zh: '管理员', en: 'Admin' },

  // Notifications
  notifications: { zh: '通知', en: 'Notifications' },
  new_notif: { zh: '条新通知', en: 'New' },
  no_notif: { zh: '暂无通知', en: 'No notifications yet' },
  mark_read: { zh: '标记已读', en: 'Mark Read' },
  mark_processed: { zh: '标记已处理', en: 'Mark Processed' },
  view_chat: { zh: '查看聊天', en: 'View Chat' },
  processed: { zh: '已处理', en: 'Processed' },
  teacher_assistant: { zh: '教师 AI 助手', en: 'Teacher AI Assistant' },
  teacher_assistant_desc: { zh: '分析班级数据、学生进度并生成报告。', en: 'Analyze class data, student progress, and generate reports.' },
  analyze_class: { zh: '班级分析', en: 'Analyze Class' },
  generate_report: { zh: '生成报告', en: 'Generate Report' },
  student_deep_dive: { zh: '个体深入', en: 'Student Deep Dive' },
  class_id_placeholder: { zh: '输入班级 ID (如: class1)', en: 'Enter Class ID (e.g., class1)' },
  
  // AI Team Dashboard
  aiTeamDashboard: { zh: 'AI 团队仪表盘', en: 'AI Team Dashboard' },
  allStudents: { zh: '全部学生', en: 'All Students' },
  activeOnly: { zh: '仅活跃', en: 'Active Only' },
  needsAttention: { zh: '需关注', en: 'Needs Attention' },
  practicing: { zh: '练习中', en: 'Practicing' },
  training: { zh: '实训中', en: 'Training' },
  assessing: { zh: '考核中', en: 'Assessing' },
  idle: { zh: '空闲', en: 'Idle' },
  silentIntervention: { zh: '静默介入', en: 'Silent Intervention' },
  transparentIntervention: { zh: '透明介入', en: 'Transparent Intervention' },
  ai_team: { zh: 'AI 指挥官', en: 'AI Commander' },
  resolveEscalation: { zh: '解决升级', en: 'Resolve Escalation' },

  // Practice & Theory Data
  "Basic Electronics Assembly": { zh: "基础电子组装", en: "Basic Electronics Assembly" },
  "Learn to identify components and assemble a basic circuit on a breadboard.": { zh: "学习识别元件并在面包板上组装基础电路。", en: "Learn to identify components and assemble a basic circuit on a breadboard." },
  "Component Identification": { zh: "元件识别", en: "Component Identification" },
  "Identify 220 ohm resistor": { zh: "识别220欧姆电阻", en: "Identify 220 ohm resistor" },
  "Identify LED polarity": { zh: "识别LED极性", en: "Identify LED polarity" },
  "Breadboard Assembly": { zh: "面包板组装", en: "Breadboard Assembly" },
  "Correct series connection": { zh: "正确的串联连接", en: "Correct series connection" },
  "Power supply connected correctly": { zh: "电源连接正确", en: "Power supply connected correctly" },
  "Python Data Analysis": { zh: "Python数据分析", en: "Python Data Analysis" },
  "Analyze a CSV dataset using Pandas and generate a basic plot.": { zh: "使用Pandas分析CSV数据集并生成基础图表。", en: "Analyze a CSV dataset using Pandas and generate a basic plot." },
  "Environment Setup": { zh: "环境搭建", en: "Environment Setup" },
  "Data Loading": { zh: "数据加载", en: "Data Loading" },

  "Ohm's Law": { zh: "欧姆定律", en: "Ohm's Law" },
  "Understanding the relationship between Voltage, Current, and Resistance.": { zh: "理解电压、电流和电阻之间的关系。", en: "Understanding the relationship between Voltage, Current, and Resistance." },
  "What is the unit of Resistance?": { zh: "电阻的单位是什么？", en: "What is the unit of Resistance?" },
  "Volt": { zh: "伏特", en: "Volt" },
  "Ampere": { zh: "安培", en: "Ampere" },
  "Ohm": { zh: "欧姆", en: "Ohm" },
  "Watt": { zh: "瓦特", en: "Watt" },
  "Resistance is measured in Ohms (Ω).": { zh: "电阻以欧姆（Ω）为单位测量。", en: "Resistance is measured in Ohms (Ω)." },
  "If Voltage is 10V and Resistance is 5Ω, what is the Current?": { zh: "如果电压是10V，电阻是5Ω，电流是多少？", en: "If Voltage is 10V and Resistance is 5Ω, what is the Current?" },
  "2A": { zh: "2A", en: "2A" },
  "50A": { zh: "50A", en: "50A" },
  "0.5A": { zh: "0.5A", en: "0.5A" },
  "15A": { zh: "15A", en: "15A" },
  "I = V / R = 10 / 5 = 2A.": { zh: "I = V / R = 10 / 5 = 2A。", en: "I = V / R = 10 / 5 = 2A." },

  // Practice UI
  "backToProjects": { zh: "返回项目列表", en: "Back to Projects" },
  "progress": { zh: "进度", en: "Progress" },
  "step": { zh: "步骤", en: "Step" },
  "mins": { zh: "分钟", en: "mins" },
  "instructions": { zh: "操作说明", en: "Instructions" },
  "instructionsDesc": { zh: "请遵循此步骤的操作标准。在继续之前，请确保满足所有安全协议。", en: "Please follow the operational standards for this step. Ensure all safety protocols are met before proceeding." },
  "checklist": { zh: "检查清单", en: "Checklist" },
  "critical": { zh: "关键", en: "Critical" },
  "submission": { zh: "提交", en: "Submission" },
  "uploadPhoto": { zh: "点击上传作品照片", en: "Click to upload photo of your work" },
  "requiredVerification": { zh: "验证所需", en: "Required for verification" },
  "completeProject": { zh: "完成项目", en: "Complete Project" },
  "nextStep": { zh: "下一步", en: "Next Step" },
  "startProject": { zh: "开始项目", en: "Start Project" },
  "projectCompleted": { zh: "项目已完成！等待教师评分。", en: "Project completed! Awaiting teacher grading." },

  // Theory UI
  "backToMap": { zh: "返回图谱", en: "Back to Map" },
  "difficulty": { zh: "难度", en: "Difficulty" },
  "question": { zh: "问题", en: "Question" },
  "explanation": { zh: "解析", en: "Explanation" },
  "submitAnswer": { zh: "提交答案", en: "Submit Answer" },
  "nextQuestion": { zh: "下一题", en: "Next Question" },
  "startLearning": { zh: "开始学习", en: "Start Learning" },
  "nodeMastered": { zh: "知识点已掌握！正在解锁下一个知识点...", en: "Knowledge node mastered! Unlocking next node..." },

  // Assessment UI
  "searchStudents": { zh: "搜索学生或项目...", en: "Search students or projects..." },
  "filter": { zh: "筛选", en: "Filter" },
  "configureWeights": { zh: "配置权重", en: "Configure Weights" },
  "pendingAssessments": { zh: "待评估", en: "Pending Assessments" },
  "submitted": { zh: "已提交", en: "Submitted" },
  "allCaughtUp": { zh: "全部处理完毕！", en: "All caught up!" },
  "noPendingAssessments": { zh: "目前没有待处理的评估。", en: "There are no pending assessments at the moment." },
  "gradingPanel": { zh: "评分面板", en: "Grading Panel" },
  "finalScore": { zh: "最终得分", en: "Final Score" },
  "teachersFeedback": { zh: "教师反馈", en: "Teacher's Feedback" },
  "addComments": { zh: "为学生添加评语...", en: "Add comments for the student..." },
  "submitGrade": { zh: "提交成绩", en: "Submit Grade" },
  "selectStudentToGrade": { zh: "从列表中选择一名学生开始评分。", en: "Select a student from the list to start grading." },
  "gradingSubmitted": { zh: "评分提交成功！", en: "Grading submitted successfully!" },

  // Teacher Intervention Panel
  "interventionStudent": { zh: "介入：学生", en: "Intervention: Student" },
  "noActiveSession": { zh: "未找到该学生的活跃会话。", en: "No active session found for this student." },
  "hiddenInstruction": { zh: "给AI的隐藏指令", en: "Hidden Instruction to AI" },
  "teacherMessage": { zh: "教师消息", en: "Teacher Message" },
  "enterHiddenInstruction": { zh: "输入给AI的隐藏指令...", en: "Enter hidden instruction for AI..." },
  "typeMessageToStudent": { zh: "输入给学生的消息...", en: "Type message to student..." },

  // Competence Portrait
  "competencePortraitTitle": { zh: "能力画像", en: "Competence Portrait" },
  "competencePortraitDesc": { zh: "多维度展示您的学习成果和潜力。", en: "A multi-dimensional view of your learning achievements and potential." },
  "downloadReport": { zh: "下载报告", en: "Download Report" },
  "sharePortfolio": { zh: "分享作品集", en: "Share Portfolio" },
  "skillRadar": { zh: "技能雷达", en: "Skill Radar" },
  "overallMastery": { zh: "总体掌握度", en: "Overall Mastery" },
  "growthRate": { zh: "增长率", en: "Growth Rate" },
  "weakAreasInsights": { zh: "薄弱环节与 AI 洞察", en: "Weak Areas & AI Insights" },
  "needsImprovement": { zh: "需要在实践步骤中改进", en: "Needs improvement in practical steps" },
  "allOnTrack": { zh: "所有能力点都在正轨上！", en: "All competence points are on track!" },
  "aiSuggestion": { zh: "AI 建议", en: "AI Suggestion" },
  "aiSuggestionPrefix": { zh: "根据您最近的练习，我们建议您重点关注", en: "Based on your recent practice, we suggest focusing on" },
  "advancedModules": { zh: "高级模块", en: "advanced modules" },
  "aiSuggestionSuffix": { zh: "。尝试推荐的自适应练习以提高您的分数。", en: ". Try the recommended adaptive exercises to boost your score." },

  // AI Chat
  "aiProcessError": { zh: "抱歉，我无法处理该请求。", en: "I'm sorry, I couldn't process that." },
  "escalationMessage": { zh: "这个问题比较复杂，我已经呼叫了老师，请稍等片刻。", en: "This issue is a bit complex. I have called the teacher, please wait a moment." },
  "aiCommError": { zh: "与 AI 通信时发生错误。", en: "An error occurred while communicating with the AI." },
  "aiLearningAssistant": { zh: "AI 学习助手", en: "AI Learning Assistant" },
  "teacherNotified": { zh: "已通知老师，稍后将为您提供帮助。", en: "The teacher has been notified and will assist you shortly." },
  "unknownStudent": { zh: "未知学生", en: "Unknown Student" },
  "aiAnalyzing": { zh: "AI 正在分析数据...", en: "AI is analyzing data..." },
  "aiError": { zh: "抱歉，处理您的请求时遇到错误。", en: "Sorry, I encountered an error while processing your request." },
  "promptAnalyzeClass": { zh: "今天哪些学生进度落后？班级ID: class1", en: "Which students are falling behind today? Class ID: class1" },
  "promptGenerateReport": { zh: "生成本周软件技术班实训报告。班级ID: class1", en: "Generate this week's practical training report for the Software Technology class. Class ID: class1" },
  "promptStudentDeepDive": { zh: "学生 student1 最近表现怎么样？", en: "How has student1 been performing recently?" },
  "promptStudentProgress": { zh: "显示班级 class1 的学生进度和能力趋势", en: "Show student progress and competency trends for class1" },
  "student_progress": { zh: "学生进度", en: "Student Progress" },
  "appTitle": { zh: "AI 增强学习", en: "AI-Enhanced Learning" },
  "appSubtitle": { zh: "通过 AI 驱动的洞察和自适应练习赋能师生。", en: "Empowering students and teachers with AI-driven insights and adaptive practice." },
  "aiLearn": { zh: "AI 学习", en: "AI Learn" },
  "roleSwitched": { zh: "角色已切换至：", en: "Role switched to: " },
  "roleSwitchFailed": { zh: "切换角色失败。请检查控制台。", en: "Failed to switch role. Please check console." },
  "no_recent_activity": { zh: "未找到最近的活动。开始您的第一个实践项目吧！", en: "No recent activity found. Start your first practice project!" },
  "competence_radar_placeholder": { zh: "能力雷达图将显示在这里。", en: "Competence radar chart will be displayed here." },
  "status_active": { zh: "进行中", en: "Active" },
  "status_completed": { zh: "已完成", en: "Completed" },
  "status_graded": { zh: "已评分", en: "Graded" },
  "loading": { zh: "加载中...", en: "Loading..." },
  "noRecentInteractions": { zh: "暂无最近互动。", en: "No recent interactions." },
  "noStudentsFound": { zh: "未找到学生", en: "No Students Found" },
  "noStudentsDesc": { zh: "该班级目前没有学生，或者您还没有生成示例数据。", en: "There are no students in this class yet, or you haven't generated sample data." },
  "generateSampleData": { zh: "生成 20 条示例数据", en: "Generate 20 Sample Records" },
  "refresh": { zh: "刷新", en: "Refresh" },
  
  // Error Boundary
  "unexpectedError": { zh: "发生意外错误。", en: "An unexpected error occurred." },
  "dbAccessDenied": { zh: "数据库访问被拒绝", en: "Database Access Denied" },
  "operation": { zh: "操作", en: "Operation" },
  "on": { zh: "于", en: "on" },
  "checkPermissions": { zh: "请检查您的权限。", en: "Please check your permissions." },
  "somethingWentWrong": { zh: "加载应用程序时出错。", en: "Something went wrong while loading the application." },
  "reloadApp": { zh: "重新加载应用", en: "Reload Application" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('zh');

  const t = (key: string) => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
