import type { GoalCard, IntegrationStatus, ReminderItem } from '../types/app'
import type { Task } from '../types/task'
import * as tauriCommands from './tauriCommands'
import * as eventkitIntegration from './eventkitIntegration'

export interface RawEventKitData {
  calendarEvents: Array<{ id: string; title: string; startsAt: string; endsAt: string; calendarTitle?: string }>
  reminders: Array<{ id: string; title: string; dueAt?: string; done: boolean; listTitle?: string }>
  systemReminders: ReminderItem[]
  integrationStatus: IntegrationStatus
}

export async function loadDesktopSnapshot(): Promise<{
  rawEventKit: RawEventKitData
  goals: GoalCard[]
  tasks: Task[]
}> {
  const [tasks, goals] = await Promise.all([
    tauriCommands.loadTaskList(),
    tauriCommands.loadGoalList(),
  ])

  const eventkitData = await eventkitIntegration.loadRawEventKitData()

  return {
    rawEventKit: eventkitData,
    goals,
    tasks,
  }
}
