import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventBus } from '../events/EventBus'
import { TaskCommands } from '../commands/TaskCommands'
import { createTaskStore } from '../store/taskStore.refactored'
import type { Task } from '../types/task'

describe('End-to-End: TaskCommands → EventBus → TaskStore', () => {
  let eventBus: EventBus
  let taskCommands: TaskCommands
  let useTaskStore: ReturnType<typeof createTaskStore>
  let mockAdapter: any

  beforeEach(() => {
    // 1. 创建 Event Bus
    eventBus = new EventBus()

    // 2. 创建 TaskStore（订阅 EventBus）
    useTaskStore = createTaskStore(eventBus)

    // 3. Mock adapter
    mockAdapter = {
      createTask: vi.fn(),
      updateTaskStatus: vi.fn(),
    }

    // 4. 创建 TaskCommands（使用 EventBus）
    taskCommands = new TaskCommands(mockAdapter, eventBus)
  })

  it('should flow from command to store through event bus', async () => {
    // Arrange
    const mockTask: Task = {
      id: 'task-1',
      title: 'Integration Test Task',
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

    // Verify initial state
    expect(useTaskStore.getState().tasks).toHaveLength(0)

    // Act - call command
    const result = await taskCommands.createTask({ title: 'Integration Test Task' })

    // Assert
    expect(result).toEqual(mockTask)

    // Verify store was updated automatically via EventBus
    const storeState = useTaskStore.getState()
    expect(storeState.tasks).toHaveLength(1)
    expect(storeState.tasks[0]).toEqual(mockTask)
  })

  it('should handle multiple tasks in sequence', async () => {
    // Arrange
    const task1: Task = {
      id: 'task-1',
      title: 'First Task',
      status: 'TODO',
      content: '',
      activityLogs: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const task2: Task = {
      id: 'task-2',
      title: 'Second Task',
      status: 'TODO',
      content: '',
      activityLogs: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockAdapter.createTask
      .mockResolvedValueOnce({ task: task1, statusMessage: 'Task 1 created' })
      .mockResolvedValueOnce({ task: task2, statusMessage: 'Task 2 created' })

    // Act - create first task
    await taskCommands.createTask({ title: 'First Task' })
    expect(useTaskStore.getState().tasks).toHaveLength(1)

    // Act - create second task
    await taskCommands.createTask({ title: 'Second Task' })

    // Assert - store has both tasks
    const storeState = useTaskStore.getState()
    expect(storeState.tasks).toHaveLength(2)
    expect(storeState.tasks.map((t) => t.id)).toEqual(['task-2', 'task-1']) // Newest first
  })

  it('should not update store when command fails', async () => {
    // Arrange
    mockAdapter.createTask.mockResolvedValue({
      task: null,
      statusMessage: 'Failed to create task',
    })

    // Act
    const result = await taskCommands.createTask({ title: 'Failing Task' })

    // Assert
    expect(result).toBeNull()
    expect(useTaskStore.getState().tasks).toHaveLength(0) // Store unchanged
  })

  it('should verify no circular dependencies', () => {
    // Assert - TaskStore should not directly know about TaskCommands
    const storeState = useTaskStore.getState()

    expect(storeState).not.toHaveProperty('addTask')
    expect(storeState).not.toHaveProperty('createTask')
    expect(storeState).not.toHaveProperty('updateTaskStatus')

    // Only has data and internal methods
    expect(storeState).toHaveProperty('tasks')
    expect(storeState).toHaveProperty('_replaceTask')
    expect(storeState).toHaveProperty('_removeTask')
  })
})
