import { describe, it, expect, beforeEach } from 'vitest'
import { signal } from '@preact/signals-react'
import { DerivationEngine } from '../reactive/DerivationEngine'
import { getInboxTaskGroups } from '../lib/workspaceDerivation'
import type { Task } from '../types/task'

describe('inbox Derivation', () => {
  let engine: DerivationEngine
  let tasksSignal: ReturnType<typeof signal<Task[]>>
  let showCompletedSignal: ReturnType<typeof signal<boolean>>

  beforeEach(() => {
    engine = new DerivationEngine()
    tasksSignal = signal<Task[]>([])
    showCompletedSignal = signal<boolean>(false)
  })

  it('should compute inbox groups from tasks', () => {
    // Arrange
    const tasks: Task[] = [
      {
        id: 'task-1',
        title: 'Active Task',
        status: 'TODO',
        content: '',
        activityLogs: [],
        createdAt: new Date('2026-06-15'),
        updatedAt: new Date('2026-06-15'),
      },
      {
        id: 'task-2',
        title: 'In Progress Task',
        status: 'IN_PROGRESS',
        content: '',
        activityLogs: [],
        createdAt: new Date('2026-06-14'),
        updatedAt: new Date('2026-06-14'),
      },
      {
        id: 'task-3',
        title: 'Done Task',
        status: 'DONE',
        content: '',
        activityLogs: [],
        createdAt: new Date('2026-06-13'),
        updatedAt: new Date('2026-06-13'),
      },
    ]

    tasksSignal.value = tasks

    // Act - register derivation
    const inbox$ = engine.register('inbox', () =>
      getInboxTaskGroups(tasksSignal.value, showCompletedSignal.value)
    )

    // Assert
    expect(inbox$.value.activeTasks).toHaveLength(2)
    expect(inbox$.value.activeTasks.map(t => t.id)).toEqual(['task-1', 'task-2'])
    expect(inbox$.value.completed.totalCount).toBe(1)
    expect(inbox$.value.completed.visibleTasks).toHaveLength(0) // showCompleted = false
  })

  it('should auto-recompute when tasks change', () => {
    // Arrange
    tasksSignal.value = []

    const inbox$ = engine.register('inbox', () =>
      getInboxTaskGroups(tasksSignal.value, showCompletedSignal.value)
    )

    expect(inbox$.value.activeTasks).toHaveLength(0)

    // Act - add tasks
    tasksSignal.value = [
      {
        id: 'task-1',
        title: 'New Task',
        status: 'TODO',
        content: '',
        activityLogs: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    // Assert - derivation updates automatically
    expect(inbox$.value.activeTasks).toHaveLength(1)
    expect(inbox$.value.activeTasks[0].id).toBe('task-1')
  })

  it('should show completed tasks when showCompleted changes', () => {
    // Arrange
    const tasks: Task[] = [
      {
        id: 'task-1',
        title: 'Done Task',
        status: 'DONE',
        content: '',
        activityLogs: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    tasksSignal.value = tasks
    showCompletedSignal.value = false

    const inbox$ = engine.register('inbox', () =>
      getInboxTaskGroups(tasksSignal.value, showCompletedSignal.value)
    )

    // Initially hidden
    expect(inbox$.value.completed.visibleTasks).toHaveLength(0)

    // Act - show completed
    showCompletedSignal.value = true

    // Assert - now visible
    expect(inbox$.value.completed.visibleTasks).toHaveLength(1)
    expect(inbox$.value.completed.visibleTasks[0].id).toBe('task-1')
  })
})
