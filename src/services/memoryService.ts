import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { StudentMemory, ConversationMessage, Notification, AlertRecord, Class } from "../types";
import { generateAIResponse } from "./geminiService";

const MEMORY_COLLECTION = "memories";
const NOTIFICATION_COLLECTION = "notifications";

export const addNotification = async (
  studentId: string,
  type: 'escalation' | 'warning',
  reason: string,
  sessionId?: string
) => {
  try {
    // Find the class this student belongs to
    const classesQuery = query(collection(db, "classes"), where("studentIds", "array-contains", studentId));
    const classesSnap = await getDocs(classesQuery);
    let teacherId = "unknown";
    let tenantId = "unknown";
    if (!classesSnap.empty) {
      const classData = classesSnap.docs[0].data() as Class;
      teacherId = classData.teacherId;
      tenantId = classData.tenantId;
    }

    // Create Notification (legacy, keep for compatibility if needed)
    const notifRef = doc(collection(db, NOTIFICATION_COLLECTION));
    const notification: Notification = {
      id: notifRef.id,
      studentId,
      type,
      reason,
      status: 'unread',
      createdAt: new Date().toISOString(),
      sessionId
    };
    await setDoc(notifRef, notification);

    // Create AlertRecord
    const alertRef = doc(collection(db, "alert_records"));
    const alertRecord: AlertRecord = {
      id: alertRef.id,
      tenantId,
      studentId,
      teacherId,
      sessionId,
      level: type === 'escalation' ? 'red' : 'yellow',
      source: 'ai',
      description: reason,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    await setDoc(alertRef, alertRecord);

    return notification;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "alert_records");
    return null;
  }
};

export const getStudentMemory = async (studentId: string): Promise<StudentMemory | null> => {
  const docRef = doc(db, MEMORY_COLLECTION, studentId);
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as StudentMemory;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${MEMORY_COLLECTION}/${studentId}`);
    return null;
  }
};

export const initializeMemory = async (studentId: string, initialTags: string[]) => {
  const initialMemory: StudentMemory = {
    studentId,
    sectionA: "New student, no competence data yet.",
    sectionB: JSON.stringify(initialTags),
    sectionC: "",
    sectionD: "Exploration mode: AI will explore knowledge level and guidance preferences.",
    sectionF: "",
    version: 1
  };
  try {
    await setDoc(doc(db, MEMORY_COLLECTION, studentId), initialMemory);
    return initialMemory;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${MEMORY_COLLECTION}/${studentId}`);
    return initialMemory;
  }
};

export const updateMemorySection = async (studentId: string, section: keyof StudentMemory, content: string) => {
  const docRef = doc(db, MEMORY_COLLECTION, studentId);
  try {
    const memory = await getStudentMemory(studentId);
    await updateDoc(docRef, {
      [section]: content,
      version: (memory?.version || 1) + 1
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${MEMORY_COLLECTION}/${studentId}`);
  }
};

export const compressSectionC = async (studentId: string, sectionC: string) => {
  const systemInstruction = "You are a memory compression engine. Summarize the recent student dynamics into a structured historical summary. Preserve key events, learning trends, and emotional signals. Output in Markdown.";
  const contents = [{ role: 'user', parts: [{ text: `Recent Dynamics (Section C):\n${sectionC}` }] }];
  
  const response = await generateAIResponse("gemini-3-flash-preview", systemInstruction, contents);
  const summary = response.text || "";
  
  const memory = await getStudentMemory(studentId);
  if (memory) {
    const newSectionF = `${memory.sectionF}\n\n### Summary (${new Date().toISOString()})\n${summary}`;
    try {
      await updateDoc(doc(db, MEMORY_COLLECTION, studentId), {
        sectionC: "",
        sectionF: newSectionF,
        version: memory.version + 1
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${MEMORY_COLLECTION}/${studentId}`);
    }
  }
};

export const addConversationMessage = async (sessionId: string, role: string, content: string, metadata: any = {}) => {
  const msgRef = doc(collection(db, "messages"));
  const message: ConversationMessage = {
    id: msgRef.id,
    sessionId,
    role: role as any,
    content,
    metadata,
    createdAt: new Date().toISOString()
  };
  try {
    await setDoc(msgRef, message);
    return message;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "messages");
    return message;
  }
};

export const getConversationHistory = async (sessionId: string, limitCount: number = 20): Promise<ConversationMessage[]> => {
  const q = query(
    collection(db, "messages"),
    where("sessionId", "==", sessionId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as ConversationMessage).reverse();
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "messages");
    return [];
  }
};
