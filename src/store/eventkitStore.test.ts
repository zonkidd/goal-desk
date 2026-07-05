import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { EventKitAdapter } from '../lib/eventkitAdapter'
import { setEventKitAdapter, resetEventKitAdapter } from '../lib/workspaceMutations'
import type { IntegrationStatus } from '../types/app'

const mockAdapter: EventKitAdapter = {
  requestCalendarAccess: vi.fn().mockResolvedValue('granted'),
  requestRemindersAccess: vi.fn().mockResolvedValue('granted'),
  openCalendarEvent: vi.fn().mockResolvedValue(undefined),
  openSystemReminder: vi.fn().mockResolvedValue(undefined),
  loadCalendarRange: vi.fn().mockResolvedValue({ events: [], reminders: [] }),
  loadRawEventKitData: vi.fn().mockResolvedValue({
    calendarEvents: [
      { id: 'evt-1', title: 'Meeting', startsAt: '2024-01-01T10:00:00.000Z', endsAt: '2024-01-01T11:00:00.000Z', calendarTitle: 'Work' },
    ],
    reminders: [
      { id: 'rem-1', title: 'Buy milk', dueAt: '2024-01-01T12:00:00.000Z', done: false, listTitle: 'Shopping' },
    ],
    systemReminders: [
      { id: 'rem-1', title: 'Buy milk', dueAt: new Date('2024-01-01T12:00:00.000Z'), done: false, listTitle: 'Shopping' },
    ],
    integrationStatus: { calendar: 'granted', reminders: 'granted' },
  }),
}

describe('eventkitStore with adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setEventKitAdapter(mockAdapter)
  })

  afterEach(() => {
    resetEventKitAdapter()
  })

  it('does not expose a system Reminder completion action', async () => {
    const { useEventkitStore } = await import('./eventkitStore')
    const store = useEventkitStore

    store.setState({
      eventkitPermissions: { calendar: 'granted', reminders: 'granted' },
      integrationStatus: { calendar: 'granted', reminders: 'granted' },
    })

    expect('toggleSystemReminderDone' in store.getState()).toBe(false)
  })

  it('does not expose a local system Reminder insertion action', async () => {
    const { useEventkitStore } = await import('./eventkitStore')
    const store = useEventkitStore

    expect('addSystemReminder' in store.getState()).toBe(false)
  })

  it('requestCalendarAccess delegates to adapter', async () => {
    const { useEventkitStore } = await import('./eventkitStore')
    const store = useEventkitStore
    store.setState({
      eventkitPermissions: { calendar: 'not_determined', reminders: 'not_determined' },
      integrationStatus: { calendar: 'not_determined', reminders: 'not_determined' },
    })

    await store.getState().requestCalendarAccess()

    expect(mockAdapter.requestCalendarAccess).toHaveBeenCalled()
    expect(store.getState().eventkitPermissions.calendar).toBe('granted')
    expect(store.getState().integrationStatus.calendar).toBe('granted')
  })

  it('requestRemindersAccess delegates to adapter', async () => {
    const { useEventkitStore } = await import('./eventkitStore')
    const store = useEventkitStore
    store.setState({
      eventkitPermissions: { calendar: 'not_determined', reminders: 'not_determined' },
      integrationStatus: { calendar: 'not_determined', reminders: 'not_determined' },
    })

    await store.getState().requestRemindersAccess()

    expect(mockAdapter.requestRemindersAccess).toHaveBeenCalled()
    expect(store.getState().eventkitPermissions.reminders).toBe('granted')
    expect(store.getState().integrationStatus.reminders).toBe('granted')
  })

  it('refreshEventkitData delegates to adapter', async () => {
    const { useEventkitStore } = await import('./eventkitStore')
    const store = useEventkitStore

    store.setState({
      eventkitPermissions: { calendar: 'granted', reminders: 'granted' },
    })

    await store.getState().refreshEventkitData()

    expect(mockAdapter.loadRawEventKitData).toHaveBeenCalled()
    expect(store.getState().rawEventKit.calendarEvents).toHaveLength(1)
    expect(store.getState().rawEventKit.reminders).toHaveLength(1)
  })

  it('refreshEventkitData keeps eventkitPermissions aligned with integrationStatus', async () => {
    const { useEventkitStore } = await import('./eventkitStore')
    const store = useEventkitStore

    store.setState({
      eventkitPermissions: { calendar: 'granted', reminders: 'granted' },
      integrationStatus: { calendar: 'granted', reminders: 'granted' },
    })

    vi.mocked(mockAdapter.loadRawEventKitData).mockResolvedValueOnce({
      calendarEvents: [],
      reminders: [],
      systemReminders: [],
      integrationStatus: { calendar: 'denied', reminders: 'restricted' },
    })

    await store.getState().refreshEventkitData()

    expect(store.getState().integrationStatus).toEqual({
      calendar: 'denied',
      reminders: 'restricted',
    })
    expect(store.getState().eventkitPermissions).toEqual({
      calendar: 'denied',
      reminders: 'restricted',
    })
  })

  it('refreshEventkitData loads data immediately when external permissions become granted', async () => {
    const { useEventkitStore } = await import('./eventkitStore')
    const store = useEventkitStore

    store.setState({
      eventkitPermissions: { calendar: 'denied', reminders: 'denied' },
      integrationStatus: { calendar: 'denied', reminders: 'denied' },
      rawEventKit: { calendarEvents: [], reminders: [] },
      systemReminders: [],
    })

    vi.mocked(mockAdapter.loadRawEventKitData).mockResolvedValueOnce({
      calendarEvents: [
        { id: 'evt-2', title: 'New event', startsAt: '2024-01-02T10:00:00.000Z', endsAt: '2024-01-02T11:00:00.000Z', calendarTitle: 'Work' },
      ],
      reminders: [
        { id: 'rem-2', title: 'New reminder', dueAt: '2024-01-02T12:00:00.000Z', done: false, listTitle: 'Inbox' },
      ],
      systemReminders: [
        { id: 'rem-2', title: 'New reminder', dueAt: new Date('2024-01-02T12:00:00.000Z'), done: false, listTitle: 'Inbox' },
      ],
      integrationStatus: { calendar: 'granted', reminders: 'granted' },
    })

    await store.getState().refreshEventkitData()

    expect(store.getState().rawEventKit.calendarEvents).toHaveLength(1)
    expect(store.getState().rawEventKit.reminders).toHaveLength(1)
    expect(store.getState().systemReminders).toHaveLength(1)
  })
})
