import { listen } from '@tauri-apps/api/event'
import { useEffect } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { AppShell } from './components/shell/AppShell'
import { QuickCaptureWindow } from './components/modal/QuickCaptureWindow'
import { getRuntimeAdapter } from './lib/runtimeAdapter'
import { loadDesktopSnapshot } from './lib/desktopSnapshot'
import { loadBrowserData } from './lib/browserCodec'
import { getRuntimeModeStatusMessage } from './lib/taskPresentation'
import { TaskCodec, type RustTask } from './lib/codecs'
import { useUiStore } from './store/uiStore'
import { useAreaStore } from './store/areaStore'
import { useAppHydration, useGoalAreaBridge, useReceiveExternalTask, useTaskGoalBridge } from './hooks/useStoreComposition'

function MainApp() {
  const hydrateApp = useAppHydration()
  const receiveExternalTask = useReceiveExternalTask()
  const setLoading = useUiStore((state) => state.setLoading)
  const setStatusMessage = useUiStore((state) => state.setStatusMessage)
  const theme = useUiStore((state) => state.theme)
  useTaskGoalBridge()
  useGoalAreaBridge()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const runtime = getRuntimeAdapter()
    if (!runtime.isTauri() || runtime.getWindowLabel() !== 'main') return

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
    const runtime = getRuntimeAdapter()
    if (!runtime.isTauri() || runtime.getWindowLabel() !== 'main') return

    const unlisten = listen<RustTask>('desk-task-created', (event) => {
      const task = TaskCodec.fromRust(event.payload)
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

    if (!getRuntimeAdapter().isTauri()) {
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

        // 初始化 allAreas 和 backup directory
        void useUiStore.getState().initBackupDirectory()
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
  }, [hydrateApp, setLoading])

  return <AppShell />
}

export default function App() {
  const runtime = getRuntimeAdapter()
  if (runtime.isTauri() && runtime.getWindowLabel() === 'quick-capture') {
    return <QuickCaptureWindow />
  }

  return <MainApp />
}
