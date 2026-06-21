import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { EventKitAdapter, BrowserEventKitAdapter } from './eventkitAdapter'
import { BrowserEventKitAdapter as BrowserAdapterImpl } from './eventkitAdapter'
import type { AuthorizationStatus, CalendarEvent, Reminder } from './eventkitIntegration'
import type { IntegrationStatus, ReminderItem } from '../types/app'

describe('EventKitAdapter interface', () => {
  let adapter: EventKitAdapter

  beforeEach(() => {
    adapter = {
      requestCalendarAccess: vi.fn().mockResolvedValue('granted'),
      requestRemindersAccess: vi.fn().mockResolvedValue('granted'),
      openCalendarEvent: vi.fn().mockResolvedValue(undefined),
      openSystemReminder: vi.fn().mockResolvedValue(undefined),
      setSystemReminderCompleted: vi.fn().mockResolvedValue({
        id: 'r1', title: 'Test', dueAt: undefined, done: true, listTitle: undefined,
      }),
      fetchCalendarEvents: vi.fn().mockResolvedValue([]),
      fetchReminders: vi.fn().mockResolvedValue([]),
      loadCalendarRange: vi.fn().mockResolvedValue({ events: [], reminders: [] }),
      loadRawEventKitData: vi.fn().mockResolvedValue({
        calendarEvents: [],
        reminders: [],
        systemReminders: [],
        integrationStatus: { calendar: 'not_determined', reminders: 'not_determined' },
      }),
    } as EventKitAdapter
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

  it('setSystemReminderCompleted returns updated reminder', async () => {
    const result = await adapter.setSystemReminderCompleted('rem-1', true)
    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('done')
  })

  it('fetchCalendarEvents returns array', async () => {
    const events = await adapter.fetchCalendarEvents(new Date(), new Date())
    expect(Array.isArray(events)).toBe(true)
  })

  it('fetchReminders returns array', async () => {
    const reminders = await adapter.fetchReminders()
    expect(Array.isArray(reminders)).toBe(true)
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

  it('setSystemReminderCompleted returns mock reminder', async () => {
    const result = await adapter.setSystemReminderCompleted('rem-1', true)
    expect(result.id).toBe('rem-1')
    expect(result.done).toBe(true)
  })

  it('fetchCalendarEvents returns empty array', async () => {
    const events = await adapter.fetchCalendarEvents(new Date(), new Date())
    expect(events).toEqual([])
  })

  it('fetchReminders returns empty array', async () => {
    const reminders = await adapter.fetchReminders()
    expect(reminders).toEqual([])
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
    expect(data.integrationStatus).toEqual({ calendar: 'not_determined', reminders: 'not_determined' })
  })
})
