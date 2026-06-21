import { invoke } from '@tauri-apps/api/core'
import type { IntegrationStatus, ReminderItem } from '../types/app'
import { isTauriRuntime } from './runtime'

// ============================================================================
// EventKit Types
// ============================================================================

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

export interface CalendarEvent {
  id: string
  title: string
  startsAt: string
  endsAt: string
  calendarTitle?: string
}

export interface Reminder {
  id: string
  title: string
  dueAt?: string
  done: boolean
  listTitle?: string
}

// ============================================================================
// Authorization
// ============================================================================

export type AuthorizationStatus = 'granted' | 'denied' | 'not_determined' | 'restricted' | 'error'

export async function requestCalendarAccess(): Promise<AuthorizationStatus> {
  if (!isTauriRuntime()) {
    return 'granted'
  }
  return invoke<AuthorizationStatus>('request_calendar_access')
}

export async function requestRemindersAccess(): Promise<AuthorizationStatus> {
  if (!isTauriRuntime()) {
    return 'granted'
  }
  return invoke<AuthorizationStatus>('request_reminders_access')
}

// ============================================================================
// System Integration
// ============================================================================

export async function openCalendarEvent(eventId: string): Promise<void> {
  if (!isTauriRuntime()) {
    console.log('Browser preview: would open calendar event', eventId)
    return
  }
  const url = `ical://ekevent/${eventId}`
  await invoke('open_url', { url })
}

export async function openSystemReminder(reminderId: string): Promise<void> {
  if (!isTauriRuntime()) {
    console.log('Browser preview: would open reminder', reminderId)
    return
  }
  const url = `x-apple-reminder://${reminderId}`
  await invoke('open_url', { url })
}

export async function setSystemReminderCompleted(reminderId: string, done: boolean): Promise<ReminderItem> {
  const reminder = await invoke<RustReminder>('set_system_reminder_completed', { reminderId, done })
  return {
    id: reminder.id,
    title: reminder.title,
    dueAt: reminder.dueAt ? new Date(reminder.dueAt) : undefined,
    done: reminder.done,
    listTitle: reminder.listTitle,
  }
}

// ============================================================================
// Data Fetching
// ============================================================================

export async function fetchCalendarEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
  if (!isTauriRuntime()) {
    return []
  }
  return invoke<CalendarEvent[]>('fetch_calendar_events', {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  })
}

export async function fetchReminders(): Promise<Reminder[]> {
  if (!isTauriRuntime()) {
    return []
  }
  return invoke<Reminder[]>('fetch_reminders')
}

interface CalendarRangeData {
  events: Array<{
    id: string
    title: string
    startsAt: string
    endsAt: string
    calendarTitle?: string
  }>
  reminders: Array<{
    id: string
    title: string
    dueAt?: string
    done: boolean
    listTitle?: string
  }>
}

export async function loadCalendarRange(
  startDate: string,
  endDate: string
): Promise<{
  events: Array<{
    id: string
    title: string
    startsAt: Date
    endsAt: Date
    calendarTitle?: string
  }>
  reminders: Array<{
    id: string
    title: string
    dueAt?: Date
    done: boolean
    listTitle?: string
  }>
}> {
  if (!isTauriRuntime()) {
    return { events: [], reminders: [] }
  }

  const result = await invoke<CalendarRangeData>('load_calendar_range', {
    startDate,
    endDate,
  })

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

// ============================================================================
// Snapshot Loading & Timeline Building
// ============================================================================

export async function loadRawEventKitData(): Promise<{
  calendarEvents: RustCalendarEvent[]
  reminders: RustReminder[]
  systemReminders: ReminderItem[]
  integrationStatus: IntegrationStatus
}> {
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
