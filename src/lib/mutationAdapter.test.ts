import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { MutationAdapter } from '../lib/mutationAdapter'
import type { GoalCard, GoalStatus, AreaWithStats } from '../types/app'
import type { Task, TaskStatus } from '../types/task'

describe('MutationAdapter interface', () => {
  let adapter: MutationAdapter

  const mockGoal: GoalCard = {
    id: 'goal-1',
    title: 'Test Goal',
    area: 'Work',
    description: 'desc',
    status: 'ACTIVE',
    progress: 0,
    nextTodo: '',
    taskCount: 0,
  }

  const mockTask: Task = {
    id: 'task-1',
    title: 'Test Task',
    content: '',
    status: 'TODO',
    showInTimeline: false,
    activityLogs: [],
  }

  beforeEach(() => {
    adapter = {
      createTask: vi.fn().mockResolvedValue({ task: mockTask, statusMessage: 'ok' }),
      createTaskForGoal: vi.fn().mockResolvedValue({ task: mockTask, statusMessage: 'ok' }),
      createGoal: vi.fn().mockResolvedValue({ goal: mockGoal, statusMessage: 'ok', openGoalWorkspace: false }),
      updateGoalFields: vi.fn().mockResolvedValue({ goal: mockGoal, statusMessage: 'ok' }),
      updateGoalStatus: vi.fn().mockResolvedValue({ goal: mockGoal, statusMessage: 'ok' }),
      addTaskNote: vi.fn().mockResolvedValue({ task: mockTask, statusMessage: 'ok' }),
      updateTaskStatus: vi.fn().mockResolvedValue({ task: mockTask, statusMessage: 'ok' }),
      updateTaskContent: vi.fn().mockResolvedValue({ task: mockTask, statusMessage: 'ok' }),
      updateTaskFields: vi.fn().mockResolvedValue({ task: mockTask, statusMessage: 'ok' }),
      updateTaskChecklists: vi.fn().mockResolvedValue({ task: mockTask, statusMessage: 'ok' }),
      listAreas: vi.fn().mockResolvedValue({ areas: [], statusMessage: 'ok' }),
      createArea: vi.fn().mockResolvedValue({ area: { id: 'a1', title: 'Work', goalCount: 0, activeGoalCount: 0, isSystem: false } as AreaWithStats, statusMessage: 'ok' }),
      renameArea: vi.fn().mockResolvedValue({ area: { id: 'a1', title: 'Renamed', goalCount: 0, activeGoalCount: 0, isSystem: false } as AreaWithStats, statusMessage: 'ok' }),
      deleteArea: vi.fn().mockResolvedValue({ success: true, message: 'deleted', statusMessage: 'ok' }),
      loadGoals: vi.fn().mockResolvedValue([mockGoal]),
      softDeleteTask: vi.fn().mockResolvedValue(undefined),
      restoreTask: vi.fn().mockResolvedValue({ task: mockTask, statusMessage: 'restored' }),
      listDeletedTasks: vi.fn().mockResolvedValue([]),
      softDeleteGoal: vi.fn().mockResolvedValue(undefined),
      restoreGoal: vi.fn().mockResolvedValue({ goal: mockGoal, statusMessage: 'restored' }),
      listDeletedGoals: vi.fn().mockResolvedValue([]),

      createDailyReviewItem: vi.fn(),
      updateDailyReviewItem: vi.fn(),
      deleteDailyReviewItem: vi.fn(),
      getDailyReviewTimeline: vi.fn(),
      exportDatabase: vi.fn(),
      importDatabase: vi.fn(),
      pickDirectory: vi.fn(),
    }
  })

  it('createTask returns task and statusMessage', async () => {
    const result = await adapter.createTask('Buy milk')
    expect(result.task).toBeDefined()
    expect(result.statusMessage).toBeDefined()
    expect(adapter.createTask).toHaveBeenCalledWith('Buy milk')
  })

  it('createGoal returns goal and openGoalWorkspace', async () => {
    const result = await adapter.createGoal({ title: 'Goal', area: 'Work', description: '' })
    expect(result.goal).toBeDefined()
    expect(typeof result.openGoalWorkspace).toBe('boolean')
  })

  it('updateGoalFields returns updated goal', async () => {
    const result = await adapter.updateGoalFields('goal-1', { title: 'Updated', area: 'Work', description: '' })
    expect(result.goal).toBeDefined()
  })

  it('updateGoalStatus returns updated goal', async () => {
    const result = await adapter.updateGoalStatus('goal-1', 'PAUSED' as GoalStatus)
    expect(result.goal).toBeDefined()
  })

  it('updateTaskStatus returns updated task', async () => {
    const result = await adapter.updateTaskStatus('task-1', 'IN_PROGRESS' as TaskStatus)
    expect(result.task).toBeDefined()
  })

  it('updateTaskChecklists returns updated task', async () => {
    const result = await adapter.updateTaskChecklists('task-1', [
      { id: 'c1', title: 'Step', completed: false, sortOrder: 0 },
    ])
    expect(result.task).toBeDefined()
    expect(adapter.updateTaskChecklists).toHaveBeenCalled()
  })

  it('addTaskNote returns updated task', async () => {
    const result = await adapter.addTaskNote('task-1', 'note')
    expect(result.task).toBeDefined()
  })

  it('listAreas returns areas array', async () => {
    const result = await adapter.listAreas()
    expect(Array.isArray(result.areas)).toBe(true)
  })

  it('createArea returns area', async () => {
    const result = await adapter.createArea('New Area')
    expect(result.area).toBeDefined()
  })

  it('deleteArea returns success flag', async () => {
    const result = await adapter.deleteArea('a1', true)
    expect(typeof result.success).toBe('boolean')
  })

  it('does not expose a System Reminder write capability', () => {
    expect('createSystemReminder' in adapter).toBe(false)
  })

  it('updateTaskFields accepts linkedGoalLabel directly', async () => {
    const result = await adapter.updateTaskFields('task-1', {
      title: 'Updated Task',
      linkedGoalId: 'goal-1',
      linkedGoalLabel: 'My Goal',
    })
    expect(result.task).toBeDefined()
    expect(adapter.updateTaskFields).toHaveBeenCalledWith('task-1', expect.objectContaining({
      linkedGoalLabel: 'My Goal',
    }))
  })

  it('loadGoals returns goals array', async () => {
    const goals = await adapter.loadGoals()
    expect(Array.isArray(goals)).toBe(true)
    expect(goals.length).toBe(1)
    expect(goals[0].id).toBe('goal-1')
  })
})
