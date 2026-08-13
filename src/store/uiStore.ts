import { create } from 'zustand'
import { getRuntimeAdapter } from '../lib/runtimeAdapter'
import { showQuickCaptureWindow as openNativeQuickCaptureWindow } from '../lib/tauriCommands'
import type { AreaFilter, ViewKey } from '../types/app'

export type DrawerType = 'task' | 'goal' | 'reminder' | 'calendarEvent'

export interface DrawerState {
  type: DrawerType
  id?: string
}

export interface UiStoreState {
  // 视图和筛选
  currentView: ViewKey
  activeArea: AreaFilter
  showCompletedTodos: boolean

  // Theme selection
  theme: 'wabi-sabi' | 'liquid-glass'
  setTheme: (theme: 'wabi-sabi' | 'liquid-glass') => void

  // 备份目录
  backupDirectory: string | null
  setBackupDirectory: (dir: string | null) => void

  // 加载和状态消息
  isLoading: boolean
  statusMessage: string
  errorToast: string | null

  // 抽屉状态
  activeDrawer: DrawerState | null

  // 快速捕获
  isQuickCaptureOpen: boolean

  // 设置弹窗
  isSettingsOpen: boolean

  // Actions - 视图
  setView: (view: ViewKey) => void
  setActiveArea: (area: AreaFilter) => void
  setShowCompletedTodos: (value: boolean) => void

  // Actions - 状态
  setLoading: (value: boolean) => void
  setStatusMessage: (value: string) => void
  showErrorToast: (message: string) => void
  dismissErrorToast: () => void

  // Actions - 抽屉
  openDrawer: (type: DrawerType, id?: string) => void
  closeDrawer: () => void

  // 通用 drawer 查询
  isDrawerOpen: (type: DrawerType) => boolean
  selectedDrawerId: (type: DrawerType) => string | undefined

  // Actions - 快速捕获
  openQuickCapture: () => void
  closeQuickCapture: () => void

  // Actions - 设置
  openSettings: () => void
  closeSettings: () => void
  initBackupDirectory: () => Promise<void>
}

export const useUiStore = create<UiStoreState>((set, get) => ({
  // 初始状态
  currentView: 'inbox',
  activeArea: 'ALL',
  showCompletedTodos: false,
  theme: typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' ? (localStorage.getItem('kairos-theme') as 'wabi-sabi' | 'liquid-glass') || 'wabi-sabi' : 'wabi-sabi',
  backupDirectory: typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' ? localStorage.getItem('kairos-backup-dir') : null,
  isLoading: true,
  statusMessage: '',
  errorToast: null,
  activeDrawer: null,
  isQuickCaptureOpen: false,
  isSettingsOpen: false,

  // 视图操作
  setView: (view) => set({ currentView: view }),
  setActiveArea: (area) => set({ activeArea: area }),
  setShowCompletedTodos: (value) => set({ showCompletedTodos: value }),
  setTheme: (theme) => {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      localStorage.setItem('kairos-theme', theme)
    }
    set({ theme })
  },

  setBackupDirectory: (dir) => {
    if (typeof window !== 'undefined') {
      if (dir) localStorage.setItem('kairos-backup-dir', dir)
      else localStorage.removeItem('kairos-backup-dir')
    }
    set({ backupDirectory: dir })
  },

  // 状态操作
  setLoading: (value) => set({ isLoading: value }),
  setStatusMessage: (value) => set({ statusMessage: value }),
  showErrorToast: (message) => set({ errorToast: message }),
  dismissErrorToast: () => set({ errorToast: null }),

  // 抽屉操作
  openDrawer: (type, id) => set({ activeDrawer: { type, id } }),
  closeDrawer: () => set({ activeDrawer: null }),

  // 通用查询
  isDrawerOpen: (type) => get().activeDrawer?.type === type,
  selectedDrawerId: (type) => {
    const drawer = get().activeDrawer
    return drawer?.type === type ? drawer.id : undefined
  },

  // 快速捕获操作
  openQuickCapture: () => {
    const runtime = getRuntimeAdapter()
    if (runtime.isTauri() && runtime.getWindowLabel() !== 'quick-capture') {
      void openNativeQuickCaptureWindow()
        .then(() => set({ statusMessage: 'Quick capture ready' }))
        .catch((error) => {
          const message = `Unable to open quick capture · ${error instanceof Error ? error.message : String(error)}`
          set({
            statusMessage: message,
            errorToast: message,
          })
        })
      return
    }

    set({ isQuickCaptureOpen: true })
  },
  closeQuickCapture: () => set({ isQuickCaptureOpen: false }),

  // 设置操作
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),

  initBackupDirectory: async () => {
    const runtime = getRuntimeAdapter()
    if (!runtime.isTauri()) return

    const stored = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' ? localStorage.getItem('kairos-backup-dir') : null
    if (stored) {
      set({ backupDirectory: stored })
      return
    }

    try {
      const { homeDir, join } = await import('@tauri-apps/api/path')
      const home = await homeDir()
      const defaultDir = await join(home, '.kairos', 'backup')
      
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        localStorage.setItem('kairos-backup-dir', defaultDir)
      }
      set({ backupDirectory: defaultDir })
    } catch (e) {
      console.error('Failed to initialize default backup directory', e)
    }
  },
}))
