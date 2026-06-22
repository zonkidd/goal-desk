import test from 'node:test'
import assert from 'node:assert/strict'

import { createTodoEditingSession } from './todoEditing.ts'

function buildTask(overrides = {}) {
  return {
    id: 'task-1',
    title: 'Refine drawer architecture',
    content: '',
    status: 'TODO',
    activityLogs: [],
    ...overrides,
  }
}

function buildGoal(overrides = {}) {
  return {
    id: 'goal-1',
    title: 'Link immediately after create',
    area: '独立开发',
    description: '',
    status: 'ACTIVE',
    progress: 0,
    nextTodo: 'Keep going',
    taskCount: 0,
    createdAt: new Date('2026-06-12T10:00:00+08:00'),
    updatedAt: new Date('2026-06-12T10:00:00+08:00'),
    ...overrides,
  }
}

function createHarness({ task = buildTask(), goals = [buildGoal()] } = {}) {
  const calls = {
    updateTaskFields: [],
    updateTaskContent: [],
    updateTaskStatus: [],
    createGoal: [],
  }

  const session = createTodoEditingSession({
    task,
    goals,
    activeArea: 'ALL',
    updateTaskFields: async (taskId, input) => {
      calls.updateTaskFields.push({ taskId, input })
    },
    updateTaskContent: async (taskId, content) => {
      calls.updateTaskContent.push({ taskId, content })
    },
    updateTaskStatus: async (taskId, next, note) => {
      calls.updateTaskStatus.push({ taskId, next, note })
    },
    createGoal: async (input, options) => {
      calls.createGoal.push({ input, options })
      return { goal: { id: 'goal-created-inline' }, openGoalWorkspace: false }
    },
  })

  return { session, calls }
}

test('todo editing session exposes start and complete actions', () => {
  const { session } = createHarness({
    task: buildTask({ status: 'TODO' }),
    goals: [],
  })

  assert.equal(session.capabilities.canChangeStatus, true)
  assert.deepEqual(session.capabilities.statusActions, ['IN_PROGRESS', 'DONE'])
})

test('in-progress todo editing session only exposes pause and complete actions', () => {
  const { session } = createHarness({
    task: buildTask({ status: 'IN_PROGRESS' }),
    goals: [],
  })

  assert.equal(session.capabilities.canChangeStatus, true)
  assert.deepEqual(session.capabilities.statusActions, ['PAUSED', 'DONE'])
})

test('paused todo editing session exposes resume and complete actions', () => {
  const { session } = createHarness({
    task: buildTask({ status: 'PAUSED' }),
    goals: [],
  })

  assert.equal(session.capabilities.canChangeStatus, true)
  assert.deepEqual(session.capabilities.statusActions, ['IN_PROGRESS', 'DONE'])
})

test('done todo editing session exposes no status actions', () => {
  const { session } = createHarness({
    task: buildTask({ status: 'DONE' }),
    goals: [],
  })

  assert.equal(session.capabilities.canChangeStatus, false)
  assert.deepEqual(session.capabilities.statusActions, [])
})

test('todo editing session resolves the linked goal label from the selected goal id', () => {
  const { session } = createHarness({
    task: buildTask({
      linkedGoalId: 'goal-1',
    }),
  })

  assert.equal(session.draft.linkedGoalIdDraft, 'goal-1')
  assert.equal(session.draft.linkedGoalLabel, 'Link immediately after create')
})

test('selecting an existing goal links the todo through the editing session action', async () => {
  const { session, calls } = createHarness({
    task: buildTask({ status: 'TODO' }),
    goals: [buildGoal(), buildGoal({ id: 'goal-2', title: 'Improve architecture' })],
  })

  const nextDraft = await session.actions.linkGoal('goal-2')

  assert.equal(nextDraft.linkedGoalIdDraft, 'goal-2')
  assert.equal(nextDraft.linkedGoalLabel, 'Improve architecture')
  assert.deepEqual(calls.updateTaskFields, [
    {
      taskId: 'task-1',
      input: {
        title: 'Refine drawer architecture',
        plannedStartAt: undefined,
        dueDate: undefined,
        linkedGoalId: 'goal-2',
        linkedGoalLabel: 'Improve architecture',
        showInTimeline: false,
      },
    },
  ])
})

