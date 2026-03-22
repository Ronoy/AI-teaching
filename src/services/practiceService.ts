import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, deleteDoc } from "firebase/firestore";
import { PracticeProject, PracticeSession, ProjectStep } from "../types";

const PROJECTS_COLLECTION = "projects";
const SESSIONS_COLLECTION = "practice_sessions";

export const getProjects = async (courseId?: string): Promise<PracticeProject[]> => {
  const q = courseId 
    ? query(collection(db, PROJECTS_COLLECTION), where("courseId", "==", courseId))
    : collection(db, PROJECTS_COLLECTION);
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PracticeProject));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, PROJECTS_COLLECTION);
    return [];
  }
};

export const getProject = async (projectId: string): Promise<PracticeProject | null> => {
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as PracticeProject;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${PROJECTS_COLLECTION}/${projectId}`);
    return null;
  }
};

export const updateProject = async (project: PracticeProject): Promise<void> => {
  const { id, ...data } = project;
  const docRef = doc(db, PROJECTS_COLLECTION, id);
  try {
    await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${PROJECTS_COLLECTION}/${id}`);
  }
};

export const deleteProject = async (projectId: string): Promise<void> => {
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${PROJECTS_COLLECTION}/${projectId}`);
  }
};

export const createPracticeSession = async (studentId: string, projectId: string): Promise<PracticeSession> => {
  const sessionRef = doc(collection(db, SESSIONS_COLLECTION));
  const session: PracticeSession = {
    id: sessionRef.id,
    studentId,
    projectId,
    status: "active",
    startTime: new Date().toISOString(),
    stepProgress: {}
  };
  try {
    await setDoc(sessionRef, session);
    return session;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, SESSIONS_COLLECTION);
    return session;
  }
};

export const getStudentSessions = async (studentId: string): Promise<PracticeSession[]> => {
  const q = query(collection(db, SESSIONS_COLLECTION), where("studentId", "==", studentId), orderBy("startTime", "desc"));
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as PracticeSession);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, SESSIONS_COLLECTION);
    return [];
  }
};

export const updateStepProgress = async (
  sessionId: string, 
  stepIndex: number, 
  data: Partial<PracticeSession['stepProgress'][number]>
) => {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  try {
    const sessionSnap = await getDoc(sessionRef);
    if (sessionSnap.exists()) {
      const session = sessionSnap.data() as PracticeSession;
      const currentStep = session.stepProgress[stepIndex] || { startTime: new Date().toISOString() };
      const updatedStep = { ...currentStep, ...data };
      
      await updateDoc(sessionRef, {
        [`stepProgress.${stepIndex}`]: updatedStep
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${SESSIONS_COLLECTION}/${sessionId}`);
  }
};

export const completeSession = async (sessionId: string) => {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  try {
    await updateDoc(sessionRef, {
      status: "completed",
      endTime: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${SESSIONS_COLLECTION}/${sessionId}`);
  }
};

export const gradeSession = async (sessionId: string, totalScore: number) => {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  try {
    await updateDoc(sessionRef, {
      status: "graded",
      totalScore
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${SESSIONS_COLLECTION}/${sessionId}`);
  }
};
