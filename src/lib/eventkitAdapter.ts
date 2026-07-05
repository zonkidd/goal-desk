import { invoke } from '@tauri-apps/api/core'
import type { RawCalendarEvent, RawEventKitData, RawReminder } from './eventkitData'
import type { AccessStatus, IntegrationStatus, ReminderItem } from '../types/app'

export type AuthorizationStatus = AccessStatus

export type EventKitSnapshotData = RawEventKitData & {
  systemReminders: ReminderItem[]
  integrationStatus: IntegrationStatus
}

export interface EventKitAdapter {
  requestCalendarAccess(): Promise<AuthorizationStatus>
  requestRemindersAccess(): Promise<AuthorizationStatus>
  openCalendarEvent(eventId: string): Promise<void>
  openSystemReminder(reminderId: string): Promise<void>
  loadCalendarRange(startDate: string, endDate: string): Promise<{
    events: Array<{ id: string; title: string; startsAt: Date; endsAt: Date; calendarTitle?: string }>
    reminders: Array<{ id: string; title: string; dueAt?: Date; done: boolean; listTitle?: string }>
  }>
  loadRawEventKitData(): Promise<EventKitSnapshotData>
}

interface RustSystemSnapshot {
  integrationStatus: IntegrationStatus
  calendarEvents: RawCalendarEvent[]
  reminders: RawReminder[]
}

interface CalendarRangeData {
  events: RawCalendarEvent[]
  reminders: RawReminder[]
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
    await invoke('open_system_reminder', { reminderId })
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

  async loadCalendarRange(_startDate: string, _endDate: string) {
    return { events: [], reminders: [] }
  }

  async loadRawEventKitData() {
    return {
      calendarEvents: [],
      reminders: [],
      systemReminders: [],
      integrationStatus: { calendar: 'granted' as const, reminders: 'granted' as const },
    }
  }
}
