import { describe, it, expect, beforeEach } from 'vitest'
import { useDerivedStore, resetDerivedStore } from './derivedStore'
import type { TodayAttentionGroups, InboxTaskGroups, TodayRelevantGoal } from '../lib/workspaceDerivation'
import type { TodayAgenda } from '../types/app'
import type { Task } from '../types/task'

describe('derivedStore', () => {
  beforeEach(() => {
    resetDerivedStore()
  })

  it('returns empty initial state', () => {
    const state = useDerivedStore.getState()
    expect(state.todayFocusTasks).toEqual([])
    expect(state.todayAttentionGroups).toEqual({ overdue: [], dueToday: [], ongoing: [] })
    expect(state.todayTimeline).toEqual([])
    expect(state.inbox).toEqual({
      activeTasks: [],
      pausedTasks: [],
      completed: { totalCount: 0, visibleTasks: [], isCollapsedByDefault: true },
    })
    expect(state.todayRelevantGoals).toEqual([])
  })

  it('updates todayFocusTasks', () => {
    const mockTasks: Task[] = [
      { id: '1', title: 'Task 1', content: '', status: 'IN_PROGRESS', showInTimeline: false, activityLogs: [] },
    ]
    useDerivedStore.getState().updateTodayFocusTasks(mockTasks)
    expect(useDerivedStore.getState().todayFocusTasks).toEqual(mockTasks)
  })

  it('updates todayAttentionGroups', () => {
    const groups: TodayAttentionGroups = {
      overdue: [],
      dueToday: [],
      ongoing: [],
    }
    useDerivedStore.getState().updateTodayAttentionGroups(groups)
    expect(useDerivedStore.getState().todayAttentionGroups).toBe(groups)
  })

  it('updates todayTimeline', () => {
    const timeline: TodayAgenda = []
    useDerivedStore.getState().updateTodayTimeline(timeline)
    expect(useDerivedStore.getState().todayTimeline).toBe(timeline)
  })

  it('updates inbox', () => {
    const inbox: InboxTaskGroups = {
      activeTasks: [],
      pausedTasks: [],
      completed: { totalCount: 5, visibleTasks: [], isCollapsedByDefault: true },
    }
    useDerivedStore.getState().updateInbox(inbox)
    expect(useDerivedStore.getState().inbox).toBe(inbox)
  })

  it('updates todayRelevantGoals', () => {
    const goals: TodayRelevantGoal[] = []
    useDerivedStore.getState().updateTodayRelevantGoals(goals)
    expect(useDerivedStore.getState().todayRelevantGoals).toBe(goals)
  })
})
