import { listen } from '@tauri-apps/api/event'
import { useEffect } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { AppShell } from './components/shell/AppShell'
import { QuickCaptureWindow } from './components/modal/QuickCaptureWindow'
import { getCurrentWindowLabel, isTauriRuntime, loadDesktopSnapshot, normalizeTask, type TaskCommandItem } from './lib/desktopApi'
import { getRuntimeModeStatusMessage } from './lib/taskPresentation'
import { mockGoals, mockTasks, mockTimelineItems } from './mock/prototypeData'
import { useAppStore } from './store/appStore'

function MainApp() {
  const hydrateApp = useAppStore((state) => state.hydrateApp)
  const receiveExternalTask = useAppStore((state) => state.receiveExternalTask)
  const setLoading = useAppStore((state) => state.setLoading)
  const setStatusMessage = useAppStore((state) => state.setStatusMessage)

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

    const unlisten = listen<TaskCommandItem>('desk-task-created', (event) => {
      receiveExternalTask(normalizeTask(event.payload))
    })

    return () => {
      void unlisten.then((cleanup) => cleanup())
    }
  }, [receiveExternalTask])

  useEffect(() => {
    hydrateApp({
      tasks: mockTasks,
      timeline: mockTimelineItems,
      goals: mockGoals,
      systemReminders: [],
      integrationStatus: {
        calendar: 'not_determined',
        reminders: 'not_determined',
      },
      statusMessage: 'Loading prototype workspace...',
    })

    if (!isTauriRuntime()) {
      setStatusMessage(getRuntimeModeStatusMessage(false))
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
      })
      .catch((error) => {
        setStatusMessage(`Fallback demo data · ${error instanceof Error ? error.message : String(error)}`)
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
