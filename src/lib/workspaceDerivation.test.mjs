import test from 'node:test'
import assert from 'node:assert/strict'

import { deriveWorkspaceState } from './workspaceDerivation.ts'

function buildGoal(overrides = {}) {
  return {
    id: 'goal-1',
    title: 'Ship Goal Desk',
    area: '独立开发',
    description: '',
    status: 'ACTIVE',
    progress: 0,
    nextTodo: 'Keep going',
    taskCount: 0,
    createdAt: new Date('2026-06-01T09:00:00+08:00'),
    updatedAt: new Date('2026-06-01T09:00:00+08:00'),
    ...overrides,
  }
}

function buildTask(overrides = {}) {
  return {
    id: 'task-1',
    title: 'Task',
    content: '',
    status: 'TODO',
    activityLogs: [{ action: 'CREATED', timestamp: new Date('2026-06-11T09:00:00+08:00') }],
    createdAt: new Date('2026-06-11T09:00:00+08:00'),
    updatedAt: new Date('2026-06-11T09:00:00+08:00'),
    ...overrides,
  }
}

test('completed todos appear only in the inbox completed group', () => {
  const state = deriveWorkspaceState({
    baseTimeline: [],
    baseGoals: [buildGoal()],
    tasks: [
      buildTask({ id: 'task-todo', title: 'Todo task', linkedGoalId: 'goal-1' }),
      buildTask({ id: 'task-done', title: 'Done task', status: 'DONE', linkedGoalId: 'goal-1' }),
    ],
    activeArea: 'ALL',
    showCompletedTodos: true,
  })

  assert.deepEqual(state.inbox.activeTasks.map((task) => task.id), ['task-todo'])
  assert.deepEqual(state.inbox.pausedTasks, [])
  assert.deepEqual(state.inbox.completed.visibleTasks.map((task) => task.id), ['task-done'])
})

test('paused and completed todos stay out of today focus', () => {
  const state = deriveWorkspaceState({
    baseTimeline: [],
    baseGoals: [buildGoal()],
    tasks: [
      buildTask({
        id: 'task-ongoing',
        status: 'IN_PROGRESS',
        linkedGoalId: 'goal-1',
        plannedStartAt: new Date('2026-06-11T09:00:00+08:00'),
        dueDate: new Date('2026-06-15T18:00:00+08:00'),
      }),
      buildTask({
        id: 'task-paused',
        status: 'PAUSED',
        linkedGoalId: 'goal-1',
        plannedStartAt: new Date('2026-06-11T09:00:00+08:00'),
        dueDate: new Date('2026-06-15T18:00:00+08:00'),
      }),
      buildTask({
        id: 'task-done',
        status: 'DONE',
        linkedGoalId: 'goal-1',
        plannedStartAt: new Date('2026-06-11T09:00:00+08:00'),
        dueDate: new Date('2026-06-15T18:00:00+08:00'),
      }),
    ],
    activeArea: 'ALL',
    now: new Date('2026-06-12T10:00:00+08:00'),
  })

  assert.deepEqual(state.todayFocusTasks.map((task) => task.id), ['task-ongoing'])
})

test('goal progress and next todo remain correct under area filtering', () => {
  const state = deriveWorkspaceState({
    baseTimeline: [],
    baseGoals: [buildGoal(), buildGoal({ id: 'goal-2', title: 'Health goal', area: '健康与运动' })],
    tasks: [
      buildTask({ id: 'task-done', status: 'DONE', linkedGoalId: 'goal-1', title: 'Done slice' }),
      buildTask({
        id: 'task-next',
        status: 'TODO',
        linkedGoalId: 'goal-1',
        title: 'Next slice',
        dueDate: new Date('2026-06-12T18:00:00+08:00'),
      }),
      buildTask({ id: 'task-health', linkedGoalId: 'goal-2', title: 'Run' }),
    ],
    activeArea: '独立开发',
  })

  assert.deepEqual(state.goals.map((goal) => goal.id), ['goal-1'])
  assert.equal(state.goals[0].progress, 50)
  assert.equal(state.goals[0].nextTodo, 'Next slice')
})

