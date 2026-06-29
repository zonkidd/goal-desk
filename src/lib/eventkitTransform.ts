import type { RawAgendaItem } from '../types/app'
import { startOfDay, isSameDay, formatTimeLabel, timeLabelSortValue } from './dateUtils.ts'

export interface EventKitCalendarEvent {
  id: string
  title: string
  startsAt: string
  endsAt: string
  calendarTitle?: string
}

export interface EventKitReminder {
  id: string
  title: string
  dueAt?: string
  done: boolean
  listTitle?: string
}

export function convertEventKitToRawItems(
  events: EventKitCalendarEvent[],
  reminders: EventKitReminder[],
  tasks: { id: string; systemReminderId?: string }[],
  now = new Date(),
  rangeStart?: Date,
  rangeEnd?: Date,
): RawAgendaItem[] {
  const today = startOfDay(now)
  const start = rangeStart ?? today
  const end = rangeEnd ?? today
  const items: RawAgendaItem[] = []

  const isInRange = (date: Date) => {
    const d = startOfDay(date)
    return d.getTime() >= start.getTime() && d.getTime() <= end.getTime()
  }

  for (const event of events) {
    const startsAt = new Date(event.startsAt)
    if (Number.isNaN(startsAt.getTime()) || !isInRange(startsAt)) continue
    items.push({
      id: event.id,
      title: event.title,
      timeLabel: formatTimeLabel(startsAt),
      source: 'calendar',
      readonly: true,
      done: false,
      sourceLabel: event.calendarTitle,
      startsAt,
    })
  }

  for (const reminder of reminders) {
    if (!reminder.dueAt) continue
    const dueAt = new Date(reminder.dueAt)
    if (Number.isNaN(dueAt.getTime()) || !isInRange(dueAt)) continue
    items.push({
      id: reminder.id,
      title: reminder.title,
      timeLabel: formatTimeLabel(dueAt),
      source: 'reminder',
      readonly: false,
      done: reminder.done,
      sourceLabel: reminder.listTitle,
      startsAt: dueAt,
    })
  }

  const linkedReminderIds = new Set(
    tasks.filter((t) => t.systemReminderId).map((t) => t.systemReminderId!),
  )
  const deduped = items.filter((item) => {
    if (item.source !== 'reminder') return true
    return !linkedReminderIds.has(item.id)
  })

  return deduped.sort((a, b) => timeLabelSortValue(a.timeLabel) - timeLabelSortValue(b.timeLabel))
}

export function groupByDate(items: RawAgendaItem[]): Map<string, RawAgendaItem[]> {
  const grouped = new Map<string, RawAgendaItem[]>()
  for (const item of items) {
    const dateSource = (item as any).occurrenceDate || item.startsAt
    if (!dateSource) continue
    const date = dateSource instanceof Date ? dateSource : new Date(dateSource)
    if (Number.isNaN(date.getTime())) continue
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const existing = grouped.get(key) || []
    existing.push(item)
    grouped.set(key, existing)
  }
  for (const [, arr] of grouped) {
    arr.sort((a, b) => {
      const da = (a as any).occurrenceDate || a.startsAt
      const db = (b as any).occurrenceDate || b.startsAt
      const va = da instanceof Date ? da.getTime() : new Date(da).getTime()
      const vb = db instanceof Date ? db.getTime() : new Date(db).getTime()
      return va - vb
    })
  }
  return grouped
}
