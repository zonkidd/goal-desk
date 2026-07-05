import test from 'node:test'
import assert from 'node:assert/strict'

import { parseBrowserQuickCapture } from './quickCapture.ts'
import {
  getTaskStatusActions,
  getRuntimeModeStatusMessage,
  getTaskContentBadgeLabel,
  getTaskPrimaryStatusLabel,
  logActionForTransition,
} from './taskPresentation.ts'
import {
  filterGoalsByArea,
  filterTasksByArea,
  filterTimelineByArea,
  getInboxTaskGroups,
  getTodayFocusTasks,
} from './workspaceDerivation.ts'

test('browser preview quick capture parses tomorrow afternoon three oclock', () => {
  const now = new Date('2026-06-10T09:00:00+08:00')

  const draft = parseBrowserQuickCapture('明天下午三点看熊掌记的总结笔记', now)

  assert.equal(draft.title, '看熊掌记的总结笔记')
  assert.equal(draft.plannedStartAt?.toISOString(), '2026-06-11T07:00:00.000Z')
})

test('quick capture cleans 之前 deadline keyword without leaving residual characters', () => {
  const now = new Date('2026-06-10T09:00:00+08:00')

  const draft = parseBrowserQuickCapture('明天3点之前完成报告', now)

  assert.equal(draft.title, '完成报告')
  assert.ok(draft.dueDate, 'should set dueDate for deadline')
})

test('quick capture cleans 前 deadline keyword correctly', () => {
  const now = new Date('2026-06-10T09:00:00+08:00')

  const draft = parseBrowserQuickCapture('明天3点前提交代码', now)

  assert.equal(draft.title, '提交代码')
  assert.ok(draft.dueDate, 'should set dueDate for deadline')
})

test('quick capture cleans 截止 keyword correctly', () => {
  const now = new Date('2026-06-10T09:00:00+08:00')

  const draft = parseBrowserQuickCapture('明天截止写文档', now)

  assert.equal(draft.title, '写文档')
  assert.ok(draft.dueDate, 'should set dueDate for deadline')
})

test('paused tasks expose a resume label instead of todo', () => {
  assert.equal(getTaskPrimaryStatusLabel('PAUSED'), 'Resume')
})

test('todo status actions only expose valid next moves for each state', () => {
  assert.deepEqual(getTaskStatusActions('TODO'), ['IN_PROGRESS', 'DONE'])
  assert.deepEqual(getTaskStatusActions('IN_PROGRESS'), ['PAUSED', 'DONE'])
  assert.deepEqual(getTaskStatusActions('PAUSED'), ['IN_PROGRESS', 'DONE'])
  assert.deepEqual(getTaskStatusActions('DONE'), [])
})

test('task primary status labels match the action semantics for visible transitions', () => {
  assert.equal(getTaskPrimaryStatusLabel('TODO'), 'Start')
  assert.equal(getTaskPrimaryStatusLabel('PAUSED'), 'Resume')
  assert.equal(getTaskPrimaryStatusLabel('IN_PROGRESS'), 'Pause')
  assert.equal(getTaskPrimaryStatusLabel('DONE'), '')
})

test('status transitions use precise activity log actions', () => {
  assert.equal(logActionForTransition('TODO', 'IN_PROGRESS'), 'STARTED')
  assert.equal(logActionForTransition('PAUSED', 'IN_PROGRESS'), 'RESUMED')
  assert.equal(logActionForTransition('IN_PROGRESS', 'PAUSED'), 'PAUSED')
  assert.equal(logActionForTransition('TODO', 'DONE'), 'COMPLETED')
  assert.equal(logActionForTransition('IN_PROGRESS', 'DONE'), 'COMPLETED')
  assert.equal(logActionForTransition('PAUSED', 'DONE'), 'COMPLETED')
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

  const focusTasks = getTodayFocusTasks(tasks, [], 'ALL', now)

  assert.deepEqual(focusTasks.map((task) => task.id), ['task-ongoing'])
})

test('inbox groups completed todos separately and keeps them collapsed by default', () => {
  const tasks = [
    {
      id: 'task-todo',
      title: 'Write proposal',
      status: 'TODO',
      activityLogs: [{ action: 'CREATED', timestamp: new Date('2026-06-11T09:00:00+08:00') }],
    },
    {
      id: 'task-progress',
      title: 'Review prototype',
      status: 'IN_PROGRESS',
      activityLogs: [{ action: 'RESUMED', timestamp: new Date('2026-06-11T10:00:00+08:00') }],
    },
    {
      id: 'task-paused',
      title: 'Wait on feedback',
      status: 'PAUSED',
      activityLogs: [{ action: 'PAUSED', timestamp: new Date('2026-06-11T08:00:00+08:00') }],
    },
    {
      id: 'task-done',
      title: 'Ship patch',
      status: 'DONE',
      activityLogs: [{ action: 'COMPLETED', timestamp: new Date('2026-06-11T11:00:00+08:00') }],
    },
  ]

  const grouped = getInboxTaskGroups(tasks)

  assert.deepEqual(grouped.activeTasks.map((task) => task.id), ['task-progress', 'task-todo'])
  assert.deepEqual(grouped.pausedTasks.map((task) => task.id), ['task-paused'])
  assert.equal(grouped.completed.isCollapsedByDefault, true)
  assert.equal(grouped.completed.totalCount, 1)
  assert.deepEqual(grouped.completed.visibleTasks, [])
})

test('inbox can expand completed todos in recent-first order', () => {
  const tasks = [
    {
      id: 'task-done-older',
      title: 'Older done',
      status: 'DONE',
      activityLogs: [{ action: 'COMPLETED', timestamp: new Date('2026-06-11T09:00:00+08:00') }],
    },
    {
      id: 'task-done-newer',
      title: 'Newer done',
      status: 'DONE',
      activityLogs: [{ action: 'COMPLETED', timestamp: new Date('2026-06-11T11:00:00+08:00') }],
    },
  ]

  const grouped = getInboxTaskGroups(tasks, true)

  assert.equal(grouped.completed.totalCount, 2)
  assert.deepEqual(grouped.completed.visibleTasks.map((task) => task.id), ['task-done-newer', 'task-done-older'])
})
