export type UserRole = 'student' | 'teacher' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  tenantId: string;
  avatarUrl?: string;
}

export interface Course {
  id: string;
  name: string;
  code?: string;
  college?: string;
  description: string;
  teacherId: string;
}

export interface ProjectResource {
  id: string;
  name: string;
  type: 'video' | 'document' | 'link' | 'tool';
  url: string;
}

export interface ProjectStep {
  id?: string;
  name: string;
  order: number;
  type: 'standardized' | 'open';
  estimatedTime: number;
  resources?: ProjectResource[];
  checkItems?: {
    name: string;
    weight: number;
    isCritical: boolean;
  }[];
  maxScore: number;
  knowledgeNodeIds?: string[];
  competenceMapping?: {
    competenceId: string;
    confidence: number;
  }[];
}

export interface LearningActivity {
  id: string;
  type: 'courseware' | 'document' | 'link' | 'quiz' | 'discussion' | 'adaptive_practice' | 'adaptive_quiz' | 'ability_training';
  name: string;
  description?: string;
  url?: string;
  metadata?: any;
}

export interface ProjectTask {
  id: string;
  name: string;
  order: number;
  type: 'theoretical' | 'practical';
  description: string;
  steps: ProjectStep[];
  scenarioDescription?: string;
  objectives?: string;
  aiTraining?: {
    name: string;
    level: string;
    description: string;
  };
  learningActivities?: LearningActivity[];
}

export interface PracticeProject {
  id: string;
  name: string;
  courseId: string;
  description: string;
  duration: number;
  acceptanceCriteria: string;
  typicalJobTask?: string;
  jobCompetencies?: string[];
  tasks?: ProjectTask[];
  steps?: ProjectStep[]; // Kept for backward compatibility
}

export interface PracticeSession {
  id: string;
  studentId: string;
  projectId: string;
  status: 'active' | 'completed' | 'graded';
  startTime: string;
  endTime?: string;
  stepProgress: Record<number, {
    startTime: string;
    endTime?: string;
    submissionUrl?: string;
    feedback?: string;
    score?: number;
    checkResults?: boolean[];
  }>;
  totalScore?: number;
}

export interface KnowledgeNode {
  id: string;
  courseId: string;
  name: string;
  description: string;
  prerequisites: string[];
  masteryThreshold: number;
  competenceIds: string[];
}

export interface Question {
  id: string;
  nodeId: string;
  type: 'choice' | 'boolean' | 'fill' | 'short';
  difficulty: 1 | 2 | 3;
  content: string;
  options?: string[];
  answer: string;
  explanation: string;
}

export interface StudentMemory {
  studentId: string;
  sectionA: string; // Competence status
  sectionB: string; // Learning features (JSON tags)
  sectionC: string; // Recent dynamics
  sectionD: string; // AI guidance strategies
  sectionF: string; // Historical summary
  version: number;
}

export interface ConversationSession {
  id: string;
  studentId: string;
  sceneMode: 'coach' | 'mentor' | 'observer' | 'assistant';
  status: 'active' | 'paused' | 'ended' | 'escalated';
}

export interface ConversationMessage {
  id: string;
  sessionId: string;
  role: 'ai' | 'student' | 'teacher_silent' | 'teacher_visible' | 'system';
  content: string;
  metadata?: any;
  createdAt: string;
}

export interface Notification {
  id: string;
  studentId: string;
  studentName?: string;
  type: 'escalation' | 'warning';
  reason: string;
  status: 'unread' | 'read' | 'processed';
  createdAt: string;
  sessionId?: string;
}

export interface AlertRecord {
  id: string;
  tenantId: string;
  studentId: string;
  teacherId: string;
  sessionId?: string;
  level: 'yellow' | 'red';
  source: 'rule' | 'ai';
  ruleType?: string;
  description: string;
  status: 'pending' | 'acknowledged' | 'resolved';
  resolvedAt?: string;
  createdAt: string;
}

export interface CompetencePoint {
  id: string;
  name: string;
  type: 'practical' | 'theoretical' | 'comprehensive';
  description: string;
}

export interface Class {
  id: string;
  name: string;
  teacherId: string;
  studentIds: string[];
  courseId: string;
  tenantId: string;
}

export interface CompetencySnapshot {
  id: string;
  studentId: string;
  timestamp: string;
  overallScore: number;
  competencies: Record<string, number>;
}
