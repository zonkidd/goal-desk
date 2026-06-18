import { create } from 'zustand'
import {
  isTauriRuntime,
  setSystemReminderCompleted as persistSystemReminderCompleted,
  requestCalendarAccess as apiRequestCalendarAccess,
  requestRemindersAccess as apiRequestRemindersAccess,
  fetchCalendarEvents,
  fetchReminders,
  type AuthorizationStatus,
} from '../lib/desktopApi'
import { PermissionManager, type PermissionType } from '../lib/PermissionManager'
import { getRuntimeModeStatusMessage } from '../lib/taskPresentation'
import type { IntegrationStatus, ReminderItem, RawAgendaItem } from '../types/app'

export interface EventkitStoreState {
  // 基础数据
  baseTimeline: RawAgendaItem[]
  systemReminders: ReminderItem[]
  integrationStatus: IntegrationStatus

  // 权限状态
  eventkitPermissions: {
    calendar: AuthorizationStatus
    reminders: AuthorizationStatus
  }

  // 数据统计
  eventkitData: {
    calendarEventCount: number
    reminderCount: number
  }

  // Actions
  hydrateEventkitData: (data: {
    timeline: RawAgendaItem[]
    systemReminders: ReminderItem[]
    integrationStatus: IntegrationStatus
  }) => void
  toggleSystemReminderDone: (reminderId: string, done: boolean) => Promise<ReminderItem | null>
  requestCalendarAccess: () => Promise<void>
  requestRemindersAccess: () => Promise<void>
  refreshEventkitData: () => Promise<void>
  setStatusMessage: (message: string) => void
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function createDateRange() {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
  return { startOfDay, endOfDay }
}

// 创建权限管理器实例
const permissionManager = new PermissionManager(async (type: PermissionType) => {
  if (type === 'calendar') {
    return await apiRequestCalendarAccess()
  } else {
    return await apiRequestRemindersAccess()
  }
})

export const useEventkitStore = create<EventkitStoreState>((set, get) => ({
  // 初始状态
  baseTimeline: [],
  systemReminders: [],
  integrationStatus: {
    calendar: 'not_determined',
    reminders: 'not_determined',
  },
  eventkitPermissions: {
    calendar: 'not_determined',
    reminders: 'not_determined',
  },
  eventkitData: {
    calendarEventCount: 0,
    reminderCount: 0,
  },

  // Hydrate
  hydrateEventkitData: (data) => {
    // 同步权限状态到 PermissionManager
    permissionManager.updateState(data.integrationStatus)

    set({
      baseTimeline: data.timeline,
      systemReminders: data.systemReminders,
      integrationStatus: data.integrationStatus,
      eventkitPermissions: permissionManager.getState(),
    })
  },

  // 切换系统提醒完成状态
  toggleSystemReminderDone: async (reminderId, done) => {
    try {
      if (!isTauriRuntime()) {
        set((state) => ({
          systemReminders: state.systemReminders.map((reminder) =>
            reminder.id === reminderId
              ? {
                  ...reminder,
                  done,
                }
              : reminder,
          ),
          baseTimeline: state.baseTimeline.map((item) => (item.id === reminderId ? { ...item, done } : item)),
        }))
        get().setStatusMessage(getRuntimeModeStatusMessage(false))
        return null
      }

      const updatedReminder = await persistSystemReminderCompleted(reminderId, done)
      set((state) => ({
        systemReminders: state.systemReminders.map((reminder) =>
          reminder.id === reminderId ? updatedReminder : reminder,
        ),
        baseTimeline: state.baseTimeline.map((item) =>
          item.id === reminderId
            ? {
                ...item,
                done: updatedReminder.done,
              }
            : item,
        ),
      }))
      get().setStatusMessage(updatedReminder.done ? 'Apple Reminder completed' : 'Apple Reminder reopened')
      return updatedReminder
    } catch (error) {
      get().setStatusMessage(`Unable to update Apple Reminder · ${formatErrorMessage(error)}`)
      return null
    }
  },

  // 请求日历访问权限
  requestCalendarAccess: async () => {
    try {
      const status = await permissionManager.request('calendar')
      set({
        eventkitPermissions: permissionManager.getState(),
      })
      get().setStatusMessage(status === 'granted' ? 'Calendar access granted' : `Calendar access ${status}`)
    } catch (error) {
      permissionManager.updateState({
        ...permissionManager.getState(),
        calendar: 'error',
      })
      set({
        eventkitPermissions: permissionManager.getState(),
      })
      get().setStatusMessage(`Unable to request calendar access · ${formatErrorMessage(error)}`)
    }
  },

  // 请求提醒事项访问权限
  requestRemindersAccess: async () => {
    try {
      const status = await permissionManager.request('reminders')
      set({
        eventkitPermissions: permissionManager.getState(),
      })
      get().setStatusMessage(status === 'granted' ? 'Reminders access granted' : `Reminders access ${status}`)
    } catch (error) {
      permissionManager.updateState({
        ...permissionManager.getState(),
        reminders: 'error',
      })
      set({
        eventkitPermissions: permissionManager.getState(),
      })
      get().setStatusMessage(`Unable to request reminders access · ${formatErrorMessage(error)}`)
    }
  },

  // 刷新 EventKit 数据
  refreshEventkitData: async () => {
    const state = get()

    // 只有在权限授权后才获取数据
    if (state.eventkitPermissions.calendar !== 'granted' && state.eventkitPermissions.reminders !== 'granted') {
      return
    }

    try {
      let calendarEventCount = 0
      let reminderCount = 0

      if (state.eventkitPermissions.calendar === 'granted') {
        const { startOfDay, endOfDay } = createDateRange()
        const events = await fetchCalendarEvents(startOfDay, endOfDay)
        calendarEventCount = events.length
      }

      if (state.eventkitPermissions.reminders === 'granted') {
        const reminders = await fetchReminders()
        reminderCount = reminders.length
      }

      set({
        eventkitData: {
          calendarEventCount,
          reminderCount,
        },
      })
      get().setStatusMessage('EventKit data refreshed')
    } catch (error) {
      get().setStatusMessage(`Unable to refresh EventKit data · ${formatErrorMessage(error)}`)
    }
  },

  // 设置状态消息（桥接到 uiStore）
  setStatusMessage: (message: string) => {
    // 这个方法会在稍后被组合 hook 覆盖，指向 uiStore.setStatusMessage
    console.warn('setStatusMessage called before being linked to uiStore')
  },
}))