test('today timeline stays aligned with scheduled todos under area filtering', () => {
  const state = deriveWorkspaceState({
    baseTimeline: [
      { id: 'cal-1', title: 'Daily sync', timeLabel: '09:00', source: 'calendar', readonly: true, done: false },
      { id: 'task-2', title: 'Other area task', timeLabel: '10:00', source: 'todo', readonly: false, done: false },
    ],
    baseGoals: [buildGoal(), buildGoal({ id: 'goal-2', title: 'Health goal', area: '健康与运动' })],
    tasks: [
      buildTask({
        id: 'task-1',
        title: 'Dev task',
        status: 'IN_PROGRESS',
        linkedGoalId: 'goal-1',
        plannedStartAt: new Date('2026-06-12T11:00:00+08:00'),
        showInTimeline: true,
      }),
      buildTask({
        id: 'task-2',
        title: 'Other area task',
        status: 'IN_PROGRESS',
        linkedGoalId: 'goal-2',
        plannedStartAt: new Date('2026-06-12T10:00:00+08:00'),
        showInTimeline: true,
      }),
    ],
    activeArea: '独立开发',
    now: new Date('2026-06-12T08:00:00+08:00'),
  })

  assert.deepEqual(state.timeline.map((item) => item.id), ['cal-1', 'task-1'])
})

test('todo with plannedStartAt today appears in timeline, due-only todo does not', () => {
  const state = deriveWorkspaceState({
    baseTimeline: [{ id: 'stale-todo', title: 'Stale todo', timeLabel: '08:00', source: 'todo', readonly: false, done: false }],
    baseGoals: [],
    tasks: [
      buildTask({
        id: 'task-start',
        title: 'Start task',
        status: 'IN_PROGRESS',
        plannedStartAt: new Date('2026-06-12T09:00:00+08:00'),
        showInTimeline: true,
      }),
      buildTask({
        id: 'task-due-only',
        title: 'Due only task',
        status: 'IN_PROGRESS',
        dueDate: new Date('2026-06-12T18:00:00+08:00'),
        showInTimeline: true,
      }),
    ],
    activeArea: 'ALL',
    now: new Date('2026-06-12T08:00:00+08:00'),
  })

  assert.deepEqual(state.timeline.map((item) => item.id), ['task-start'])
  assert.equal(state.timeline[0].timeLabel, '09:00')
})

test('todo with plannedStartAt on different day does not appear in today timeline', () => {
  const state = deriveWorkspaceState({
    baseTimeline: [],
    baseGoals: [],
    tasks: [
      buildTask({
        id: 'task-tomorrow',
        title: 'Tomorrow task',
        status: 'IN_PROGRESS',
        plannedStartAt: new Date('2026-06-13T09:00:00+08:00'),
        showInTimeline: true,
      }),
      buildTask({
        id: 'task-today',
        title: 'Today task',
        status: 'IN_PROGRESS',
        plannedStartAt: new Date('2026-06-12T14:00:00+08:00'),
        showInTimeline: true,
      }),
    ],
    activeArea: 'ALL',
    now: new Date('2026-06-12T08:00:00+08:00'),
  })

  assert.deepEqual(state.timeline.map((item) => item.id), ['task-today'])
})

test('today attention splits into overdue, due-today, and ongoing groups', () => {
  const state = deriveWorkspaceState({
    baseTimeline: [],
    baseGoals: [],
    tasks: [
      buildTask({
        id: 'task-overdue',
        title: 'Overdue task',
        status: 'TODO',
        dueDate: new Date('2026-06-11T18:00:00+08:00'),
      }),
      buildTask({
        id: 'task-due-today',
        title: 'Due today task',
        status: 'TODO',
        dueDate: new Date('2026-06-12T18:00:00+08:00'),
      }),
      buildTask({
        id: 'task-ongoing',
        title: 'Ongoing task',
        status: 'IN_PROGRESS',
        plannedStartAt: new Date('2026-06-10T09:00:00+08:00'),
        dueDate: new Date('2026-06-15T18:00:00+08:00'),
      }),
    ],
    activeArea: 'ALL',
    now: new Date('2026-06-12T10:00:00+08:00'),
  })

  assert.deepEqual(state.todayAttentionGroups.overdue.map((t) => t.id), ['task-overdue'])
  assert.deepEqual(state.todayAttentionGroups.dueToday.map((t) => t.id), ['task-due-today'])
  assert.deepEqual(state.todayAttentionGroups.ongoing.map((t) => t.id), ['task-ongoing'])
})

