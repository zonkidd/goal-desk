export interface RawCalendarEvent {
  id: string
  title: string
  startsAt: string
  endsAt: string
  calendarTitle?: string
}

export interface RawReminder {
  id: string
  title: string
  dueAt?: string
  done: boolean
  listTitle?: string
}

export interface RawEventKitData {
  calendarEvents: RawCalendarEvent[]
  reminders: RawReminder[]
}

interface ImportedCalendarEvent extends Omit<RawCalendarEvent, 'startsAt' | 'endsAt'> {
  startsAt: Date | string
  endsAt: Date | string
}

interface ImportedReminder extends Omit<RawReminder, 'dueAt'> {
  dueAt?: Date | string
}

export interface ImportedEventKitRangeData {
  events: ImportedCalendarEvent[]
  reminders: ImportedReminder[]
}

function serializeEventKitDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

export function normalizeEventKitRangeData(data: ImportedEventKitRangeData): RawEventKitData {
  return {
    calendarEvents: data.events.map((event) => ({
      id: event.id,
      title: event.title,
      startsAt: serializeEventKitDate(event.startsAt),
      endsAt: serializeEventKitDate(event.endsAt),
      calendarTitle: event.calendarTitle,
    })),
    reminders: data.reminders.map((reminder) => ({
      id: reminder.id,
      title: reminder.title,
      dueAt: reminder.dueAt ? serializeEventKitDate(reminder.dueAt) : undefined,
      done: reminder.done,
      listTitle: reminder.listTitle,
    })),
  }
}

export function mergeById<T extends { id: string }>(base: T[], updates: T[]): T[] {
  const indexById = new Map<string, number>()
  const merged = base.map((item, index) => {
    indexById.set(item.id, index)
    return item
  })

  for (const item of updates) {
    const existingIndex = indexById.get(item.id)
    if (existingIndex === undefined) {
      indexById.set(item.id, merged.length)
      merged.push(item)
    } else {
      merged[existingIndex] = item
    }
  }

  return merged
}
