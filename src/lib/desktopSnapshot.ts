import type { GoalCard, IntegrationStatus, ReminderItem, TimelineItem } from '../types/app'
import type { Task } from '../types/task'
import * as tauriCommands from './tauriCommands'
import * as eventkitIntegration from './eventkitIntegration'

export async function loadDesktopSnapshot(): Promise<{
  timeline: TimelineItem[]
  goals: GoalCard[]
  tasks: Task[]
  systemReminders: ReminderItem[]
  integrationStatus: IntegrationStatus
}> {
  const [tasks, goals] = await Promise.all([
    tauriCommands.loadTaskList(),
    tauriCommands.loadGoalList(),
  ])

  const eventkitData = await eventkitIntegration.loadEventKitSnapshot(tasks)

  return {
    timeline: eventkitData.timeline,
    goals,
    tasks,
    systemReminders: eventkitData.systemReminders,
    integrationStatus: eventkitData.integrationStatus,
  }
}
