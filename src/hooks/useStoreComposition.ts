import { useUiStore } from '../store/uiStore'
import { useTaskStore } from '../store/taskStore'
import { useGoalStore } from '../store/goalStore'
import { useEventkitStore } from '../store/eventkitStore'
import { getRuntimeAdapter } from '../lib/runtimeAdapter'
import { loadDesktopSnapshot } from '../lib/desktopSnapshot'
import type { HydratePayload } from '../store/appStore.types'
import type { Task } from '../types/task'

export function useAppHydration() {
  const hydrateGoals = useGoalStore((s) => s.hydrateGoals)
  const hydrateTasks = useTaskStore((s) => s.hydrateTasks)
  const hydrateEventkitData = useEventkitStore((s) => s.hydrateEventkitData)
  const setStatusMessage = useUiStore((s) => s.setStatusMessage)

  return (payload: HydratePayload) => {
    hydrateTasks(payload.tasks)
    hydrateGoals(payload.goals)
    hydrateEventkitData({
      rawEventKit: payload.rawEventKit,
      systemReminders: payload.systemReminders,
      integrationStatus: payload.integrationStatus,
    })
    setStatusMessage(payload.statusMessage)
  }
}

export function useReceiveExternalTask() {
  const replaceTask = useTaskStore((s) => s.replaceTask)
  const setStatusMessage = useUiStore((s) => s.setStatusMessage)

  return (task: Task) => {
    replaceTask(task)
    setStatusMessage('Quick capture synced')
  }
}

export function useToggleSystemReminder() {
  const toggleReminder = useEventkitStore((s) => s.toggleSystemReminderDone)
  const syncTasks = useTaskStore((s) => s.syncTasksForSystemReminder)

  return async (reminderId: string, done: boolean) => {
    const updatedReminder = await toggleReminder(reminderId, done)
    if (updatedReminder && getRuntimeAdapter().isTauri()) {
      syncTasks(reminderId, updatedReminder.done)
    }
  }
}

export function useReloadWorkspaceAfterAreaChange() {
  const hydrateApp = useAppHydration()
  const setStatusMessage = useUiStore((s) => s.setStatusMessage)

  return async (statusMessage?: string) => {
    if (getRuntimeAdapter().isTauri()) {
      const snapshot = await loadDesktopSnapshot()
      await hydrateApp({
        goals: snapshot.goals,
        rawEventKit: snapshot.rawEventKit,
        tasks: snapshot.tasks,
        systemReminders: snapshot.rawEventKit.systemReminders,
        integrationStatus: snapshot.rawEventKit.integrationStatus,
        statusMessage: statusMessage || '',
      })
    }
  }
}
