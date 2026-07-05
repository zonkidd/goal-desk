import { create } from 'zustand'
import { getEventKitAdapter } from '../lib/workspaceMutations'
import { mergeById, type RawEventKitData } from '../lib/eventkitData'
import type { AccessStatus, IntegrationStatus, ReminderItem } from '../types/app'

export interface EventkitStoreState {
  rawEventKit: RawEventKitData
  systemReminders: ReminderItem[]
  integrationStatus: IntegrationStatus

  eventkitPermissions: {
    calendar: AccessStatus
    reminders: AccessStatus
  }

  hydrateEventkitData: (data: {
    rawEventKit?: RawEventKitData
    systemReminders: ReminderItem[]
    integrationStatus: IntegrationStatus
  }) => void
  mergeEventkitRangeData: (data: RawEventKitData) => void
  requestCalendarAccess: () => Promise<void>
  requestRemindersAccess: () => Promise<void>
  refreshEventkitData: () => Promise<void>
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

  mergeEventkitRangeData: (data) => {
    set((state) => ({
      rawEventKit: {
        calendarEvents: mergeById(state.rawEventKit.calendarEvents, data.calendarEvents),
        reminders: mergeById(state.rawEventKit.reminders, data.reminders),
      },
      systemReminders: mergeById(
        state.systemReminders,
        data.reminders.map((reminder) => ({
          id: reminder.id,
          title: reminder.title,
          dueAt: reminder.dueAt ? new Date(reminder.dueAt) : undefined,
          done: reminder.done,
          listTitle: reminder.listTitle,
        })),
      ),
    }))
  },

  requestCalendarAccess: async () => {
    if (pendingRequests.has('calendar')) {
      await pendingRequests.get('calendar')
      return
    }

    const adapter = getEventKitAdapter()
    const promise = adapter.requestCalendarAccess()
      .then((status) => {
        set((s) => ({
          eventkitPermissions: { ...s.eventkitPermissions, calendar: status },
          integrationStatus: { ...s.integrationStatus, calendar: status },
        }))
        return status
      })
      .catch(() => {
        set((s) => ({
          eventkitPermissions: { ...s.eventkitPermissions, calendar: 'error' as AccessStatus },
          integrationStatus: { ...s.integrationStatus, calendar: 'error' as AccessStatus },
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
    if (pendingRequests.has('reminders')) {
      await pendingRequests.get('reminders')
      return
    }

    const adapter = getEventKitAdapter()
    const promise = adapter.requestRemindersAccess()
      .then((status) => {
        set((s) => ({
          eventkitPermissions: { ...s.eventkitPermissions, reminders: status },
          integrationStatus: { ...s.integrationStatus, reminders: status },
        }))
        return status
      })
      .catch(() => {
        set((s) => ({
          eventkitPermissions: { ...s.eventkitPermissions, reminders: 'error' as AccessStatus },
          integrationStatus: { ...s.integrationStatus, reminders: 'error' as AccessStatus },
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
    const hasGrantedPermission =
      state.eventkitPermissions.calendar === 'granted' ||
      state.eventkitPermissions.reminders === 'granted'
    const hasSyncedDeniedSnapshot =
      state.eventkitPermissions.calendar === 'denied' &&
      state.eventkitPermissions.reminders === 'denied' &&
      state.integrationStatus.calendar === 'denied' &&
      state.integrationStatus.reminders === 'denied'

    if (!hasGrantedPermission && !hasSyncedDeniedSnapshot) {
      return
    }

    try {
      const snapshot = await getEventKitAdapter().loadRawEventKitData()
      const nextPermissions = {
        calendar: snapshot.integrationStatus.calendar,
        reminders: snapshot.integrationStatus.reminders,
      }

      set((s) => ({
        rawEventKit: {
          calendarEvents: nextPermissions.calendar === 'granted'
            ? snapshot.calendarEvents
            : s.rawEventKit.calendarEvents,
          reminders: nextPermissions.reminders === 'granted'
            ? snapshot.reminders
            : s.rawEventKit.reminders,
        },
        systemReminders: nextPermissions.reminders === 'granted'
          ? snapshot.systemReminders
          : s.systemReminders,
        integrationStatus: snapshot.integrationStatus,
        eventkitPermissions: nextPermissions,
      }))
    } catch (error) {
      // error handled by caller
    }
  },
}))
