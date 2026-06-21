import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { useEventkitStore } from './eventkitStore'
import { setEventKitAdapter, resetEventKitAdapter } from '../lib/workspaceMutations'
import type { EventKitAdapter } from '../lib/eventkitAdapter'

function createMockAdapter(overrides: Partial<EventKitAdapter> = {}): EventKitAdapter {
  return {
    requestCalendarAccess: vi.fn().mockResolvedValue('granted'),
    requestRemindersAccess: vi.fn().mockResolvedValue('granted'),
    openCalendarEvent: vi.fn().mockResolvedValue(undefined),
    openSystemReminder: vi.fn().mockResolvedValue(undefined),
    setSystemReminderCompleted: vi.fn().mockResolvedValue({
      id: 'r1', title: 'Updated', dueAt: undefined, done: true, listTitle: undefined,
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
    ...overrides,
  }
}

describe('EventKit Permission Management', () => {
  beforeEach(() => {
    useEventkitStore.setState({
      eventkitPermissions: {
        calendar: 'not_determined',
        reminders: 'not_determined',
      },
      rawEventKit: { calendarEvents: [], reminders: [] },
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetEventKitAdapter()
  })

  describe('initial state', () => {
    it('permissions should be not_determined', () => {
      const state = useEventkitStore.getState()
      expect(state.eventkitPermissions.calendar).toBe('not_determined')
      expect(state.eventkitPermissions.reminders).toBe('not_determined')
    })

    it('data counts should be derived from rawEventKit', () => {
      const state = useEventkitStore.getState()
      expect(state.rawEventKit.calendarEvents.length).toBe(0)
      expect(state.rawEventKit.reminders.length).toBe(0)
    })
  })

  describe('requestCalendarAccess', () => {
    it('should change to granted after authorization', async () => {
      const adapter = createMockAdapter({
        requestCalendarAccess: vi.fn().mockResolvedValue('granted'),
      })
      setEventKitAdapter(adapter)

      await useEventkitStore.getState().requestCalendarAccess()

      const state = useEventkitStore.getState()
      expect(state.eventkitPermissions.calendar).toBe('granted')
      expect(adapter.requestCalendarAccess).toHaveBeenCalledOnce()
    })

    it('should change to denied when user denies', async () => {
      const adapter = createMockAdapter({
        requestCalendarAccess: vi.fn().mockResolvedValue('denied'),
      })
      setEventKitAdapter(adapter)

      await useEventkitStore.getState().requestCalendarAccess()

      const state = useEventkitStore.getState()
      expect(state.eventkitPermissions.calendar).toBe('denied')
    })

    it('should change to restricted when system restricts', async () => {
      const adapter = createMockAdapter({
        requestCalendarAccess: vi.fn().mockResolvedValue('restricted'),
      })
      setEventKitAdapter(adapter)

      await useEventkitStore.getState().requestCalendarAccess()

      const state = useEventkitStore.getState()
      expect(state.eventkitPermissions.calendar).toBe('restricted')
    })

    it('should change to error on failure', async () => {
      const adapter = createMockAdapter({
        requestCalendarAccess: vi.fn().mockRejectedValue(new Error('Permission request failed')),
      })
      setEventKitAdapter(adapter)

      await useEventkitStore.getState().requestCalendarAccess()

      const state = useEventkitStore.getState()
      expect(state.eventkitPermissions.calendar).toBe('error')
    })
  })

  describe('requestRemindersAccess', () => {
    it('should change to granted after authorization', async () => {
      const adapter = createMockAdapter({
        requestRemindersAccess: vi.fn().mockResolvedValue('granted'),
      })
      setEventKitAdapter(adapter)

      await useEventkitStore.getState().requestRemindersAccess()

      const state = useEventkitStore.getState()
      expect(state.eventkitPermissions.reminders).toBe('granted')
      expect(adapter.requestRemindersAccess).toHaveBeenCalledOnce()
    })

    it('should change to denied when user denies', async () => {
      const adapter = createMockAdapter({
        requestRemindersAccess: vi.fn().mockResolvedValue('denied'),
      })
      setEventKitAdapter(adapter)

      await useEventkitStore.getState().requestRemindersAccess()

      const state = useEventkitStore.getState()
      expect(state.eventkitPermissions.reminders).toBe('denied')
    })
  })

  describe('refreshEventkitData', () => {
    beforeEach(() => {
      useEventkitStore.setState({
        eventkitPermissions: {
          calendar: 'granted',
          reminders: 'granted',
        },
      })
    })

    it('should update rawEventKit with calendar events', async () => {
      const mockEvents = [
        { id: '1', title: 'Meeting 1', startsAt: new Date('2026-06-14T10:00:00Z'), endsAt: new Date('2026-06-14T11:00:00Z') },
        { id: '2', title: 'Meeting 2', startsAt: new Date('2026-06-14T14:00:00Z'), endsAt: new Date('2026-06-14T15:00:00Z') },
      ]
      const adapter = createMockAdapter({
        fetchCalendarEvents: vi.fn().mockResolvedValue(mockEvents),
        fetchReminders: vi.fn().mockResolvedValue([]),
      })
      setEventKitAdapter(adapter)

      await useEventkitStore.getState().refreshEventkitData()

      const state = useEventkitStore.getState()
      expect(state.rawEventKit.calendarEvents.length).toBe(2)
    })

    it('should update rawEventKit with reminders', async () => {
      const mockReminders = [
        { id: '1', title: 'Reminder 1', done: false },
        { id: '2', title: 'Reminder 2', done: false },
        { id: '3', title: 'Reminder 3', done: true },
      ]
      const adapter = createMockAdapter({
        fetchCalendarEvents: vi.fn().mockResolvedValue([]),
        fetchReminders: vi.fn().mockResolvedValue(mockReminders),
      })
      setEventKitAdapter(adapter)

      await useEventkitStore.getState().refreshEventkitData()

      const state = useEventkitStore.getState()
      expect(state.rawEventKit.reminders.length).toBe(3)
    })

    it('should update both simultaneously', async () => {
      const mockEvents = [
        { id: '1', title: 'Event', startsAt: new Date('2026-06-14T10:00:00Z'), endsAt: new Date('2026-06-14T11:00:00Z') },
      ]
      const mockReminders = [
        { id: '1', title: 'Reminder 1', done: false },
        { id: '2', title: 'Reminder 2', done: false },
      ]
      const adapter = createMockAdapter({
        fetchCalendarEvents: vi.fn().mockResolvedValue(mockEvents),
        fetchReminders: vi.fn().mockResolvedValue(mockReminders),
      })
      setEventKitAdapter(adapter)

      await useEventkitStore.getState().refreshEventkitData()

      const state = useEventkitStore.getState()
      expect(state.rawEventKit.calendarEvents.length).toBe(1)
      expect(state.rawEventKit.reminders.length).toBe(2)
    })

    it('should not call API when permissions denied', async () => {
      const adapter = createMockAdapter()
      setEventKitAdapter(adapter)
      useEventkitStore.setState({
        eventkitPermissions: {
          calendar: 'denied',
          reminders: 'denied',
        },
      })

      await useEventkitStore.getState().refreshEventkitData()

      expect(adapter.fetchCalendarEvents).not.toHaveBeenCalled()
      expect(adapter.fetchReminders).not.toHaveBeenCalled()
    })

    it('should keep rawEventKit unchanged on API failure', async () => {
      const adapter = createMockAdapter({
        fetchCalendarEvents: vi.fn().mockRejectedValue(new Error('Fetch failed')),
        fetchReminders: vi.fn().mockRejectedValue(new Error('Fetch failed')),
      })
      setEventKitAdapter(adapter)

      await useEventkitStore.getState().refreshEventkitData()

      const state = useEventkitStore.getState()
      expect(state.rawEventKit.calendarEvents.length).toBe(0)
      expect(state.rawEventKit.reminders.length).toBe(0)
    })
  })
})
