import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGoalStore } from './goalStore'
import { setWorkspaceMutationAdapter, resetWorkspaceMutationAdapter } from '../lib/workspaceMutations'
import type { MutationAdapter } from '../lib/mutationAdapter'
import type { GoalCard } from '../types/app'

describe('goalStore.refreshGoals', () => {
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

  beforeEach(() => {
    resetWorkspaceMutationAdapter()
    useGoalStore.setState({ baseGoals: [] })
    mockAdapter = {
      createTask: vi.fn(),
      createTaskForGoal: vi.fn(),
      createGoal: vi.fn(),
      updateGoalFields: vi.fn(),
      updateGoalStatus: vi.fn(),
      addTaskNote: vi.fn(),
      updateTaskStatus: vi.fn(),
      updateTaskContent: vi.fn(),
      updateTaskFields: vi.fn(),
      listAreas: vi.fn(),
      createArea: vi.fn(),
      renameArea: vi.fn(),
      deleteArea: vi.fn(),
      createSystemReminder: vi.fn(),
      loadGoals: vi.fn().mockResolvedValue([mockGoal]),
      softDeleteTask: vi.fn(),
      restoreTask: vi.fn(),
      listDeletedTasks: vi.fn().mockResolvedValue([]),
      softDeleteGoal: vi.fn(),
      restoreGoal: vi.fn(),
      listDeletedGoals: vi.fn().mockResolvedValue([]),
    } as MutationAdapter
  })

  it('refreshGoals calls adapter.loadGoals instead of tauriCommands', async () => {
    setWorkspaceMutationAdapter(mockAdapter)
    await useGoalStore.getState().refreshGoals()
    expect(mockAdapter.loadGoals).toHaveBeenCalled()
  })

  it('refreshGoals updates baseGoals with adapter result', async () => {
    setWorkspaceMutationAdapter(mockAdapter)
    await useGoalStore.getState().refreshGoals()
    const goals = useGoalStore.getState().baseGoals
    expect(goals).toHaveLength(1)
    expect(goals[0].id).toBe('goal-1')
  })
})
