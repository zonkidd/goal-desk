import { useSyncExternalStore } from 'react'
import { useTaskStore } from '../store/taskStore'
import { useGoalStore } from '../store/goalStore'
import { useUiStore } from '../store/uiStore'
import { useEventkitStore } from '../store/eventkitStore'
import type { WorkspaceSnapshot } from '../lib/WorkspaceEngine'
import { createWorkspaceDeriver } from './workspaceDeriver'

const emptySnapshot: WorkspaceSnapshot = {
  goals: [],
  today: {
    timeline: [],
    focusTasks: [],
    attentionGroups: { overdue: [], dueToday: [], ongoing: [], systemReminders: [] },
    relevantGoals: [],
  },
  inbox: {
    activeTasks: [],
    pausedTasks: [],
    completed: { totalCount: 0, visibleTasks: [], isCollapsedByDefault: true },
  },
  meta: { computedAt: new Date(), activeArea: 'ALL', taskCount: 0, goalCount: 0 },
}

let version = 0
const listeners = new Set<() => void>()
let snapshot = emptySnapshot
let computing = false

function readEventKitSource() {
  const eventkitState = useEventkitStore.getState()
  return {
    calendarEvents: eventkitState.rawEventKit.calendarEvents,
    reminders: eventkitState.rawEventKit.reminders,
    systemReminders: eventkitState.systemReminders,
  }
}

function recompute() {
  if (computing) return
  computing = true
  try {
    const deriver = createWorkspaceDeriver({
      getTasks: () => useTaskStore.getState().tasks,
      getBaseGoals: () => useGoalStore.getState().baseGoals,
      getActiveArea: () => useUiStore.getState().activeArea,
      getShowCompletedTodos: () => useUiStore.getState().showCompletedTodos,
      getEventKitSource: readEventKitSource,
    })

    snapshot = deriver.compute()
    version++
    listeners.forEach((l) => l())
  } finally {
    computing = false
  }
}

let unsubscribed = false
let unsubscribeTasks: (() => void) | null = null
let unsubscribeGoals: (() => void) | null = null
let unsubscribeArea: (() => void) | null = null
let unsubscribeCompleted: (() => void) | null = null
let unsubscribeEventkit: (() => void) | null = null

function ensureSubscriptions() {
  if (unsubscribeTasks) return
  unsubscribeTasks = useTaskStore.subscribe((s, p) => {
    if (s.tasks !== p.tasks) recompute()
  })
  unsubscribeGoals = useGoalStore.subscribe((s, p) => {
    if (s.baseGoals !== p.baseGoals) recompute()
  })
  unsubscribeArea = useUiStore.subscribe((s, p) => {
    if (s.activeArea !== p.activeArea) recompute()
  })
  unsubscribeCompleted = useUiStore.subscribe((s, p) => {
    if (s.showCompletedTodos !== p.showCompletedTodos) recompute()
  })
  unsubscribeEventkit = useEventkitStore.subscribe((s, p) => {
    if (s.rawEventKit !== p.rawEventKit || s.systemReminders !== p.systemReminders) recompute()
  })
}

function subscribe(callback: () => void): () => void {
  ensureSubscriptions()
  listeners.add(callback)
  return () => { listeners.delete(callback) }
}

function getSnapshot(): WorkspaceSnapshot {
  return snapshot
}

function getServerSnapshot(): WorkspaceSnapshot {
  return emptySnapshot
}

export function useWorkspaceDerived(): WorkspaceSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function useTodayFocusTasks() {
  return useWorkspaceDerived().today.focusTasks
}

export function useTodayAttentionGroups() {
  return useWorkspaceDerived().today.attentionGroups
}

export function useTodayTimeline() {
  return useWorkspaceDerived().today.timeline
}

export function useInboxGroups() {
  return useWorkspaceDerived().inbox
}

export function useTodayRelevantGoals() {
  return useWorkspaceDerived().today.relevantGoals
}

export function useDerivedGoals() {
  return useWorkspaceDerived().goals
}
