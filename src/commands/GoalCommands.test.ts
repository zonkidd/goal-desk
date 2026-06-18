import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GoalCommands } from './GoalCommands'
import { EventBus } from '../events/EventBus'
import type { GoalCard } from '../types/app'

describe('GoalCommands', () => {
  let goalCommands: GoalCommands
  let eventBus: EventBus
  let mockAdapter: any

  beforeEach(() => {
    eventBus = new EventBus()

    // Mock adapter
    mockAdapter = {
      createGoal: vi.fn(),
      updateGoalStatus: vi.fn(),
      updateGoalFields: vi.fn(),
    }

    goalCommands = new GoalCommands(mockAdapter, eventBus)
  })

  it('should create goal and emit event', async () => {
    // Arrange
    const mockGoal: GoalCard = {
      id: 'goal-1',
      title: 'Test Goal',
      area: 'Work',
      description: 'Test description',
      status: 'ACTIVE',
      progress: 0,
      nextTodo: 'Keep going',
      taskCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockAdapter.createGoal.mockResolvedValue({
      goal: mockGoal,
      statusMessage: 'Goal created',
      openGoalWorkspace: false,
    })

    const eventHandler = vi.fn()
    eventBus.subscribe(eventHandler)

    // Act
    const result = await goalCommands.createGoal({
      title: 'Test Goal',
      area: 'Work',
      description: 'Test description',
    })

    // Assert
    expect(mockAdapter.createGoal).toHaveBeenCalledWith(
      { title: 'Test Goal', area: 'Work', description: 'Test description' },
      undefined
    )
    expect(result.goal).toEqual(mockGoal)
    expect(eventHandler).toHaveBeenCalledWith({
      type: 'goal.created',
      payload: mockGoal,
    })
  })

  it('should default area to "未分类" when empty', async () => {
    // Arrange
    const mockGoal: GoalCard = {
      id: 'goal-1',
      title: 'Test Goal',
      area: '未分类',
      description: '',
      status: 'ACTIVE',
      progress: 0,
      nextTodo: 'Keep going',
      taskCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockAdapter.createGoal.mockResolvedValue({
      goal: mockGoal,
      statusMessage: 'Goal created',
      openGoalWorkspace: false,
    })

    // Act
    await goalCommands.createGoal({ title: 'Test Goal', area: '', description: '' })

    // Assert
    expect(mockAdapter.createGoal).toHaveBeenCalledWith(
      { title: 'Test Goal', area: '未分类', description: '' },
      undefined
    )
  })

  it('should reject empty title', async () => {
    // Act & Assert
    await expect(goalCommands.createGoal({ title: '', area: 'Work', description: '' }))
      .rejects.toThrow('Goal title cannot be empty')

    await expect(goalCommands.createGoal({ title: '   ', area: 'Work', description: '' }))
      .rejects.toThrow('Goal title cannot be empty')

    expect(mockAdapter.createGoal).not.toHaveBeenCalled()
  })

  it('should return null goal when adapter fails', async () => {
    // Arrange
    mockAdapter.createGoal.mockResolvedValue({
      goal: null,
      statusMessage: 'Failed to create goal',
      openGoalWorkspace: false,
    })

    const eventHandler = vi.fn()
    eventBus.subscribe(eventHandler)

    // Act
    const result = await goalCommands.createGoal({ title: 'Test Goal', area: 'Work', description: '' })

    // Assert
    expect(result.goal).toBeNull()
    expect(eventHandler).not.toHaveBeenCalled() // No event if creation failed
  })
})
