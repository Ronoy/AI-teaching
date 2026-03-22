import { GoogleGenAI, GenerateContentResponse, Type, FunctionDeclaration, Modality } from "@google/genai";
import { ConversationMessage, StudentMemory, KnowledgeNode, CompetencePoint } from "../types";
import * as teacherAssistantService from "./teacherAssistantService";
import * as knowledgeService from "./knowledgeService";
import { getAITeamDashboardData } from "./aiTeamService";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const generateAIResponse = async (
  model: string = "gemini-3-flash-preview",
  systemInstruction: string,
  contents: any,
  responseMimeType: string = "text/plain"
): Promise<GenerateContentResponse> => {
  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction,
      responseMimeType,
      tools: [{ functionDeclarations: studentTools }]
    },
  });

  const functionCalls = response.functionCalls;
  if (functionCalls) {
    const functionResponses: any[] = [];
    for (const call of functionCalls) {
      let result;
      const args = call.args as any;
      
      switch (call.name) {
        case "searchKnowledgeNodes":
          result = await knowledgeService.searchKnowledgeNodes(args.query);
          break;
        case "getKnowledgeNodeDetails":
          result = await knowledgeService.getKnowledgeNodeDetails(args.nodeId);
          break;
        case "searchBilibiliVideos":
          result = await knowledgeService.getBilibiliVideos(args.query);
          break;
        case "searchWebImages":
          result = await knowledgeService.getWebImages(args.query);
          break;
        default:
          result = { error: "Function not found" };
      }
      
      functionResponses.push({
        name: call.name,
        response: { result },
        id: call.id
      });
    }

    // Send function responses back to Gemini
    return await ai.models.generateContent({
      model,
      contents: [
        ...contents,
        { role: 'model', parts: response.candidates[0].content.parts },
        { role: 'user', parts: functionResponses.map(fr => ({
          functionResponse: {
            name: fr.name,
            response: fr.response
          }
        })) }
      ],
      config: { systemInstruction, responseMimeType }
    });
  }

  return response;
};

