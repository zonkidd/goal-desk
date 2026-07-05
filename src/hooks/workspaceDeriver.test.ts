import { describe, it, expect } from 'vitest'
import { createWorkspaceDeriver, type WorkspaceDeriver, type StoreGetters } from './workspaceDeriver'
import type { Task } from '../types/task'
import type { GoalCard } from '../types/app'

const emptyGetters: StoreGetters = {
  getTasks: () => [],
  getBaseGoals: () => [],
  getActiveArea: () => 'ALL',
  getShowCompletedTodos: () => false,
  getEventKitSource: () => ({
    calendarEvents: [],
    reminders: [],
    systemReminders: [],
  }),
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

  it('reads EventKit source through one coherent getter', () => {
    const today = new Date()
    const eventStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9)
    const eventEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10)
    const reminderDueAt = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11)
    const deriver = createWorkspaceDeriver({
      ...emptyGetters,
      getEventKitSource: () => ({
        calendarEvents: [{
          id: 'event-1',
          title: 'Planning',
          startsAt: eventStart.toISOString(),
          endsAt: eventEnd.toISOString(),
          calendarTitle: 'Work',
        }],
        reminders: [{
          id: 'reminder-1',
          title: 'Follow up',
          dueAt: reminderDueAt.toISOString(),
          done: false,
          listTitle: 'Inbox',
        }],
        systemReminders: [{
          id: 'reminder-1',
          title: 'Follow up',
          dueAt: reminderDueAt,
          done: false,
          listTitle: 'Inbox',
        }],
      }),
    })

    const snapshot = deriver.compute()

    expect(snapshot.today.timeline.map((item) => item.id)).toEqual(['event-1', 'reminder-1'])
    expect(snapshot.today.attentionGroups.systemReminders.map((item) => item.id)).toEqual(['reminder-1'])
  })
})
