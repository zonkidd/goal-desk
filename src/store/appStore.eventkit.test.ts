import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEventkitStore } from './eventkitStore'
import { requestCalendarAccess, requestRemindersAccess, fetchCalendarEvents, fetchReminders } from '../lib/eventkitIntegration'
import { isTauriRuntime } from '../lib/runtime'

vi.mock('../lib/runtime', () => ({
  isTauriRuntime: vi.fn(() => false),
  getCurrentWindowLabel: vi.fn(() => 'browser'),
}))

vi.mock('../lib/eventkitIntegration', () => ({
  setSystemReminderCompleted: vi.fn(),
  requestCalendarAccess: vi.fn(),
  requestRemindersAccess: vi.fn(),
  fetchCalendarEvents: vi.fn(),
  fetchReminders: vi.fn(),
}))

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
      vi.mocked(requestCalendarAccess).mockResolvedValue('granted')

      await useEventkitStore.getState().requestCalendarAccess()

      const state = useEventkitStore.getState()
      expect(state.eventkitPermissions.calendar).toBe('granted')
      expect(requestCalendarAccess).toHaveBeenCalledOnce()
    })

    it('should change to denied when user denies', async () => {
      vi.mocked(requestCalendarAccess).mockResolvedValue('denied')

      await useEventkitStore.getState().requestCalendarAccess()

      const state = useEventkitStore.getState()
      expect(state.eventkitPermissions.calendar).toBe('denied')
    })

    it('should change to restricted when system restricts', async () => {
      vi.mocked(requestCalendarAccess).mockResolvedValue('restricted')

      await useEventkitStore.getState().requestCalendarAccess()

      const state = useEventkitStore.getState()
      expect(state.eventkitPermissions.calendar).toBe('restricted')
    })

    it('should change to error on failure', async () => {
      vi.mocked(requestCalendarAccess).mockRejectedValue(new Error('Permission request failed'))

      await useEventkitStore.getState().requestCalendarAccess()

      const state = useEventkitStore.getState()
      expect(state.eventkitPermissions.calendar).toBe('error')
    })
  })

  describe('requestRemindersAccess', () => {
    it('should change to granted after authorization', async () => {
      vi.mocked(requestRemindersAccess).mockResolvedValue('granted')

      await useEventkitStore.getState().requestRemindersAccess()

      const state = useEventkitStore.getState()
      expect(state.eventkitPermissions.reminders).toBe('granted')
      expect(requestRemindersAccess).toHaveBeenCalledOnce()
    })

    it('should change to denied when user denies', async () => {
      vi.mocked(requestRemindersAccess).mockResolvedValue('denied')

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
        { id: '1', title: 'Meeting 1', startsAt: '2026-06-14T10:00:00Z', endsAt: '2026-06-14T11:00:00Z' },
        { id: '2', title: 'Meeting 2', startsAt: '2026-06-14T14:00:00Z', endsAt: '2026-06-14T15:00:00Z' },
      ]
      vi.mocked(fetchCalendarEvents).mockResolvedValue(mockEvents)
      vi.mocked(fetchReminders).mockResolvedValue([])

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
      vi.mocked(fetchCalendarEvents).mockResolvedValue([])
      vi.mocked(fetchReminders).mockResolvedValue(mockReminders)

      await useEventkitStore.getState().refreshEventkitData()

      const state = useEventkitStore.getState()
      expect(state.rawEventKit.reminders.length).toBe(3)
    })

    it('should update both simultaneously', async () => {
      const mockEvents = [
        { id: '1', title: 'Event', startsAt: '2026-06-14T10:00:00Z', endsAt: '2026-06-14T11:00:00Z' },
      ]
      const mockReminders = [
        { id: '1', title: 'Reminder 1', done: false },
        { id: '2', title: 'Reminder 2', done: false },
      ]
      vi.mocked(fetchCalendarEvents).mockResolvedValue(mockEvents)
      vi.mocked(fetchReminders).mockResolvedValue(mockReminders)

      await useEventkitStore.getState().refreshEventkitData()

      const state = useEventkitStore.getState()
      expect(state.rawEventKit.calendarEvents.length).toBe(1)
      expect(state.rawEventKit.reminders.length).toBe(2)
    })

    it('should not call API when permissions denied', async () => {
      useEventkitStore.setState({
        eventkitPermissions: {
          calendar: 'denied',
          reminders: 'denied',
        },
      })

      await useEventkitStore.getState().refreshEventkitData()

      expect(fetchCalendarEvents).not.toHaveBeenCalled()
      expect(fetchReminders).not.toHaveBeenCalled()
    })

    it('should keep rawEventKit unchanged on API failure', async () => {
      vi.mocked(fetchCalendarEvents).mockRejectedValue(new Error('Fetch failed'))
      vi.mocked(fetchReminders).mockRejectedValue(new Error('Fetch failed'))

      await useEventkitStore.getState().refreshEventkitData()

      const state = useEventkitStore.getState()
      expect(state.rawEventKit.calendarEvents.length).toBe(0)
      expect(state.rawEventKit.reminders.length).toBe(0)
    })
  })

  describe('browser environment mock behavior', () => {
    it('should return mock status in browser environment', async () => {
      vi.mocked(isTauriRuntime).mockReturnValue(false)
      vi.mocked(requestCalendarAccess).mockResolvedValue('granted')

      await useEventkitStore.getState().requestCalendarAccess()

      const state = useEventkitStore.getState()
      expect(state.eventkitPermissions.calendar).toBe('granted')
    })
  })
})
