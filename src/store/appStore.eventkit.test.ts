import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from './appStore'
import * as desktopApi from '../lib/desktopApi'

// Mock desktopApi module
vi.mock('../lib/desktopApi', () => ({
  isTauriRuntime: vi.fn(() => false),
  getCurrentWindowLabel: vi.fn(() => 'browser'),
  loadDesktopSnapshot: vi.fn(),
  captureTask: vi.fn(),
  createGoal: vi.fn(),
  updateGoalFields: vi.fn(),
  updateGoalStatus: vi.fn(),
  createTaskForGoal: vi.fn(),
  updateTaskContent: vi.fn(),
  updateTaskFields: vi.fn(),
  updateTaskStatus: vi.fn(),
  addTaskNote: vi.fn(),
  openTaskInBear: vi.fn(),
  showQuickCaptureWindow: vi.fn(),
  setSystemReminderCompleted: vi.fn(),
  listAreas: vi.fn(),
  createArea: vi.fn(),
  renameArea: vi.fn(),
  deleteArea: vi.fn(),
  hideCurrentWindow: vi.fn(),
  // EventKit APIs
  requestCalendarAccess: vi.fn(),
  requestRemindersAccess: vi.fn(),
  fetchCalendarEvents: vi.fn(),
  fetchReminders: vi.fn(),
}))

