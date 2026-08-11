import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMutation } from './createMutation'
import { setWorkspaceMutationAdapter, resetWorkspaceMutationAdapter } from '../lib/workspaceMutations'
import type { MutationAdapter } from '../lib/mutationAdapter'
import type { GoalCard, AreaWithStats } from '../types/app'
import type { Task } from '../types/task'

describe('createMutation', () => {
  const mockTask: Task = {
    id: 'task-1',
    title: 'Test Task',
    content: '',
    status: 'TODO',
    showInTimeline: false,
    activityLogs: [],
  }

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

  let mockAdapter: MutationAdapter
  let mockSet: ReturnType<typeof vi.fn>
  let mockGet: ReturnType<typeof vi.fn>

  beforeEach(() => {
    resetWorkspaceMutationAdapter()
    mockSet = vi.fn()
    mockGet = vi.fn().mockReturnValue({})
    mockAdapter = {
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
      exportDatabase: vi.fn(),
      importDatabase: vi.fn(),
      pickDirectory: vi.fn(),
    } as MutationAdapter
    setWorkspaceMutationAdapter(mockAdapter)
  })

  it('creates a mutation function that calls adapter method', async () => {
    const mutate = createMutation(
      (a) => a.createTask('New Task'),
      () => ({}),
      mockSet as unknown as (partial: Record<string, unknown> | ((state: unknown) => Record<string, unknown>)) => void,
      mockGet as unknown as () => unknown,
    )
    await mutate(undefined as never)
    expect(mockAdapter.createTask).toHaveBeenCalledWith('New Task')
  })

  it('calls updater with result on success', async () => {
    const updater = vi.fn().mockReturnValue({ tasks: [mockTask] })
    const mutate = createMutation(
      (a) => a.createTask('New Task'),
      updater,
      mockSet as unknown as (partial: Record<string, unknown> | ((state: unknown) => Record<string, unknown>)) => void,
      mockGet as unknown as () => unknown,
    )
    await mutate(undefined as never)
    expect(updater).toHaveBeenCalledWith({}, { task: mockTask, statusMessage: 'ok' })
    expect(mockSet).toHaveBeenCalledWith({ tasks: [mockTask] })
  })

  it('returns result on success', async () => {
    const mutate = createMutation(
      (a) => a.createTask('New Task'),
      () => ({}),
      mockSet as unknown as (partial: Record<string, unknown> | ((state: unknown) => Record<string, unknown>)) => void,
      mockGet as unknown as () => unknown,
    )
    const result = await mutate(undefined as never)
    expect(result).toEqual({ task: mockTask, statusMessage: 'ok' })
  })

  it('returns null on error without calling updater', async () => {
    vi.mocked(mockAdapter.createTask).mockRejectedValueOnce(new Error('fail'))
    const updater = vi.fn()
    const mutate = createMutation(
      (a) => a.createTask('New Task'),
      updater,
      mockSet as unknown as (partial: Record<string, unknown> | ((state: unknown) => Record<string, unknown>)) => void,
      mockGet as unknown as () => unknown,
    )
    const result = await mutate(undefined as never)
    expect(result).toBeNull()
    expect(updater).not.toHaveBeenCalled()
  })

  it('passes input to adapter method', async () => {
    const mutate = createMutation(
      (a: MutationAdapter, input: string) => a.createTask(input),
      () => ({}),
      mockSet as unknown as (partial: Record<string, unknown> | ((state: unknown) => Record<string, unknown>)) => void,
      mockGet as unknown as () => unknown,
    )
    await mutate('My Task')
    expect(mockAdapter.createTask).toHaveBeenCalledWith('My Task')
  })
})
