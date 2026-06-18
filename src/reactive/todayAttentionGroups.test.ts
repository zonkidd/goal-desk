import { describe, it, expect, beforeEach } from 'vitest'
import { signal } from '@preact/signals-react'
import { DerivationEngine } from '../reactive/DerivationEngine'
import { deriveTodayAttentionGroups } from '../lib/workspaceDerivation'
import type { Task } from '../types/task'

describe('todayAttentionGroups Derivation', () => {
  let engine: DerivationEngine
  let tasksSignal: ReturnType<typeof signal<Task[]>>

  beforeEach(() => {
    engine = new DerivationEngine()
    tasksSignal = signal<Task[]>([])
  })

  it('should group tasks by attention category', () => {
    // Arrange
    const today = new Date('2026-06-16T10:00:00')
    const yesterday = new Date('2026-06-15T10:00:00')
    const tomorrow = new Date('2026-06-17T10:00:00')

    const tasks: Task[] = [
      {
        id: 'task-1',
        title: 'Overdue Task',
        status: 'TODO',
        content: '',
        activityLogs: [],
        dueDate: yesterday,
        createdAt: new Date('2026-06-10'),
        updatedAt: new Date('2026-06-10'),
      },
      {
        id: 'task-2',
        title: 'Due Today Task',
        status: 'IN_PROGRESS',
        content: '',
        activityLogs: [],
        dueDate: today,
        createdAt: new Date('2026-06-10'),
        updatedAt: new Date('2026-06-10'),
      },
      {
        id: 'task-3',
        title: 'Ongoing Task',
        status: 'IN_PROGRESS',
        content: '',
        activityLogs: [],
        plannedStartAt: yesterday,
        dueDate: tomorrow,
        createdAt: yesterday,
        updatedAt: yesterday,
      },
    ]

    tasksSignal.value = tasks

    // Act
    const todayAttentionGroups$ = engine.register('todayAttentionGroups', () =>
      deriveTodayAttentionGroups(tasksSignal.value, today)
    )

    // Assert
    expect(todayAttentionGroups$.value.overdue).toHaveLength(1)
    expect(todayAttentionGroups$.value.overdue[0].id).toBe('task-1')

    expect(todayAttentionGroups$.value.dueToday).toHaveLength(1)
    expect(todayAttentionGroups$.value.dueToday[0].id).toBe('task-2')

    expect(todayAttentionGroups$.value.ongoing).toHaveLength(1)
    expect(todayAttentionGroups$.value.ongoing[0].id).toBe('task-3')
  })

  it('should auto-recompute when tasks change', () => {
    // Arrange
    const today = new Date('2026-06-16T10:00:00')
    tasksSignal.value = []

    const todayAttentionGroups$ = engine.register('todayAttentionGroups', () =>
      deriveTodayAttentionGroups(tasksSignal.value, today)
    )

    expect(todayAttentionGroups$.value.overdue).toHaveLength(0)

    // Act - add overdue task
    tasksSignal.value = [
      {
        id: 'task-1',
        title: 'New Overdue',
        status: 'TODO',
        content: '',
        activityLogs: [],
        dueDate: new Date('2026-06-15'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    // Assert
    expect(todayAttentionGroups$.value.overdue).toHaveLength(1)
    expect(todayAttentionGroups$.value.overdue[0].id).toBe('task-1')
  })

  it('should exclude DONE tasks', () => {
    // Arrange
    const today = new Date('2026-06-16T10:00:00')
    const yesterday = new Date('2026-06-15T10:00:00')

    const tasks: Task[] = [
      {
        id: 'task-1',
        title: 'Done Overdue',
        status: 'DONE',
        content: '',
        activityLogs: [],
        dueDate: yesterday,
        createdAt: new Date('2026-06-10'),
        updatedAt: new Date('2026-06-10'),
      },
    ]

    tasksSignal.value = tasks

    // Act
    const todayAttentionGroups$ = engine.register('todayAttentionGroups', () =>
      deriveTodayAttentionGroups(tasksSignal.value, today)
    )

    // Assert - DONE tasks should not appear
    expect(todayAttentionGroups$.value.overdue).toHaveLength(0)
    expect(todayAttentionGroups$.value.dueToday).toHaveLength(0)
    expect(todayAttentionGroups$.value.ongoing).toHaveLength(0)
  })
})
