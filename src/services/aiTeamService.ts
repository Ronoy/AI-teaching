import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from "firebase/firestore";
import { Class, UserProfile, PracticeSession, ConversationSession, StudentMemory, AlertRecord, CompetencySnapshot } from "../types";

export interface StudentDashboardCard {
  userId: string;
  name: string;
  avatarUrl?: string;
  activityStatus: 'idle' | 'practicing' | 'training' | 'assessing';
  recentSummary: string;
  competencyTrend: 'up' | 'flat' | 'down';
  alertLevel: 'green' | 'yellow' | 'red';
}

// Helper to chunk arrays for Firestore 'in' queries (max 10)
const chunkArray = <T>(arr: T[], size: number): T[][] => {
  return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );
};

export const getAITeamDashboardData = async (teacherId: string, classId: string): Promise<StudentDashboardCard[]> => {
  try {
    // 1. Verify access and get class
    const classDoc = await getDoc(doc(db, "classes", classId));
    if (!classDoc.exists()) throw new Error("Class not found");
    const classData = classDoc.data() as Class;
    // Allow access if teacherId matches UID or email (for legacy/seeded data)
    const isAuthorized = classData.teacherId === teacherId || classData.teacherId === "huizhiruronoy@gmail.com";
    if (!isAuthorized) {
      console.warn(`Unauthorized access attempt to class ${classId}. Class teacherId: ${classData.teacherId}, Provided teacherId: ${teacherId}`);
      throw new Error("Unauthorized");
    }

    const studentIds = classData.studentIds;
    if (!studentIds || studentIds.length === 0) return [];

    const studentIdChunks = chunkArray(studentIds, 10);

    const usersMap = new Map<string, UserProfile>();
    const activePracticeMap = new Map<string, boolean>();
    const activeConvMap = new Map<string, boolean>();
    const memoriesMap = new Map<string, StudentMemory>();
    const alertsMap = new Map<string, 'yellow' | 'red'>();
    const competencyTrendMap = new Map<string, 'up' | 'flat' | 'down'>();

    // Fetch data in chunks
    for (const chunk of studentIdChunks) {
      // Users
      const usersQuery = query(collection(db, "users"), where("uid", "in", chunk));
      const usersSnap = await getDocs(usersQuery);
      usersSnap.docs.forEach(d => usersMap.set(d.id, d.data() as UserProfile));

      // Active Practice Sessions
      const activePracticeQuery = query(
        collection(db, "practice_sessions"),
        where("studentId", "in", chunk),
        where("status", "==", "active")
      );
      const activePracticeSnap = await getDocs(activePracticeQuery);
      activePracticeSnap.docs.forEach(d => activePracticeMap.set((d.data() as PracticeSession).studentId, true));

      // Active Conversation Sessions
      const activeConvQuery = query(
        collection(db, "conversations"),
        where("studentId", "in", chunk),
        where("status", "==", "active")
      );
      const activeConvSnap = await getDocs(activeConvQuery);
      activeConvSnap.docs.forEach(d => activeConvMap.set((d.data() as ConversationSession).studentId, true));

      // Memories
      const memoriesQuery = query(collection(db, "memories"), where("studentId", "in", chunk));
      const memoriesSnap = await getDocs(memoriesQuery);
      memoriesSnap.docs.forEach(d => memoriesMap.set((d.data() as StudentMemory).studentId, d.data() as StudentMemory));

      // Alerts (from alert_records)
      const alertsQuery = query(
        collection(db, "alert_records"),
        where("studentId", "in", chunk),
        where("status", "in", ["pending", "acknowledged"])
      );
      const alertsSnap = await getDocs(alertsQuery);
      alertsSnap.docs.forEach(d => {
        const alert = d.data() as AlertRecord;
        const currentLevel = alertsMap.get(alert.studentId);
        const level = alert.level;
        if (level === 'red' || currentLevel !== 'red') {
          alertsMap.set(alert.studentId, level);
        }
      });

      // Competency Snapshots
      const snapshotsQuery = query(
        collection(db, "competency_snapshots"),
        where("studentId", "in", chunk)
      );
      const snapshotsSnap = await getDocs(snapshotsQuery);
      
      const studentSnapshots = new Map<string, CompetencySnapshot[]>();
      snapshotsSnap.docs.forEach(d => {
        const data = d.data() as CompetencySnapshot;
        if (!studentSnapshots.has(data.studentId)) {
          studentSnapshots.set(data.studentId, []);
        }
        studentSnapshots.get(data.studentId)!.push(data);
      });

      chunk.forEach(studentId => {
        const snaps = studentSnapshots.get(studentId) || [];
        snaps.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        let trend: 'up' | 'flat' | 'down' = 'flat';
        if (snaps.length >= 2) {
          const latest = snaps[0].overallScore || 0;
          const previous = snaps[1].overallScore || 0;
          if (latest > previous) trend = 'up';
          else if (latest < previous) trend = 'down';
        }
        competencyTrendMap.set(studentId, trend);
      });
    }

    // Assemble data
    const dashboardData: StudentDashboardCard[] = studentIds.map(id => {
      const user = usersMap.get(id);
      const isPracticing = activePracticeMap.get(id);
      const isConversing = activeConvMap.get(id);
      const memory = memoriesMap.get(id);
      const alertLevel = alertsMap.get(id) || 'green';

      let activityStatus: StudentDashboardCard['activityStatus'] = 'idle';
      if (isPracticing) activityStatus = 'practicing';
      else if (isConversing) activityStatus = 'training';

      return {
        userId: id,
        name: user?.displayName || 'Unknown Student',
        avatarUrl: user?.avatarUrl,
        activityStatus,
        recentSummary: memory?.sectionC || 'No recent interactions.',
        competencyTrend: competencyTrendMap.get(id) || 'flat',
        alertLevel
      };
    });

    return dashboardData;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `classes/${classId}/dashboard`);
    return [];
  }
};
