import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc, limit, orderBy } from "firebase/firestore";
import { Class, PracticeSession, Notification, StudentMemory, CompetencePoint } from "../types";

/**
 * Verify if the teacher has access to the specified class.
 */
export const verifyTeacherAccess = async (teacherId: string, classId: string): Promise<boolean> => {
  try {
    const classDoc = await getDoc(doc(db, "classes", classId));
    if (!classDoc.exists()) return false;
    const classData = classDoc.data() as Class;
    return classData.teacherId === teacherId;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `classes/${classId}`);
    return false;
  }
};

/**
 * Get progress of all students in a class for a specific date.
 */
export const getClassProgress = async (teacherId: string, classId: string, date?: string) => {
  if (!(await verifyTeacherAccess(teacherId, classId))) {
    throw new Error("Unauthorized access to class data.");
  }

  try {
    const classDoc = await getDoc(doc(db, "classes", classId));
    const studentIds = (classDoc.data() as Class).studentIds;

    const sessionsQuery = query(
      collection(db, "practice_sessions"),
      where("studentId", "in", studentIds)
    );
    const sessionsSnap = await getDocs(sessionsQuery);
    const sessions = sessionsSnap.docs.map(d => d.data() as PracticeSession);

    // Filter by date if provided (simplified for demo)
    return sessions.map(s => ({
      studentId: s.studentId,
      projectId: s.projectId,
      status: s.status,
      completedSteps: Object.keys(s.stepProgress).filter(k => s.stepProgress[Number(k)].endTime).length,
      totalSteps: 2, // Mock total steps for demo
      lastUpdate: s.startTime
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "practice_sessions");
    return [];
  }
};

/**
 * Get detailed info for a specific student.
 */
export const getStudentDetail = async (teacherId: string, studentId: string) => {
  // In a real app, we'd verify if the student belongs to any of the teacher's classes.
  // For this demo, we'll assume access if the teacher is authenticated.
  
  try {
    const memoryRef = doc(db, "memories", studentId);
    const memorySnap = await getDoc(memoryRef);
    const memory = memorySnap.exists() ? memorySnap.data() as StudentMemory : null;

    const sessionsQuery = query(
      collection(db, "practice_sessions"),
      where("studentId", "==", studentId),
      orderBy("startTime", "desc"),
      limit(5)
    );
    const sessionsSnap = await getDocs(sessionsQuery);
    const recentScores = sessionsSnap.docs.map(d => (d.data() as PracticeSession).totalScore || 0);

    return {
      studentId,
      memorySummary: memory ? {
        sectionA: memory.sectionA,
        sectionC: memory.sectionC,
        sectionF: memory.sectionF
      } : "No memory data found.",
      recentScores,
      averageScore: recentScores.length > 0 ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : 0
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `memories/${studentId}`);
    return null;
  }
};

/**
 * Get alert records for a class.
 */
export const getClassAlerts = async (teacherId: string, classId: string, dateRange?: { start: string; end: string }) => {
  if (!(await verifyTeacherAccess(teacherId, classId))) {
    throw new Error("Unauthorized access to class data.");
  }

  try {
    const classDoc = await getDoc(doc(db, "classes", classId));
    const studentIds = (classDoc.data() as Class).studentIds;

    const alertsQuery = query(
      collection(db, "notifications"),
      where("studentId", "in", studentIds),
      orderBy("createdAt", "desc")
    );
    const alertsSnap = await getDocs(alertsQuery);
    return alertsSnap.docs.map(d => d.data() as Notification);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "notifications");
    return [];
  }
};

/**
 * Get competency statistics for a class.
 */
export const getCompetencyStats = async (teacherId: string, classId: string, competencyId?: string) => {
  if (!(await verifyTeacherAccess(teacherId, classId))) {
    throw new Error("Unauthorized access to class data.");
  }

  // Mock implementation for demo
  return {
    classId,
    competencyId: competencyId || "all",
    stats: [
      { name: "Circuit Fundamentals", averageMastery: 0.75, studentCount: 15 },
      { name: "Hands-on Assembly", averageMastery: 0.62, studentCount: 15 }
    ]
  };
};

/**
 * Get specific memory sections for a student.
 */
export const getStudentMemory = async (teacherId: string, studentId: string, sections: string[]) => {
  try {
    const memoryRef = doc(db, "memories", studentId);
    const memorySnap = await getDoc(memoryRef);
    if (!memorySnap.exists()) return null;
    
    const memory = memorySnap.data() as StudentMemory;
    const result: any = {};
    sections.forEach(s => {
      const key = `section${s.toUpperCase()}` as keyof StudentMemory;
      if (memory[key]) {
        result[s] = memory[key];
      }
    });
    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `memories/${studentId}`);
    return null;
  }
};
