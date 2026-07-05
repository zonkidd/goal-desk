import { describe, it, expect, vi, beforeEach } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import type { EventKitAdapter, BrowserEventKitAdapter, AuthorizationStatus } from './eventkitAdapter'
import {
  BrowserEventKitAdapter as BrowserAdapterImpl,
  TauriEventKitAdapter,
} from './eventkitAdapter'
import type { IntegrationStatus } from '../types/app'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

describe('EventKitAdapter interface', () => {
  let adapter: EventKitAdapter

  beforeEach(() => {
    adapter = {
      requestCalendarAccess: vi.fn().mockResolvedValue('granted'),
      requestRemindersAccess: vi.fn().mockResolvedValue('granted'),
      openCalendarEvent: vi.fn().mockResolvedValue(undefined),
      openSystemReminder: vi.fn().mockResolvedValue(undefined),
      loadCalendarRange: vi.fn().mockResolvedValue({ events: [], reminders: [] }),
      loadRawEventKitData: vi.fn().mockResolvedValue({
        calendarEvents: [],
        reminders: [],
        systemReminders: [],
        integrationStatus: { calendar: 'not_determined', reminders: 'not_determined' },
      }),
    }
  })

  it('requestCalendarAccess returns authorization status', async () => {
    const status = await adapter.requestCalendarAccess()
    expect(['granted', 'denied', 'not_determined', 'restricted', 'error']).toContain(status)
  })

  it('requestRemindersAccess returns authorization status', async () => {
    const status = await adapter.requestRemindersAccess()
    expect(['granted', 'denied', 'not_determined', 'restricted', 'error']).toContain(status)
  })

  it('openCalendarEvent resolves without error', async () => {
    await expect(adapter.openCalendarEvent('evt-1')).resolves.toBeUndefined()
  })

  it('openSystemReminder resolves without error', async () => {
    await expect(adapter.openSystemReminder('rem-1')).resolves.toBeUndefined()
  })

  it('does not expose a system Reminder completion write capability', () => {
    expect('setSystemReminderCompleted' in adapter).toBe(false)
  })

  it('does not expose removed per-resource EventKit fetch commands', () => {
    expect('fetchCalendarEvents' in adapter).toBe(false)
    expect('fetchReminders' in adapter).toBe(false)
  })

  it('loadCalendarRange returns events and reminders', async () => {
    const range = await adapter.loadCalendarRange(new Date().toISOString(), new Date().toISOString())
    expect(range).toHaveProperty('events')
    expect(range).toHaveProperty('reminders')
    expect(Array.isArray(range.events)).toBe(true)
    expect(Array.isArray(range.reminders)).toBe(true)
  })

  it('loadRawEventKitData returns full snapshot', async () => {
    const data = await adapter.loadRawEventKitData()
    expect(data).toHaveProperty('calendarEvents')
    expect(data).toHaveProperty('reminders')
    expect(data).toHaveProperty('systemReminders')
    expect(data).toHaveProperty('integrationStatus')
  })
})

describe('BrowserEventKitAdapter', () => {
  let adapter: BrowserAdapterImpl

  beforeEach(() => {
    adapter = new BrowserAdapterImpl()
  })

  it('requestCalendarAccess returns granted', async () => {
    const status = await adapter.requestCalendarAccess()
    expect(status).toBe('granted')
  })

  it('requestRemindersAccess returns granted', async () => {
    const status = await adapter.requestRemindersAccess()
    expect(status).toBe('granted')
  })

  it('openCalendarEvent resolves without error', async () => {
    await expect(adapter.openCalendarEvent('evt-1')).resolves.toBeUndefined()
  })

  it('openSystemReminder resolves without error', async () => {
    await expect(adapter.openSystemReminder('rem-1')).resolves.toBeUndefined()
  })

  it('loadCalendarRange returns empty events and reminders', async () => {
    const range = await adapter.loadCalendarRange(new Date().toISOString(), new Date().toISOString())
    expect(range.events).toEqual([])
    expect(range.reminders).toEqual([])
  })

  it('loadRawEventKitData returns empty snapshot', async () => {
    const data = await adapter.loadRawEventKitData()
    expect(data.calendarEvents).toEqual([])
    expect(data.reminders).toEqual([])
    expect(data.systemReminders).toEqual([])
    expect(data.integrationStatus).toEqual({ calendar: 'granted', reminders: 'granted' })
  })
})

describe('TauriEventKitAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens system Reminders through the typed Tauri command', async () => {
    const adapter = new TauriEventKitAdapter()

    await adapter.openSystemReminder('rem-1')

    expect(invoke).toHaveBeenCalledWith('open_system_reminder', { reminderId: 'rem-1' })
  })

  it('does not expose a native command wrapper to complete imported Reminders', () => {
    const adapter = new TauriEventKitAdapter()

    expect('setSystemReminderCompleted' in adapter).toBe(false)
    expect(invoke).not.toHaveBeenCalled()
  })
})
