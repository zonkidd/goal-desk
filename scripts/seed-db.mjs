#!/usr/bin/env node

/**
 * 种子数据脚本 — 直接操作 SQLite 数据库
 *
 * 使用 Node.js 内置的 node:sqlite（Node 22.5+），无需安装任何依赖。
 *
 * 用法:
 *   node scripts/seed-db.mjs
 *
 * 效果:
 *   清空所有旧数据（保留系统"未分类"区域），然后创建一条测试数据。
 */

import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DB_PATH = join(homedir(), 'Library', 'Application Support', 'com.goaldesk.app', 'goal-desk.sqlite');

console.log(`📂 数据库路径: ${DB_PATH}`);

const db = new DatabaseSync(DB_PATH);

// ── 0. 清空旧数据（按外键顺序） ──
console.log('\n0️⃣ 清空旧数据...');
db.exec(`
  DELETE FROM desk_task_activity_logs;
  DELETE FROM desk_tasks;
  DELETE FROM milestones;
  DELETE FROM todos;
  DELETE FROM projects;
  DELETE FROM goals;
  DELETE FROM areas WHERE id != '00000000-0000-0000-0000-000000000000';
`);
console.log('✅ 旧数据已清空（系统"未分类"区域已保留）');

// ── 1. 创建测试领域 ──
console.log('\n1️⃣ 创建测试领域...');
const areaId = randomUUID();
db.prepare('INSERT INTO areas (id, title) VALUES (?, ?)').run(areaId, '测试领域');
console.log(`✅ 领域创建成功: ${areaId} / 测试领域`);

// ── 2. 创建测试目标 ──
console.log('\n2️⃣ 创建测试目标...');
const goalId = randomUUID();
db.prepare('INSERT INTO goals (id, area_id, title, description, status) VALUES (?, ?, ?, ?, ?)')
  .run(goalId, areaId, '测试目标', '这是一个测试目标', 'ACTIVE');
console.log(`✅ 目标创建成功: ${goalId} / 测试目标 (ACTIVE)`);

// ── 3. 创建测试任务 ──
console.log('\n3️⃣ 创建测试任务...');
const taskId = randomUUID();
const now = new Date().toISOString();

db.prepare(
  `INSERT INTO desk_tasks (
    id, title, content, status,
    planned_start_at, due_at,
    linked_goal_id, linked_goal_label,
    bear_note_id, system_reminder_id,
    show_in_timeline
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
).run(taskId, '测试任务', '', 'TODO', null, null, goalId, '测试目标', null, null, 0);

// 创建活动日志
const logId = randomUUID();
db.prepare(
  'INSERT INTO desk_task_activity_logs (id, task_id, action, note, timestamp) VALUES (?, ?, ?, ?, ?)'
).run(logId, taskId, 'CREATED', null, now);

console.log(`✅ 任务创建成功: ${taskId} / 测试任务 (TODO)`);

db.close();

console.log('\n🎉 种子数据创建完成！刷新 Tauri 应用即可看到。\n');
