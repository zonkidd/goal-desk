import { describe, it, expect } from 'vitest'
import { computeSnapshot, type AtomicState } from './WorkspaceEngine'
import type { GoalCard, RawAgendaItem } from '../types/app'
import type { Task } from '../types/task'

function createMockAtomicState(overrides: Partial<AtomicState> = {}): AtomicState {
  return {
    baseTimeline: [],
    baseGoals: [],
    tasks: [],
    activeArea: 'ALL',
    showCompletedTodos: false,
    now: new Date('2026-06-20T10:00:00'),
    ...overrides,
  }
}

describe('computeSnapshot (pure function)', () => {
  it('returns empty snapshot for empty state', () => {
    const snapshot = computeSnapshot(createMockAtomicState())
    expect(snapshot.goals).toEqual([])
    expect(snapshot.today.focusTasks).toEqual([])
    expect(snapshot.today.timeline).toEqual([])
    expect(snapshot.inbox.activeTasks).toEqual([])
  })

  it('derives goal progress from linked tasks', () => {
    const goals: GoalCard[] = [{
      id: 'g1', title: 'Goal 1', area: 'Work', description: '',
      status: 'ACTIVE', progress: 0, nextTodo: '', taskCount: 0,
      createdAt: new Date(), updatedAt: new Date(),
    }]
    const tasks: Task[] = [
      { id: 't1', title: 'Task 1', content: '', status: 'DONE', showInTimeline: false, linkedGoalId: 'g1', activityLogs: [] },
      { id: 't2', title: 'Task 2', content: '', status: 'TODO', showInTimeline: false, linkedGoalId: 'g1', activityLogs: [] },
    ]

    const snapshot = computeSnapshot(createMockAtomicState({ baseGoals: goals, tasks }))
    expect(snapshot.goals[0].progress).toBe(50)
    expect(snapshot.goals[0].taskCount).toBe(2)
  })

  it('filters goals by area', () => {
    const goals: GoalCard[] = [
      { id: 'g1', title: 'Work Goal', area: 'Work', description: '', status: 'ACTIVE', progress: 0, nextTodo: '', taskCount: 0, createdAt: new Date(), updatedAt: new Date() },
      { id: 'g2', title: 'Personal Goal', area: 'Personal', description: '', status: 'ACTIVE', progress: 0, nextTodo: '', taskCount: 0, createdAt: new Date(), updatedAt: new Date() },
    ]

    const snapshot = computeSnapshot(createMockAtomicState({ baseGoals: goals, activeArea: 'Work' }))
    expect(snapshot.goals).toHaveLength(1)
    expect(snapshot.goals[0].id).toBe('g1')
  })

  it('groups inbox tasks by status', () => {
    const tasks: Task[] = [
      { id: 't1', title: 'Active', content: '', status: 'TODO', showInTimeline: false, activityLogs: [] },
      { id: 't2', title: 'Paused', content: '', status: 'PAUSED', showInTimeline: false, activityLogs: [] },
      { id: 't3', title: 'Done', content: '', status: 'DONE', showInTimeline: false, activityLogs: [] },
    ]

    const snapshot = computeSnapshot(createMockAtomicState({ tasks }))
    expect(snapshot.inbox.activeTasks).toHaveLength(1)
    expect(snapshot.inbox.pausedTasks).toHaveLength(1)
    expect(snapshot.inbox.completed.totalCount).toBe(1)
  })

  it('includes meta information', () => {
    const snapshot = computeSnapshot(createMockAtomicState())
    expect(snapshot.meta.computedAt).toBeInstanceOf(Date)
    expect(snapshot.meta.activeArea).toBe('ALL')
    expect(snapshot.meta.taskCount).toBe(0)
    expect(snapshot.meta.goalCount).toBe(0)
  })
})
