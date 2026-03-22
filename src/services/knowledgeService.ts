import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, getDocs, query, where, doc, getDoc, limit } from "firebase/firestore";
import { KnowledgeNode } from "../types";

const NODES_COLLECTION = "knowledge_nodes";

export const searchKnowledgeNodes = async (searchTerm: string): Promise<KnowledgeNode[]> => {
  try {
    const q = query(collection(db, NODES_COLLECTION), limit(20));
    const querySnapshot = await getDocs(q);
    const allNodes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KnowledgeNode));
    
    // Simple client-side search for demo purposes
    // In production, use Algolia or Firestore full-text search if available
    return allNodes.filter(node => 
      node.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      node.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, NODES_COLLECTION);
    return [];
  }
};

export const getKnowledgeNodeDetails = async (nodeId: string): Promise<KnowledgeNode | null> => {
  try {
    const nodeRef = doc(db, NODES_COLLECTION, nodeId);
    const nodeSnap = await getDoc(nodeRef);
    if (nodeSnap.exists()) {
      return { id: nodeSnap.id, ...nodeSnap.data() } as KnowledgeNode;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, NODES_COLLECTION);
    return null;
  }
};

export const getBilibiliVideos = async (query: string) => {
  // Simulate Bilibili search results
  // In a real app, this would call a Bilibili API or a proxy
  return [
    {
      title: `${query} 相关教学视频 - 基础篇`,
      url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(query)}`,
      thumbnail: "https://picsum.photos/seed/bilibili1/320/180",
      duration: "12:45",
      author: "工业机器人专家"
    },
    {
      title: `${query} 实操演示 - 进阶技巧`,
      url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(query)}`,
      thumbnail: "https://picsum.photos/seed/bilibili2/320/180",
      duration: "08:20",
      author: "机器人课堂"
    }
  ];
};

export const getWebImages = async (query: string) => {
  // Simulate image search results
  return [
    {
      title: `${query} 示意图 1`,
      url: `https://picsum.photos/seed/${encodeURIComponent(query)}1/800/600`,
      thumbnail: `https://picsum.photos/seed/${encodeURIComponent(query)}1/200/150`
    },
    {
      title: `${query} 示意图 2`,
      url: `https://picsum.photos/seed/${encodeURIComponent(query)}2/800/600`,
      thumbnail: `https://picsum.photos/seed/${encodeURIComponent(query)}2/200/150`
    }
  ];
};