export const assemblePrompt = (
  sceneMode: 'coach' | 'mentor' | 'observer' | 'assistant',
  memory: StudentMemory,
  currentTask: string,
  history: ConversationMessage[],
  studentName?: string
) => {
  const namePrefix = studentName ? `${studentName}的专属` : "";
  const roleDefinitions = {
    coach: `你是一个${namePrefix} AI 教练。鼓励探索，引导学生通过错误学习，而不是直接给出答案。使用提示、类比和问题来引导他们找到解决方案。`,
    mentor: `你是一个${namePrefix} AI 导师。专注于实际训练，引导学生完成步骤，强调安全和最佳实践。确保每个检查项都得到确认。`,
    observer: `你是一个${namePrefix} AI 观察员。尽量减少干预，只记录过程数据，不提供提示。只回答程序性问题，如“还剩多少时间”。`,
    assistant: `你是一个${namePrefix}教师 AI 助手。帮助进行数据分析，查询学生进度并生成报告。在此模式下不直接与学生互动。`
  };

  const sceneConstraints = {
    coach: "禁止：直接给出答案。强制：引导学生进行推理；提供线索和类比。",
    mentor: "强制：强调操作标准和安全；确认每个检查项；立即纠正违规行为。",
    observer: "禁止：提供任何提示或指导。强制：仅回答程序性查询。",
    assistant: "强制：使用函数调用查询数据库；分析班级/个人数据；生成报告。"
  };

  // Load memory sections based on scene
  let memoryContext = "";
  if (sceneMode === 'coach') {
    memoryContext = `学生记忆：\nA部分（能力）：${memory.sectionA}\nB部分（特征）：${memory.sectionB}\nC部分（近期）：${memory.sectionC}\nD部分（策略）：${memory.sectionD}`;
  } else if (sceneMode === 'mentor') {
    memoryContext = `学生记忆：\nA部分（能力）：${memory.sectionA}\nC部分（近期）：${memory.sectionC}\nD部分（策略）：${memory.sectionD}`;
  } else if (sceneMode === 'observer') {
    memoryContext = `学生记忆：\nA部分（能力）：${memory.sectionA}`;
  } else if (sceneMode === 'assistant') {
    memoryContext = `学生记忆：\nA部分（能力）：${memory.sectionA}\nC部分（近期）：${memory.sectionC}\nF部分（历史）：${memory.sectionF}`;
  }

  const systemInstruction = `${roleDefinitions[sceneMode]}

${sceneConstraints[sceneMode]}

${memoryContext}

能力增强：
1. 你可以搜索 B 站视频、网页图片和知识点图谱。
2. 当学生遇到无法解决的困难、表达困惑或多次尝试失败时，你应该主动调用这些工具并直接推荐相关的学习资源。
3. 推荐资源时，请说明为什么这些资源对他们当前的问题有帮助。

所有回复必须使用中文。`;

  const contents = history.map(msg => ({
    role: msg.role === 'ai' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  contents.push({
    role: 'user',
    parts: [{ text: `当前任务: ${currentTask}` }]
  });

  return { systemInstruction, contents };
};

export const evaluateConversation = async (
  history: ConversationMessage[]
): Promise<{ needsAttention: boolean; type: 'escalation' | 'warning'; reason: string }> => {
  const systemInstruction = `你是一个 AI 学习系统的对话评估员。
  在每一轮对话之后，你必须评估学生是否需要教师干预。
  
  “请求升级”标准（红色）：
  - 学生明确要求找老师。
  - 尽管有 AI 指导，学生仍长时间卡住。
  - 技术问题阻碍进度。
  
  “建议教师关注”标准（黄色）：
  - 学生表达负面情绪（“太难了”、“不想做了”）。
  - 学生有明显的知识误区。
  - 学生重复询问同一个问题（理解瓶颈）。
  
  以 JSON 格式响应：
  {
    "needsAttention": boolean,
    "type": "escalation" | "warning",
    "reason": "一句中文解释"
  }`;

  const contents = history.slice(-5).map(msg => ({
    role: msg.role === 'ai' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          needsAttention: { type: Type.BOOLEAN },
          type: { type: Type.STRING, enum: ["escalation", "warning"] },
          reason: { type: Type.STRING }
        },
        required: ["needsAttention", "type", "reason"]
      }
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return { needsAttention: false, type: 'warning', reason: "" };
  }
};

const studentTools: FunctionDeclaration[] = [
  {
    name: "searchKnowledgeNodes",
    description: "Search for knowledge nodes in the curriculum knowledge graph.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "The search term for knowledge nodes." }
      },
      required: ["query"]
    }
  },
  {
    name: "getKnowledgeNodeDetails",
    description: "Get detailed information about a specific knowledge node.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        nodeId: { type: Type.STRING, description: "The ID of the knowledge node." }
      },
      required: ["nodeId"]
    }
  },
  {
    name: "searchBilibiliVideos",
    description: "Search for educational videos on Bilibili.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "The search query for videos." }
      },
      required: ["query"]
    }
  },
  {
    name: "searchWebImages",
    description: "Search for relevant images on the web.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "The search query for images." }
      },
      required: ["query"]
    }
  }
];

const teacherAssistantTools: FunctionDeclaration[] = [
  {
    name: "getClassProgress",
    description: "Get progress of all students in a class for a specific date. Returns PracticeSession progress list.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        classId: { type: Type.STRING, description: "The ID of the class to query." },
        date: { type: Type.STRING, description: "Optional date in ISO format (YYYY-MM-DD)." }
      },
      required: ["classId"]
    }
  },
  {
    name: "getStudentDetail",
    description: "Get detailed info for a specific student, including memory A+C+F zones and recent scores.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        studentId: { type: Type.STRING, description: "The ID of the student to query." }
      },
      required: ["studentId"]
    }
  },
  {
    name: "getClassAlerts",
    description: "Get alert records for a class within a specified time range.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        classId: { type: Type.STRING, description: "The ID of the class to query." },
        startDate: { type: Type.STRING, description: "Optional start date in ISO format." },
        endDate: { type: Type.STRING, description: "Optional end date in ISO format." }
      },
      required: ["classId"]
    }
  },
  {
    name: "getCompetencyStats",
    description: "Get competency statistics for a class (overall or specific competency).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        classId: { type: Type.STRING, description: "The ID of the class to query." },
        competencyId: { type: Type.STRING, description: "Optional ID of a specific competency point." }
      },
      required: ["classId"]
    }
  },
  {
    name: "getStudentMemory",
    description: "Get specific memory sections (A, B, C, D, F) for a student.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        studentId: { type: Type.STRING, description: "The ID of the student to query." },
        sections: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "List of sections to retrieve (e.g., ['A', 'C', 'F'])."
        }
      },
      required: ["studentId", "sections"]
    }
  },
  {
    name: "getAITeamDashboardData",
    description: "Get student progress and competency trends for a class.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        classId: { type: Type.STRING, description: "The ID of the class to query." }
      },
      required: ["classId"]
    }
  }
];

