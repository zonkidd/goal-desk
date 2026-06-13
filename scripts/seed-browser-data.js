/**
 * Goal Desk 浏览器模式种子数据脚本
 *
 * 使用方法：
 * 1. 打开浏览器访问 http://localhost:1420
 * 2. 打开浏览器开发者工具（F12 或 Cmd+Option+I）
 * 3. 切换到 Console（控制台）标签
 * 4. 复制本文件的全部内容粘贴到控制台
 * 5. 按 Enter 执行
 * 6. 刷新页面查看效果
 */

(function() {
  console.log('🚀 开始生成 Goal Desk 浏览器模式测试数据...\n');

  // ==================== 辅助函数 ====================

  function generateUUID() {
    return crypto.randomUUID();
  }

  function createTimestamp(daysOffset = 0, hoursOffset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    date.setHours(date.getHours() + hoursOffset);
    return date.toISOString();
  }

  // ==================== 创建 Areas ====================

  console.log('📁 创建领域（Areas）...');

  const areas = [
    {
      id: generateUUID(),
      title: '工作',
      goalCount: 0,
      activeGoalCount: 0,
      isSystem: false
    },
    {
      id: generateUUID(),
      title: '个人成长',
      goalCount: 0,
      activeGoalCount: 0,
      isSystem: false
    },
    {
      id: generateUUID(),
      title: '健康',
      goalCount: 0,
      activeGoalCount: 0,
      isSystem: false
    },
    {
      id: generateUUID(),
      title: '家庭',
      goalCount: 0,
      activeGoalCount: 0,
      isSystem: false
    },
    {
      id: generateUUID(),
      title: '财务',
      goalCount: 0,
      activeGoalCount: 0,
      isSystem: false
    }
  ];

  localStorage.setItem('goal-desk-browser-areas', JSON.stringify(areas));
  console.log(`✅ 创建了 ${areas.length} 个领域：${areas.map(a => a.title).join('、')}\n`);

  // ==================== 创建 Goals ====================

  console.log('🎯 创建目标（Goals）...');

  const goals = [
    // 工作领域
    {
      id: generateUUID(),
      title: '完成 Q2 项目交付',
      area: '工作',
      description: '按时完成第二季度的所有项目交付目标，包括功能开发、测试和上线部署。',
      status: 'ACTIVE',
      progress: 35,
      nextTodo: '完成前端界面优化',
      taskCount: 8,
      createdAt: createTimestamp(-15),
      updatedAt: createTimestamp(-1)
    },
    {
      id: generateUUID(),
      title: '提升团队技术能力',
      area: '工作',
      description: '组织技术分享会，提升团队整体技术水平。',
      status: 'ACTIVE',
      progress: 20,
      nextTodo: '准备下周分享主题',
      taskCount: 5,
      createdAt: createTimestamp(-10),
      updatedAt: createTimestamp(-2)
    },
    {
      id: generateUUID(),
      title: '优化代码质量',
      area: '工作',
      description: '重构老旧代码，提高代码可维护性和性能。',
      status: 'PAUSED',
      progress: 50,
      nextTodo: '',
      taskCount: 3,
      createdAt: createTimestamp(-20),
      updatedAt: createTimestamp(-5)
    },
    // 个人成长领域
    {
      id: generateUUID(),
      title: '学习 Rust 编程语言',
      area: '个人成长',
      description: '系统学习 Rust，掌握所有权、借用检查等核心概念。',
      status: 'ACTIVE',
      progress: 45,
      nextTodo: '完成第 8 章练习题',
      taskCount: 12,
      createdAt: createTimestamp(-30),
      updatedAt: createTimestamp(0)
    },
    {
      id: generateUUID(),
      title: '阅读 12 本技术书籍',
      area: '个人成长',
      description: '今年阅读至少 12 本技术或管理类书籍。',
      status: 'ACTIVE',
      progress: 25,
      nextTodo: '继续阅读《系统设计面试》',
      taskCount: 4,
      createdAt: createTimestamp(-60),
      updatedAt: createTimestamp(-3)
    },
    {
      id: generateUUID(),
      title: '建立个人知识库',
      area: '个人成长',
      description: '使用 Obsidian 搭建个人知识管理系统。',
      status: 'READY_TO_COMPLETE',
      progress: 90,
      nextTodo: '整理最后的笔记模板',
      taskCount: 2,
      createdAt: createTimestamp(-45),
      updatedAt: createTimestamp(0)
    },
    // 健康领域
    {
      id: generateUUID(),
      title: '每周运动 3 次',
      area: '健康',
      description: '保持每周至少 3 次的有氧运动，每次 30 分钟以上。',
      status: 'ACTIVE',
      progress: 60,
      nextTodo: '今晚去健身房',
      taskCount: 10,
      createdAt: createTimestamp(-90),
      updatedAt: createTimestamp(0)
    },
    {
      id: generateUUID(),
      title: '改善睡眠质量',
      area: '健康',
      description: '调整作息，确保每天 7-8 小时优质睡眠。',
      status: 'ACTIVE',
      progress: 40,
      nextTodo: '晚上 11 点前上床',
      taskCount: 6,
      createdAt: createTimestamp(-25),
      updatedAt: createTimestamp(-1)
    },
    // 家庭领域
    {
      id: generateUUID(),
      title: '规划暑期家庭旅行',
      area: '家庭',
      description: '计划 7 月的家庭旅行，包括目的地选择、预订酒店和行程安排。',
      status: 'ACTIVE',
      progress: 15,
      nextTodo: '研究旅行目的地',
      taskCount: 7,
      createdAt: createTimestamp(-5),
      updatedAt: createTimestamp(0)
    },
    {
      id: generateUUID(),
      title: '陪伴父母',
      area: '家庭',
      description: '每月至少回家看望父母一次。',
      status: 'ACTIVE',
      progress: 70,
      nextTodo: '本周末回家',
      taskCount: 3,
      createdAt: createTimestamp(-120),
      updatedAt: createTimestamp(-2)
    },
    // 财务领域
    {
      id: generateUUID(),
      title: '建立投资组合',
      area: '财务',
      description: '学习投资理财知识，建立合理的投资组合。',
      status: 'ACTIVE',
      progress: 30,
      nextTodo: '研究基金投资策略',
      taskCount: 5,
      createdAt: createTimestamp(-40),
      updatedAt: createTimestamp(-4)
    },
    {
      id: generateUUID(),
      title: '年度储蓄目标',
      area: '财务',
      description: '今年存款目标达到 10 万元。',
      status: 'ACTIVE',
      progress: 55,
      nextTodo: '',
      taskCount: 1,
      createdAt: createTimestamp(-180),
      updatedAt: createTimestamp(-10)
    }
  ];

  localStorage.setItem('goal-desk-browser-goals', JSON.stringify(goals));
  console.log(`✅ 创建了 ${goals.length} 个目标：`);
  goals.forEach(g => console.log(`   - ${g.area} / ${g.title} (${g.progress}%)`));
  console.log('');

  // ==================== 创建 Tasks ====================

  console.log('✅ 创建待办（Tasks）...');

  const tasks = [
    // ==================== 今日焦点任务（IN_PROGRESS + plannedStartAt 在今天或之前） ====================
    {
      id: generateUUID(),
      title: '完成前端界面优化',
      content: '优化首页加载速度，减少白屏时间。\n\n重点：\n- 图片懒加载\n- 代码分割\n- CDN 加速',
      status: 'IN_PROGRESS',
      showInTimeline: true,
      linkedGoalId: goals[0].id,
      linkedGoalLabel: goals[0].title,
      plannedStartAt: createTimestamp(-1, 9), // 昨天开始，跨天任务
      dueDate: createTimestamp(2),
      createdAt: createTimestamp(-2),
      activityLogs: [
        {
          action: 'STARTED',
          note: '开始优化工作',
          timestamp: createTimestamp(-1, 9)
        },
        {
          action: 'NOTE_ADDED',
          note: '已完成图片懒加载实现',
          timestamp: createTimestamp(0, -1)
        },
        {
          action: 'CREATED',
          timestamp: createTimestamp(-2)
        }
      ]
    },
    {
      id: generateUUID(),
      title: '编写 API 接口文档',
      content: '为用户管理模块编写完整的 RESTful API 文档。\n\n包含：\n- 接口列表\n- 请求参数\n- 响应格式\n- 错误码说明',
      status: 'IN_PROGRESS',
      showInTimeline: true,
      linkedGoalId: goals[0].id,
      linkedGoalLabel: goals[0].title,
      plannedStartAt: createTimestamp(0, 10), // 今天上午 10 点开始
      dueDate: createTimestamp(1),
      createdAt: createTimestamp(0, -1),
      activityLogs: [
        {
          action: 'STARTED',
          note: '开始编写文档',
          timestamp: createTimestamp(0, -1)
        },
        {
          action: 'CREATED',
          timestamp: createTimestamp(0, -1)
        }
      ]
    },
    {
      id: generateUUID(),
      title: '重构支付模块代码',
      content: '优化支付模块的代码结构，提高可维护性。',
      status: 'IN_PROGRESS',
      showInTimeline: true,
      linkedGoalId: goals[2].id,
      linkedGoalLabel: goals[2].title,
      plannedStartAt: createTimestamp(-2, 14), // 前天开始，长期任务
      dueDate: createTimestamp(5),
      createdAt: createTimestamp(-3),
      activityLogs: [
        {
          action: 'STARTED',
          timestamp: createTimestamp(-2, 14)
        },
        {
          action: 'CREATED',
          timestamp: createTimestamp(-3)
        }
      ]
    },
    {
      id: generateUUID(),
      title: '修复用户反馈的 3 个 Bug',
      content: '处理用户反馈的紧急问题：\n1. 登录超时问题\n2. 数据显示错误\n3. 按钮点击无响应',
      status: 'TODO',
      showInTimeline: true,
      linkedGoalId: goals[0].id,
      linkedGoalLabel: goals[0].title,
      plannedStartAt: createTimestamp(1, 10),
      dueDate: createTimestamp(3),
      activityLogs: [
        {
          action: 'CREATED',
          timestamp: createTimestamp(-1)
        }
      ]
    },
    {
      id: generateUUID(),
      title: '编写 API 文档',
      content: '为新开发的接口编写完整的 API 文档。',
      status: 'TODO',
      showInTimeline: false,
      linkedGoalId: goals[0].id,
      linkedGoalLabel: goals[0].title,
      activityLogs: [
        {
          action: 'CREATED',
          timestamp: createTimestamp(-3)
        }
      ]
    },
    {
      id: generateUUID(),
      title: '代码审查：支付模块',
      content: '审查同事提交的支付模块代码，重点关注安全性。',
      status: 'TODO',
      showInTimeline: true,
      plannedStartAt: createTimestamp(0, 14),
      dueDate: createTimestamp(0),
      activityLogs: [
        {
          action: 'CREATED',
          timestamp: createTimestamp(0, -5)
        }
      ]
    },
    {
      id: generateUUID(),
      title: '准备技术分享 PPT',
      content: '主题：React 性能优化最佳实践',
      status: 'TODO',
      showInTimeline: false,
      linkedGoalId: goals[1].id,
      linkedGoalLabel: goals[1].title,
      dueDate: createTimestamp(5),
      activityLogs: [
        {
          action: 'CREATED',
          timestamp: createTimestamp(-1)
        }
      ]
    },
    {
      id: generateUUID(),
      title: '周会：讨论技术架构升级方案',
      content: '',
      status: 'TODO',
      showInTimeline: true,
      plannedStartAt: createTimestamp(3, 10),
      activityLogs: [
        {
          action: 'CREATED',
          timestamp: createTimestamp(0)
        }
      ]
    },
    // 学习相关任务
    {
      id: generateUUID(),
      title: '完成 Rust 第 8 章练习题',
      content: '《Rust 程序设计语言》第 8 章：常见集合类型\n\n需要完成的练习：\n- Vec 练习\n- String 练习\n- HashMap 练习',
      status: 'IN_PROGRESS',
      showInTimeline: true,
      linkedGoalId: goals[3].id,
      linkedGoalLabel: goals[3].title,
      plannedStartAt: createTimestamp(0, 8), // 今天早上 8 点开始
      dueDate: createTimestamp(1),
      createdAt: createTimestamp(0, -2),
      activityLogs: [
        {
          action: 'STARTED',
          note: '开始做 Vec 练习',
          timestamp: createTimestamp(0, -2)
        },
        {
          action: 'CREATED',
          timestamp: createTimestamp(0, -2)
        }
      ]
    },
    {
      id: generateUUID(),
      title: '阅读《系统设计面试》第 3 章',
      content: '第 3 章主题：设计一个分布式缓存系统\n\n重点内容：\n- 缓存策略（LRU/LFU）\n- 数据分片\n- 一致性哈希',
      status: 'IN_PROGRESS',
      showInTimeline: true,
      linkedGoalId: goals[4].id,
      linkedGoalLabel: goals[4].title,
      plannedStartAt: createTimestamp(-1, 20), // 昨晚开始阅读
      createdAt: createTimestamp(-1, 20),
      activityLogs: [
        {
          action: 'STARTED',
          timestamp: createTimestamp(-1, 20)
        },
        {
          action: 'CREATED',
          timestamp: createTimestamp(-1, 20)
        }
      ]
    },
    {
      id: generateUUID(),
      title: '整理 Obsidian 笔记模板',
      content: '完善以下模板：\n- 读书笔记模板\n- 项目文档模板\n- 每日回顾模板',
      status: 'TODO',
      showInTimeline: false,
      linkedGoalId: goals[5].id,
      linkedGoalLabel: goals[5].title,
      activityLogs: [
        {
          action: 'CREATED',
          timestamp: createTimestamp(0)
        }
      ]
    },
    // 健康相关任务
    {
      id: generateUUID(),
      title: '今晚去健身房',
      content: '训练计划：\n- 热身 10 分钟\n- 有氧 30 分钟\n- 力量训练 20 分钟\n- 拉伸 10 分钟',
      status: 'TODO',
      showInTimeline: true,
      plannedStartAt: createTimestamp(0, 19),
      linkedGoalId: goals[6].id,
      linkedGoalLabel: goals[6].title,
      createdAt: createTimestamp(0, -6),
      activityLogs: [
        {
          action: 'CREATED',
          timestamp: createTimestamp(0, -6)
        }
      ]
    },
    {
      id: generateUUID(),
      title: '本周健身计划执行中',
      content: '本周目标：完成 3 次有氧训练 + 2 次力量训练\n\n已完成：\n✅ 周一：有氧 30 分钟\n✅ 周三：力量训练\n⏳ 今天：有氧训练',
      status: 'IN_PROGRESS',
      showInTimeline: true,
      linkedGoalId: goals[6].id,
      linkedGoalLabel: goals[6].title,
      plannedStartAt: createTimestamp(-6, 7), // 本周一开始
      dueDate: createTimestamp(1), // 明天结束
      createdAt: createTimestamp(-6),
      activityLogs: [
        {
          action: 'NOTE_ADDED',
          note: '周三完成力量训练',
          timestamp: createTimestamp(-3, 20)
        },
        {
          action: 'NOTE_ADDED',
          note: '周一完成有氧训练',
          timestamp: createTimestamp(-6, 20)
        },
        {
          action: 'STARTED',
          timestamp: createTimestamp(-6, 7)
        },
        {
          action: 'CREATED',
          timestamp: createTimestamp(-6)
        }
      ]
    },
    {
      id: generateUUID(),
      title: '改善睡眠：早睡挑战第 3 天',
      content: '本周挑战：连续 7 天晚上 11 点前入睡\n\n进度：\n✅ 第 1 天：10:50 入睡\n✅ 第 2 天：10:45 入睡\n⏳ 第 3 天：今晚',
      status: 'IN_PROGRESS',
      showInTimeline: false,
      linkedGoalId: goals[7].id,
      linkedGoalLabel: goals[7].title,
      plannedStartAt: createTimestamp(-2, 22), // 前天晚上开始
      dueDate: createTimestamp(4),
      createdAt: createTimestamp(-2),
      activityLogs: [
        {
          action: 'NOTE_ADDED',
          note: '第 2 天成功',
          timestamp: createTimestamp(-1, 23)
        },
        {
          action: 'NOTE_ADDED',
          note: '第 1 天成功',
          timestamp: createTimestamp(-2, 23)
        },
        {
          action: 'STARTED',
          timestamp: createTimestamp(-2, 22)
        },
        {
          action: 'CREATED',
          timestamp: createTimestamp(-2)
        }
      ]
    },
    {
      id: generateUUID(),
      title: '周六上午晨跑',
      content: '',
      status: 'TODO',
      showInTimeline: true,
      plannedStartAt: createTimestamp(2, 7),
      linkedGoalId: goals[6].id,
      linkedGoalLabel: goals[6].title,
      activityLogs: [
        {
          action: 'CREATED',
          timestamp: createTimestamp(0)
        }
      ]
    },
    {
      id: generateUUID(),
      title: '购买健身补剂',
      content: '采购清单：\n- 蛋白粉 1 桶\n- 维生素 C\n- 鱼油',
      status: 'TODO',
      showInTimeline: false,
      activityLogs: [
        {
          action: 'CREATED',
          timestamp: createTimestamp(0)
        }
      ]
    },
    {
      id: generateUUID(),
      title: '调整作息：晚上 11 点前睡觉',
      content: '本周目标：连续 5 天 11 点前入睡',
      status: 'TODO',
      showInTimeline: false,
      linkedGoalId: goals[7].id,
      linkedGoalLabel: goals[7].title,
      activityLogs: [
        {
          action: 'CREATED',
          timestamp: createTimestamp(0)
        }
      ]
    },
    // 家庭相关任务
    {
      id: generateUUID(),
      title: '研究暑期旅行目的地',
      content: '候选地点：\n1. 成都 - 美食之旅\n2. 桂林 - 山水风光\n3. 厦门 - 海滨度假\n\n需要考虑：预算、天气、景点',
      status: 'TODO',
      showInTimeline: false,
      linkedGoalId: goals[8].id,
      linkedGoalLabel: goals[8].title,
      dueDate: createTimestamp(7),
      activityLogs: [
        {
          action: 'CREATED',
          timestamp: createTimestamp(0)
        }
      ]
    },
    {
      id: generateUUID(),
      title: '本周末回家看望父母',
      content: '带上父母喜欢的水果和点心',
      status: 'TODO',
      showInTimeline: true,
      plannedStartAt: createTimestamp(2, 9),
      linkedGoalId: goals[9].id,
      linkedGoalLabel: goals[9].title,
      activityLogs: [
        {
          action: 'CREATED',
          timestamp: createTimestamp(0)
        }
      ]
    },
    {
      id: generateUUID(),
      title: '给妈妈打电话',
      content: '',
      status: 'TODO',
      showInTimeline: true,
      plannedStartAt: createTimestamp(0, 20),
      activityLogs: [
        {
          action: 'CREATED',
          timestamp: createTimestamp(0)
        }
      ]
    },
    // 财务相关任务
    {
      id: generateUUID(),
      title: '研究基金投资策略',
      content: '学习内容：\n- 指数基金定投\n- 风险分散\n- 定投时机选择',
      status: 'TODO',
      showInTimeline: false,
      linkedGoalId: goals[10].id,
      linkedGoalLabel: goals[10].title,
      activityLogs: [
        {
          action: 'CREATED',
          timestamp: createTimestamp(-1)
        }
      ]
    },
    // 收件箱任务（无 Goal 关联）
    {
      id: generateUUID(),
      title: '整理书架',
      content: '清理不再需要的书籍，捐赠或二手售卖。',
      status: 'TODO',
      showInTimeline: false,
      activityLogs: [
        {
          action: 'CREATED',
          timestamp: createTimestamp(-2)
        }
      ]
    },
    {
      id: generateUUID(),
      title: '更新简历',
      content: '添加最近半年的项目经历。',
      status: 'TODO',
      showInTimeline: false,
      activityLogs: [
        {
          action: 'CREATED',
          timestamp: createTimestamp(-5)
        }
      ]
    },
    {
      id: generateUUID(),
      title: '预约牙医检查',
      content: '',
      status: 'TODO',
      showInTimeline: false,
      dueDate: createTimestamp(10),
      activityLogs: [
        {
          action: 'CREATED',
          timestamp: createTimestamp(0)
        }
      ]
    },
    {
      id: generateUUID(),
      title: '缴纳水电费',
      content: '',
      status: 'TODO',
      showInTimeline: false,
      dueDate: createTimestamp(5),
      activityLogs: [
        {
          action: 'CREATED',
          timestamp: createTimestamp(-1)
        }
      ]
    },
    {
      id: generateUUID(),
      title: '清理电脑磁盘空间',
      content: '删除不必要的文件，释放至少 50GB 空间。',
      status: 'TODO',
      showInTimeline: false,
      activityLogs: [
        {
          action: 'CREATED',
          timestamp: createTimestamp(0)
        }
      ]
    },
    // 已完成的任务示例
    {
      id: generateUUID(),
      title: '完成月度工作总结',
      content: '总结本月工作亮点和需要改进的地方。',
      status: 'DONE',
      showInTimeline: false,
      linkedGoalId: goals[0].id,
      linkedGoalLabel: goals[0].title,
      activityLogs: [
        {
          action: 'COMPLETED',
          note: '总结已提交',
          timestamp: createTimestamp(-3)
        },
        {
          action: 'STARTED',
          timestamp: createTimestamp(-4)
        },
        {
          action: 'CREATED',
          timestamp: createTimestamp(-5)
        }
      ]
    },
    {
      id: generateUUID(),
      title: '学习 TypeScript 高级类型',
      content: '',
      status: 'DONE',
      showInTimeline: false,
      linkedGoalId: goals[3].id,
      linkedGoalLabel: goals[3].title,
      activityLogs: [
        {
          action: 'COMPLETED',
          timestamp: createTimestamp(-7)
        },
        {
          action: 'CREATED',
          timestamp: createTimestamp(-10)
        }
      ]
    },
    {
      id: generateUUID(),
      title: '周一健身：有氧训练',
      content: '',
      status: 'DONE',
      showInTimeline: false,
      linkedGoalId: goals[6].id,
      linkedGoalLabel: goals[6].title,
      activityLogs: [
        {
          action: 'COMPLETED',
          note: '完成 40 分钟跑步',
          timestamp: createTimestamp(-2)
        },
        {
          action: 'CREATED',
          timestamp: createTimestamp(-3)
        }
      ]
    }
  ];

  localStorage.setItem('goal-desk-browser-tasks', JSON.stringify(tasks));
  console.log(`✅ 创建了 ${tasks.length} 个待办任务：`);
  console.log(`   - TODO: ${tasks.filter(t => t.status === 'TODO').length} 个`);
  console.log(`   - IN_PROGRESS: ${tasks.filter(t => t.status === 'IN_PROGRESS').length} 个`);
  console.log(`   - DONE: ${tasks.filter(t => t.status === 'DONE').length} 个`);
  console.log(`   - 关联到 Goal: ${tasks.filter(t => t.linkedGoalId).length} 个`);
  console.log(`   - 时间线显示: ${tasks.filter(t => t.showInTimeline).length} 个`);
  console.log(`   - 今日焦点任务 (IN_PROGRESS + plannedStartAt): ${tasks.filter(t => t.status === 'IN_PROGRESS' && t.plannedStartAt).length} 个`);
  console.log('');

  // ==================== 统计信息 ====================

  console.log('📊 数据统计：');
  console.log(`   - 领域（Areas）: ${areas.length} 个`);
  console.log(`   - 目标（Goals）: ${goals.length} 个`);
  console.log(`   - 待办（Tasks）: ${tasks.length} 个`);
  console.log('');

  console.log('✨ 测试数据生成完成！');
  console.log('');
  console.log('🔄 请刷新页面查看效果：');
  console.log('   - Today 视图：查看今日待办和时间线');
  console.log('   - Inbox 视图：查看所有收件箱任务');
  console.log('   - Goals 视图：查看所有目标及进度');
  console.log('   - Board 视图：看板视图展示');
  console.log('   - Areas 视图：查看所有领域');
  console.log('');
  console.log('💡 提示：');
  console.log('   - 点击任务可查看详细内容和活动日志');
  console.log('   - 点击目标可查看关联的任务列表');
  console.log('   - 数据已保存到 localStorage，刷新后依然存在');
  console.log('   - 如需清空数据，在控制台执行：');
  console.log('     localStorage.clear(); location.reload();');
  console.log('');

  // 自动刷新页面
  const autoReload = confirm('是否立即刷新页面查看效果？');
  if (autoReload) {
    location.reload();
  }
})();
