import type { AreaFilter, GoalCard, RawAgendaItem, TodayAgenda } from '../types/app'
import type { Task } from '../types/task'
import { computeSnapshot, type WorkspaceSnapshot } from '../lib/WorkspaceEngine'
import { convertEventKitToRawItems } from '../lib/workspaceDerivation'

export interface StoreGetters {
  getTasks: () => Task[]
  getBaseGoals: () => GoalCard[]
  getActiveArea: () => AreaFilter
  getShowCompletedTodos: () => boolean
  getRawCalendarEvents: () => Array<{ id: string; title: string; startsAt: string; endsAt: string; calendarTitle?: string }>
  getRawReminders: () => Array<{ id: string; title: string; dueAt?: string; done: boolean; listTitle?: string }>
}

export interface WorkspaceDeriver {
  compute(): WorkspaceSnapshot
}

export function createWorkspaceDeriver(getters: StoreGetters): WorkspaceDeriver {
  return {
    compute() {
      const tasks = getters.getTasks()
      const baseGoals = getters.getBaseGoals()
      const activeArea = getters.getActiveArea()
      const showCompletedTodos = getters.getShowCompletedTodos()
      const rawCalendarEvents = getters.getRawCalendarEvents()
      const rawReminders = getters.getRawReminders()

      const baseTimeline = convertEventKitToRawItems(rawCalendarEvents, rawReminders, tasks)

      return computeSnapshot({ tasks, baseGoals, baseTimeline, activeArea, showCompletedTodos })
    },
  }
}
