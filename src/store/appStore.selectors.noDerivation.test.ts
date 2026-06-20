import { describe, it, expect, vi } from 'vitest'
import { createMockGoalState } from './appStore.test-utils'
import { selectFilteredGoals } from './appStore.selectors'

vi.mock('../lib/workspaceDerivation', async () => {
  const actual = await vi.importActual<typeof import('../lib/workspaceDerivation')>('../lib/workspaceDerivation')
  return {
    ...actual,
    filterGoalsByArea: vi.fn(actual.filterGoalsByArea),
  }
})

describe('selectors use pre-computed state', () => {
  it('selectFilteredGoals should not call filterGoalsByArea', async () => {
    const { filterGoalsByArea } = await import('../lib/workspaceDerivation')
    const mockGoals = [{
      id: 'goal-1',
      title: 'Test',
      area: 'Work',
      description: '',
      status: 'ACTIVE' as const,
      progress: 50,
      nextTodo: 'Task 1',
      taskCount: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    }]

    const state = createMockGoalState({
      baseGoals: mockGoals,
      activeArea: 'Work',
    })

    selectFilteredGoals(state)

    expect(filterGoalsByArea).not.toHaveBeenCalled()
  })

  it('selectFilteredGoals should filter by area from baseGoals', () => {
    const mockGoals = [
      { id: 'goal-1', title: 'Work Goal', area: 'Work', description: '', status: 'ACTIVE' as const, progress: 0, nextTodo: '', taskCount: 0, createdAt: new Date(), updatedAt: new Date() },
      { id: 'goal-2', title: 'Personal Goal', area: 'Personal', description: '', status: 'ACTIVE' as const, progress: 0, nextTodo: '', taskCount: 0, createdAt: new Date(), updatedAt: new Date() },
    ]

    const state = createMockGoalState({
      baseGoals: mockGoals,
      activeArea: 'Work',
    })

    const result = selectFilteredGoals(state)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('goal-1')
  })
})
