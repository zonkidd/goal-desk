#!/usr/bin/env node

/**
 * Goal Desk 完整种子数据脚本
 *
 * 使用 Node.js 内置的 node:sqlite（Node 22.5+），无需安装任何依赖。
 *
 * 用法:
 *   node scripts/seed-db.mjs
 *
 * 效果:
 *   清空所有旧数据（保留系统"未分类"区域），然后创建完整的测试数据集，
 *   覆盖各种边界条件和功能场景。
 */

import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

// ── 辅助函数 ──

function createTimestamp(daysOffset = 0, hoursOffset = 0, minutesOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(d.getHours() + hoursOffset);
  d.setMinutes(d.getMinutes() + minutesOffset);
  return d.toISOString().replace(/\.\d{3}Z$/, '+08:00');
}

function sqlEscape(str) {
  if (str === null || str === undefined) return null;
  return String(str).replace(/'/g, "''");
}

// ── 主流程 ──

const DB_PATH = join(homedir(), 'Library', 'Application Support', 'com.goaldesk.app', 'goal-desk.sqlite');
console.log(`📂 数据库路径: ${DB_PATH}\n`);

const db = new DatabaseSync(DB_PATH);
const stmt = (sql) => db.prepare(sql);

// ==================== 0. 清空旧数据 ====================
console.log('0️⃣ 清空旧数据...');
db.exec(`
  DELETE FROM desk_task_activity_logs;
  DELETE FROM desk_tasks;
  DELETE FROM milestones;
  DELETE FROM todos;
  DELETE FROM projects;
  DELETE FROM goals;
  DELETE FROM reminders;
  DELETE FROM areas WHERE id != '00000000-0000-0000-0000-000000000000';
`);
console.log('✅ 旧数据已清空（系统"未分类"区域已保留）\n');

// ==================== 1. 创建领域（Areas） ====================
console.log('1️⃣ 创建领域（Areas）...');

const insertArea = stmt('INSERT INTO areas (id, title) VALUES (?, ?)');

const areas = {
  work: randomUUID(),
  growth: randomUUID(),
  health: randomUUID(),
  family: randomUUID(),
  finance: randomUUID(),
  shortTitle: randomUUID(),
  emoji: randomUUID(),
  special: randomUUID(),
};

const areaData = [
  [areas.work, '工作'],
  [areas.growth, '个人成长'],
  [areas.health, '健康'],
  [areas.family, '家庭'],
  [areas.finance, '财务'],
  [areas.shortTitle, 'A'],
  [areas.emoji, '🎯 项目管理'],
  [areas.special, 'Research & Development（R&D）'],
];

for (const [id, title] of areaData) {
  insertArea.run(id, title);
  console.log(`   ✅ ${title}`);
}
console.log(`✅ 创建 ${areaData.length} 个领域\n`);

// ==================== 2. 创建目标（Goals） ====================
console.log('2️⃣ 创建目标（Goals）...');

const insertGoal = stmt(
  'INSERT INTO goals (id, area_id, title, description, status) VALUES (?, ?, ?, ?, ?)'
);

const goals = {};

const goalDefs = [
  // ACTIVE 目标 (6个)
  { key: 'q2_delivery', area: 'work', title: '完成 Q2 项目交付', desc: '按时完成第二季度的所有项目交付目标，包括功能开发、测试和上线部署。', status: 'ACTIVE' },
  { key: 'team_tech', area: 'work', title: '提升团队技术能力', desc: '组织技术分享会，提升团队整体技术水平。', status: 'ACTIVE' },
  { key: 'rust_learn', area: 'growth', title: '学习 Rust 编程语言', desc: '系统学习 Rust，掌握所有权、借用检查等核心概念。', status: 'ACTIVE' },
  { key: 'read_books', area: 'growth', title: '阅读 12 本技术书籍', desc: '今年阅读至少 12 本技术或管理类书籍。', status: 'ACTIVE' },
  { key: 'exercise', area: 'health', title: '每周运动 3 次', desc: '保持每周至少 3 次的有氧运动，每次 30 分钟以上。', status: 'ACTIVE' },
  { key: 'travel_plan', area: 'family', title: '规划暑期家庭旅行', desc: '计划 7 月的家庭旅行，包括目的地选择、预订酒店和行程安排。', status: 'ACTIVE' },

  // PAUSED 目标 (2个)
  { key: 'code_quality', area: 'work', title: '优化代码质量', desc: '重构老旧代码，提高代码可维护性和性能。', status: 'PAUSED' },
  { key: 'sleep_improve', area: 'health', title: '改善睡眠质量', desc: '调整作息，确保每天 7-8 小时优质睡眠。', status: 'PAUSED' },

  // COMPLETED 目标 (3个)
  { key: 'onboard_new', area: 'work', title: '新员工入职培训', desc: '完成新员工入职培训流程。', status: 'COMPLETED' },
  { key: 'obsidian_kb', area: 'growth', title: '建立个人知识库', desc: '使用 Obsidian 搭建个人知识管理系统。', status: 'COMPLETED' },
  { key: 'tax_filing', area: 'finance', title: '完成年度报税', desc: '按时完成个人所得税年度汇算清缴。', status: 'COMPLETED' },

  // ARCHIVED 目标 (2个)
  { key: 'old_project', area: 'work', title: '旧项目维护', desc: '维护旧项目的稳定运行。', status: 'ARCHIVED' },
  { key: 'old_goal', area: 'family', title: '去年旅行计划', desc: '去年的家庭旅行计划（已归档）。', status: 'ARCHIVED' },

  // 边界：无 Area（area_id = NULL）
  { key: 'no_area', area: null, title: '未分类目标', desc: '这是一个没有关联领域的目标。', status: 'ACTIVE' },

  // 边界：空描述 + 特殊字符
  { key: 'empty_desc', area: 'work', title: '🎯 Q2 OKR "关键结果"', desc: '', status: 'ACTIVE' },

  // 边界：关联大量任务的目标
  { key: 'big_goal', area: 'work', title: '大型项目（10+ 任务）', desc: '这是一个关联了很多任务的目标，用于测试进度计算和分页显示。'.repeat(5), status: 'ACTIVE' },
];

for (const g of goalDefs) {
  const id = randomUUID();
  goals[g.key] = id;
  insertGoal.run(id, g.area ? areas[g.area] : null, g.title, g.desc, g.status);
  console.log(`   ✅ [${g.status}] ${g.title}`);
}
console.log(`✅ 创建 ${goalDefs.length} 个目标\n`);

// ==================== 3. 创建任务（DeskTasks） ====================
console.log('3️⃣ 创建任务（DeskTasks）...');

const insertTask = stmt(`
  INSERT INTO desk_tasks (
    id, title, content, status,
    planned_start_at, due_at,
    linked_goal_id, linked_goal_label,
    bear_note_id, system_reminder_id,
    show_in_timeline
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const tasks = {};

const taskDefs = [
  // ── TODO 任务 (8个) ──
  { key: 'todo_fix_bug', title: '修复用户反馈的 3 个 Bug', content: 'Bug 列表：\n1. 登录页面样式错乱\n2. 数据导出失败\n3. 搜索结果不准确', status: 'TODO', goal: 'q2_delivery', due: 3, start: 1, timeline: 1 },
  { key: 'todo_api_doc', title: '编写 API 接口文档', content: '', status: 'TODO', goal: 'q2_delivery', due: 5, start: null, timeline: 0 },
  { key: 'todo_ppt', title: '准备技术分享 PPT', content: '主题：Rust 在生产环境中的实践', status: 'TODO', goal: 'team_tech', due: 7, start: null, timeline: 0 },
  { key: 'todo_book', title: '阅读《系统设计面试》第 3 章', content: '', status: 'TODO', goal: 'read_books', due: 1, start: -1, timeline: 1 },
  { key: 'todo_gym', title: '今晚去健身房', content: '胸部 + 三头肌训练', status: 'TODO', goal: 'exercise', due: 0, start: null, timeline: 1 },
  { key: 'todo_run', title: '周六上午晨跑', content: '5 公里慢跑', status: 'TODO', goal: 'exercise', due: 2, start: 2, timeline: 1 },
  { key: 'todo_travel', title: '研究暑期旅行目的地', content: '候选：云南、新疆、日本', status: 'TODO', goal: 'travel_plan', due: 7, start: null, timeline: 0 },
  { key: 'todo_special', title: '处理 "紧急" 任务 & 其他事务', content: '包含特殊字符：引号\'反斜杠\\换行符', status: 'TODO', goal: 'empty_desc', due: 1, start: 0, timeline: 1 },

  // ── IN_PROGRESS 任务 (7个) ──
  { key: 'ip_frontend', title: '完成前端界面优化', content: '优化目标卡片的交互体验', status: 'IN_PROGRESS', goal: 'q2_delivery', due: 2, start: -1, timeline: 1 },
  { key: 'ip_refactor', title: '重构支付模块代码', content: '将旧的支付逻辑迁移到新的统一支付网关', status: 'IN_PROGRESS', goal: 'code_quality', due: 5, start: -2, timeline: 1 },
  { key: 'ip_rust', title: '完成 Rust 第 8 章练习题', content: '所有权和借用检查相关练习', status: 'IN_PROGRESS', goal: 'rust_learn', due: 1, start: 0, timeline: 1 },
  { key: 'ip_sleep', title: '改善睡眠：早睡挑战第 3 天', content: '目标：23:00 前入睡', status: 'IN_PROGRESS', goal: 'sleep_improve', due: 4, start: -2, timeline: 1 },
  { key: 'ip_weekly', title: '本周健身计划执行中', content: '周一：胸+三头\n周三：背+二头\n周五：腿+肩', status: 'IN_PROGRESS', goal: 'exercise', due: 1, start: -6, timeline: 1 },
  { key: 'ip_big1', title: '大型任务 1：需求分析', content: '完成产品需求文档', status: 'IN_PROGRESS', goal: 'big_goal', due: 3, start: -1, timeline: 1 },
  { key: 'ip_big2', title: '大型任务 2：技术选型', content: '评估候选技术方案', status: 'IN_PROGRESS', goal: 'big_goal', due: 5, start: 0, timeline: 1 },

  // ── PAUSED 任务 (3个) ──
  { key: 'paused_deploy', title: '部署到生产环境', content: '等待 QA 验证完成后部署', status: 'PAUSED', goal: 'q2_delivery', due: 7, start: null, timeline: 0 },
  { key: 'paused_test', title: '编写集成测试', content: '覆盖核心业务流程', status: 'PAUSED', goal: 'code_quality', due: 10, start: null, timeline: 0 },
  { key: 'paused_review', title: '代码审查：支付模块', content: '审查支付模块的重构代码', status: 'PAUSED', goal: 'code_quality', due: 0, start: null, timeline: 1 },

  // ── DONE 任务 (6个) ──
  { key: 'done_setup', title: '完成开发环境搭建', content: '配置 IDE、Git、数据库等开发工具', status: 'DONE', goal: 'onboard_new', due: -5, start: -7, timeline: 0 },
  { key: 'done_template', title: '整理 Obsidian 笔记模板', content: '创建日记、周报、项目笔记模板', status: 'DONE', goal: 'obsidian_kb', due: -3, start: -5, timeline: 0 },
  { key: 'done_tax', title: '收集报税材料', content: '整理工资单、发票、扣除凭证', status: 'DONE', goal: 'tax_filing', due: -2, start: -4, timeline: 0 },
  { key: 'done_reopen', title: '已重新打开的任务', content: '原本已完成，但发现需要修改', status: 'TODO', goal: 'team_tech', due: 2, start: null, timeline: 0, reopen: true },
  { key: 'done_old1', title: '旧项目：数据库迁移', content: '将旧数据库迁移到新架构', status: 'DONE', goal: 'old_project', due: -10, start: -15, timeline: 0 },
  { key: 'done_old2', title: '旧项目：文档整理', content: '整理旧项目的技术文档', status: 'DONE', goal: 'old_project', due: -8, start: -12, timeline: 0 },

  // ── 收件箱任务 (3个，无关联目标) ──
  { key: 'inbox1', title: '周会：讨论技术架构升级方案', content: '准备架构升级的 proposal', status: 'TODO', goal: null, due: 3, start: null, timeline: 1 },
  { key: 'inbox2', title: '购买健身补剂', content: '蛋白粉、肌酸', status: 'TODO', goal: null, due: null, start: null, timeline: 0 },
  { key: 'inbox3', title: '整理书架', content: '', status: 'TODO', goal: null, due: null, start: null, timeline: 0 },

  // ── 边界：时间边界 ──
  { key: 'overdue_severe', title: '严重过期任务（7天前）', content: '这个任务已经过期 7 天了', status: 'TODO', goal: 'q2_delivery', due: -7, start: -10, timeline: 1 },
  { key: 'overdue_yesterday', title: '刚过期任务（昨天）', content: '昨天到期但未完成', status: 'TODO', goal: 'q2_delivery', due: -1, start: -3, timeline: 1 },
  { key: 'due_today', title: '今天到期的任务', content: '今天必须完成！', status: 'IN_PROGRESS', goal: 'q2_delivery', due: 0, start: -1, timeline: 1 },
  { key: 'due_tomorrow', title: '明天到期的任务', content: '明天截止', status: 'TODO', goal: 'q2_delivery', due: 1, start: null, timeline: 1 },
  { key: 'future_task', title: '一周后到期的任务', content: '下周再处理', status: 'TODO', goal: 'travel_plan', due: 7, start: 2, timeline: 1 },

  // ── 边界：关联边界 ──
  { key: 'linked_paused', title: '关联暂停目标的任务', content: '目标已暂停', status: 'TODO', goal: 'code_quality', due: 5, start: null, timeline: 0 },
  { key: 'linked_completed', title: '关联已完成目标的任务', content: '目标已完成', status: 'TODO', goal: 'obsidian_kb', due: null, start: null, timeline: 0 },
  { key: 'linked_archived', title: '关联归档目标的任务', content: '目标已归档', status: 'TODO', goal: 'old_project', due: null, start: null, timeline: 0 },

  // ── 边界：内容边界 ──
  { key: 'empty_content', title: '空内容任务', content: '', status: 'TODO', goal: null, due: null, start: null, timeline: 0 },
  { key: 'long_content', title: '长内容任务', content: '这是一段非常长的任务内容。'.repeat(50), status: 'TODO', goal: null, due: null, start: null, timeline: 0 },
  { key: 'special_chars', title: '特殊字符任务："引号" & 符号', content: '包含引号、&、<、> 等特殊字符', status: 'TODO', goal: null, due: null, start: null, timeline: 0 },

  // ── 边界：时间跨度重叠 ──
  // 同一天有多个任务到期，测试时间线排序
  { key: 'overlap_today_a', title: '今天任务 A（上午到期）', content: '重叠测试：今天上午到期', status: 'IN_PROGRESS', goal: 'q2_delivery', due: 0, start: -2, timeline: 1 },
  { key: 'overlap_today_b', title: '今天任务 B（下午到期）', content: '重叠测试：今天下午到期', status: 'TODO', goal: 'q2_delivery', due: 0, start: -1, timeline: 1 },
  { key: 'overlap_today_c', title: '今天任务 C（晚上到期）', content: '重叠测试：今天晚上到期', status: 'TODO', goal: 'q2_delivery', due: 0, start: 0, timeline: 1 },

  // 跨天任务：开始时间在昨天，结束时间在明天
  { key: 'overlap_span', title: '跨天任务（昨天开始→明天结束）', content: '测试跨天时间跨度', status: 'IN_PROGRESS', goal: 'q2_delivery', due: 1, start: -1, timeline: 1 },

  // 完全重叠：两个任务时间完全相同
  { key: 'overlap_exact_a', title: '完全重叠任务 A', content: '与 B 时间完全相同', status: 'TODO', goal: 'team_tech', due: 2, start: 0, timeline: 1 },
  { key: 'overlap_exact_b', title: '完全重叠任务 B', content: '与 A 时间完全相同', status: 'IN_PROGRESS', goal: 'team_tech', due: 2, start: 0, timeline: 1 },

  // ── 边界：同一天多任务优先级排序 ──
  // 5 个任务都在明天，测试按紧急度/状态排序
  { key: 'priority_urgent', title: '紧急：明天必须完成', content: '优先级最高', status: 'IN_PROGRESS', goal: 'q2_delivery', due: 1, start: -1, timeline: 1 },
  { key: 'priority_high', title: '高优：明天尽量完成', content: '优先级高', status: 'TODO', goal: 'q2_delivery', due: 1, start: 0, timeline: 1 },
  { key: 'priority_medium', title: '中优：明天可以做', content: '优先级中', status: 'TODO', goal: 'team_tech', due: 1, start: null, timeline: 1 },
  { key: 'priority_low', title: '低优：明天有空再做', content: '优先级低', status: 'TODO', goal: 'team_tech', due: 1, start: null, timeline: 1 },
  { key: 'priority_paused', title: '暂停：明天暂停中', content: '优先级最低', status: 'PAUSED', goal: 'code_quality', due: 1, start: null, timeline: 0 },
];

for (const t of taskDefs) {
  const id = randomUUID();
  tasks[t.key] = id;
  const goalId = t.goal ? goals[t.goal] : null;
  const goalLabel = t.goal ? goalDefs.find(g => g.key === t.goal)?.title : null;

  insertTask.run(
    id,
    t.title,
    t.content,
    t.status,
    t.start !== null ? createTimestamp(t.start) : null,
    t.due !== null ? createTimestamp(t.due) : null,
    goalId,
    goalLabel,
    null, // bear_note_id
    null, // system_reminder_id
    t.timeline || 0
  );
  console.log(`   ✅ [${t.status}] ${t.title}`);
}
console.log(`✅ 创建 ${taskDefs.length} 个任务\n`);

// ==================== 4. 创建里程碑（Milestones） ====================
console.log('4️⃣ 创建里程碑（Milestones）...');

const insertMilestone = stmt(
  'INSERT INTO milestones (id, goal_id, title, completed) VALUES (?, ?, ?, ?)'
);

const milestoneDefs = [
  // Q2 项目交付：6 个里程碑（测试同一目标下多个里程碑）
  { goal: 'q2_delivery', title: '需求分析完成', completed: 1 },
  { goal: 'q2_delivery', title: '前端开发完成', completed: 1 },
  { goal: 'q2_delivery', title: '后端开发完成', completed: 0 },
  { goal: 'q2_delivery', title: 'API 联调完成', completed: 0 },
  { goal: 'q2_delivery', title: 'QA 测试通过', completed: 0 },
  { goal: 'q2_delivery', title: '生产环境上线', completed: 0 },

  // Rust 学习：5 个里程碑
  { goal: 'rust_learn', title: '完成基础语法学习', completed: 1 },
  { goal: 'rust_learn', title: '完成所有权章节', completed: 1 },
  { goal: 'rust_learn', title: '完成生命周期章节', completed: 0 },
  { goal: 'rust_learn', title: '完成并发编程章节', completed: 0 },
  { goal: 'rust_learn', title: '完成异步编程章节', completed: 0 },

  // 每周运动：3 个里程碑
  { goal: 'exercise', title: '第 1 周完成 3 次运动', completed: 1 },
  { goal: 'exercise', title: '第 2 周完成 3 次运动', completed: 0 },
  { goal: 'exercise', title: '第 3 周完成 3 次运动', completed: 0 },

  // 阅读书籍：2 个里程碑
  { goal: 'read_books', title: '读完第 1 本书', completed: 1 },
  { goal: 'read_books', title: '读完第 2 本书', completed: 0 },
];

for (const m of milestoneDefs) {
  insertMilestone.run(randomUUID(), goals[m.goal], m.title, m.completed);
  console.log(`   ✅ ${m.title} (${m.completed ? '已完成' : '未完成'})`);
}
console.log(`✅ 创建 ${milestoneDefs.length} 个里程碑\n`);

// ==================== 5. 创建活动日志（ActivityLogs） ====================
console.log('5️⃣ 创建活动日志（ActivityLogs）...');

const insertLog = stmt(
  'INSERT INTO desk_task_activity_logs (id, task_id, action, note, timestamp) VALUES (?, ?, ?, ?, ?)'
);

const logDefs = [
  // CREATED 日志
  { task: 'ip_frontend', action: 'CREATED', note: null, days: -7 },
  { task: 'ip_refactor', action: 'CREATED', note: null, days: -10 },
  { task: 'ip_rust', action: 'CREATED', note: null, days: -5 },
  { task: 'done_setup', action: 'CREATED', note: null, days: -14 },
  { task: 'done_template', action: 'CREATED', note: null, days: -8 },
  { task: 'done_reopen', action: 'CREATED', note: null, days: -6 },

  // STARTED 日志
  { task: 'ip_frontend', action: 'STARTED', note: '开始前端优化工作', days: -3 },
  { task: 'ip_refactor', action: 'STARTED', note: '开始重构支付模块', days: -2 },
  { task: 'ip_rust', action: 'STARTED', note: '开始学习 Rust 第 8 章', days: -1 },
  { task: 'due_today', action: 'STARTED', note: '今天必须完成', days: 0 },

  // PAUSED 日志
  { task: 'paused_deploy', action: 'PAUSED', note: '等待 QA 验证', days: -1 },
  { task: 'paused_test', action: 'PAUSED', note: '优先级调整', days: -2 },
  { task: 'paused_review', action: 'PAUSED', note: '等待重构完成', days: 0 },

  // RESUMED 日志
  { task: 'done_reopen', action: 'RESUMED', note: null, days: -1 },
  { task: 'ip_weekly', action: 'RESUMED', note: '周三恢复训练', days: -3 },

  // COMPLETED 日志
  { task: 'done_setup', action: 'COMPLETED', note: null, days: -5 },
  { task: 'done_template', action: 'COMPLETED', note: '模板已创建完成', days: -3 },
  { task: 'done_tax', action: 'COMPLETED', note: null, days: -2 },

  // NOTE_ADDED 日志
  { task: 'ip_frontend', action: 'NOTE_ADDED', note: '优化方案已确定，开始实施', days: -2 },
  { task: 'ip_refactor', action: 'NOTE_ADDED', note: '这是一段超长的笔记内容。'.repeat(10), days: -1 },
];

for (const l of logDefs) {
  insertLog.run(randomUUID(), tasks[l.task], l.action, l.note, createTimestamp(l.days));
  console.log(`   ✅ ${l.action}: ${l.task}`);
}
console.log(`✅ 创建 ${logDefs.length} 条活动日志\n`);

// ==================== 统计信息 ====================
console.log('📊 数据统计：');
console.log(`   - 领域（Areas）: ${areaData.length} 个`);
console.log(`   - 目标（Goals）: ${goalDefs.length} 个`);
console.log(`     • ACTIVE: ${goalDefs.filter(g => g.status === 'ACTIVE').length} 个`);
console.log(`     • PAUSED: ${goalDefs.filter(g => g.status === 'PAUSED').length} 个`);
console.log(`     • COMPLETED: ${goalDefs.filter(g => g.status === 'COMPLETED').length} 个`);
console.log(`     • ARCHIVED: ${goalDefs.filter(g => g.status === 'ARCHIVED').length} 个`);
console.log(`   - 任务（Tasks）: ${taskDefs.length} 个`);
console.log(`     • TODO: ${taskDefs.filter(t => t.status === 'TODO').length} 个`);
console.log(`     • IN_PROGRESS: ${taskDefs.filter(t => t.status === 'IN_PROGRESS').length} 个`);
console.log(`     • PAUSED: ${taskDefs.filter(t => t.status === 'PAUSED').length} 个`);
console.log(`     • DONE: ${taskDefs.filter(t => t.status === 'DONE').length} 个`);
console.log(`     • 收件箱任务: ${taskDefs.filter(t => !t.goal).length} 个`);
console.log(`   - 里程碑（Milestones）: ${milestoneDefs.length} 个`);
console.log(`   - 活动日志（ActivityLogs）: ${logDefs.length} 条`);

db.close();

console.log('\n🎉 种子数据创建完成！');
console.log('\n🔄 请刷新 Tauri 应用查看效果：');
console.log('   - Today 视图：查看今日待办和时间线');
console.log('   - Inbox 视图：查看收件箱任务');
console.log('   - Goals 视图：查看所有目标及进度');
console.log('   - 各领域下的目标分组');
console.log('');
