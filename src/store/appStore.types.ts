import type { GoalCard, IntegrationStatus, ReminderItem } from '../types/app'
import type { Task } from '../types/task'

export interface HydratePayload {
  tasks: Task[]
  rawEventKit?: {
    calendarEvents: Array<{ id: string; title: string; startsAt: string; endsAt: string; calendarTitle?: string }>
    reminders: Array<{ id: string; title: string; dueAt?: string; done: boolean; listTitle?: string }>
  }
  goals: GoalCard[]
  systemReminders: ReminderItem[]
  integrationStatus: IntegrationStatus
  statusMessage: string
}
