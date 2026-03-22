import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit, addDoc } from "firebase/firestore";
import { KnowledgeNode, Question } from "../types";

const NODES_COLLECTION = "knowledge_nodes";
const QUESTIONS_COLLECTION = "questions";
const RECORDS_COLLECTION = "answer_records";

export const getKnowledgeNodes = async (courseId: string): Promise<KnowledgeNode[]> => {
  const q = query(collection(db, NODES_COLLECTION), where("courseId", "==", courseId));
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KnowledgeNode));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, NODES_COLLECTION);
    return [];
  }
};

export const getQuestions = async (nodeId: string, difficulty: number): Promise<Question[]> => {
  const q = query(
    collection(db, QUESTIONS_COLLECTION),
    where("nodeId", "==", nodeId),
    where("difficulty", "==", difficulty)
  );
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, QUESTIONS_COLLECTION);
    return [];
  }
};

export const recordAnswer = async (
  studentId: string,
  nodeId: string,
  questionId: string,
  studentAnswer: string,
  isCorrect: boolean,
  timeSpent: number
) => {
  const recordRef = collection(db, RECORDS_COLLECTION);
  try {
    await addDoc(recordRef, {
      studentId,
      nodeId,
      questionId,
      studentAnswer,
      isCorrect,
      timeSpent,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, RECORDS_COLLECTION);
  }
};

export const getAdaptiveQuestion = async (
  nodeId: string,
  currentDifficulty: number,
  history: { isCorrect: boolean; difficulty: number }[]
): Promise<{ question: Question | null; nextDifficulty: number }> => {
  // Adaptive Logic
  // Initial: 3 Level 1 questions
  // All correct -> Level 2
  // Wrong 1-2 -> Continue Level 1
  // All wrong -> Review
  
  // Level 2: 3 questions
  // All correct -> Level 3
  // Wrong -> Level 1
  
  // Level 3: 2 questions
  // All correct -> Mastery
  
  let nextDifficulty = currentDifficulty;
  const recentHistory = history.slice(-3);
  const correctCount = recentHistory.filter(h => h.isCorrect).length;
  
  if (currentDifficulty === 1) {
    if (recentHistory.length === 3) {
      if (correctCount === 3) nextDifficulty = 2;
      else if (correctCount === 0) nextDifficulty = 1; // Should trigger review
    }
  } else if (currentDifficulty === 2) {
    if (recentHistory.length === 3) {
      if (correctCount === 3) nextDifficulty = 3;
      else nextDifficulty = 1;
    }
  } else if (currentDifficulty === 3) {
    if (recentHistory.length === 2) {
      if (correctCount === 2) nextDifficulty = 3; // Mastery
    }
  }

  const questions = await getQuestions(nodeId, nextDifficulty);
  const unusedQuestions = questions.filter(q => !history.some(h => h.difficulty === nextDifficulty));
  
  return {
    question: unusedQuestions.length > 0 ? unusedQuestions[0] : null,
    nextDifficulty
  };
};
