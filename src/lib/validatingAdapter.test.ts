import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ValidatingMutationAdapter } from './validatingAdapter'
import type { MutationAdapter } from './mutationAdapter'
import type { GoalCard, GoalStatus, AreaWithStats } from '../types/app'
import type { Task, TaskStatus } from '../types/task'

describe('ValidatingMutationAdapter', () => {
  let innerAdapter: MutationAdapter
  let validatingAdapter: ValidatingMutationAdapter

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
    innerAdapter = {
      createTask: vi.fn().mockResolvedValue({ task: mockTask, statusMessage: 'ok' }),
      createTaskForGoal: vi.fn().mockResolvedValue({ task: mockTask, statusMessage: 'ok' }),
      createGoal: vi.fn().mockResolvedValue({ goal: mockGoal, statusMessage: 'ok', openGoalWorkspace: false }),
      updateGoalFields: vi.fn().mockResolvedValue({ goal: mockGoal, statusMessage: 'ok' }),
      updateGoalStatus: vi.fn().mockResolvedValue({ goal: mockGoal, statusMessage: 'ok' }),
      addTaskNote: vi.fn().mockResolvedValue({ task: mockTask, statusMessage: 'ok' }),
      updateTaskStatus: vi.fn().mockResolvedValue({ task: mockTask, statusMessage: 'ok' }),
      updateTaskContent: vi.fn().mockResolvedValue({ task: mockTask, statusMessage: 'ok' }),
      updateTaskFields: vi.fn().mockResolvedValue({ task: mockTask, statusMessage: 'ok' }),
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
    } as MutationAdapter
    validatingAdapter = new ValidatingMutationAdapter(innerAdapter)
  })

  it('passes valid task title to inner adapter', async () => {
    await validatingAdapter.createTask('Buy milk')
    expect(innerAdapter.createTask).toHaveBeenCalledWith('Buy milk')
  })

  it('rejects empty task title without calling inner adapter', async () => {
    const result = await validatingAdapter.createTask('')
    expect(innerAdapter.createTask).not.toHaveBeenCalled()
    expect(result.task).toBeUndefined()
  })

  it('rejects null task title without calling inner adapter', async () => {
    const result = await validatingAdapter.createTask(null as any)
    expect(innerAdapter.createTask).not.toHaveBeenCalled()
    expect(result.task).toBeUndefined()
  })

  it('passes valid goal input to inner adapter', async () => {
    await validatingAdapter.createGoal({ title: 'Goal', area: 'Work', description: 'desc' })
    expect(innerAdapter.createGoal).toHaveBeenCalledWith(
      { title: 'Goal', area: 'Work', description: 'desc' },
      undefined,
    )
  })

  it('rejects empty goal title without calling inner adapter', async () => {
    const result = await validatingAdapter.createGoal({ title: '', area: 'Work', description: '' })
    expect(innerAdapter.createGoal).not.toHaveBeenCalled()
    expect(result.goal).toBeUndefined()
  })

  it('passes valid area title to inner adapter', async () => {
    await validatingAdapter.createArea('New Area')
    expect(innerAdapter.createArea).toHaveBeenCalledWith('New Area')
  })

  it('rejects empty area title without calling inner adapter', async () => {
    const result = await validatingAdapter.createArea('')
    expect(innerAdapter.createArea).not.toHaveBeenCalled()
    expect(result.area).toBeUndefined()
  })

  it('trims whitespace from valid inputs', async () => {
    await validatingAdapter.createTask('  Buy milk  ')
    expect(innerAdapter.createTask).toHaveBeenCalledWith('Buy milk')
  })

  it('delegates non-validation methods directly', async () => {
    await validatingAdapter.updateTaskStatus('task-1', 'DONE')
    expect(innerAdapter.updateTaskStatus).toHaveBeenCalledWith('task-1', 'DONE', undefined)
  })

  it('delegates loadGoals directly', async () => {
    const goals = await validatingAdapter.loadGoals()
    expect(innerAdapter.loadGoals).toHaveBeenCalled()
    expect(goals).toHaveLength(1)
  })
})
