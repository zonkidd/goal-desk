import { create } from 'zustand'
import { isTauriRuntime } from '../lib/runtime'
import {
  setSystemReminderCompleted as persistSystemReminderCompleted,
  requestCalendarAccess as apiRequestCalendarAccess,
  requestRemindersAccess as apiRequestRemindersAccess,
  fetchCalendarEvents,
  fetchReminders,
} from '../lib/eventkitIntegration'
import type { AccessStatus, IntegrationStatus, ReminderItem } from '../types/app'

export interface EventkitStoreState {
  rawEventKit: {
    calendarEvents: Array<{ id: string; title: string; startsAt: string; endsAt: string; calendarTitle?: string }>
    reminders: Array<{ id: string; title: string; dueAt?: string; done: boolean; listTitle?: string }>
  }
  systemReminders: ReminderItem[]
  integrationStatus: IntegrationStatus

  eventkitPermissions: {
    calendar: AccessStatus
    reminders: AccessStatus
  }

  hydrateEventkitData: (data: {
    rawEventKit?: {
      calendarEvents: Array<{ id: string; title: string; startsAt: string; endsAt: string; calendarTitle?: string }>
      reminders: Array<{ id: string; title: string; dueAt?: string; done: boolean; listTitle?: string }>
    }
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

type PendingMap = Map<'calendar' | 'reminders', Promise<AccessStatus>>

const pendingRequests: PendingMap = new Map()

export const useEventkitStore = create<EventkitStoreState>((set, get) => ({
  rawEventKit: { calendarEvents: [], reminders: [] },
  systemReminders: [],
  integrationStatus: {
    calendar: 'not_determined',
    reminders: 'not_determined',
  },
  eventkitPermissions: {
    calendar: 'not_determined',
    reminders: 'not_determined',
  },

  hydrateEventkitData: (data) => {
    const integrationStatus = data.integrationStatus
    set({
      rawEventKit: data.rawEventKit || { calendarEvents: [], reminders: [] },
      systemReminders: data.systemReminders,
      integrationStatus,
      eventkitPermissions: {
        calendar: integrationStatus.calendar,
        reminders: integrationStatus.reminders,
      },
    })
  },

  toggleSystemReminderDone: async (reminderId, done) => {
    try {
      if (!isTauriRuntime()) {
        set((state) => ({
          systemReminders: state.systemReminders.map((reminder) =>
            reminder.id === reminderId
              ? { ...reminder, done }
              : reminder,
          ),
        }))
        return null
      }

      const updatedReminder = await persistSystemReminderCompleted(reminderId, done)
      set((state) => ({
        systemReminders: state.systemReminders.map((reminder) =>
          reminder.id === reminderId ? updatedReminder : reminder,
        ),
      }))
      return updatedReminder
    } catch (error) {
      return null
    }
  },

  requestCalendarAccess: async () => {
    if (pendingRequests.has('calendar')) return

    const promise = apiRequestCalendarAccess()
      .then((status) => {
        set((s) => ({
          eventkitPermissions: { ...s.eventkitPermissions, calendar: status },
        }))
        return status
      })
      .catch(() => {
        set((s) => ({
          eventkitPermissions: { ...s.eventkitPermissions, calendar: 'error' as AccessStatus },
        }))
        return 'error' as AccessStatus
      })
      .finally(() => {
        pendingRequests.delete('calendar')
      })

    pendingRequests.set('calendar', promise)
    await promise
  },

  requestRemindersAccess: async () => {
    if (pendingRequests.has('reminders')) return

    const promise = apiRequestRemindersAccess()
      .then((status) => {
        set((s) => ({
          eventkitPermissions: { ...s.eventkitPermissions, reminders: status },
        }))
        return status
      })
      .catch(() => {
        set((s) => ({
          eventkitPermissions: { ...s.eventkitPermissions, reminders: 'error' as AccessStatus },
        }))
        return 'error' as AccessStatus
      })
      .finally(() => {
        pendingRequests.delete('reminders')
      })

    pendingRequests.set('reminders', promise)
    await promise
  },

  refreshEventkitData: async () => {
    const state = get()

    if (state.eventkitPermissions.calendar !== 'granted' && state.eventkitPermissions.reminders !== 'granted') {
      return
    }

    try {
      const newRawEventKit = { ...state.rawEventKit }

      if (state.eventkitPermissions.calendar === 'granted') {
        const { startOfDay, endOfDay } = createDateRange()
        newRawEventKit.calendarEvents = await fetchCalendarEvents(startOfDay, endOfDay)
      }

      if (state.eventkitPermissions.reminders === 'granted') {
        newRawEventKit.reminders = await fetchReminders()
      }

      set({ rawEventKit: newRawEventKit })
    } catch (error) {
      // error handled by caller
    }
  },
}))
