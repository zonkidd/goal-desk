import { listen } from '@tauri-apps/api/event'
import { useEffect } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { AppShell } from './components/shell/AppShell'
import { QuickCaptureWindow } from './components/modal/QuickCaptureWindow'
import { getCurrentWindowLabel, isTauriRuntime } from './lib/runtime'
import { loadDesktopSnapshot } from './lib/desktopSnapshot'
import { loadBrowserData } from './lib/browserCodec'
import { getRuntimeModeStatusMessage } from './lib/taskPresentation'
import { useUiStore } from './store/uiStore'
import { useAreaStore } from './store/areaStore'
import { useAppHydration, useReceiveExternalTask } from './hooks/useStoreComposition'
import type { Task } from './types/task'

function MainApp() {
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
      .then(({ tasks, rawEventKit, goals }) => {
        hydrateApp({
          tasks,
          rawEventKit,
          goals,
          systemReminders: rawEventKit.systemReminders,
          integrationStatus: rawEventKit.integrationStatus,
          statusMessage: getRuntimeModeStatusMessage(true),
        })

        // 初始化 allAreas
        return useAreaStore.getState().loadAreas()
      })
      .catch((error) => {
        hydrateApp({
          tasks: [],
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
