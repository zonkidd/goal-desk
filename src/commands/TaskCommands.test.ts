import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TaskCommands } from './TaskCommands'
import { EventBus } from '../events/EventBus'
import type { Task } from '../types/task'
import type { DomainEvent } from '../events/DomainEvents'

describe('TaskCommands', () => {
  let taskCommands: TaskCommands
  let eventBus: EventBus
  let mockAdapter: any

  beforeEach(() => {
    eventBus = new EventBus()

    // Mock adapter
    mockAdapter = {
      createTask: vi.fn(),
      updateTaskStatus: vi.fn(),
    }

    taskCommands = new TaskCommands(mockAdapter, eventBus)
  })

  it('should create task and emit event', async () => {
    // Arrange
    const mockTask: Task = {
      id: 'task-1',
      title: 'Test Task',
      status: 'TODO',
      content: '',
      activityLogs: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockAdapter.createTask.mockResolvedValue({
      task: mockTask,
      statusMessage: 'Task created',
    })

    const eventHandler = vi.fn()
    eventBus.subscribe(eventHandler)

    // Act
    const result = await taskCommands.createTask({ title: 'Test Task' })

    // Assert
    expect(mockAdapter.createTask).toHaveBeenCalledWith('Test Task')
    expect(result).toEqual(mockTask)
    expect(eventHandler).toHaveBeenCalledWith({
      type: 'task.created',
      payload: mockTask,
    })
  })

  it('should trim whitespace from title', async () => {
    // Arrange
    const mockTask: Task = {
      id: 'task-2',
      title: 'Trimmed Task',
      status: 'TODO',
      content: '',
      activityLogs: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockAdapter.createTask.mockResolvedValue({
      task: mockTask,
      statusMessage: 'Task created',
    })

    // Act
    await taskCommands.createTask({ title: '  Trimmed Task  ' })

    // Assert
    expect(mockAdapter.createTask).toHaveBeenCalledWith('Trimmed Task')
  })

  it('should reject empty title', async () => {
    // Act & Assert
    await expect(taskCommands.createTask({ title: '' })).rejects.toThrow('Task title cannot be empty')
    await expect(taskCommands.createTask({ title: '   ' })).rejects.toThrow('Task title cannot be empty')
    expect(mockAdapter.createTask).not.toHaveBeenCalled()
  })

  it('should return null when adapter fails to create task', async () => {
    // Arrange
    mockAdapter.createTask.mockResolvedValue({
      task: null,
      statusMessage: 'Failed to create task',
    })

    const eventHandler = vi.fn()
    eventBus.subscribe(eventHandler)

    // Act
    const result = await taskCommands.createTask({ title: 'Test Task' })

    // Assert
    expect(result).toBeNull()
    expect(eventHandler).not.toHaveBeenCalled() // No event if creation failed
  })
})