test('paused and completed todos excluded from today attention groups', () => {
  const state = deriveWorkspaceState({
    baseTimeline: [],
    baseGoals: [],
    tasks: [
      buildTask({
        id: 'task-paused-overdue',
        title: 'Paused overdue',
        status: 'PAUSED',
        dueDate: new Date('2026-06-11T18:00:00+08:00'),
      }),
      buildTask({
        id: 'task-done-due-today',
        title: 'Done due today',
        status: 'DONE',
        dueDate: new Date('2026-06-12T18:00:00+08:00'),
      }),
      buildTask({
        id: 'task-active',
        title: 'Active task',
        status: 'TODO',
        dueDate: new Date('2026-06-12T18:00:00+08:00'),
      }),
    ],
    activeArea: 'ALL',
    now: new Date('2026-06-12T10:00:00+08:00'),
  })

  assert.deepEqual(state.todayAttentionGroups.overdue, [])
  assert.deepEqual(state.todayAttentionGroups.dueToday.map((t) => t.id), ['task-active'])
  assert.deepEqual(state.todayAttentionGroups.ongoing, [])
})

test('today relevant goals derived only from ongoing todos spanning today', () => {
  const state = deriveWorkspaceState({
    baseTimeline: [],
    baseGoals: [
      buildGoal({ id: 'goal-ongoing', title: 'Goal with ongoing todo' }),
      buildGoal({ id: 'goal-due-today', title: 'Goal with due today todo' }),
      buildGoal({ id: 'goal-overdue', title: 'Goal with overdue todo' }),
    ],
    tasks: [
      buildTask({
        id: 'task-ongoing',
        title: 'Ongoing task',
        status: 'IN_PROGRESS',
        linkedGoalId: 'goal-ongoing',
        plannedStartAt: new Date('2026-06-10T09:00:00+08:00'),
        dueDate: new Date('2026-06-15T18:00:00+08:00'),
      }),
      buildTask({
        id: 'task-due-today',
        title: 'Due today task',
        status: 'TODO',
        linkedGoalId: 'goal-due-today',
        dueDate: new Date('2026-06-12T18:00:00+08:00'),
      }),
      buildTask({
        id: 'task-overdue',
        title: 'Overdue task',
        status: 'TODO',
        linkedGoalId: 'goal-overdue',
        dueDate: new Date('2026-06-11T18:00:00+08:00'),
      }),
    ],
    activeArea: 'ALL',
    now: new Date('2026-06-12T10:00:00+08:00'),
  })

  assert.deepEqual(state.todayRelevantGoals.map((g) => g.id), ['goal-ongoing'])
})

test('area options are derived from all base goals with stable first-seen order', () => {
  const state = deriveWorkspaceState({
    baseTimeline: [],
    baseGoals: [
      buildGoal({ id: 'goal-1', area: '独立开发' }),
      buildGoal({ id: 'goal-2', area: '健康与运动' }),
      buildGoal({ id: 'goal-3', area: '独立开发' }),
      buildGoal({ id: 'goal-4', area: '  ' }),
    ],
    tasks: [],
    activeArea: 'ALL',
  })

  assert.deepEqual(state.areaOptions, [
    { value: '独立开发', label: '独立开发', goalCount: 2 },
    { value: '健康与运动', label: '健康与运动', goalCount: 1 },
  ])
})

test('goal enters ready-to-complete automatically when all linked todos are done', () => {
  const state = deriveWorkspaceState({
    baseTimeline: [],
    baseGoals: [buildGoal({ id: 'goal-ready', status: 'ACTIVE' })],
    tasks: [
      buildTask({ id: 'task-a', linkedGoalId: 'goal-ready', status: 'DONE' }),
      buildTask({ id: 'task-b', linkedGoalId: 'goal-ready', status: 'DONE' }),
    ],
    activeArea: 'ALL',
  })

  assert.equal(state.goals[0].status, 'READY_TO_COMPLETE')
})

