import { create } from 'zustand'
import {
  getCurrentWindowLabel,
  isTauriRuntime,
} from '../lib/runtime'
import { showQuickCaptureWindow as openNativeQuickCaptureWindow } from '../lib/tauriCommands'
import type { AreaFilter, ViewKey } from '../types/app'

export interface UiStoreState {
  // 视图和筛选
  currentView: ViewKey
  activeArea: AreaFilter
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
}

export const useUiStore = create<UiStoreState>((set) => ({
  // 初始状态
  currentView: 'inbox',
  activeArea: 'ALL',
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
}))
