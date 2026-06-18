import { create } from 'zustand'
import {
  getCurrentWindowLabel,
  isTauriRuntime,
  showQuickCaptureWindow as openNativeQuickCaptureWindow,
} from '../lib/desktopApi'
import { createWorkspaceMutationAdapter } from '../lib/workspaceMutations'
import type { AreaFilter, AreaWithStats, ViewKey } from '../types/app'

export interface UiStoreState {
  // 视图和筛选
  currentView: ViewKey
  activeArea: AreaFilter
  allAreas: AreaWithStats[]
  showCompletedTodos: boolean

  // 加载和状态消息
  isLoading: boolean
  statusMessage: string

  // 抽屉状态
  isTaskDrawerOpen: boolean
  selectedTaskId?: string
  isGoalDrawerOpen: boolean
  selectedGoalId?: string
  isReminderDrawerOpen: boolean
  selectedReminderId?: string
  isCalendarEventDrawerOpen: boolean
  selectedCalendarEventId?: string

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
  openTaskDrawer: (taskId: string) => void
  closeTaskDrawer: () => void
  openGoalDrawer: (goalId: string) => void
  closeGoalDrawer: () => void
  openReminderDrawer: (reminderId?: string) => void
  closeReminderDrawer: () => void
  openCalendarEventDrawer: (eventId: string) => void
  closeCalendarEventDrawer: () => void

  // Actions - 快速捕获
  openQuickCapture: () => void
  closeQuickCapture: () => void

  // Actions - 领域管理
  loadAreas: () => Promise<void>
  createArea: (title: string) => Promise<void>
  renameArea: (areaId: string, newTitle: string) => Promise<void>
  deleteArea: (areaId: string, force?: boolean) => Promise<void>
}

export const useUiStore = create<UiStoreState>((set, get) => ({
  // 初始状态
  currentView: 'inbox',
  activeArea: 'ALL',
  allAreas: [],
  showCompletedTodos: false,
  isLoading: true,
  statusMessage: '',
  isTaskDrawerOpen: false,
  isGoalDrawerOpen: false,
  isReminderDrawerOpen: false,
  isCalendarEventDrawerOpen: false,
  isQuickCaptureOpen: false,

  // 视图操作
  setView: (view) => set({ currentView: view }),
  setActiveArea: (area) => set({ activeArea: area }),
  setShowCompletedTodos: (value) => set({ showCompletedTodos: value }),

  // 状态操作
  setLoading: (value) => set({ isLoading: value }),
  setStatusMessage: (value) => set({ statusMessage: value }),

  // 抽屉操作
  openTaskDrawer: (taskId) => set({ selectedTaskId: taskId, isTaskDrawerOpen: true }),
  closeTaskDrawer: () => set({ isTaskDrawerOpen: false }),
  openGoalDrawer: (goalId) => set({ selectedGoalId: goalId, isGoalDrawerOpen: true }),
  closeGoalDrawer: () => set({ isGoalDrawerOpen: false }),
  openReminderDrawer: (reminderId) => set({ selectedReminderId: reminderId, isReminderDrawerOpen: true }),
  closeReminderDrawer: () => set({ isReminderDrawerOpen: false, selectedReminderId: undefined }),
  openCalendarEventDrawer: (eventId) => set({ selectedCalendarEventId: eventId, isCalendarEventDrawerOpen: true }),
  closeCalendarEventDrawer: () => set({ isCalendarEventDrawerOpen: false }),

  // 快速捕获操作
  openQuickCapture: () => {
    if (isTauriRuntime() && getCurrentWindowLabel() !== 'quick-capture') {
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

  // 领域管理
  loadAreas: async () => {
    const adapter = createWorkspaceMutationAdapter()
    try {
      const { areas, statusMessage } = await adapter.listAreas()

      set({
        allAreas: areas || [],
        statusMessage: statusMessage || '',
      })
    } catch (error) {
      set({
        statusMessage: `Unable to load areas · ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  },
  createArea: async (title) => {
    const adapter = createWorkspaceMutationAdapter()
    try {
      const { area, statusMessage } = await adapter.createArea(title)
      if (area) {
        set((state) => {
          const withoutDuplicate = state.allAreas.filter((a) => a.id !== area.id && a.title !== area.title)
          return {
            allAreas: [...withoutDuplicate, area].sort((a, b) => a.title.localeCompare(b.title)),
            statusMessage: statusMessage || '',
          }
        })
      }
    } catch (error) {
      set({ statusMessage: `Unable to create area · ${error instanceof Error ? error.message : String(error)}` })
    }
  },
  renameArea: async (areaId, newTitle) => {
    const adapter = createWorkspaceMutationAdapter()
    try {
      const { area, statusMessage } = await adapter.renameArea(areaId, newTitle)
      if (area) {
        set((state) => ({
          allAreas: state.allAreas.map((a) => (a.id === areaId ? { ...a, title: area.title } : a)).sort((a, b) => a.title.localeCompare(b.title)),
          statusMessage: statusMessage || '',
        }))
      }
    } catch (error) {
      set({ statusMessage: `Unable to rename area · ${error instanceof Error ? error.message : String(error)}` })
    }
  },
  deleteArea: async (areaId, force = false) => {
    const adapter = createWorkspaceMutationAdapter()
    try {
      const { success, message, statusMessage } = await adapter.deleteArea(areaId, force)
      if (success) {
        set((state) => ({
          allAreas: state.allAreas.filter((a) => a.id !== areaId),
          statusMessage: statusMessage || '',
        }))
      } else {
        set({ statusMessage: message })
      }
    } catch (error) {
      set({ statusMessage: `Unable to delete area · ${error instanceof Error ? error.message : String(error)}` })
    }
  },
}))
