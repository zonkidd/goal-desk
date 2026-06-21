import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMutationOrchestrator, type MutationOrchestrator } from './mutationOrchestrator'
import type { MutationAdapter } from '../lib/mutationAdapter'
import type { Task, TaskStatus } from '../types/task'
import type { GoalCard } from '../types/app'

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
  description: '',
  status: 'ACTIVE',
  progress: 0,
  nextTodo: '',
  taskCount: 0,
}

function createMockAdapter(): MutationAdapter {
  return {
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
    createArea: vi.fn().mockResolvedValue({ area: { id: 'a1', title: 'Work', goalCount: 0, activeGoalCount: 0, isSystem: false }, statusMessage: 'ok' }),
    renameArea: vi.fn().mockResolvedValue({ area: { id: 'a1', title: 'Renamed', goalCount: 0, activeGoalCount: 0, isSystem: false }, statusMessage: 'ok' }),
    deleteArea: vi.fn().mockResolvedValue({ success: true, message: 'deleted', statusMessage: 'ok' }),
    createSystemReminder: vi.fn().mockResolvedValue('reminder-id'),
  } as MutationAdapter
}

describe('MutationOrchestrator', () => {
  let adapter: MutationAdapter
  let orchestrator: MutationOrchestrator

  beforeEach(() => {
    adapter = createMockAdapter()
    orchestrator = createMutationOrchestrator(adapter)
  })

  it('run executes mutation and returns result', async () => {
    const result = await orchestrator.run((a) => a.createTask('Test'))
    expect(result).toEqual(expect.objectContaining({ task: mockTask }))
  })

  it('run calls onSuccess callback', async () => {
    const onSuccess = vi.fn()
    await orchestrator.run((a) => a.createTask('Test'), { onSuccess })
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ task: mockTask }))
  })

  it('run returns null on error', async () => {
    vi.mocked(adapter.createTask).mockRejectedValue(new Error('fail'))
    const result = await orchestrator.run((a) => a.createTask('Test'))
    expect(result).toBeNull()
  })

  it('run calls onError callback on failure', async () => {
    vi.mocked(adapter.createTask).mockRejectedValue(new Error('fail'))
    const onError = vi.fn()
    await orchestrator.run((a) => a.createTask('Test'), { onError })
    expect(onError).toHaveBeenCalled()
  })

  it('task convenience method runs createTask', async () => {
    const result = await orchestrator.task.createTask('Test')
    expect(result).toEqual(expect.objectContaining({ task: mockTask }))
    expect(adapter.createTask).toHaveBeenCalledWith('Test')
  })

  it('goal convenience method runs createGoal', async () => {
    const result = await orchestrator.goal.createGoal({ title: 'Goal' })
    expect(result).toEqual(expect.objectContaining({ goal: mockGoal }))
    expect(adapter.createGoal).toHaveBeenCalled()
  })
})
