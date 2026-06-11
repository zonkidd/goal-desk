import test from 'node:test'
import assert from 'node:assert/strict'

import { parseBrowserQuickCapture } from './quickCapture.ts'
import {
  deriveGoalRecords,
  filterGoalsByArea,
  getTodayFocusTasks,
  filterTasksByArea,
  filterTimelineByArea,
  getRuntimeModeStatusMessage,
  getTaskContentBadgeLabel,
  getTaskPrimaryStatusLabel,
} from './taskPresentation.ts'

test('browser preview quick capture parses tomorrow afternoon three oclock', () => {
  const now = new Date('2026-06-10T09:00:00+08:00')

  const draft = parseBrowserQuickCapture('明天下午三点看熊掌记的总结笔记', now)

  assert.equal(draft.title, '看熊掌记的总结笔记')
  assert.equal(draft.dueDate?.toISOString(), '2026-06-11T07:00:00.000Z')
})

test('paused tasks expose a resume label instead of todo', () => {
  assert.equal(getTaskPrimaryStatusLabel('PAUSED'), 'Resume')
})

test('browser runtime exposes a preview-only status message', () => {
  assert.equal(getRuntimeModeStatusMessage(false), 'Browser preview only · no SQLite or Tauri IPC')
})

test('empty task content does not claim markdown notes', () => {
  assert.equal(getTaskContentBadgeLabel('   '), '暂无笔记')
})

test('area filter keeps linked tasks in matching area and preserves non-task timeline context', () => {
  const goals = [
    { id: 'goal-health', title: '瘦十斤', area: '健康与运动', progress: 10, nextTodo: '跑步' },
    { id: 'goal-build', title: 'Goal Desk MVP', area: '独立开发', progress: 20, nextTodo: '建看板' },
  ]
  const tasks = [
    { id: 'task-a', linkedGoalId: 'goal-health', title: '今晚跑步', status: 'TODO' },
    { id: 'task-b', linkedGoalId: 'goal-build', title: '实现筛选', status: 'IN_PROGRESS' },
    { id: 'task-c', title: '未归类任务', status: 'TODO' },
  ]
  const timeline = [
    { id: 'cal-1', title: '早会', timeLabel: '09:00', source: 'calendar', readonly: true, done: false },
    { id: 'task-a', title: '今晚跑步', timeLabel: '20:00', source: 'todo', readonly: false, done: false },
    { id: 'task-b', title: '实现筛选', timeLabel: '14:00', source: 'todo', readonly: false, done: false },
  ]

  const filteredGoals = filterGoalsByArea(goals, '健康与运动')
  const filteredTasks = filterTasksByArea(tasks, goals, '健康与运动')
  const filteredTimeline = filterTimelineByArea(timeline, filteredTasks)

  assert.deepEqual(filteredGoals.map((goal) => goal.id), ['goal-health'])
  assert.deepEqual(filteredTasks.map((task) => task.id), ['task-a'])
  assert.deepEqual(filteredTimeline.map((item) => item.id), ['cal-1', 'task-a'])
})

test('goals derive ready-to-complete state and progress from linked tasks', () => {
  const goals = [
    {
      id: 'goal-ship',
      title: 'Ship Goal Desk',
      area: '独立开发',
      description: 'close the first local loop',
      status: 'ACTIVE',
      progress: 0,
      nextTodo: '',
      createdAt: new Date('2026-06-01T09:00:00+08:00'),
      updatedAt: new Date('2026-06-01T09:00:00+08:00'),
    },
    {
      id: 'goal-empty',
      title: 'Future Goal',
      area: '个人成长',
      description: '',
      status: 'ACTIVE',
      progress: 0,
      nextTodo: '',
      createdAt: new Date('2026-06-01T09:00:00+08:00'),
      updatedAt: new Date('2026-06-01T09:00:00+08:00'),
    },
  ]
  const tasks = [
    { id: 'task-a', linkedGoalId: 'goal-ship', title: 'Build inbox', status: 'DONE', activityLogs: [] },
    { id: 'task-b', linkedGoalId: 'goal-ship', title: 'Build board', status: 'DONE', activityLogs: [] },
  ]

  const derived = deriveGoalRecords(goals, tasks)

  assert.equal(derived[0].progress, 100)
  assert.equal(derived[0].status, 'READY_TO_COMPLETE')
  assert.equal(derived[0].taskCount, 2)
  assert.equal(derived[1].progress, 0)
  assert.equal(derived[1].status, 'ACTIVE')
  assert.equal(derived[1].taskCount, 0)
})

test('today focus includes ongoing tasks before their deadline', () => {
  const now = new Date('2026-11-12T09:00:00+08:00')
  const tasks = [
    {
      id: 'task-ongoing',
      title: 'Prepare launch notes',
      status: 'IN_PROGRESS',
      isOngoing: true,
      dueDate: new Date('2026-11-15T18:00:00+08:00'),
      createdAt: new Date('2026-11-11T10:00:00+08:00'),
      activityLogs: [],
    },
    {
      id: 'task-deadline-only',
      title: 'One-day review',
      status: 'TODO',
      dueDate: new Date('2026-11-15T18:00:00+08:00'),
      createdAt: new Date('2026-11-11T10:00:00+08:00'),
      activityLogs: [],
    },
  ]

  const focusTasks = getTodayFocusTasks(tasks, now)

  assert.deepEqual(focusTasks.map((task) => task.id), ['task-ongoing'])
})