test('goal leaves ready-to-complete automatically when linked work reopens', () => {
  const state = deriveWorkspaceState({
    baseTimeline: [],
    baseGoals: [buildGoal({ id: 'goal-active', status: 'READY_TO_COMPLETE' })],
    tasks: [
      buildTask({ id: 'task-done', linkedGoalId: 'goal-active', status: 'DONE' }),
      buildTask({ id: 'task-open', linkedGoalId: 'goal-active', status: 'TODO' }),
    ],
    activeArea: 'ALL',
  })

  assert.equal(state.goals[0].status, 'ACTIVE')
})

test('paused and archived goals do not become ready-to-complete automatically', () => {
  const state = deriveWorkspaceState({
    baseTimeline: [],
    baseGoals: [
      buildGoal({ id: 'goal-paused', status: 'PAUSED' }),
      buildGoal({ id: 'goal-archived', status: 'ARCHIVED' }),
    ],
    tasks: [
      buildTask({ id: 'task-paused', linkedGoalId: 'goal-paused', status: 'DONE' }),
      buildTask({ id: 'task-archived', linkedGoalId: 'goal-archived', status: 'DONE' }),
    ],
    activeArea: 'ALL',
  })

  assert.deepEqual(state.goals.map((goal) => goal.status), ['PAUSED', 'ARCHIVED'])
})

test('completed goal stays completed when all linked todos are done', () => {
  const state = deriveWorkspaceState({
    baseTimeline: [],
    baseGoals: [buildGoal({ id: 'goal-completed', status: 'COMPLETED' })],
    tasks: [
      buildTask({ id: 'task-done-a', linkedGoalId: 'goal-completed', status: 'DONE' }),
      buildTask({ id: 'task-done-b', linkedGoalId: 'goal-completed', status: 'DONE' }),
    ],
    activeArea: 'ALL',
  })

  assert.equal(state.goals[0].status, 'COMPLETED')
})

test('completed goal returns to active when linked work reopens', () => {
  const state = deriveWorkspaceState({
    baseTimeline: [],
    baseGoals: [buildGoal({ id: 'goal-completed', status: 'COMPLETED' })],
    tasks: [
      buildTask({ id: 'task-done', linkedGoalId: 'goal-completed', status: 'DONE' }),
      buildTask({ id: 'task-open', linkedGoalId: 'goal-completed', status: 'TODO' }),
    ],
    activeArea: 'ALL',
  })

  assert.equal(state.goals[0].status, 'ACTIVE')
})

// ========== 今日焦点新增测试 ==========

test('today focus tasks: only IN_PROGRESS tasks within time range', () => {
  const today = new Date('2026-06-13T12:00:00+08:00')
  const yesterday = new Date('2026-06-12T14:00:00+08:00')
  const tomorrow = new Date('2026-06-14T14:00:00+08:00')

  const state = deriveWorkspaceState({
    baseTimeline: [],
    baseGoals: [],
    tasks: [
      // 应该包含: 昨天开始，明天结束，IN_PROGRESS
      buildTask({
        id: 'multi-day-task',
        status: 'IN_PROGRESS',
        plannedStartAt: yesterday,
        dueDate: tomorrow,
      }),
      // 应该包含: 今天开始，今天结束，IN_PROGRESS
      buildTask({
        id: 'today-task',
        status: 'IN_PROGRESS',
        plannedStartAt: new Date('2026-06-13T08:00:00+08:00'),
        dueDate: new Date('2026-06-13T18:00:00+08:00'),
      }),
      // 应该包含: 今天开始，无截止，IN_PROGRESS
      buildTask({
        id: 'no-due-task',
        status: 'IN_PROGRESS',
        plannedStartAt: new Date('2026-06-13T10:00:00+08:00'),
        dueDate: undefined,
      }),
      // 应该排除: TODO 状态
      buildTask({
        id: 'todo-task',
        status: 'TODO',
        plannedStartAt: new Date('2026-06-13T10:00:00+08:00'),
        dueDate: new Date('2026-06-13T18:00:00+08:00'),
      }),
      // 应该排除: 已逾期（昨天结束）
      buildTask({
        id: 'overdue-task',
        status: 'IN_PROGRESS',
        plannedStartAt: yesterday,
        dueDate: new Date('2026-06-12T18:00:00+08:00'),
      }),
      // 应该排除: 未来任务（明天开始）
      buildTask({
        id: 'future-task',
        status: 'IN_PROGRESS',
        plannedStartAt: tomorrow,
        dueDate: new Date('2026-06-20T18:00:00+08:00'),
      }),
    ],
    activeArea: 'ALL',
    now: today,
  })

  assert.deepEqual(
    state.todayFocusTasks.map((t) => t.id).sort(),
    ['multi-day-task', 'no-due-task', 'today-task'].sort()
  )
})

