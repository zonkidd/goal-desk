/**
 * Goal Desk Tauri 模式种子数据脚本
 *
 * 使用方法：
 * 1. 运行 Tauri 应用：npm run tauri:dev
 * 2. 打开开发者工具（macOS: Cmd+Option+I）
 * 3. 切换到 Console（控制台）标签
 * 4. 复制本文件的全部内容粘贴到控制台
 * 5. 按 Enter 执行
 * 6. 等待数据创建完成后刷新页面
 *
 * 注意：
 * - 本脚本通过 Tauri commands 将数据写入 SQLite 数据库
 * - 数据持久化保存，重启应用后依然存在
 * - 如需清空数据，请删除数据库文件：
 *   macOS: ~/Library/Application Support/com.goal-desk.app/goal-desk.sqlite
 */

(async function() {
  console.log('🚀 开始生成 Goal Desk Tauri 模式测试数据...\n');

  // 检查是否在 Tauri 环境中
  if (!window.__TAURI__) {
    console.error('❌ 错误：必须在 Tauri 应用中运行此脚本！');
    console.log('请使用 npm run tauri:dev 启动应用，然后在开发者工具中执行。');
    return;
  }

  const { invoke } = window.__TAURI__.core;

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

  const areaDefinitions = [
    '工作',
    '个人成长',
    '健康',
    '家庭',
    '财务'
  ];

  const createdAreas = {};
  for (const title of areaDefinitions) {
    try {
      const area = await invoke('create_area', { title });
      createdAreas[title] = area.id;
      console.log(`✅ 创建领域: ${title}`);
    } catch (error) {
      console.error(`❌ 创建领域失败 (${title}):`, error);
    }
  }

  console.log(`\n总计创建 ${Object.keys(createdAreas).length} 个领域\n`);

  // ==================== 创建 Goals ====================

  console.log('🎯 创建目标（Goals）...');

  const goalDefinitions = [
    // 工作领域
    {
      title: '完成 Q2 项目交付',
      area: '工作',
      description: '按时完成第二季度的所有项目交付目标，包括功能开发、测试和上线部署。',
      status: 'ACTIVE',
      tasks: [
        { title: '完成前端界面优化', plannedStartAt: createTimestamp(-1, 9), dueDate: createTimestamp(2), status: 'IN_PROGRESS' },
        { title: '编写 API 接口文档', plannedStartAt: createTimestamp(0, 10), dueDate: createTimestamp(1), status: 'IN_PROGRESS' },
        { title: '修复用户反馈的 3 个 Bug', plannedStartAt: createTimestamp(1, 10), dueDate: createTimestamp(3), status: 'TODO' },
        { title: '编写 API 文档', status: 'TODO' },
      ]
    },
    {
      title: '提升团队技术能力',
      area: '工作',
      description: '组织技术分享会，提升团队整体技术水平。',
      status: 'ACTIVE',
      tasks: [
        { title: '准备技术分享 PPT', dueDate: createTimestamp(5), status: 'TODO' },
      ]
    },
    {
      title: '优化代码质量',
      area: '工作',
      description: '重构老旧代码，提高代码可维护性和性能。',
      status: 'PAUSED',
      tasks: [
        { title: '重构支付模块代码', plannedStartAt: createTimestamp(-2, 14), dueDate: createTimestamp(5), status: 'IN_PROGRESS' },
      ]
    },
    // 个人成长领域
    {
      title: '学习 Rust 编程语言',
      area: '个人成长',
      description: '系统学习 Rust，掌握所有权、借用检查等核心概念。',
      status: 'ACTIVE',
      tasks: [
        { title: '完成 Rust 第 8 章练习题', plannedStartAt: createTimestamp(0, 8), dueDate: createTimestamp(1), status: 'IN_PROGRESS' },
      ]
    },
    {
      title: '阅读 12 本技术书籍',
      area: '个人成长',
      description: '今年阅读至少 12 本技术或管理类书籍。',
      status: 'ACTIVE',
      tasks: [
        { title: '阅读《系统设计面试》第 3 章', plannedStartAt: createTimestamp(-1, 20), status: 'IN_PROGRESS' },
      ]
    },
    {
      title: '建立个人知识库',
      area: '个人成长',
      description: '使用 Obsidian 搭建个人知识管理系统。',
      status: 'READY_TO_COMPLETE',
      tasks: [
        { title: '整理 Obsidian 笔记模板', status: 'TODO' },
      ]
    },
    // 健康领域
    {
      title: '每周运动 3 次',
      area: '健康',
      description: '保持每周至少 3 次的有氧运动，每次 30 分钟以上。',
      status: 'ACTIVE',
      tasks: [
        { title: '今晚去健身房', plannedStartAt: createTimestamp(0, 19), status: 'TODO' },
        { title: '本周健身计划执行中', plannedStartAt: createTimestamp(-6, 7), dueDate: createTimestamp(1), status: 'IN_PROGRESS' },
        { title: '周六上午晨跑', plannedStartAt: createTimestamp(2, 7), status: 'TODO' },
      ]
    },
    {
      title: '改善睡眠质量',
      area: '健康',
      description: '调整作息，确保每天 7-8 小时优质睡眠。',
      status: 'ACTIVE',
      tasks: [
        { title: '改善睡眠：早睡挑战第 3 天', plannedStartAt: createTimestamp(-2, 22), dueDate: createTimestamp(4), status: 'IN_PROGRESS' },
        { title: '调整作息：晚上 11 点前睡觉', status: 'TODO' },
      ]
    },
    // 家庭领域
    {
      title: '规划暑期家庭旅行',
      area: '家庭',
      description: '计划 7 月的家庭旅行，包括目的地选择、预订酒店和行程安排。',
      status: 'ACTIVE',
      tasks: [
        { title: '研究暑期旅行目的地', dueDate: createTimestamp(7), status: 'TODO' },
      ]
    },
    {
      title: '陪伴父母',
      area: '家庭',
      description: '每月至少回家看望父母一次。',
      status: 'ACTIVE',
      tasks: [
        { title: '本周末回家看望父母', plannedStartAt: createTimestamp(2, 9), status: 'TODO' },
        { title: '给妈妈打电话', plannedStartAt: createTimestamp(0, 20), status: 'TODO' },
      ]
    },
    // 财务领域
    {
      title: '建立投资组合',
      area: '财务',
      description: '学习投资理财知识，建立合理的投资组合。',
      status: 'ACTIVE',
      tasks: [
        { title: '研究基金投资策略', status: 'TODO' },
      ]
    },
    {
      title: '年度储蓄目标',
      area: '财务',
      description: '今年存款目标达到 10 万元。',
      status: 'ACTIVE',
      tasks: []
    }
  ];

  const createdGoals = [];
  let totalTasks = 0;

  for (const goalDef of goalDefinitions) {
    try {
      const goal = await invoke('create_goal', {
        title: goalDef.title,
        area: goalDef.area,
        description: goalDef.description,
        status: goalDef.status
      });

      createdGoals.push({
        ...goal,
        taskDefinitions: goalDef.tasks
      });

      console.log(`✅ 创建目标: ${goalDef.area} / ${goalDef.title}`);

      // 为该目标创建任务
      for (const taskDef of goalDef.tasks) {
        try {
          const task = await invoke('create_task_for_goal', {
            goalId: goal.id,
            title: taskDef.title
          });

          // 更新任务的其他字段（状态、时间等）
          if (taskDef.status || taskDef.plannedStartAt || taskDef.dueDate) {
            await invoke('update_task_fields', {
              taskId: task.id,
              title: taskDef.title,
              plannedStartAt: taskDef.plannedStartAt || null,
              dueDate: taskDef.dueDate || null,
              linkedGoalId: goal.id,
              linkedGoalLabel: goal.title,
              showInTimeline: !!(taskDef.plannedStartAt || taskDef.dueDate)
            });
          }

          if (taskDef.status && taskDef.status !== 'TODO') {
            await invoke('update_task_status', {
              taskId: task.id,
              status: taskDef.status,
              note: taskDef.status === 'IN_PROGRESS' ? '开始工作' : null
            });
          }

          totalTasks++;
          console.log(`  ✅ 创建任务: ${taskDef.title}`);
        } catch (error) {
          console.error(`  ❌ 创建任务失败 (${taskDef.title}):`, error);
        }
      }
    } catch (error) {
      console.error(`❌ 创建目标失败 (${goalDef.title}):`, error);
    }
  }

  console.log(`\n总计创建 ${createdGoals.length} 个目标和 ${totalTasks} 个任务\n`);

  // ==================== 创建独立任务（收件箱任务） ====================

  console.log('📋 创建收件箱任务（无关联目标）...');

  const inboxTaskDefinitions = [
    { title: '代码审查：支付模块', plannedStartAt: createTimestamp(0, 14), dueDate: createTimestamp(0), status: 'TODO' },
    { title: '周会：讨论技术架构升级方案', plannedStartAt: createTimestamp(3, 10), status: 'TODO' },
    { title: '购买健身补剂', status: 'TODO' },
    { title: '整理书架', status: 'TODO' },
    { title: '更新简历', status: 'TODO' },
    { title: '预约牙医检查', dueDate: createTimestamp(10), status: 'TODO' },
    { title: '缴纳水电费', dueDate: createTimestamp(5), status: 'TODO' },
    { title: '清理电脑磁盘空间', status: 'TODO' },
  ];

  let inboxTaskCount = 0;
  for (const taskDef of inboxTaskDefinitions) {
    try {
      const task = await invoke('capture_task', {
        input: taskDef.title
      });

      // 更新任务字段
      if (taskDef.plannedStartAt || taskDef.dueDate) {
        await invoke('update_task_fields', {
          taskId: task.id,
          title: taskDef.title,
          plannedStartAt: taskDef.plannedStartAt || null,
          dueDate: taskDef.dueDate || null,
          linkedGoalId: null,
          linkedGoalLabel: null,
          showInTimeline: !!(taskDef.plannedStartAt || taskDef.dueDate)
        });
      }

      inboxTaskCount++;
      console.log(`✅ 创建收件箱任务: ${taskDef.title}`);
    } catch (error) {
      console.error(`❌ 创建收件箱任务失败 (${taskDef.title}):`, error);
    }
  }

  console.log(`\n总计创建 ${inboxTaskCount} 个收件箱任务\n`);

  // ==================== 统计信息 ====================

  console.log('📊 数据统计：');
  console.log(`   - 领域（Areas）: ${Object.keys(createdAreas).length} 个`);
  console.log(`   - 目标（Goals）: ${createdGoals.length} 个`);
  console.log(`   - 待办（Tasks）: ${totalTasks + inboxTaskCount} 个`);
  console.log(`     • 关联目标的任务: ${totalTasks} 个`);
  console.log(`     • 收件箱任务: ${inboxTaskCount} 个`);
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
  console.log('   - 数据已保存到 SQLite 数据库，重启后依然存在');
  console.log('   - 如需清空数据，请删除数据库文件：');
  console.log('     macOS: ~/Library/Application Support/com.goal-desk.app/goal-desk.sqlite');
  console.log('');

  // 自动刷新页面
  const autoReload = confirm('是否立即刷新页面查看效果？');
  if (autoReload) {
    location.reload();
  }
})();
