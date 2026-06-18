import { describe, it, expect, beforeEach } from 'vitest'
import { EventBus } from '../events/EventBus'
import { createGoalStore } from './goalStore.refactored'
import type { GoalCard } from '../types/app'

describe('GoalStore (Refactored)', () => {
  let eventBus: EventBus
  let useGoalStore: ReturnType<typeof createGoalStore>

  beforeEach(() => {
    eventBus = new EventBus()
    useGoalStore = createGoalStore(eventBus)
  })

  it('should store goals as pure data', () => {
    // Act
    const initialState = useGoalStore.getState()

    // Assert
    expect(initialState.baseGoals).toEqual([])
  })

  it('should update goals when receiving goal.created event', () => {
    // Arrange
    const newGoal: GoalCard = {
      id: 'goal-1',
      title: 'New Goal',
      area: 'Work',
      description: 'Test goal',
      status: 'ACTIVE',
      progress: { totalTasks: 0, completedTasks: 0, percentage: 0 },
      nextTodo: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Act
    eventBus.emit({ type: 'goal.created', payload: newGoal })

    // Assert
    const state = useGoalStore.getState()
    expect(state.baseGoals).toHaveLength(1)
    expect(state.baseGoals[0]).toEqual(newGoal)
  })

  it('should update existing goal when receiving goal.updated event', () => {
    // Arrange
    const existingGoal: GoalCard = {
      id: 'goal-1',
      title: 'Original Title',
      area: 'Work',
      description: '',
      status: 'ACTIVE',
      progress: { totalTasks: 0, completedTasks: 0, percentage: 0 },
      nextTodo: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    useGoalStore.getState()._replaceGoal(existingGoal)

    const updatedGoal: GoalCard = {
      ...existingGoal,
      title: 'Updated Title',
      description: 'Updated description',
    }

    // Act
    eventBus.emit({ type: 'goal.updated', payload: updatedGoal })

    // Assert
    const state = useGoalStore.getState()
    expect(state.baseGoals).toHaveLength(1)
    expect(state.baseGoals[0].title).toBe('Updated Title')
    expect(state.baseGoals[0].description).toBe('Updated description')
  })

  it('should delete goal when receiving goal.deleted event', () => {
    // Arrange
    const goal1: GoalCard = {
      id: 'goal-1',
      title: 'Goal 1',
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
      title: 'Goal 2',
      area: 'Personal',
      description: '',
      status: 'ACTIVE',
      progress: { totalTasks: 0, completedTasks: 0, percentage: 0 },
      nextTodo: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    useGoalStore.getState()._replaceGoal(goal1)
    useGoalStore.getState()._replaceGoal(goal2)

    // Act
    eventBus.emit({ type: 'goal.deleted', payload: { goalId: 'goal-1' } })

    // Assert
    const state = useGoalStore.getState()
    expect(state.baseGoals).toHaveLength(1)
    expect(state.baseGoals[0].id).toBe('goal-2')
  })

  it('should not have derived state fields', () => {
    // Arrange
    const state = useGoalStore.getState()

    // Assert - these fields should NOT exist in the new architecture
    expect(state).not.toHaveProperty('todayRelevantGoals')
  })

  it('should not have cross-store dependencies', () => {
    // Assert - store should only have goals and internal methods
    const state = useGoalStore.getState()

    // Should NOT have methods that call other stores
    expect(state).not.toHaveProperty('openGoalDrawer')
    expect(state).not.toHaveProperty('setView')
  })
})
