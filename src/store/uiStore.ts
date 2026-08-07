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

  // 加载和状态消息
  isLoading: boolean
  statusMessage: string

  // 抽屉状态
  activeDrawer: DrawerState | null

  // 快速捕获
  isQuickCaptureOpen: boolean

  // Actions - 视图
  setView: (view: ViewKey) => void
  setActiveArea: (area: AreaFilter) => void
  setShowCompletedTodos: (value: boolean) => void

  // Actions - 状态
  setLoading: (value: boolean) => void
  setStatusMessage: (value: string) => void

  // Actions - 抽屉
  openDrawer: (type: DrawerType, id?: string) => void
  closeDrawer: () => void

  // 通用 drawer 查询
  isDrawerOpen: (type: DrawerType) => boolean
  selectedDrawerId: (type: DrawerType) => string | undefined

  // Actions - 快速捕获
  openQuickCapture: () => void
  closeQuickCapture: () => void
}

export const useUiStore = create<UiStoreState>((set, get) => ({
  // 初始状态
  currentView: 'inbox',
  activeArea: 'ALL',
  showCompletedTodos: false,
  theme: typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' ? (localStorage.getItem('kairos-theme') as 'wabi-sabi' | 'liquid-glass') || 'wabi-sabi' : 'wabi-sabi',
  isLoading: true,
  statusMessage: '',
  activeDrawer: null,
  isQuickCaptureOpen: false,

  // 视图操作
  setView: (view) => set({ currentView: view }),
  setActiveArea: (area) => set({ activeArea: area }),
  setShowCompletedTodos: (value) => set({ showCompletedTodos: value }),
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kairos-theme', theme)
    }
    set({ theme })
  },

  // 状态操作
  setLoading: (value) => set({ isLoading: value }),
  setStatusMessage: (value) => set({ statusMessage: value }),

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
        .catch((error) =>
          set({
            statusMessage: `Unable to open quick capture · ${error instanceof Error ? error.message : String(error)}`,
          }),
        )
      return
    }

    set({ isQuickCaptureOpen: true })
  },
  closeQuickCapture: () => set({ isQuickCaptureOpen: false }),
}))
