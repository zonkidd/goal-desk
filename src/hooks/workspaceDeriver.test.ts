import { describe, it, expect } from 'vitest'
import { createWorkspaceDeriver, type WorkspaceDeriver, type StoreGetters } from './workspaceDeriver'
import type { Task } from '../types/task'
import type { GoalCard, RawAgendaItem } from '../types/app'

const emptyGetters: StoreGetters = {
  getTasks: () => [],
  getBaseGoals: () => [],
  getActiveArea: () => 'ALL',
  getShowCompletedTodos: () => false,
  getRawCalendarEvents: () => [],
  getRawReminders: () => [],
  getSystemReminders: () => [],
}

describe('WorkspaceDeriver', () => {
  it('creates deriver with empty state', () => {
    const deriver = createWorkspaceDeriver(emptyGetters)
    const snapshot = deriver.compute()
    expect(snapshot.goals).toEqual([])
    expect(snapshot.today.focusTasks).toEqual([])
    expect(snapshot.inbox.activeTasks).toEqual([])
  })

  it('compute returns snapshot with tasks', () => {
    const task: Task = {
      id: 't1',
      title: 'Test Task',
      content: '',
      status: 'TODO',
      showInTimeline: false,
      activityLogs: [],
    }

    const deriver = createWorkspaceDeriver({
      ...emptyGetters,
      getTasks: () => [task],
    })

    const snapshot = deriver.compute()
    expect(snapshot.meta.taskCount).toBe(1)
  })

  it('compute returns snapshot with goals', () => {
    const goal: GoalCard = {
      id: 'g1',
      title: 'Test Goal',
      area: 'Work',
      description: '',
      status: 'ACTIVE',
      progress: 0,
      nextTodo: '',
      taskCount: 0,
    }

    const deriver = createWorkspaceDeriver({
      ...emptyGetters,
      getBaseGoals: () => [goal],
    })

    const snapshot = deriver.compute()
    expect(snapshot.goals).toHaveLength(1)
    expect(snapshot.meta.goalCount).toBe(1)
  })

  it('compute filters goals by active area', () => {
    const goals: GoalCard[] = [
      { id: 'g1', title: 'Work Goal', area: 'Work', description: '', status: 'ACTIVE', progress: 0, nextTodo: '', taskCount: 0 },
      { id: 'g2', title: 'Personal Goal', area: 'Personal', description: '', status: 'ACTIVE', progress: 0, nextTodo: '', taskCount: 0 },
    ]

    const deriver = createWorkspaceDeriver({
      ...emptyGetters,
      getBaseGoals: () => goals,
      getActiveArea: () => 'Work',
    })

    const snapshot = deriver.compute()
    expect(snapshot.goals).toHaveLength(1)
    expect(snapshot.goals[0].title).toBe('Work Goal')
  })
})
