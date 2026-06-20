import { create } from 'zustand'
import type { TodayAgenda } from '../types/app'
import type { Task } from '../types/task'
import type { InboxTaskGroups, TodayAttentionGroups, TodayRelevantGoal } from '../lib/workspaceDerivation'

export interface DerivedStoreState {
  todayFocusTasks: Task[]
  todayAttentionGroups: TodayAttentionGroups
  todayTimeline: TodayAgenda
  inbox: InboxTaskGroups
  todayRelevantGoals: TodayRelevantGoal[]

  updateTodayFocusTasks: (tasks: Task[]) => void
  updateTodayAttentionGroups: (groups: TodayAttentionGroups) => void
  updateTodayTimeline: (timeline: TodayAgenda) => void
  updateInbox: (inbox: InboxTaskGroups) => void
  updateTodayRelevantGoals: (goals: TodayRelevantGoal[]) => void
}

export const useDerivedStore = create<DerivedStoreState>((set) => ({
  todayFocusTasks: [],
  todayAttentionGroups: { overdue: [], dueToday: [], ongoing: [] },
  todayTimeline: [],
  inbox: {
    activeTasks: [],
    pausedTasks: [],
    completed: { totalCount: 0, visibleTasks: [], isCollapsedByDefault: true },
  },
  todayRelevantGoals: [],

  updateTodayFocusTasks: (tasks) => set({ todayFocusTasks: tasks }),
  updateTodayAttentionGroups: (groups) => set({ todayAttentionGroups: groups }),
  updateTodayTimeline: (timeline) => set({ todayTimeline: timeline }),
  updateInbox: (inbox) => set({ inbox }),
  updateTodayRelevantGoals: (goals) => set({ todayRelevantGoals: goals }),
}))

export function resetDerivedStore() {
  useDerivedStore.setState({
    todayFocusTasks: [],
    todayAttentionGroups: { overdue: [], dueToday: [], ongoing: [] },
    todayTimeline: [],
    inbox: {
      activeTasks: [],
      pausedTasks: [],
      completed: { totalCount: 0, visibleTasks: [], isCollapsedByDefault: true },
    },
    todayRelevantGoals: [],
  })
}
