import { invoke } from '@tauri-apps/api/core'
import type { AccessStatus, IntegrationStatus, ReminderItem } from '../types/app'

export type AuthorizationStatus = AccessStatus

export interface CalendarEvent {
  id: string
  title: string
  startsAt: Date
  endsAt: Date
  calendarTitle?: string
}

export interface Reminder {
  id: string
  title: string
  dueAt?: Date
  done: boolean
  listTitle?: string
}

export interface EventKitAdapter {
  requestCalendarAccess(): Promise<AuthorizationStatus>
  requestRemindersAccess(): Promise<AuthorizationStatus>
  openCalendarEvent(eventId: string): Promise<void>
  openSystemReminder(reminderId: string): Promise<void>
  setSystemReminderCompleted(reminderId: string, done: boolean): Promise<ReminderItem>
  fetchCalendarEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]>
  fetchReminders(): Promise<Reminder[]>
  loadCalendarRange(startDate: string, endDate: string): Promise<{
    events: Array<{ id: string; title: string; startsAt: Date; endsAt: Date; calendarTitle?: string }>
    reminders: Array<{ id: string; title: string; dueAt?: Date; done: boolean; listTitle?: string }>
  }>
  loadRawEventKitData(): Promise<{
    calendarEvents: Array<{ id: string; title: string; startsAt: string; endsAt: string; calendarTitle?: string }>
    reminders: Array<{ id: string; title: string; dueAt?: string; done: boolean; listTitle?: string }>
    systemReminders: ReminderItem[]
    integrationStatus: IntegrationStatus
  }>
}

interface RustCalendarEvent {
  id: string
  title: string
  startsAt: string
  endsAt: string
  calendarTitle?: string
}

interface RustReminder {
  id: string
  title: string
  dueAt?: string
  done: boolean
  listTitle?: string
}

interface RustSystemSnapshot {
  integrationStatus: IntegrationStatus
  calendarEvents: RustCalendarEvent[]
  reminders: RustReminder[]
}

interface CalendarRangeData {
  events: RustCalendarEvent[]
  reminders: RustReminder[]
}

export class TauriEventKitAdapter implements EventKitAdapter {
  async requestCalendarAccess(): Promise<AuthorizationStatus> {
    return invoke<AuthorizationStatus>('request_calendar_access')
  }

  async requestRemindersAccess(): Promise<AuthorizationStatus> {
    return invoke<AuthorizationStatus>('request_reminders_access')
  }

  async openCalendarEvent(eventId: string): Promise<void> {
    const url = `ical://ekevent/${eventId}`
    await invoke('open_url', { url })
  }

  async openSystemReminder(reminderId: string): Promise<void> {
    const url = `x-apple-reminder://${reminderId}`
    await invoke('open_url', { url })
  }

  async setSystemReminderCompleted(reminderId: string, done: boolean): Promise<ReminderItem> {
    const reminder = await invoke<RustReminder>('set_system_reminder_completed', { reminderId, done })
    return {
      id: reminder.id,
      title: reminder.title,
      dueAt: reminder.dueAt ? new Date(reminder.dueAt) : undefined,
      done: reminder.done,
      listTitle: reminder.listTitle,
    }
  }

  async fetchCalendarEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    const rustEvents = await invoke<RustCalendarEvent[]>('fetch_calendar_events', {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    })
    return rustEvents.map(event => ({
      id: event.id,
      title: event.title,
      startsAt: new Date(event.startsAt),
      endsAt: new Date(event.endsAt),
      calendarTitle: event.calendarTitle,
    }))
  }

  async fetchReminders(): Promise<Reminder[]> {
    const rustReminders = await invoke<RustReminder[]>('fetch_reminders')
    return rustReminders.map(reminder => ({
      id: reminder.id,
      title: reminder.title,
      dueAt: reminder.dueAt ? new Date(reminder.dueAt) : undefined,
      done: reminder.done,
      listTitle: reminder.listTitle,
    }))
  }

  async loadCalendarRange(startDate: string, endDate: string) {
    const result = await invoke<CalendarRangeData>('load_calendar_range', { startDate, endDate })
    return {
      events: result.events.map((event) => ({
        id: event.id,
        title: event.title,
        startsAt: new Date(event.startsAt),
        endsAt: new Date(event.endsAt),
        calendarTitle: event.calendarTitle,
      })),
      reminders: result.reminders.map((reminder) => ({
        id: reminder.id,
        title: reminder.title,
        dueAt: reminder.dueAt ? new Date(reminder.dueAt) : undefined,
        done: reminder.done,
        listTitle: reminder.listTitle,
      })),
    }
  }

  async loadRawEventKitData() {
    const systemSnapshot = await invoke<RustSystemSnapshot>('eventkit_snapshot').catch(() => undefined)

    const systemReminders: ReminderItem[] =
      systemSnapshot?.reminders.map((item) => ({
        id: item.id,
        title: item.title,
        dueAt: item.dueAt ? new Date(item.dueAt) : undefined,
        done: item.done,
        listTitle: item.listTitle,
      })) || []

    const integrationStatus: IntegrationStatus = systemSnapshot?.integrationStatus || {
      calendar: 'error' as const,
      reminders: 'error' as const,
    }

    return {
      calendarEvents: systemSnapshot?.calendarEvents || [],
      reminders: systemSnapshot?.reminders || [],
      systemReminders,
      integrationStatus,
    }
  }
}

export class BrowserEventKitAdapter implements EventKitAdapter {
  async requestCalendarAccess(): Promise<AuthorizationStatus> {
    return 'granted'
  }

  async requestRemindersAccess(): Promise<AuthorizationStatus> {
    return 'granted'
  }

  async openCalendarEvent(_eventId: string): Promise<void> {
    console.log('Browser preview: would open calendar event', _eventId)
  }

  async openSystemReminder(_reminderId: string): Promise<void> {
    console.log('Browser preview: would open reminder', _reminderId)
  }

  async setSystemReminderCompleted(reminderId: string, done: boolean): Promise<ReminderItem> {
    return {
      id: reminderId,
      title: 'Mock Reminder',
      dueAt: undefined,
      done,
      listTitle: undefined,
    }
  }

  async fetchCalendarEvents(_startDate: Date, _endDate: Date): Promise<CalendarEvent[]> {
    return []
  }

  async fetchReminders(): Promise<Reminder[]> {
    return []
  }

  async loadCalendarRange(_startDate: string, _endDate: string) {
    return { events: [], reminders: [] }
  }

  async loadRawEventKitData() {
    return {
      calendarEvents: [],
      reminders: [],
      systemReminders: [],
      integrationStatus: { calendar: 'not_determined' as const, reminders: 'not_determined' as const },
    }
  }
}
