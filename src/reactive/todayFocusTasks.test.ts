import { describe, it, expect, beforeEach } from 'vitest'
import { signal } from '@preact/signals-react'
import { DerivationEngine } from '../reactive/DerivationEngine'
import { getTodayFocusTasks } from '../lib/workspaceDerivation'
import type { Task } from '../types/task'
import type { GoalCard } from '../types/app'

describe('todayFocusTasks Derivation', () => {
  let engine: DerivationEngine
  let tasksSignal: ReturnType<typeof signal<Task[]>>
  let goalsSignal: ReturnType<typeof signal<GoalCard[]>>

  beforeEach(() => {
    engine = new DerivationEngine()
    tasksSignal = signal<Task[]>([])
    goalsSignal = signal<GoalCard[]>([])
  })

  it('should compute todayFocusTasks from tasks and goals', () => {
    // Arrange
    const today = new Date('2026-06-16T10:00:00')
    const yesterday = new Date('2026-06-15T10:00:00')

    const tasks: Task[] = [
      {
        id: 'task-1',
        title: 'In Progress Task',
        status: 'IN_PROGRESS',
        content: '',
        activityLogs: [],
        plannedStartAt: yesterday,
        createdAt: yesterday,
        updatedAt: new Date(),
      },
      {
        id: 'task-2',
        title: 'Todo Task',
        status: 'TODO',
        content: '',
        activityLogs: [],
        plannedStartAt: yesterday,
        createdAt: yesterday,
        updatedAt: new Date(),
      },
    ]

    tasksSignal.value = tasks

    // Act - register derivation
    const todayFocusTasks$ = engine.register('todayFocusTasks', () =>
      getTodayFocusTasks(tasksSignal.value, goalsSignal.value, 'ALL', today)
    )

    // Assert - only IN_PROGRESS tasks are included
    expect(todayFocusTasks$.value).toHaveLength(1)
    expect(todayFocusTasks$.value[0].id).toBe('task-1')
  })

  it('should auto-recompute when tasks change', () => {
    // Arrange
    const today = new Date('2026-06-16T10:00:00')
    const yesterday = new Date('2026-06-15T10:00:00')

    tasksSignal.value = []

    const todayFocusTasks$ = engine.register('todayFocusTasks', () =>
      getTodayFocusTasks(tasksSignal.value, goalsSignal.value, 'ALL', today)
    )

    expect(todayFocusTasks$.value).toHaveLength(0)

    // Act - add a task
    tasksSignal.value = [
      {
        id: 'task-1',
        title: 'New In Progress Task',
        status: 'IN_PROGRESS',
        content: '',
        activityLogs: [],
        plannedStartAt: yesterday,
        createdAt: yesterday,
        updatedAt: new Date(),
      },
    ]

    // Assert - derivation updates automatically
    expect(todayFocusTasks$.value).toHaveLength(1)
    expect(todayFocusTasks$.value[0].id).toBe('task-1')
  })

  it('should filter by area when goals change', () => {
    // Arrange
    const today = new Date('2026-06-16T10:00:00')
    const yesterday = new Date('2026-06-15T10:00:00')

    const goal: GoalCard = {
      id: 'goal-1',
      title: 'Work Goal',
      area: 'Work',
      description: '',
      status: 'ACTIVE',
      progress: { totalTasks: 0, completedTasks: 0, percentage: 0 },
      nextTodo: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const tasks: Task[] = [
      {
        id: 'task-1',
        title: 'Work Task',
        status: 'IN_PROGRESS',
        content: '',
        activityLogs: [],
        plannedStartAt: yesterday,
        linkedGoalId: 'goal-1',
        createdAt: yesterday,
        updatedAt: new Date(),
      },
      {
        id: 'task-2',
        title: 'Personal Task',
        status: 'IN_PROGRESS',
        content: '',
        activityLogs: [],
        plannedStartAt: yesterday,
        linkedGoalId: 'goal-2',
        createdAt: yesterday,
        updatedAt: new Date(),
      },
    ]

    tasksSignal.value = tasks
    goalsSignal.value = []

    const todayFocusTasks$ = engine.register('todayFocusTasks', () =>
      getTodayFocusTasks(tasksSignal.value, goalsSignal.value, 'Work', today)
    )

    // Initially no goals, so no tasks match area filter
    expect(todayFocusTasks$.value).toHaveLength(0)

    // Act - add goal
    goalsSignal.value = [goal]

    // Assert - now task-1 matches the Work area
    expect(todayFocusTasks$.value).toHaveLength(1)
    expect(todayFocusTasks$.value[0].id).toBe('task-1')
  })
})
