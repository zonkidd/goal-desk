import test from 'node:test'
import assert from 'node:assert/strict'

import { useAppStore } from './appStore.ts'

const baseState = {
  currentView: 'inbox',
  activeArea: 'ALL',
  areaOptions: [],
  tasks: [
    {
      id: 'task-1',
      title: 'Refine goal linking',
      content: '',
      status: 'TODO',
      activityLogs: [{ action: 'CREATED', timestamp: new Date('2026-06-11T09:00:00+08:00') }],
      createdAt: new Date('2026-06-11T09:00:00+08:00'),
      updatedAt: new Date('2026-06-11T09:00:00+08:00'),
    },
  ],
  todayFocusTasks: [],
  todayAttentionGroups: { overdue: [], dueToday: [], ongoing: [] },
  todayRelevantGoals: [],
  timeline: [],
  inbox: {
    activeTasks: [],
    pausedTasks: [],
    completed: {
      totalCount: 0,
      visibleTasks: [],
      isCollapsedByDefault: true,
    },
  },
  showCompletedTodos: false,
  baseTimeline: [],
  goals: [],
  baseGoals: [],
  systemReminders: [],
  integrationStatus: {
    calendar: 'not_determined',
    reminders: 'not_determined',
  },
  selectedTaskId: 'task-1',
  selectedGoalId: undefined,
  selectedReminderId: undefined,
  statusMessage: '',
  isLoading: false,
  isTaskDrawerOpen: true,
  isGoalDrawerOpen: false,
  isReminderDrawerOpen: false,
  isQuickCaptureOpen: false,
}

function resetStore() {
  useAppStore.setState(baseState)
}

test('inline goal creation can keep the todo drawer context instead of navigating to goal management', async () => {
  resetStore()

  const goalId = await useAppStore.getState().createGoal(
    { title: 'Clarify linking flow', area: '', description: '' },
    { openGoalWorkspace: false },
  )

  const state = useAppStore.getState()
  assert.ok(goalId)
  assert.equal(state.currentView, 'inbox')
  assert.equal(state.isTaskDrawerOpen, true)
  assert.equal(state.isGoalDrawerOpen, false)
  assert.equal(state.selectedGoalId, undefined)
  assert.equal(state.baseGoals.some((goal) => goal.id === goalId && goal.title === 'Clarify linking flow'), true)
})

test('todo field updates can immediately link a newly created goal by id', async () => {
  resetStore()

  const goalId = await useAppStore.getState().createGoal(
    { title: 'Link immediately after create', area: '', description: '' },
    { openGoalWorkspace: false },
  )

  assert.ok(goalId)

  await useAppStore.getState().updateTaskFields('task-1', {
    title: 'Refine goal linking',
    linkedGoalId: goalId,
    linkedGoalLabel: 'stale label should not win',
    isOngoing: false,
  })

  const task = useAppStore.getState().tasks.find((item) => item.id === 'task-1')
  assert.ok(task)
  assert.equal(task.linkedGoalId, goalId)
  assert.equal(task.linkedGoalLabel, 'Link immediately after create')
})

test('updateGoalStatus rejects manual READY_TO_COMPLETE', async () => {
  resetStore()

  await useAppStore.getState().updateGoalStatus('goal-1', 'READY_TO_COMPLETE')

  const state = useAppStore.getState()
  assert.equal(state.statusMessage, 'READY_TO_COMPLETE is auto-computed and cannot be set manually')
})

test('updateGoalStatus allows ACTIVE, PAUSED, COMPLETED, ARCHIVED', async () => {
  resetStore()

  for (const status of ['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']) {
    await useAppStore.getState().updateGoalStatus('goal-1', status)

    const after = useAppStore.getState().statusMessage
    assert.notEqual(after, 'READY_TO_COMPLETE is auto-computed and cannot be set manually', `${status} should be allowed`)
  }
})
