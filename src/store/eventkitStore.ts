import { create } from 'zustand'
import { isTauriRuntime } from '../lib/runtime'
import {
  setSystemReminderCompleted as persistSystemReminderCompleted,
  requestCalendarAccess as apiRequestCalendarAccess,
  requestRemindersAccess as apiRequestRemindersAccess,
  fetchCalendarEvents,
  fetchReminders,
  type AuthorizationStatus,
} from '../lib/eventkitIntegration'
import { PermissionManager, type PermissionType } from '../lib/PermissionManager'
import type { IntegrationStatus, ReminderItem, RawAgendaItem } from '../types/app'

export interface EventkitStoreState {
  // 原始 EventKit 数据（日历事件 + 系统提醒，只读）
  rawTimeline: RawAgendaItem[]
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
  rawTimeline: [],
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
      rawTimeline: data.timeline,
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
          rawTimeline: state.rawTimeline.map((item) => (item.id === reminderId ? { ...item, done } : item)),
        }))
        return null
      }

      const updatedReminder = await persistSystemReminderCompleted(reminderId, done)
      set((state) => ({
        systemReminders: state.systemReminders.map((reminder) =>
          reminder.id === reminderId ? updatedReminder : reminder,
        ),
        rawTimeline: state.rawTimeline.map((item) =>
          item.id === reminderId
            ? {
                ...item,
                done: updatedReminder.done,
              }
            : item,
        ),
      }))
      return updatedReminder
    } catch (error) {
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
    } catch (error) {
      permissionManager.updateState({
        ...permissionManager.getState(),
        calendar: 'error',
      })
      set({
        eventkitPermissions: permissionManager.getState(),
      })
    }
  },

  // 请求提醒事项访问权限
  requestRemindersAccess: async () => {
    try {
      const status = await permissionManager.request('reminders')
      set({
        eventkitPermissions: permissionManager.getState(),
      })
    } catch (error) {
      permissionManager.updateState({
        ...permissionManager.getState(),
        reminders: 'error',
      })
      set({
        eventkitPermissions: permissionManager.getState(),
      })
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
    } catch (error) {
      // error handled by caller
    }
  },
}))
