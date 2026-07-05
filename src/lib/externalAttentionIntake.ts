import type { RawAgendaItem, ReminderItem } from '../types/app'
import type { Task } from '../types/task'

export interface ExternalAttentionInput {
  baseTimeline: RawAgendaItem[]
  tasks: Task[]
  systemReminders?: ReminderItem[]
}

export interface ExternalAttentionContext {
  baseTimeline: RawAgendaItem[]
  systemReminders: ReminderItem[]
  linkedReminderIds: Set<string>
}

export function getLinkedSystemReminderIds(tasks: Array<{ systemReminderId?: string }>): Set<string> {
  return new Set(
    tasks.filter((task) => task.systemReminderId).map((task) => task.systemReminderId!),
  )
}

export function prepareExternalAttention(input: ExternalAttentionInput): ExternalAttentionContext {
  const linkedReminderIds = getLinkedSystemReminderIds(input.tasks)

  return {
    baseTimeline: input.baseTimeline.filter((item) => (
      item.source !== 'reminder' || !linkedReminderIds.has(item.id)
    )),
    systemReminders: input.systemReminders ?? [],
    linkedReminderIds,
  }
}
