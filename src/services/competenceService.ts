import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, doc, getDoc, getDocs, query, where, addDoc, updateDoc } from "firebase/firestore";
import { CompetencePoint } from "../types";

const COMPETENCE_COLLECTION = "competence_points";

export const getCompetencePoints = async (): Promise<CompetencePoint[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, COMPETENCE_COLLECTION));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompetencePoint));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COMPETENCE_COLLECTION);
    return [];
  }
};

export const createCompetencePoint = async (data: Omit<CompetencePoint, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, COMPETENCE_COLLECTION), data);
    return { id: docRef.id, ...data };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COMPETENCE_COLLECTION);
    return { id: '', ...data };
  }
};

export const calculateCompetencePortrait = async (studentId: string, competencePoints: CompetencePoint[]) => {
  // Logic to calculate competence portrait based on practice and theory records
  // Practical: 0.7 practice, 0.3 theory
  // Theoretical: 0.3 practice, 0.7 theory
  // Comprehensive: 0.5 practice, 0.5 theory
  
  const portrait: Record<string, number> = {};
  
  for (const point of competencePoints) {
    // Fetch records for this competence point
    // This is a simplified version
    portrait[point.id] = Math.random() * 100; // Placeholder
  }
  
  return portrait;
};
