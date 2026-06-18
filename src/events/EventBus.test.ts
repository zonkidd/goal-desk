import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventBus } from './EventBus'
import type { DomainEvent } from './DomainEvents'

describe('EventBus', () => {
  let eventBus: EventBus

  beforeEach(() => {
    eventBus = new EventBus()
  })

  it('should emit and receive events', () => {
    // Arrange
    const handler = vi.fn()
    eventBus.subscribe(handler)

    const event: DomainEvent = {
      type: 'task.created',
      payload: {
        id: 'task-1',
        title: 'Test Task',
        status: 'TODO',
        content: '',
        activityLogs: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }

    // Act
    eventBus.emit(event)

    // Assert
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(event)
  })

  it('should notify all subscribers', () => {
    // Arrange
    const handler1 = vi.fn()
    const handler2 = vi.fn()
    const handler3 = vi.fn()

    eventBus.subscribe(handler1)
    eventBus.subscribe(handler2)
    eventBus.subscribe(handler3)

    const event: DomainEvent = {
      type: 'goal.created',
      payload: {
        id: 'goal-1',
        title: 'Test Goal',
        area: 'Work',
        description: '',
        status: 'ACTIVE',
        progress: { totalTasks: 0, completedTasks: 0, percentage: 0 },
        nextTodo: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }

    // Act
    eventBus.emit(event)

    // Assert
    expect(handler1).toHaveBeenCalledWith(event)
    expect(handler2).toHaveBeenCalledWith(event)
    expect(handler3).toHaveBeenCalledWith(event)
  })

  it('should allow unsubscribing', () => {
    // Arrange
    const handler = vi.fn()
    const unsubscribe = eventBus.subscribe(handler)

    const event: DomainEvent = {
      type: 'task.updated',
      payload: {
        id: 'task-1',
        title: 'Updated Task',
        status: 'IN_PROGRESS',
        content: '',
        activityLogs: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }

    // Act - emit before unsubscribe
    eventBus.emit(event)
    expect(handler).toHaveBeenCalledTimes(1)

    // Act - unsubscribe and emit again
    unsubscribe()
    eventBus.emit(event)

    // Assert - should not be called again
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
