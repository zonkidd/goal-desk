import type { RawAgendaItem } from '../types/app'
import { startOfDay, formatTimeLabel, timeLabelSortValue } from './dateUtils.ts'
import { getLinkedSystemReminderIds } from './externalAttentionIntake.ts'

const DAY_MS = 24 * 60 * 60 * 1000

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

export function toCalendarEventAgendaItem(event: EventKitCalendarEvent): RawAgendaItem | undefined {
  const startsAt = new Date(event.startsAt)
  if (Number.isNaN(startsAt.getTime())) return undefined

  return {
    id: event.id,
    title: event.title,
    timeLabel: formatTimeLabel(startsAt),
    source: 'calendar',
    readonly: true,
    done: false,
    sourceLabel: event.calendarTitle,
    startsAt,
  }
}

export function findCalendarEventAgendaItem(
  events: EventKitCalendarEvent[],
  eventId: string | undefined,
): RawAgendaItem | undefined {
  if (!eventId) return undefined
  const event = events.find((item) => item.id === eventId)
  return event ? toCalendarEventAgendaItem(event) : undefined
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
    const item = toCalendarEventAgendaItem(event)
    if (!item || !item.startsAt) continue

    const endsAt = new Date(event.endsAt)
    const eventStartDay = startOfDay(item.startsAt)
    const eventEndAt = Number.isNaN(endsAt.getTime())
      ? item.startsAt
      : new Date(Math.max(endsAt.getTime() - 1, item.startsAt.getTime()))
    const eventEndDay = startOfDay(eventEndAt)
    const occurrenceStart = new Date(Math.max(eventStartDay.getTime(), start.getTime()))
    const occurrenceEnd = new Date(Math.min(eventEndDay.getTime(), end.getTime()))
    if (occurrenceStart.getTime() > occurrenceEnd.getTime()) continue

    for (
      let occurrenceTime = occurrenceStart.getTime();
      occurrenceTime <= occurrenceEnd.getTime();
      occurrenceTime += DAY_MS
    ) {
      items.push({
        ...item,
        occurrenceDate: new Date(occurrenceTime),
      })
    }
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
      readonly: true,
      done: reminder.done,
      sourceLabel: reminder.listTitle,
      startsAt: dueAt,
    })
  }

  const linkedReminderIds = getLinkedSystemReminderIds(tasks)
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