test('today timeline: today-starting tasks show automatically, multi-day tasks need showInTimeline', () => {
  const today = new Date('2026-06-13T12:00:00+08:00')
  const yesterday = new Date('2026-06-12T14:00:00+08:00')
  const tomorrow = new Date('2026-06-14T14:00:00+08:00')

  const state = deriveWorkspaceState({
    baseTimeline: [],
    baseGoals: [],
    tasks: [
      // 应该包含: 跨天任务 + showInTimeline=true
      buildTask({
        id: 'multi-day-with-flag',
        status: 'IN_PROGRESS',
        plannedStartAt: yesterday,
        dueDate: tomorrow,
        showInTimeline: true,
      }),
      // 应该包含: 今天开始的任务，自动显示（无论是否勾选）
      buildTask({
        id: 'today-start-no-flag',
        status: 'IN_PROGRESS',
        plannedStartAt: new Date('2026-06-13T10:00:00+08:00'),
        dueDate: tomorrow,
        showInTimeline: false,
      }),
      buildTask({
        id: 'today-start-with-flag',
        status: 'IN_PROGRESS',
        plannedStartAt: new Date('2026-06-13T14:00:00+08:00'),
        dueDate: new Date('2026-06-13T18:00:00+08:00'),
        showInTimeline: true,
      }),
      // 应该排除: 跨天任务但 showInTimeline=false
      buildTask({
        id: 'multi-day-no-flag',
        status: 'IN_PROGRESS',
        plannedStartAt: yesterday,
        dueDate: tomorrow,
        showInTimeline: false,
      }),
      // 应该排除: TODO 状态
      buildTask({
        id: 'todo-timeline-task',
        status: 'TODO',
        plannedStartAt: new Date('2026-06-13T10:00:00+08:00'),
        dueDate: tomorrow,
        showInTimeline: true,
      }),
      // 应该排除: 无 plannedStartAt
      buildTask({
        id: 'no-start-task',
        status: 'IN_PROGRESS',
        plannedStartAt: undefined,
        dueDate: tomorrow,
        showInTimeline: true,
      }),
    ],
    activeArea: 'ALL',
    now: today,
  })

  assert.deepEqual(
    state.timeline.map((t) => t.id).sort(),
    ['multi-day-with-flag', 'today-start-no-flag', 'today-start-with-flag'].sort()
  )
})

test('today focus: TODO status tasks are excluded (Issue 020)', () => {
  const today = new Date('2026-06-13T12:00:00+08:00')

  const state = deriveWorkspaceState({
    baseTimeline: [],
    baseGoals: [],
    tasks: [
      // 虽然时间范围覆盖今天，但 TODO 状态应该被排除
      buildTask({
        id: 'todo-in-range',
        status: 'TODO',
        plannedStartAt: new Date('2026-06-13T08:00:00+08:00'),
        dueDate: new Date('2026-06-13T18:00:00+08:00'),
      }),
      // IN_PROGRESS 应该包含
      buildTask({
        id: 'in-progress-task',
        status: 'IN_PROGRESS',
        plannedStartAt: new Date('2026-06-13T08:00:00+08:00'),
        dueDate: new Date('2026-06-13T18:00:00+08:00'),
      }),
    ],
    activeArea: 'ALL',
    now: today,
  })

  // 只应该包含 IN_PROGRESS 任务
  assert.deepEqual(state.todayFocusTasks.map((t) => t.id), ['in-progress-task'])

  // 确保 TODO 任务被排除
  assert.ok(!state.todayFocusTasks.some((t) => t.id === 'todo-in-range'))
})

