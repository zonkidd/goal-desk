import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventBus } from '../events/EventBus'
import { createTaskStore } from './taskStore.refactored'
import type { Task } from '../types/task'
import type { DomainEvent } from '../events/DomainEvents'

describe('TaskStore (Refactored)', () => {
  let eventBus: EventBus
  let useTaskStore: ReturnType<typeof createTaskStore>

  beforeEach(() => {
    eventBus = new EventBus()
    useTaskStore = createTaskStore(eventBus)
  })

  it('should store tasks as pure data', () => {
    // Act
    const initialState = useTaskStore.getState()

    // Assert
    expect(initialState.tasks).toEqual([])
  })

  it('should update tasks when receiving task.created event', () => {
    // Arrange
    const newTask: Task = {
      id: 'task-1',
      title: 'New Task',
      status: 'TODO',
      content: '',
      activityLogs: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Act
    eventBus.emit({ type: 'task.created', payload: newTask })

    // Assert
    const state = useTaskStore.getState()
    expect(state.tasks).toHaveLength(1)
    expect(state.tasks[0]).toEqual(newTask)
  })

  it('should update existing task when receiving task.updated event', () => {
    // Arrange
    const existingTask: Task = {
      id: 'task-1',
      title: 'Original Title',
      status: 'TODO',
      content: '',
      activityLogs: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    useTaskStore.getState()._replaceTask(existingTask)

    const updatedTask: Task = {
      ...existingTask,
      title: 'Updated Title',
      status: 'IN_PROGRESS',
    }

    // Act
    eventBus.emit({ type: 'task.updated', payload: updatedTask })

    // Assert
    const state = useTaskStore.getState()
    expect(state.tasks).toHaveLength(1)
    expect(state.tasks[0].title).toBe('Updated Title')
    expect(state.tasks[0].status).toBe('IN_PROGRESS')
  })

  it('should delete task when receiving task.deleted event', () => {
    // Arrange
    const task1: Task = {
      id: 'task-1',
      title: 'Task 1',
      status: 'TODO',
      content: '',
      activityLogs: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const task2: Task = {
      id: 'task-2',
      title: 'Task 2',
      status: 'TODO',
      content: '',
      activityLogs: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    useTaskStore.getState()._replaceTask(task1)
    useTaskStore.getState()._replaceTask(task2)

    // Act
    eventBus.emit({ type: 'task.deleted', payload: { taskId: 'task-1' } })

    // Assert
    const state = useTaskStore.getState()
    expect(state.tasks).toHaveLength(1)
    expect(state.tasks[0].id).toBe('task-2')
  })

  it('should not have derived state fields', () => {
    // Arrange
    const state = useTaskStore.getState()

    // Assert - these fields should NOT exist in the new architecture
    expect(state).not.toHaveProperty('todayFocusTasks')
    expect(state).not.toHaveProperty('inbox')
    expect(state).not.toHaveProperty('todayAttentionGroups')
  })

  it('should not have cross-store dependencies', () => {
    // Assert - store should only have tasks and internal methods
    const state = useTaskStore.getState()

    // Should NOT have methods that call other stores
    expect(state).not.toHaveProperty('openTaskDrawer')
    expect(state).not.toHaveProperty('setView')
  })
})
