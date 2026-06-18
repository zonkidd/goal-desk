import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventBus } from '../events/EventBus'
import { GoalCommands } from '../commands/GoalCommands'
import { createGoalStore } from '../store/goalStore.refactored'
import type { GoalCard } from '../types/app'

describe('End-to-End: GoalCommands → EventBus → GoalStore', () => {
  let eventBus: EventBus
  let goalCommands: GoalCommands
  let useGoalStore: ReturnType<typeof createGoalStore>
  let mockAdapter: any

  beforeEach(() => {
    // 1. 创建 Event Bus
    eventBus = new EventBus()

    // 2. 创建 GoalStore（订阅 EventBus）
    useGoalStore = createGoalStore(eventBus)

    // 3. Mock adapter
    mockAdapter = {
      createGoal: vi.fn(),
      updateGoalStatus: vi.fn(),
      updateGoalFields: vi.fn(),
    }

    // 4. 创建 GoalCommands（使用 EventBus）
    goalCommands = new GoalCommands(mockAdapter, eventBus)
  })

  it('should flow from command to store through event bus', async () => {
    // Arrange
    const mockGoal: GoalCard = {
      id: 'goal-1',
      title: 'Integration Test Goal',
      area: 'Work',
      description: 'Test description',
      status: 'ACTIVE',
      progress: { totalTasks: 0, completedTasks: 0, percentage: 0 },
      nextTodo: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockAdapter.createGoal.mockResolvedValue({
      goal: mockGoal,
      statusMessage: 'Goal created',
      openGoalWorkspace: false,
    })

    // Verify initial state
    expect(useGoalStore.getState().baseGoals).toHaveLength(0)

    // Act - call command
    const result = await goalCommands.createGoal({
      title: 'Integration Test Goal',
      area: 'Work',
      description: 'Test description',
    })

    // Assert
    expect(result.goal).toEqual(mockGoal)

    // Verify store was updated automatically via EventBus
    const storeState = useGoalStore.getState()
    expect(storeState.baseGoals).toHaveLength(1)
    expect(storeState.baseGoals[0]).toEqual(mockGoal)
  })

  it('should handle multiple goals in sequence', async () => {
    // Arrange
    const goal1: GoalCard = {
      id: 'goal-1',
      title: 'First Goal',
      area: 'Work',
      description: '',
      status: 'ACTIVE',
      progress: { totalTasks: 0, completedTasks: 0, percentage: 0 },
      nextTodo: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const goal2: GoalCard = {
      id: 'goal-2',
      title: 'Second Goal',
      area: 'Personal',
      description: '',
      status: 'ACTIVE',
      progress: { totalTasks: 0, completedTasks: 0, percentage: 0 },
      nextTodo: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockAdapter.createGoal
      .mockResolvedValueOnce({
        goal: goal1,
        statusMessage: 'Goal 1 created',
        openGoalWorkspace: false,
      })
      .mockResolvedValueOnce({
        goal: goal2,
        statusMessage: 'Goal 2 created',
        openGoalWorkspace: false,
      })

    // Act - create first goal
    await goalCommands.createGoal({ title: 'First Goal', area: 'Work', description: '' })
    expect(useGoalStore.getState().baseGoals).toHaveLength(1)

    // Act - create second goal
    await goalCommands.createGoal({ title: 'Second Goal', area: 'Personal', description: '' })

    // Assert - store has both goals
    const storeState = useGoalStore.getState()
    expect(storeState.baseGoals).toHaveLength(2)
    expect(storeState.baseGoals.map((g) => g.id)).toEqual(['goal-2', 'goal-1']) // Newest first
  })

  it('should not update store when command fails', async () => {
    // Arrange
    mockAdapter.createGoal.mockResolvedValue({
      goal: null,
      statusMessage: 'Failed to create goal',
      openGoalWorkspace: false,
    })

    // Act
    const result = await goalCommands.createGoal({
      title: 'Failing Goal',
      area: 'Work',
      description: '',
    })

    // Assert
    expect(result.goal).toBeNull()
    expect(useGoalStore.getState().baseGoals).toHaveLength(0) // Store unchanged
  })

  it('should verify no circular dependencies', () => {
    // Assert - GoalStore should not directly know about GoalCommands
    const storeState = useGoalStore.getState()

    expect(storeState).not.toHaveProperty('createGoal')
    expect(storeState).not.toHaveProperty('updateGoalStatus')
    expect(storeState).not.toHaveProperty('updateGoalFields')

    // Only has data and internal methods
    expect(storeState).toHaveProperty('baseGoals')
    expect(storeState).toHaveProperty('_replaceGoal')
    expect(storeState).toHaveProperty('_removeGoal')
  })
})
