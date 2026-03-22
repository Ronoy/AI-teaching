import { db } from "./firebase";
import { collection, doc, setDoc, getDocs, deleteDoc } from "firebase/firestore";

export const seedData = async (teacherId: string = "huizhiruronoy@gmail.com") => {
  const collectionsToClear = [
    "projects", "knowledge_nodes", "questions", "competence_points", 
    "classes", "practice_sessions", "conversations", "memories", 
    "alert_records", "competency_snapshots", "users"
  ];

  console.log("Clearing old data...");
  for (const collName of collectionsToClear) {
    const snap = await getDocs(collection(db, collName));
    for (const d of snap.docs) {
      // Don't delete the admin user if they are in the users collection
      if (collName === "users" && (d.data().email === "huizhiruronoy@gmail.com" || d.id === teacherId)) continue;
      await deleteDoc(doc(db, collName, d.id));
    }
  }

  console.log("Seeding Industrial Robot projects...");
    const projects = [
      {
        id: "proj_robot_1",
        name: "工业机器人操作一",
        courseId: "ROBOT101",
        description:
          "本课程主要任务是工业机器人认知、手动操作机器人、工业机器人程序结构及编程、坐标系创建及应用、程序数据创建及应用、常用指令及应用、I/O 的通讯认知及操作，培养学生具备工业机器人操作和编程应用的能力。",
        duration: 40,
        acceptanceCriteria:
          "完成所有模块的理论学习与实操训练，掌握工业机器人的基本操作与编程。",
        tasks: [
          {
            id: "t1",
            name: "项目 1 工业机器人认知",
            order: 0,
            description:
              "了解工业机器人分类与应用，了解工业机器人结构与组成，认识 ABB 工业机器人。",
            scenarioDescription:
              "在智能制造车间中，认识不同类型的工业机器人及其基本结构。",
            objectives: "掌握工业机器人结构、组成及应用",
            steps: [
              {
                name: "工业机器人分类与应用",
                order: 0,
                type: "standardized",
                estimatedTime: 10,
                checkItems: [
                  {
                    name: "识别常见工业机器人类型",
                    weight: 50,
                    isCritical: true,
                  },
                  {
                    name: "描述机器人的典型应用场景",
                    weight: 50,
                    isCritical: false,
                  },
                ],
                maxScore: 100,
              },
              {
                name: "工业机器人结构与组成",
                order: 1,
                type: "standardized",
                estimatedTime: 15,
                checkItems: [
                  {
                    name: "指出机器人的主要机械部件",
                    weight: 50,
                    isCritical: true,
                  },
                  {
                    name: "说明控制柜的基本功能",
                    weight: 50,
                    isCritical: false,
                  },
                ],
                maxScore: 100,
              },
              {
                name: "认识 ABB 工业机器人",
                order: 2,
                type: "standardized",
                estimatedTime: 15,
                checkItems: [
                  {
                    name: "识别 ABB 机器人的型号和规格",
                    weight: 100,
                    isCritical: true,
                  },
                ],
                maxScore: 100,
              },
            ],
          },
          {
            id: "t2",
            name: "项目 2 软件安装及创建虚拟仿真平台",
            order: 1,
            description:
              "正确安装好 ROBOTSTUDIO 虚拟仿真软件。在 ROBOTSTUDIO 中新建一个虚拟工业机器人。",
            scenarioDescription:
              "在计算机上搭建工业机器人虚拟仿真环境，为后续编程和调试做准备。",
            objectives: "掌握工业机器人软件的安装和使用",
            steps: [
              {
                name: "安装 ROBOTSTUDIO",
                order: 0,
                type: "standardized",
                estimatedTime: 20,
                checkItems: [
                  { name: "成功安装软件", weight: 50, isCritical: true },
                ],
                maxScore: 50,
              },
              {
                name: "创建虚拟机器人",
                order: 1,
                type: "standardized",
                estimatedTime: 20,
                checkItems: [
                  {
                    name: "在软件中新建虚拟机器人工作站",
                    weight: 50,
                    isCritical: true,
                  },
                ],
                maxScore: 50,
              },
            ],
          },
          {
            id: "t3",
            name: "项目 3 手动操作机器人",
            order: 2,
            description: "工业机器人维护，工业机器人操作。",
            scenarioDescription:
              "使用示教器对工业机器人进行手动单轴运动和线性运动操作。",
            objectives:
              "了解工业机器人的操作，掌握工业机器人的数据备份与维护，掌握工业机器人的手动操作",
            steps: [
              {
                name: "手动单轴运动",
                order: 0,
                type: "standardized",
                estimatedTime: 20,
                checkItems: [
                  { name: "正确操作各轴运动", weight: 50, isCritical: true },
                ],
                maxScore: 50,
              },
              {
                name: "线性运动",
                order: 1,
                type: "standardized",
                estimatedTime: 20,
                checkItems: [
                  { name: "正确操作线性运动", weight: 50, isCritical: true },
                ],
                maxScore: 50,
              },
              {
                name: "重定位运动",
                order: 2,
                type: "standardized",
                estimatedTime: 20,
                checkItems: [
                  { name: "正确操作重定位运动", weight: 100, isCritical: true },
                ],
                maxScore: 100,
              },
            ],
          },
          {
            id: "t4",
            name: "项目 4 工业机器人程序结构及编程",
            order: 3,
            description: "程序模块、例行程序，基本指令入门，简单例行程序。",
            scenarioDescription:
              "编写简单的机器人运动控制程序，实现基本的轨迹运动。",
            objectives: "掌握 MoveL\\MoveC\\MoveJ，会创建程序模块和例行程序",
            steps: [
              {
                name: "创建程序模块",
                order: 0,
                type: "standardized",
                estimatedTime: 15,
                checkItems: [
                  {
                    name: "成功建立程序模块和例行程序",
                    weight: 50,
                    isCritical: true,
                  },
                ],
                maxScore: 50,
              },
              {
                name: "编写运动指令",
                order: 1,
                type: "standardized",
                estimatedTime: 25,
                checkItems: [
                  {
                    name: "正确使用 MoveJ, MoveL 和 MoveC 指令",
                    weight: 50,
                    isCritical: true,
                  },
                ],
                maxScore: 50,
              },
            ],
          },
          {
            id: "t5",
            name: "项目 5 坐标系创建及应用",
            order: 4,
            description: "创建工具坐标系，建立工件坐标系。",
            scenarioDescription:
              "根据实际工件和工具的尺寸，在系统中标定坐标系。",
            objectives: "掌握工具坐标系的方法、工件坐标系的方法及使用",
            steps: [
              {
                name: "创建工具坐标系",
                order: 0,
                type: "standardized",
                estimatedTime: 20,
                checkItems: [
                  { name: "完成 TCP 标定", weight: 50, isCritical: true },
                ],
                maxScore: 50,
              },
              {
                name: "建立工件坐标系",
                order: 1,
                type: "standardized",
                estimatedTime: 20,
                checkItems: [
                  { name: "完成工件坐标系标定", weight: 50, isCritical: true },
                ],
                maxScore: 50,
              },
            ],
          },
          {
            id: "t6",
            name: "项目 6 程序数据创建及应用",
            order: 5,
            description: "程序数据，基本指令。",
            scenarioDescription:
              "在程序中定义和使用不同类型的数据（如位置数据、数字量等）。",
            objectives: "掌握程序数据类型及使用、掌握基本指令",
            steps: [
              {
                name: "创建程序数据",
                order: 0,
                type: "standardized",
                estimatedTime: 40,
                checkItems: [
                  {
                    name: "正确创建和修改 robtarget 数据",
                    weight: 50,
                    isCritical: true,
                  },
                  {
                    name: "正确创建和修改 num 数据",
                    weight: 50,
                    isCritical: true,
                  },
                ],
                maxScore: 100,
              },
            ],
          },
          {
            id: "t7",
            name: "项目 7 常用指令及应用",
            order: 6,
            description:
              "Offs、RelTool、赋值指令：=、ProcCall、MoveAbsJ、条件逻辑判定指令。",
            scenarioDescription:
              "使用偏移指令和逻辑控制指令编写复杂的机器人程序。",
            objectives: "掌握：=、ProcCall、WaitTime，掌握 IF/FOR/WHILE",
            steps: [
              {
                name: "使用逻辑指令",
                order: 0,
                type: "standardized",
                estimatedTime: 40,
                checkItems: [
                  {
                    name: "正确编写包含 IF 或 FOR 循环的程序",
                    weight: 50,
                    isCritical: true,
                  },
                  {
                    name: "正确使用 Offs 和 RelTool 指令",
                    weight: 50,
                    isCritical: true,
                  },
                ],
                maxScore: 100,
              },
            ],
          },
          {
            id: "t8",
            name: "项目 8 I/O 的通讯认知及操作",
            order: 7,
            description: "认识 652 板卡，IO 口创建与应用。",
            scenarioDescription:
              "配置机器人的 I/O 通讯板卡，实现与外部设备的信号交互。",
            objectives: "掌握 ABB 机器人的通讯，掌握 Devicenet 板卡的使用",
            steps: [
              {
                name: "配置 I/O 板卡",
                order: 0,
                type: "standardized",
                estimatedTime: 40,
                checkItems: [
                  {
                    name: "成功配置 652 板卡及数字量输入输出信号",
                    weight: 100,
                    isCritical: true,
                  },
                ],
                maxScore: 100,
              },
            ],
          },
          {
            id: "t9",
            name: "项目 9 机器人基本应用（IO）及编程",
            order: 8,
            description: "掌握 IO 控制指令。",
            scenarioDescription:
              "在程序中加入 I/O 控制指令，实现抓取或放置动作的逻辑控制。",
            objectives: "Set/Reset, WaitDi/WaitDO",
            steps: [
              {
                name: "编写 I/O 控制程序",
                order: 0,
                type: "standardized",
                estimatedTime: 40,
                checkItems: [
                  {
                    name: "正确使用 Set 和 WaitDI 指令控制夹具",
                    weight: 100,
                    isCritical: true,
                  },
                ],
                maxScore: 100,
              },
            ],
          },
          {
            id: "t10",
            name: "项目 10 工业机器人维护",
            order: 9,
            description: "工业机器人维护。",
            scenarioDescription: "对工业机器人进行日常检查和基本维护保养。",
            objectives: "掌握工业机器人结构、组成及应用",
            steps: [
              {
                name: "日常维护检查",
                order: 0,
                type: "standardized",
                estimatedTime: 40,
                checkItems: [
                  {
                    name: "完成机器人本体及控制柜的检查",
                    weight: 100,
                    isCritical: true,
                  },
                ],
                maxScore: 100,
              },
            ],
          },
        ],
      },
    ];

    for (const p of projects) {
      await setDoc(doc(db, "projects", p.id), p);
    }

  console.log("Seeding knowledge nodes...");
  const nodes = [
    {
      id: "node_robot_1",
      courseId: "ROBOT101",
      name: "工业机器人分类与应用",
      description: "掌握工业机器人分类、结构组成及应用场景。",
      prerequisites: [],
      masteryThreshold: 0.8,
      competenceIds: ["comp_robot_1"],
    },
    {
      id: "node_robot_2",
      courseId: "ROBOT101",
      name: "ROBOTSTUDIO 软件安装与使用",
      description: "掌握 ROBOTSTUDIO 虚拟仿真软件的安装及虚拟机器人创建。",
      prerequisites: ["node_robot_1"],
      masteryThreshold: 0.8,
      competenceIds: ["comp_robot_2"],
    },
    {
      id: "node_robot_3",
      courseId: "ROBOT101",
      name: "手动操作机器人",
      description:
        "掌握示教器使用方法，能手动（单轴 / 线性运动）操作工业机器人。",
      prerequisites: ["node_robot_1"],
      masteryThreshold: 0.8,
      competenceIds: ["comp_robot_3"],
    },
    {
      id: "node_robot_4",
      courseId: "ROBOT101",
      name: "工业机器人程序结构及编程",
      description: "掌握 MoveL、MoveC、MoveJ 等基本运动指令，会创建程序模块和例行程序。",
      prerequisites: ["node_robot_3"],
      masteryThreshold: 0.8,
      competenceIds: ["comp_robot_4"],
    },
    {
      id: "node_robot_5",
      courseId: "ROBOT101",
      name: "坐标系创建及应用",
      description: "掌握工具坐标系的方法、工件坐标系的方法及使用。",
      prerequisites: ["node_robot_3"],
      masteryThreshold: 0.8,
      competenceIds: ["comp_robot_5"],
    },
    {
      id: "node_robot_6",
      courseId: "ROBOT101",
      name: "程序数据创建及应用",
      description: "掌握程序数据类型及使用、掌握基本指令。",
      prerequisites: ["node_robot_4"],
      masteryThreshold: 0.8,
      competenceIds: ["comp_robot_6"],
    },
    {
      id: "node_robot_7",
      courseId: "ROBOT101",
      name: "常用指令及应用",
      description: "掌握：=、ProcCall、WaitTime，掌握 IF/FOR/WHILE 等逻辑控制指令。",
      prerequisites: ["node_robot_4"],
      masteryThreshold: 0.8,
      competenceIds: ["comp_robot_7"],
    },
    {
      id: "node_robot_8",
      courseId: "ROBOT101",
      name: "I/O 的通讯认知及操作",
      description: "掌握 ABB 机器人的通讯，掌握 Devicenet 板卡的使用。",
      prerequisites: ["node_robot_1"],
      masteryThreshold: 0.8,
      competenceIds: ["comp_robot_8"],
    },
    {
      id: "node_robot_9",
      courseId: "ROBOT101",
      name: "机器人基本应用（IO）及编程",
      description: "掌握 Set/Reset, WaitDi/WaitDO 等 IO 控制指令。",
      prerequisites: ["node_robot_8"],
      masteryThreshold: 0.8,
      competenceIds: ["comp_robot_9"],
    },
    {
      id: "node_robot_10",
      courseId: "ROBOT101",
      name: "工业机器人维护",
      description: "掌握工业机器人结构、组成及应用，能进行日常维护检查。",
      prerequisites: ["node_robot_1"],
      masteryThreshold: 0.8,
      competenceIds: ["comp_robot_10"],
    }
  ];

  for (const n of nodes) {
    await setDoc(doc(db, "knowledge_nodes", n.id), n);
  }

  console.log("Seeding questions...");
  const questions = [
    {
      id: "q_robot_1",
      nodeId: "node_robot_1",
      type: "choice",
      difficulty: 1,
      content: "常见的工业机器人不包括以下哪种？",
      options: ["多关节机器人", "SCARA 机器人", "并联机器人", "扫地机器人"],
      answer: "扫地机器人",
      explanation: "扫地机器人属于服务机器人，不属于工业机器人。",
    },
    {
      id: "q_robot_2",
      nodeId: "node_robot_3",
      type: "choice",
      difficulty: 1,
      content:
        "在示教器上进行手动单轴运动时，通常需要按住哪个按键才能使机器人运动？",
      options: [
        "急停按钮",
        "使能器 (Deadman switch)",
        "启动按钮",
        "复位按钮",
      ],
      answer: "使能器 (Deadman switch)",
      explanation:
        "为了安全，手动操作机器人时必须按住使能器（通常在示教器背面）。",
    },
    {
      id: "q_robot_3",
      nodeId: "node_robot_4",
      type: "choice",
      difficulty: 1,
      content: "ABB 机器人中，用于直线运动的指令是？",
      options: ["MoveJ", "MoveL", "MoveC", "MoveAbsJ"],
      answer: "MoveL",
      explanation: "MoveL (Move Linear) 用于控制机器人 TCP 沿直线移动到目标点。",
    },
    {
      id: "q_robot_4",
      nodeId: "node_robot_5",
      type: "choice",
      difficulty: 1,
      content: "在定义工具坐标系 (TCP) 时，通常使用哪种方法最常见？",
      options: ["三点法", "四点法", "五点法", "六点法"],
      answer: "四点法",
      explanation: "四点法是定义工具中心点 (TCP) 最常用且精度较高的方法。",
    },
    {
      id: "q_robot_5",
      nodeId: "node_robot_6",
      type: "choice",
      difficulty: 1,
      content: "在 ABB 机器人编程中，表示位置数据的类型是？",
      options: ["num", "string", "robtarget", "bool"],
      answer: "robtarget",
      explanation: "robtarget 用于存储机器人的位置数据，包括 XYZ 坐标和姿态信息。",
    },
    {
      id: "q_robot_6",
      nodeId: "node_robot_7",
      type: "choice",
      difficulty: 1,
      content: "以下哪个指令用于在程序中设置等待时间？",
      options: ["WaitDI", "WaitDO", "WaitTime", "WaitUntil"],
      answer: "WaitTime",
      explanation: "WaitTime 指令用于让机器人程序暂停执行指定的时间。",
    },
    {
      id: "q_robot_7",
      nodeId: "node_robot_8",
      type: "choice",
      difficulty: 1,
      content: "ABB 机器人常用的标准 I/O 板卡型号是？",
      options: ["DSQC 651", "DSQC 652", "DSQC 653", "DSQC 654"],
      answer: "DSQC 652",
      explanation: "DSQC 652 是 ABB 机器人常用的 16 进 16 出数字量 I/O 板卡。",
    },
    {
      id: "q_robot_8",
      nodeId: "node_robot_9",
      type: "choice",
      difficulty: 1,
      content: "用于将数字输出信号置为高电平 (1) 的指令是？",
      options: ["Reset", "Set", "WaitDI", "WaitDO"],
      answer: "Set",
      explanation: "Set 指令用于将指定的数字输出 (DO) 信号设置为 1。",
    },
    {
      id: "q_robot_9",
      nodeId: "node_robot_10",
      type: "choice",
      difficulty: 1,
      content: "工业机器人日常维护中，不包括以下哪项？",
      options: ["清洁机器人本体", "检查电缆磨损", "更换减速机齿轮", "检查控制柜风扇"],
      answer: "更换减速机齿轮",
      explanation: "更换减速机齿轮属于大修或专业维修范畴，不属于日常维护。",
    }
  ];

  for (const q of questions) {
    await setDoc(doc(db, "questions", q.id), q);
  }

  console.log("Seeding competence points...");
  const points = [
    {
      id: "comp_robot_1",
      name: "机器人基础理论",
      type: "theoretical",
      description: "掌握工业机器人的分类、结构和基本原理。",
    },
    {
      id: "comp_robot_2",
      name: "虚拟仿真软件操作",
      type: "practical",
      description: "熟练使用 ROBOTSTUDIO 进行虚拟工作站的搭建。",
    },
    {
      id: "comp_robot_3",
      name: "实体机器人操作",
      type: "practical",
      description: "能够安全、规范地使用示教器手动操作工业机器人。",
    },
    {
      id: "comp_robot_4",
      name: "机器人基础编程",
      type: "practical",
      description: "掌握基本的运动指令和程序结构，能编写简单的轨迹程序。",
    },
    {
      id: "comp_robot_5",
      name: "坐标系标定",
      type: "practical",
      description: "能够准确标定工具坐标系和工件坐标系。",
    },
    {
      id: "comp_robot_6",
      name: "程序数据管理",
      type: "theoretical",
      description: "理解并能正确使用各种类型的程序数据。",
    },
    {
      id: "comp_robot_7",
      name: "高级指令应用",
      type: "practical",
      description: "能运用逻辑控制指令和偏移指令编写复杂程序。",
    },
    {
      id: "comp_robot_8",
      name: "I/O 硬件配置",
      type: "practical",
      description: "能够配置机器人的 I/O 通讯板卡。",
    },
    {
      id: "comp_robot_9",
      name: "I/O 逻辑编程",
      type: "practical",
      description: "能结合 I/O 信号编写逻辑控制程序。",
    },
    {
      id: "comp_robot_10",
      name: "机器人维护保养",
      type: "practical",
      description: "掌握机器人的日常检查和基本维护方法。",
    }
  ];

    for (const p of points) {
      await setDoc(doc(db, "competence_points", p.id), p);
    }

  const classesSnap = await getDocs(collection(db, "classes"));
  const studentIds = Array.from({ length: 20 }, (_, i) => `student${i + 1}`);

  console.log("Seeding users...");
  const studentNames = [
    "张伟", "王芳", "李静", "陈洋", "刘强", "赵敏", "孙磊", "周杰", "吴鹏", "郑洁",
    "冯晨", "褚卫", "卫东", "蒋华", "沈明", "韩梅", "杨林", "朱涛", "秦岚", "尤勇"
  ];

  for (let i = 0; i < 20; i++) {
    const id = `student${i + 1}`;
    await setDoc(doc(db, "users", id), {
      uid: id,
      email: `${id}@example.com`,
      displayName: studentNames[i],
      role: "student",
      tenantId: "default",
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`
    });
  }

  console.log("Seeding classes...");
  const classes = [
    {
      id: "class1",
      name: "机电一体化 2026班",
      teacherId: teacherId,
      studentIds: studentIds,
      courseId: "ROBOT101",
    },
  ];

  for (const c of classes) {
    await setDoc(doc(db, "classes", c.id), c);
  }

  console.log("Seeding practice sessions...");
  for (let i = 0; i < 15; i++) {
    const studentId = `student${i + 1}`;
    await setDoc(doc(db, "practice_sessions", `sess_${studentId}`), {
      id: `sess_${studentId}`,
      studentId: studentId,
      projectId: "proj_robot_1",
      status: i % 5 === 0 ? "completed" : "active",
      startTime: new Date(Date.now() - Math.random() * 10000000).toISOString(),
      stepProgress: {
        0: { score: 80 + Math.random() * 20 },
        1: { score: 70 + Math.random() * 30 }
      }
    });
  }

  console.log("Seeding conversations...");
  for (let i = 5; i < 12; i++) {
    const studentId = `student${i + 1}`;
    await setDoc(doc(db, "conversations", `conv_${studentId}`), {
      id: `conv_${studentId}`,
      studentId: studentId,
      status: "active",
      startTime: new Date(Date.now() - Math.random() * 5000000).toISOString(),
      lastMessageTime: new Date().toISOString()
    });
  }

  console.log("Seeding memories...");
  const summaries = [
    "正在尝试手动操作机器人，表现稳定。",
    "在坐标系标定环节遇到困难，需要指导。",
    "程序逻辑编写非常出色，进度领先。",
    "对 I/O 通讯理解较慢，建议加强理论学习。",
    "实操过程中操作规范，安全意识强。",
    "正在进行虚拟仿真平台搭建，进展顺利。",
    "在 MoveC 指令使用上存在疑惑。",
    "完成了所有基础任务，正在尝试挑战题。",
    "学习态度积极，经常向 AI 助手提问。",
    "近期参与度有所下降，建议关注。"
  ];

  for (let i = 0; i < 20; i++) {
    const studentId = `student${i + 1}`;
    await setDoc(doc(db, "memories", `mem_${studentId}`), {
      studentId: studentId,
      sectionA: "基础知识掌握扎实",
      sectionB: "实操能力有待提高",
      sectionC: summaries[i % summaries.length],
      lastUpdated: new Date().toISOString()
    });
  }

  console.log("Seeding alert records...");
  const alertStudents = [
    { id: "student2", level: "red", message: "长时间停留在坐标系标定步骤，无进展。" },
    { id: "student7", level: "yellow", message: "MoveC 指令多次尝试失败。" },
    { id: "student10", level: "yellow", message: "近期活跃度显著下降。" },
    { id: "student15", level: "red", message: "实操中出现违规操作警告。" }
  ];

  for (const alert of alertStudents) {
    await setDoc(doc(db, "alert_records", `alert_${alert.id}`), {
      id: `alert_${alert.id}`,
      studentId: alert.id,
      level: alert.level,
      message: alert.message,
      status: "pending",
      timestamp: new Date().toISOString()
    });
  }

  console.log("Seeding competency snapshots...");
  for (let i = 0; i < 20; i++) {
    const studentId = `student${i + 1}`;
    // Create two snapshots to show trend
    await setDoc(doc(db, "competency_snapshots", `snap1_${studentId}`), {
      id: `snap1_${studentId}`,
      studentId: studentId,
      overallScore: 60 + Math.random() * 20,
      timestamp: new Date(Date.now() - 86400000).toISOString()
    });
    await setDoc(doc(db, "competency_snapshots", `snap2_${studentId}`), {
      id: `snap2_${studentId}`,
      studentId: studentId,
      overallScore: 70 + Math.random() * 20,
      timestamp: new Date().toISOString()
    });
  }
};