export const generateAssistantResponse = async (
  teacherId: string,
  systemInstruction: string,
  contents: any[]
): Promise<string> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents,
    config: {
      systemInstruction,
      tools: [{ functionDeclarations: teacherAssistantTools }]
    }
  });

  const functionCalls = response.functionCalls;
  if (functionCalls) {
    const functionResponses: any[] = [];
    for (const call of functionCalls) {
      let result;
      const args = call.args as any;
      
      switch (call.name) {
        case "getClassProgress":
          result = await teacherAssistantService.getClassProgress(teacherId, args.classId, args.date);
          break;
        case "getStudentDetail":
          result = await teacherAssistantService.getStudentDetail(teacherId, args.studentId);
          break;
        case "getClassAlerts":
          result = await teacherAssistantService.getClassAlerts(teacherId, args.classId, args.startDate && args.endDate ? { start: args.startDate, end: args.endDate } : undefined);
          break;
        case "getCompetencyStats":
          result = await teacherAssistantService.getCompetencyStats(teacherId, args.classId, args.competencyId);
          break;
        case "getStudentMemory":
          result = await teacherAssistantService.getStudentMemory(teacherId, args.studentId, args.sections);
          break;
        case "getAITeamDashboardData":
          result = await getAITeamDashboardData(teacherId, args.classId);
          break;
        default:
          result = { error: "Function not found" };
      }
      
      functionResponses.push({
        name: call.name,
        response: { result },
        id: call.id
      });
    }

    // Send function responses back to Gemini
    const finalResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...contents,
        { role: 'model', parts: response.candidates[0].content.parts },
        { role: 'user', parts: functionResponses.map(fr => ({
          functionResponse: {
            name: fr.name,
            response: fr.response
          }
        })) }
      ],
      config: { systemInstruction }
    });

    return finalResponse.text || "";
  }

  return response.text || "";
};

export const recommendStepAttributes = async (
  stepName: string,
  taskDescription: string,
  knowledgeNodes: KnowledgeNode[],
  competencePoints: CompetencePoint[]
): Promise<{ 
  checkItems: { name: string; weight: number; isCritical: boolean }[];
  knowledgeNodeIds: string[];
  competenceMapping: { competenceId: string; confidence: number }[];
}> => {
  const systemInstruction = `你是一个教育专家。根据提供的任务描述和步骤名称，推荐最合适的考核项、知识点和能力点。
  
  可用知识点：${JSON.stringify(knowledgeNodes.map(n => ({ id: n.id, name: n.name })))}
  可用能力点：${JSON.stringify(competencePoints.map(c => ({ id: c.id, name: c.name })))}
  
  响应格式必须为 JSON：
  {
    "checkItems": [{"name": "考核项名称", "weight": 1-10, "isCritical": boolean}],
    "knowledgeNodeIds": ["知识点ID"],
    "competenceMapping": [{"competenceId": "能力点ID", "confidence": 0.0-1.0}]
  }`;

  const prompt = `任务描述: ${taskDescription}\n步骤名称: ${stepName}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          checkItems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                weight: { type: Type.NUMBER },
                isCritical: { type: Type.BOOLEAN }
              },
              required: ["name", "weight", "isCritical"]
            }
          },
          knowledgeNodeIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          competenceMapping: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                competenceId: { type: Type.STRING },
                confidence: { type: Type.NUMBER }
              },
              required: ["competenceId", "confidence"]
            }
          }
        },
        required: ["checkItems", "knowledgeNodeIds", "competenceMapping"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return { checkItems: [], knowledgeNodeIds: [], competenceMapping: [] };
  }
};
