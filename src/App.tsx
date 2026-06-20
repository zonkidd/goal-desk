import { listen } from '@tauri-apps/api/event'
import { useEffect } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { AppShell } from './components/shell/AppShell'
import { QuickCaptureWindow } from './components/modal/QuickCaptureWindow'
import { getCurrentWindowLabel, isTauriRuntime } from './lib/runtime'
import { loadDesktopSnapshot } from './lib/desktopSnapshot'
import { getRuntimeModeStatusMessage } from './lib/taskPresentation'
import { useUiStore } from './store/uiStore'
import { useAreaStore } from './store/areaStore'
import { useDerivedStateSync, useAppHydration, useReceiveExternalTask } from './hooks/useStoreComposition'
import type { Task } from './types/task'
import type { GoalCard } from './types/app'
import type { AreaWithStats } from './types/app'

// Browser mode localStorage keys
const BROWSER_STORAGE_TASKS = 'goal-desk-browser-tasks'
const BROWSER_STORAGE_GOALS = 'goal-desk-browser-goals'

function loadBrowserData() {
  try {
    const tasksData = localStorage.getItem(BROWSER_STORAGE_TASKS)
    const goalsData = localStorage.getItem(BROWSER_STORAGE_GOALS)

    const tasks: Task[] = tasksData ? JSON.parse(tasksData) : []
    const goals: GoalCard[] = goalsData ? JSON.parse(goalsData) : []

    // Convert timestamp strings back to Date objects
    tasks.forEach(task => {
      if (task.activityLogs) {
        task.activityLogs = task.activityLogs.map(log => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }))
      }
      if (task.plannedStartAt) task.plannedStartAt = new Date(task.plannedStartAt)
      if (task.dueDate) task.dueDate = new Date(task.dueDate)
      if (task.createdAt) task.createdAt = new Date(task.createdAt)
      if (task.updatedAt) task.updatedAt = new Date(task.updatedAt)
    })

    goals.forEach(goal => {
      if (goal.createdAt) goal.createdAt = new Date(goal.createdAt)
      if (goal.updatedAt) goal.updatedAt = new Date(goal.updatedAt)
    })

    return { tasks, goals }
  } catch {
    return { tasks: [], goals: [] }
  }
}

function MainApp() {
  // 初始化多 store 架构的同步
  useDerivedStateSync()

  // 使用新架构的 hooks
  const hydrateApp = useAppHydration()
  const receiveExternalTask = useReceiveExternalTask()
  const setLoading = useUiStore((state) => state.setLoading)
  const setStatusMessage = useUiStore((state) => state.setStatusMessage)

  useEffect(() => {
    if (!isTauriRuntime() || getCurrentWindowLabel() !== 'main') return

    const currentWindow = getCurrentWindow()
    const cleanup = currentWindow.onCloseRequested(async (event) => {
      event.preventDefault()
      await currentWindow.hide()
    })

    return () => {
      void cleanup.then((unlisten) => unlisten())
    }
  }, [])

  useEffect(() => {
    if (!isTauriRuntime() || getCurrentWindowLabel() !== 'main') return

    const unlisten = listen<{
      id: string
      title: string
      content: string
      status: Task['status']
      plannedStartAt?: string
      dueAt?: string
      showInTimeline: boolean
      linkedGoalId?: string
      linkedGoalLabel?: string
      bearNoteId?: string
      systemReminderId?: string
      activityLogs: Array<{
        action: Task['activityLogs'][0]['action']
        note?: string
        timestamp: string
      }>
    }>('desk-task-created', (event) => {
      const payload = event.payload
      const task: Task = {
        id: payload.id,
        title: payload.title,
        content: payload.content,
        status: payload.status,
        plannedStartAt: payload.plannedStartAt ? new Date(payload.plannedStartAt) : undefined,
        dueDate: payload.dueAt ? new Date(payload.dueAt) : undefined,
        showInTimeline: payload.showInTimeline,
        linkedGoalId: payload.linkedGoalId,
        linkedGoalLabel: payload.linkedGoalLabel,
        bearNoteId: payload.bearNoteId,
        systemReminderId: payload.systemReminderId,
        activityLogs: payload.activityLogs.map((log) => ({
          action: log.action,
          note: log.note,
          timestamp: new Date(log.timestamp),
        })),
      }
      receiveExternalTask(task)
    })

    return () => {
      void unlisten.then((cleanup) => cleanup())
    }
  }, [receiveExternalTask])

  useEffect(() => {
    hydrateApp({
      tasks: [],
      timeline: [],
      goals: [],
      systemReminders: [],
      integrationStatus: {
        calendar: 'not_determined',
        reminders: 'not_determined',
      },
      statusMessage: 'Loading workspace...',
    })

    if (!isTauriRuntime()) {
      // Browser mode: load from localStorage
      const { tasks, goals } = loadBrowserData()
      hydrateApp({
        tasks,
        timeline: [],
        goals,
        systemReminders: [],
        integrationStatus: {
          calendar: 'not_determined',
          reminders: 'not_determined',
        },
        statusMessage: getRuntimeModeStatusMessage(false),
      })

      // Load areas from localStorage
      void useAreaStore.getState().loadAreas()

      setLoading(false)
      return
    }

    void loadDesktopSnapshot()
      .then(({ tasks, timeline, goals, systemReminders, integrationStatus }) => {
        hydrateApp({
          tasks,
          timeline,
          goals,
          systemReminders,
          integrationStatus,
          statusMessage: getRuntimeModeStatusMessage(true),
        })

        // 初始化 allAreas
        return useAreaStore.getState().loadAreas()
      })
      .catch((error) => {
        hydrateApp({
          tasks: [],
          timeline: [],
          goals: [],
          systemReminders: [],
          integrationStatus: {
            calendar: 'error',
            reminders: 'error',
          },
          statusMessage: `Unable to load workspace · ${error instanceof Error ? error.message : String(error)}`,
        })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [hydrateApp, setLoading, setStatusMessage])

  return <AppShell />
}

export default function App() {
  if (isTauriRuntime() && getCurrentWindowLabel() === 'quick-capture') {
    return <QuickCaptureWindow />
  }

  return <MainApp />
}