test('today focus and timeline: no due date tasks handled correctly', () => {
  const today = new Date('2026-06-13T12:00:00+08:00')
  const yesterday = new Date('2026-06-12T10:00:00+08:00')
  const tomorrow = new Date('2026-06-14T10:00:00+08:00')

  const state = deriveWorkspaceState({
    baseTimeline: [],
    baseGoals: [],
    tasks: [
      // 应该包含: 今天开始，无截止
      buildTask({
        id: 'today-no-due',
        status: 'IN_PROGRESS',
        plannedStartAt: new Date('2026-06-13T09:00:00+08:00'),
        dueDate: undefined,
        showInTimeline: true,
      }),
      // 应该包含: 昨天开始，无截止
      buildTask({
        id: 'yesterday-no-due',
        status: 'IN_PROGRESS',
        plannedStartAt: yesterday,
        dueDate: undefined,
        showInTimeline: true,
      }),
      // 应该排除: 明天开始，无截止
      buildTask({
        id: 'tomorrow-no-due',
        status: 'IN_PROGRESS',
        plannedStartAt: tomorrow,
        dueDate: undefined,
        showInTimeline: true,
      }),
    ],
    activeArea: 'ALL',
    now: today,
  })

  // 今日焦点应包含今天及之前开始的无截止任务
  assert.deepEqual(
    state.todayFocusTasks.map((t) => t.id).sort(),
    ['today-no-due', 'yesterday-no-due'].sort()
  )

  // 时间轴也应该包含这两个任务
  assert.deepEqual(
    state.timeline.map((t) => t.id).sort(),
    ['today-no-due', 'yesterday-no-due'].sort()
  )
})

test('ongoing group excludes overdue and due-today tasks', () => {
  const today = new Date('2026-06-13T12:00:00+08:00')
  const yesterday = new Date('2026-06-12T14:00:00+08:00')
  const tomorrow = new Date('2026-06-14T14:00:00+08:00')

  const state = deriveWorkspaceState({
    baseTimeline: [],
    baseGoals: [],
    tasks: [
      // ongoing: 昨天开始，明天结束
      buildTask({
        id: 'task-ongoing',
        status: 'IN_PROGRESS',
        plannedStartAt: yesterday,
        dueDate: tomorrow,
      }),
      // dueToday: 今天开始，今天结束
      buildTask({
        id: 'task-due-today',
        status: 'IN_PROGRESS',
        plannedStartAt: new Date('2026-06-13T08:00:00+08:00'),
        dueDate: new Date('2026-06-13T18:00:00+08:00'),
      }),
      // overdue: 昨天应完成但还在进行
      buildTask({
        id: 'task-overdue',
        status: 'IN_PROGRESS',
        plannedStartAt: yesterday,
        dueDate: new Date('2026-06-12T18:00:00+08:00'),
      }),
      // 排除: TODO 状态
      buildTask({
        id: 'task-todo',
        status: 'TODO',
        plannedStartAt: new Date('2026-06-13T10:00:00+08:00'),
        dueDate: tomorrow,
      }),
    ],
    activeArea: 'ALL',
    now: today,
  })

  // todayFocusTasks 包含所有 IN_PROGRESS 且时间范围覆盖今天的任务
  assert.deepEqual(
    state.todayFocusTasks.map((t) => t.id).sort(),
    ['task-due-today', 'task-ongoing'].sort()
  )

  // 但 ongoing 分组排除了 dueToday 任务
  assert.deepEqual(state.todayAttentionGroups.ongoing.map((t) => t.id), ['task-ongoing'])

  // dueToday 分组包含今天截止的任务
  assert.deepEqual(state.todayAttentionGroups.dueToday.map((t) => t.id), ['task-due-today'])

  // overdue 分组包含已逾期的任务
  assert.deepEqual(state.todayAttentionGroups.overdue.map((t) => t.id), ['task-overdue'])
})
