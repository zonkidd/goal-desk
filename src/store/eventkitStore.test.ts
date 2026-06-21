import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { EventKitAdapter } from '../lib/eventkitAdapter'
import { setEventKitAdapter, resetEventKitAdapter } from '../lib/workspaceMutations'
import type { IntegrationStatus, ReminderItem } from '../types/app'

const mockAdapter: EventKitAdapter = {
  requestCalendarAccess: vi.fn().mockResolvedValue('granted'),
  requestRemindersAccess: vi.fn().mockResolvedValue('granted'),
  openCalendarEvent: vi.fn().mockResolvedValue(undefined),
  openSystemReminder: vi.fn().mockResolvedValue(undefined),
  setSystemReminderCompleted: vi.fn().mockResolvedValue({
    id: 'r1', title: 'Updated', dueAt: undefined, done: true, listTitle: undefined,
  }),
  fetchCalendarEvents: vi.fn().mockResolvedValue([
    { id: 'evt-1', title: 'Meeting', startsAt: '2024-01-01T10:00:00', endsAt: '2024-01-01T11:00:00', calendarTitle: 'Work' },
  ]),
  fetchReminders: vi.fn().mockResolvedValue([
    { id: 'rem-1', title: 'Buy milk', dueAt: '2024-01-01T12:00:00', done: false, listTitle: 'Shopping' },
  ]),
  loadCalendarRange: vi.fn().mockResolvedValue({ events: [], reminders: [] }),
  loadRawEventKitData: vi.fn().mockResolvedValue({
    calendarEvents: [],
    reminders: [],
    systemReminders: [],
    integrationStatus: { calendar: 'not_determined', reminders: 'not_determined' },
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

  it('toggleSystemReminderDone delegates to adapter', async () => {
    const { useEventkitStore } = await import('./eventkitStore')
    const store = useEventkitStore

    store.setState({
      systemReminders: [{ id: 'r1', title: 'Test', done: false } as ReminderItem],
    })

    const result = await store.getState().toggleSystemReminderDone('r1', true)

    expect(mockAdapter.setSystemReminderCompleted).toHaveBeenCalledWith('r1', true)
    expect(result).toEqual(expect.objectContaining({ id: 'r1', done: true }))
  })

  it('requestCalendarAccess delegates to adapter', async () => {
    const { useEventkitStore } = await import('./eventkitStore')
    const store = useEventkitStore

    await store.getState().requestCalendarAccess()

    expect(mockAdapter.requestCalendarAccess).toHaveBeenCalled()
    expect(store.getState().eventkitPermissions.calendar).toBe('granted')
  })

  it('requestRemindersAccess delegates to adapter', async () => {
    const { useEventkitStore } = await import('./eventkitStore')
    const store = useEventkitStore

    await store.getState().requestRemindersAccess()

    expect(mockAdapter.requestRemindersAccess).toHaveBeenCalled()
    expect(store.getState().eventkitPermissions.reminders).toBe('granted')
  })

  it('refreshEventkitData delegates to adapter', async () => {
    const { useEventkitStore } = await import('./eventkitStore')
    const store = useEventkitStore

    store.setState({
      eventkitPermissions: { calendar: 'granted', reminders: 'granted' },
    })

    await store.getState().refreshEventkitData()

    expect(mockAdapter.fetchCalendarEvents).toHaveBeenCalled()
    expect(mockAdapter.fetchReminders).toHaveBeenCalled()
    expect(store.getState().rawEventKit.calendarEvents).toHaveLength(1)
    expect(store.getState().rawEventKit.reminders).toHaveLength(1)
  })
})
