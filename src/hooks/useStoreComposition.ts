import { useEffect } from 'react'
import { useUiStore } from '../store/uiStore'
import { useTaskStore } from '../store/taskStore'
import { useGoalStore } from '../store/goalStore'
import { useEventkitStore } from '../store/eventkitStore'
import { useDerivedStore } from '../store/derivedStore'
import { computeSnapshot, type AtomicState } from '../lib/WorkspaceEngine'
import { isTauriRuntime } from '../lib/runtime'
import { loadDesktopSnapshot } from '../lib/desktopSnapshot'
import type { Task } from '../types/task'

function collectAtomicState(): AtomicState {
  const taskStore = useTaskStore.getState()
  const goalStore = useGoalStore.getState()
  const eventkitStore = useEventkitStore.getState()
  const uiStore = useUiStore.getState()

  return {
    baseTimeline: eventkitStore.rawTimeline,
    baseGoals: goalStore.baseGoals,
    tasks: taskStore.tasks,
    activeArea: uiStore.activeArea,
    showCompletedTodos: uiStore.showCompletedTodos,
  }
}

function computeAndUpdate() {
  const atomicState = collectAtomicState()
  const snapshot = computeSnapshot(atomicState)

  const derived = useDerivedStore.getState()
  derived.updateTodayFocusTasks(snapshot.today.focusTasks)
  derived.updateTodayAttentionGroups(snapshot.today.attentionGroups)
  derived.updateTodayTimeline(snapshot.today.timeline)
  derived.updateInbox(snapshot.inbox)
  derived.updateTodayRelevantGoals(snapshot.today.relevantGoals)
}

export function useDerivedStateSync() {
  useEffect(() => {
    const unsubTasks = useTaskStore.subscribe((state, prevState) => {
      if (state.tasks !== prevState.tasks) {
        computeAndUpdate()
      }
    })

    const unsubGoals = useGoalStore.subscribe((state, prevState) => {
      if (state.baseGoals !== prevState.baseGoals) {
        computeAndUpdate()
      }
    })

    const unsubArea = useUiStore.subscribe((state, prevState) => {
      if (state.activeArea !== prevState.activeArea) {
        computeAndUpdate()
      }
    })

    const unsubCompleted = useUiStore.subscribe((state, prevState) => {
      if (state.showCompletedTodos !== prevState.showCompletedTodos) {
        computeAndUpdate()
      }
    })

    return () => {
      unsubTasks()
      unsubGoals()
      unsubArea()
      unsubCompleted()
    }
  }, [])
}

export function useTodayViewModel() {
  const tasks = useDerivedStore((s) => s.todayFocusTasks)
  const attentionGroups = useDerivedStore((s) => s.todayAttentionGroups)
  const goals = useDerivedStore((s) => s.todayRelevantGoals)
  const timeline = useDerivedStore((s) => s.todayTimeline)

  return { tasks, attentionGroups, goals, timeline }
}

export function useInboxViewModel() {
  const inbox = useDerivedStore((s) => s.inbox)
  const showCompletedTodos = useUiStore((s) => s.showCompletedTodos)

  return { inbox, showCompletedTodos }
}

export function useAppHydration() {
  const hydrateGoals = useGoalStore((s) => s.hydrateGoals)
  const hydrateTasks = useTaskStore((s) => s.hydrateTasks)
  const hydrateEventkitData = useEventkitStore((s) => s.hydrateEventkitData)
  const setStatusMessage = useUiStore((s) => s.setStatusMessage)

  return (payload: {
    tasks: Task[]
    timeline: any[]
    goals: any[]
    systemReminders: any[]
    integrationStatus: any
    statusMessage: string
  }) => {
    hydrateTasks(payload.tasks)
    hydrateGoals(payload.goals)
    hydrateEventkitData({
      timeline: payload.timeline,
      systemReminders: payload.systemReminders,
      integrationStatus: payload.integrationStatus,
    })
    setStatusMessage(payload.statusMessage)

    computeAndUpdate()
  }
}

export function useReceiveExternalTask() {
  const replaceTask = useTaskStore((s) => s.replaceTask)
  const setStatusMessage = useUiStore((s) => s.setStatusMessage)

  return (task: Task) => {
    replaceTask(task)
    computeAndUpdate()
    setStatusMessage('Quick capture synced')
  }
}

export function useToggleSystemReminder() {
  const toggleReminder = useEventkitStore((s) => s.toggleSystemReminderDone)
  const syncTasks = useTaskStore((s) => s.syncTasksForSystemReminder)

  return async (reminderId: string, done: boolean) => {
    const updatedReminder = await toggleReminder(reminderId, done)
    if (updatedReminder && isTauriRuntime()) {
      syncTasks(reminderId, updatedReminder.done)
      computeAndUpdate()
    }
  }
}

export function useReloadWorkspaceAfterAreaChange() {
  const hydrateApp = useAppHydration()
  const setStatusMessage = useUiStore((s) => s.setStatusMessage)

  return async (statusMessage?: string) => {
    if (isTauriRuntime()) {
      const snapshot = await loadDesktopSnapshot()
      await hydrateApp({
        goals: snapshot.goals,
        timeline: snapshot.timeline,
        tasks: snapshot.tasks,
        systemReminders: snapshot.systemReminders,
        integrationStatus: snapshot.integrationStatus,
        statusMessage: statusMessage || '',
      })
    }
  }
}

export function useWorkspaceSnapshot() {
  const atomicState = collectAtomicState()
  return computeSnapshot(atomicState)
}
