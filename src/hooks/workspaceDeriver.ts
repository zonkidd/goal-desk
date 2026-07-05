import type { AreaFilter, GoalCard, ReminderItem } from '../types/app'
import type { Task } from '../types/task'
import { computeSnapshot, type WorkspaceSnapshot } from '../lib/WorkspaceEngine'
import { convertEventKitToRawItems } from '../lib/workspaceDerivation'

export interface EventKitSource {
  calendarEvents: Array<{ id: string; title: string; startsAt: string; endsAt: string; calendarTitle?: string }>
  reminders: Array<{ id: string; title: string; dueAt?: string; done: boolean; listTitle?: string }>
  systemReminders: ReminderItem[]
}

export interface StoreGetters {
  getTasks: () => Task[]
  getBaseGoals: () => GoalCard[]
  getActiveArea: () => AreaFilter
  getShowCompletedTodos: () => boolean
  getEventKitSource: () => EventKitSource
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
      const eventKitSource = getters.getEventKitSource()

      const baseTimeline = convertEventKitToRawItems(
        eventKitSource.calendarEvents,
        eventKitSource.reminders,
        tasks,
      )

      return computeSnapshot({
        tasks,
        baseGoals,
        baseTimeline,
        activeArea,
        showCompletedTodos,
        systemReminders: eventKitSource.systemReminders,
      })
    },
  }
}