test('unlinking a goal clears the todo goal association', async () => {
  const { session, calls } = createHarness({
    task: buildTask({ linkedGoalId: 'goal-1' }),
  })

  const nextDraft = await session.actions.unlinkGoal()

  assert.equal(nextDraft.linkedGoalIdDraft, '')
  assert.equal(nextDraft.linkedGoalLabel, undefined)
  assert.deepEqual(calls.updateTaskFields, [
    {
      taskId: 'task-1',
      input: {
        title: 'Refine drawer architecture',
        plannedStartAt: undefined,
        dueDate: undefined,
        linkedGoalId: undefined,
        linkedGoalLabel: undefined,
        showInTimeline: false,
      },
    },
  ])
})

test('inline goal creation keeps the todo drawer context and links the new goal immediately', async () => {
  const { session, calls } = createHarness({
    task: buildTask(),
    goals: [buildGoal()],
  })

  const draftWithInlineGoal = session.actions.setNewGoalTitle('New inline goal')
  const draftWithArea = session.actions.setNewGoalArea('独立开发', draftWithInlineGoal)

  const result = await session.actions.createAndLinkGoal({
    ...draftWithArea,
  })

  assert.equal(result.goalId, 'goal-created-inline')
  assert.equal(result.draft.linkedGoalIdDraft, 'goal-created-inline')
  assert.equal(result.draft.isCreatingGoalInline, false)
  assert.equal(result.draft.activeEditor, 'none')
  assert.deepEqual(calls.createGoal, [
    {
      input: { title: 'New inline goal', area: '独立开发' },
      options: { openGoalWorkspace: false },
    },
  ])
  assert.deepEqual(calls.updateTaskFields, [
    {
      taskId: 'task-1',
      input: {
        title: 'Refine drawer architecture',
        plannedStartAt: undefined,
        dueDate: undefined,
        linkedGoalId: 'goal-created-inline',
        linkedGoalLabel: undefined,
        showInTimeline: false,
      },
    },
  ])
})

test('inline goal creation failure preserves the todo draft and allows retry', async () => {
  const calls = {
    updateTaskFields: [],
    updateTaskContent: [],
    updateTaskStatus: [],
    createGoal: [],
  }

  const session = createTodoEditingSession({
    task: buildTask(),
    goals: [buildGoal()],
    activeArea: 'ALL',
    updateTaskFields: async (taskId, input) => {
      calls.updateTaskFields.push({ taskId, input })
    },
    updateTaskContent: async (taskId, content) => {
      calls.updateTaskContent.push({ taskId, content })
    },
    updateTaskStatus: async (taskId, next, note) => {
      calls.updateTaskStatus.push({ taskId, next, note })
    },
    createGoal: async (input, options) => {
      calls.createGoal.push({ input, options })
      return undefined
    },
  })

  const draftWithInlineGoal = session.actions.startInlineGoalCreation()
  const draftWithTitle = session.actions.setNewGoalTitle('Failed goal', draftWithInlineGoal)
  const draftWithArea = session.actions.setNewGoalArea('独立开发', draftWithTitle)

  const result = await session.actions.createAndLinkGoal({
    ...draftWithArea,
  })

  assert.equal(result.goalId, undefined)
  assert.equal(result.draft.linkedGoalIdDraft, '')
  assert.equal(result.draft.newGoalTitle, 'Failed goal')
  assert.equal(result.draft.isCreatingGoalInline, true)
  assert.deepEqual(calls.updateTaskFields, [])
})
