import type { RawAgendaItem, TimelineItem } from '../types/app'
import type { Task } from '../types/task'
import {
  convertEventKitToRawItems,
  type EventKitCalendarEvent,
  type EventKitReminder,
} from './eventkitTransform.ts'
import { formatTimeLabel, startOfDay, timeLabelSortValue } from './dateUtils.ts'

export interface AgendaTimelineInput {
  baseTimeline: RawAgendaItem[]
  tasks: Task[]
  rangeStart: Date
  rangeEnd: Date
}

export interface ImportedRangeTimelineInput {
  calendarEvents: EventKitCalendarEvent[]
  reminders: EventKitReminder[]
  tasks: Task[]
  rangeStart: Date
  rangeEnd: Date
  now?: Date
}

export function computeAgendaTimeline({
  baseTimeline,
  tasks,
  rangeStart,
  rangeEnd,
}: AgendaTimelineInput): TimelineItem[] {
  const rangeStartDate = startOfDay(rangeStart)
  const rangeEndDate = startOfDay(rangeEnd)

  const baseItems = baseTimeline.filter((item) => {
    if (item.source === 'todo') return false
    const dateSource = item.occurrenceDate ?? item.startsAt
    if (!dateSource) return false
    const date = startOfDay(dateSource instanceof Date ? dateSource : new Date(dateSource))
    return date.getTime() >= rangeStartDate.getTime() && date.getTime() <= rangeEndDate.getTime()
  })

  const taskItems: TimelineItem[] = []
  for (const task of tasks) {
    if (task.status === 'DONE') continue
    const taskStartAt = task.plannedStartAt
    if (!taskStartAt) continue

    const startDay = startOfDay(taskStartAt)
    const isExactDay = startDay.getTime() >= rangeStartDate.getTime() && startDay.getTime() <= rangeEndDate.getTime()
    
    let isSpanning = false
    if (!isExactDay && task.showInTimeline && task.dueDate) {
      const dueDay = startOfDay(task.dueDate)
      if (startDay.getTime() <= rangeEndDate.getTime() && dueDay.getTime() >= rangeStartDate.getTime()) {
        isSpanning = true
      }
    }

    if (!isExactDay && !isSpanning) {
      continue
    }

    taskItems.push({
      id: task.id,
      title: task.title,
      timeLabel: formatTimeLabel(taskStartAt),
      source: 'todo',
      readonly: false,
      done: false,
      sourceLabel: task.linkedGoalLabel || 'Desk Task',
      startsAt: taskStartAt,
      occurrenceDate: isSpanning ? rangeStartDate : undefined,
      linkedGoalId: task.linkedGoalId,
    })
  }

  return [...baseItems, ...taskItems].sort(
    (left, right) => timeLabelSortValue(left.timeLabel) - timeLabelSortValue(right.timeLabel),
  )
}

export function computeImportedRangeTimeline({
  calendarEvents,
  reminders,
  tasks,
  rangeStart,
  rangeEnd,
  now = rangeStart,
}: ImportedRangeTimelineInput): TimelineItem[] {
  const rangeStartDay = startOfDay(rangeStart)
  const rangeEndDay = startOfDay(rangeEnd)
  const baseTimeline = convertEventKitToRawItems(
    calendarEvents,
    reminders,
    tasks,
    now,
    rangeStartDay,
    rangeEndDay,
  )
  return computeAgendaTimeline({
    baseTimeline,
    tasks,
    rangeStart: rangeStartDay,
    rangeEnd: rangeEndDay,
  })
}