describe('EventKit Permission Management', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAppStore.setState({
      eventkitPermissions: {
        calendar: 'not_determined',
        reminders: 'not_determined',
      },
      eventkitData: {
        calendarEventCount: 0,
        reminderCount: 0,
      },
    })
    vi.clearAllMocks()
  })

  describe('初始状态', () => {
    it('权限状态应为 not_determined', () => {
      const state = useAppStore.getState()
      expect(state.eventkitPermissions.calendar).toBe('not_determined')
      expect(state.eventkitPermissions.reminders).toBe('not_determined')
    })

    it('数据计数应为 0', () => {
      const state = useAppStore.getState()
      expect(state.eventkitData.calendarEventCount).toBe(0)
      expect(state.eventkitData.reminderCount).toBe(0)
    })
  })

  describe('requestCalendarAccess', () => {
    it('成功授权后状态应变为 granted', async () => {
      vi.mocked(desktopApi.requestCalendarAccess).mockResolvedValue('granted')

      await useAppStore.getState().requestCalendarAccess()

      const state = useAppStore.getState()
      expect(state.eventkitPermissions.calendar).toBe('granted')
      expect(desktopApi.requestCalendarAccess).toHaveBeenCalledOnce()
    })

    it('用户拒绝后状态应变为 denied', async () => {
      vi.mocked(desktopApi.requestCalendarAccess).mockResolvedValue('denied')

      await useAppStore.getState().requestCalendarAccess()

      const state = useAppStore.getState()
      expect(state.eventkitPermissions.calendar).toBe('denied')
    })

    it('系统限制时状态应变为 restricted', async () => {
      vi.mocked(desktopApi.requestCalendarAccess).mockResolvedValue('restricted')

      await useAppStore.getState().requestCalendarAccess()

      const state = useAppStore.getState()
      expect(state.eventkitPermissions.calendar).toBe('restricted')
    })

    it('发生错误时状态应变为 error', async () => {
      vi.mocked(desktopApi.requestCalendarAccess).mockRejectedValue(new Error('Permission request failed'))

      await useAppStore.getState().requestCalendarAccess()

      const state = useAppStore.getState()
      expect(state.eventkitPermissions.calendar).toBe('error')
    })
  })

  describe('requestRemindersAccess', () => {
    it('成功授权后状态应变为 granted', async () => {
      vi.mocked(desktopApi.requestRemindersAccess).mockResolvedValue('granted')

      await useAppStore.getState().requestRemindersAccess()

      const state = useAppStore.getState()
      expect(state.eventkitPermissions.reminders).toBe('granted')
      expect(desktopApi.requestRemindersAccess).toHaveBeenCalledOnce()
    })

    it('用户拒绝后状态应变为 denied', async () => {
      vi.mocked(desktopApi.requestRemindersAccess).mockResolvedValue('denied')

      await useAppStore.getState().requestRemindersAccess()

      const state = useAppStore.getState()
      expect(state.eventkitPermissions.reminders).toBe('denied')
    })
  })

  describe('refreshEventkitData', () => {
    beforeEach(() => {
      // 设置权限为 granted
      useAppStore.setState({
        eventkitPermissions: {
          calendar: 'granted',
          reminders: 'granted',
        },
      })
    })

    it('应正确更新日历事件计数', async () => {
      const mockEvents = [
        { id: '1', title: 'Meeting 1', startsAt: '2026-06-14T10:00:00Z', endsAt: '2026-06-14T11:00:00Z' },
        { id: '2', title: 'Meeting 2', startsAt: '2026-06-14T14:00:00Z', endsAt: '2026-06-14T15:00:00Z' },
      ]
      vi.mocked(desktopApi.fetchCalendarEvents).mockResolvedValue(mockEvents)
      vi.mocked(desktopApi.fetchReminders).mockResolvedValue([])

      await useAppStore.getState().refreshEventkitData()

      const state = useAppStore.getState()
      expect(state.eventkitData.calendarEventCount).toBe(2)
    })

    it('应正确更新提醒计数', async () => {
      const mockReminders = [
        { id: '1', title: 'Reminder 1', done: false },
        { id: '2', title: 'Reminder 2', done: false },
        { id: '3', title: 'Reminder 3', done: true },
      ]
      vi.mocked(desktopApi.fetchCalendarEvents).mockResolvedValue([])
      vi.mocked(desktopApi.fetchReminders).mockResolvedValue(mockReminders)

      await useAppStore.getState().refreshEventkitData()

      const state = useAppStore.getState()
      expect(state.eventkitData.reminderCount).toBe(3)
    })

    it('应同时更新日历和提醒的计数', async () => {
      const mockEvents = [
        { id: '1', title: 'Event', startsAt: '2026-06-14T10:00:00Z', endsAt: '2026-06-14T11:00:00Z' },
      ]
      const mockReminders = [
        { id: '1', title: 'Reminder 1', done: false },
        { id: '2', title: 'Reminder 2', done: false },
      ]
      vi.mocked(desktopApi.fetchCalendarEvents).mockResolvedValue(mockEvents)
      vi.mocked(desktopApi.fetchReminders).mockResolvedValue(mockReminders)

      await useAppStore.getState().refreshEventkitData()

      const state = useAppStore.getState()
      expect(state.eventkitData.calendarEventCount).toBe(1)
      expect(state.eventkitData.reminderCount).toBe(2)
    })

    it('权限未授权时不应调用 API', async () => {
      useAppStore.setState({
        eventkitPermissions: {
          calendar: 'denied',
          reminders: 'denied',
        },
      })

      await useAppStore.getState().refreshEventkitData()

      expect(desktopApi.fetchCalendarEvents).not.toHaveBeenCalled()
      expect(desktopApi.fetchReminders).not.toHaveBeenCalled()
    })

    it('API 失败时计数应保持不变', async () => {
      vi.mocked(desktopApi.fetchCalendarEvents).mockRejectedValue(new Error('Fetch failed'))
      vi.mocked(desktopApi.fetchReminders).mockRejectedValue(new Error('Fetch failed'))

      await useAppStore.getState().refreshEventkitData()

      const state = useAppStore.getState()
      expect(state.eventkitData.calendarEventCount).toBe(0)
      expect(state.eventkitData.reminderCount).toBe(0)
    })
  })

  describe('浏览器环境 Mock 行为', () => {
    it('在浏览器环境中 requestCalendarAccess 应返回 mock 状态', async () => {
      vi.mocked(desktopApi.isTauriRuntime).mockReturnValue(false)
      vi.mocked(desktopApi.requestCalendarAccess).mockResolvedValue('granted')

      // 浏览器环境应该有默认行为
      await useAppStore.getState().requestCalendarAccess()

      const state = useAppStore.getState()
      // 浏览器环境应该 mock 为 granted
      expect(state.eventkitPermissions.calendar).toBe('granted')
    })
  })
})
