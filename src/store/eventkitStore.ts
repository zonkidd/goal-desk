import { create } from 'zustand'
import { getEventKitAdapter } from '../lib/workspaceMutations'
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
  addSystemReminder: (reminder: ReminderItem) => void
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

  addSystemReminder: (reminder) => {
    set((state) => ({
      systemReminders: [...state.systemReminders, reminder],
    }))
  },

  toggleSystemReminderDone: async (reminderId, done) => {
    try {
      const adapter = getEventKitAdapter()
      const updatedReminder = await adapter.setSystemReminderCompleted(reminderId, done)
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

    const adapter = getEventKitAdapter()
    const promise = adapter.requestCalendarAccess()
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

    const adapter = getEventKitAdapter()
    const promise = adapter.requestRemindersAccess()
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
      const adapter = getEventKitAdapter()
      const newRawEventKit = { ...state.rawEventKit }

      if (state.eventkitPermissions.calendar === 'granted') {
        const { startOfDay, endOfDay } = createDateRange()
        const events = await adapter.fetchCalendarEvents(startOfDay, endOfDay)
        newRawEventKit.calendarEvents = events.map(e => ({
          id: e.id,
          title: e.title,
          startsAt: e.startsAt.toISOString(),
          endsAt: e.endsAt.toISOString(),
          calendarTitle: e.calendarTitle,
        }))
      }

      if (state.eventkitPermissions.reminders === 'granted') {
        const reminders = await adapter.fetchReminders()
        newRawEventKit.reminders = reminders.map(r => ({
          id: r.id,
          title: r.title,
          dueAt: r.dueAt?.toISOString(),
          done: r.done,
          listTitle: r.listTitle,
        }))
      }

      set({ rawEventKit: newRawEventKit })
    } catch (error) {
      // error handled by caller
    }
  },
}))
