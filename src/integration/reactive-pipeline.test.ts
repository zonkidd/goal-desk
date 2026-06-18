import { describe, it, expect, beforeEach } from 'vitest'
import { signal } from '@preact/signals-react'
import { DerivationEngine } from '../reactive/DerivationEngine'
import { createReactivDerivations } from '../reactive/derivations'
import { EventBus } from '../events/EventBus'
import { TaskCommands } from '../commands/TaskCommands'
import { createTaskStore } from '../store/taskStore.refactored'
import type { Task } from '../types/task'
import type { GoalCard } from '../types/app'

describe('End-to-End: Commands → Store → Reactive Derivation', () => {
  let eventBus: EventBus
  let engine: DerivationEngine
  let taskCommands: TaskCommands
  let useTaskStore: ReturnType<typeof createTaskStore>
  let tasksSignal: ReturnType<typeof signal<Task[]>>
  let goalsSignal: ReturnType<typeof signal<GoalCard[]>>
  let areaSignal: ReturnType<typeof signal<'ALL' | string>>
  let todayFocusTasks$: any
  let mockAdapter: any

  beforeEach(() => {
    // 1. 创建基础设施
    eventBus = new EventBus()
    engine = new DerivationEngine()

    // 2. 创建 TaskStore（订阅 EventBus）
    useTaskStore = createTaskStore(eventBus)

    // 3. 创建 Signals（连接 Store 和 Reactive Engine）
    tasksSignal = signal<Task[]>([])
    goalsSignal = signal<GoalCard[]>([])
    areaSignal = signal<'ALL' | string>('ALL')

    // 4. 注册响应式派生
    const derivations = createReactivDerivations(engine, tasksSignal, goalsSignal, areaSignal)
    todayFocusTasks$ = derivations.todayFocusTasks$

    // 5. 同步 Store 到 Signal
    useTaskStore.subscribe((state) => {
      tasksSignal.value = state.tasks
    })

    // 6. Mock adapter
    mockAdapter = {
      createTask: vi.fn(),
      updateTaskStatus: vi.fn(),
    }

    // 7. 创建 TaskCommands
    taskCommands = new TaskCommands(mockAdapter, eventBus)
  })

  it('should flow from command through store to reactive derivation', async () => {
    // Arrange
    const yesterday = new Date('2026-06-15T10:00:00')
    const mockTask: Task = {
      id: 'task-1',
      title: 'In Progress Task',
      status: 'IN_PROGRESS',
      content: '',
      activityLogs: [],
      plannedStartAt: yesterday,
      createdAt: yesterday,
      updatedAt: new Date(),
    }

    mockAdapter.createTask.mockResolvedValue({
      task: mockTask,
      statusMessage: 'Task created',
    })

    // Verify initial state
    expect(todayFocusTasks$.value).toHaveLength(0)

    // Act - create task via command
    await taskCommands.createTask({ title: 'In Progress Task' })

    // Assert - derivation updated automatically
    expect(todayFocusTasks$.value).toHaveLength(1)
    expect(todayFocusTasks$.value[0].id).toBe('task-1')
  })

  it('should filter out TODO tasks from todayFocusTasks', async () => {
    // Arrange
    const yesterday = new Date('2026-06-15T10:00:00')
    const todoTask: Task = {
      id: 'task-1',
      title: 'Todo Task',
      status: 'TODO',
      content: '',
      activityLogs: [],
      plannedStartAt: yesterday,
      createdAt: yesterday,
      updatedAt: new Date(),
    }

    mockAdapter.createTask.mockResolvedValue({
      task: todoTask,
      statusMessage: 'Task created',
    })

    // Act
    await taskCommands.createTask({ title: 'Todo Task' })

    // Assert - TODO tasks are not in todayFocusTasks
    expect(todayFocusTasks$.value).toHaveLength(0)
  })

  it('should verify complete reactive pipeline', async () => {
    // This test verifies the complete architecture:
    // Command → EventBus → Store → Signal → Reactive Engine → Derived Signal

    const yesterday = new Date('2026-06-15T10:00:00')

    // Create first IN_PROGRESS task
    const task1: Task = {
      id: 'task-1',
      title: 'Task 1',
      status: 'IN_PROGRESS',
      content: '',
      activityLogs: [],
      plannedStartAt: yesterday,
      createdAt: yesterday,
      updatedAt: new Date(),
    }

    mockAdapter.createTask.mockResolvedValueOnce({
      task: task1,
      statusMessage: 'Task 1 created',
    })

    await taskCommands.createTask({ title: 'Task 1' })
    expect(todayFocusTasks$.value).toHaveLength(1)

    // Create second IN_PROGRESS task
    const task2: Task = {
      id: 'task-2',
      title: 'Task 2',
      status: 'IN_PROGRESS',
      content: '',
      activityLogs: [],
      plannedStartAt: yesterday,
      createdAt: yesterday,
      updatedAt: new Date(),
    }

    mockAdapter.createTask.mockResolvedValueOnce({
      task: task2,
      statusMessage: 'Task 2 created',
    })

    await taskCommands.createTask({ title: 'Task 2' })

    // Assert - both tasks in derivation
    expect(todayFocusTasks$.value).toHaveLength(2)

    // Verify store also has both tasks
    expect(useTaskStore.getState().tasks).toHaveLength(2)
  })
})
