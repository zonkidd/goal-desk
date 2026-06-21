import { create } from 'zustand'
import {
  getCurrentWindowLabel,
  isTauriRuntime,
} from '../lib/runtime'
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

  // 加载和状态消息
  isLoading: boolean
  statusMessage: string

  // 抽屉状态（泛型化）
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

  // Actions - 抽屉（泛型化）
  openDrawer: (type: DrawerType, id?: string) => void
  closeDrawer: () => void

  // 向后兼容 selectors
  isTaskDrawerOpen: boolean
  selectedTaskId?: string
  isGoalDrawerOpen: boolean
  selectedGoalId?: string
  isReminderDrawerOpen: boolean
  selectedReminderId?: string
  isCalendarEventDrawerOpen: boolean
  selectedCalendarEventId?: string

  // 向后兼容 actions
  openTaskDrawer: (taskId: string) => void
  closeTaskDrawer: () => void
  openGoalDrawer: (goalId: string) => void
  closeGoalDrawer: () => void
  openReminderDrawer: (reminderId?: string) => void
  closeReminderDrawer: () => void
  openCalendarEventDrawer: (eventId: string) => void
  closeCalendarEventDrawer: () => void

  // 通用 drawer 查询
  isDrawerOpen: (type: DrawerType) => boolean
  selectedDrawerId: (type: DrawerType) => string | undefined

  // Actions - 快速捕获
  openQuickCapture: () => void
  closeQuickCapture: () => void
}

function deriveDrawerFlags(activeDrawer: DrawerState | null) {
  return {
    isTaskDrawerOpen: activeDrawer?.type === 'task',
    selectedTaskId: activeDrawer?.type === 'task' ? activeDrawer.id : undefined,
    isGoalDrawerOpen: activeDrawer?.type === 'goal',
    selectedGoalId: activeDrawer?.type === 'goal' ? activeDrawer.id : undefined,
    isReminderDrawerOpen: activeDrawer?.type === 'reminder',
    selectedReminderId: activeDrawer?.type === 'reminder' ? activeDrawer.id : undefined,
    isCalendarEventDrawerOpen: activeDrawer?.type === 'calendarEvent',
    selectedCalendarEventId: activeDrawer?.type === 'calendarEvent' ? activeDrawer.id : undefined,
  }
}

export const useUiStore = create<UiStoreState>((set, get) => ({
  // 初始状态
  currentView: 'inbox',
  activeArea: 'ALL',
  showCompletedTodos: false,
  isLoading: true,
  statusMessage: '',
  activeDrawer: null,
  isQuickCaptureOpen: false,

  // 向后兼容初始值
  ...deriveDrawerFlags(null),

  // 视图操作
  setView: (view) => set({ currentView: view }),
  setActiveArea: (area) => set({ activeArea: area }),
  setShowCompletedTodos: (value) => set({ showCompletedTodos: value }),

  // 状态操作
  setLoading: (value) => set({ isLoading: value }),
  setStatusMessage: (value) => set({ statusMessage: value }),

  // 泛型化抽屉操作
  openDrawer: (type, id) => set((state) => {
    const activeDrawer: DrawerState = { type, id }
    return { activeDrawer, ...deriveDrawerFlags(activeDrawer) }
  }),
  closeDrawer: () => set((state) => {
    const activeDrawer = null
    return { activeDrawer, ...deriveDrawerFlags(activeDrawer) }
  }),

  // 向后兼容 actions
  openTaskDrawer: (taskId) => get().openDrawer('task', taskId),
  closeTaskDrawer: () => get().closeDrawer(),
  openGoalDrawer: (goalId) => get().openDrawer('goal', goalId),
  closeGoalDrawer: () => get().closeDrawer(),
  openReminderDrawer: (reminderId) => get().openDrawer('reminder', reminderId),
  closeReminderDrawer: () => get().closeDrawer(),
  openCalendarEventDrawer: (eventId) => get().openDrawer('calendarEvent', eventId),
  closeCalendarEventDrawer: () => get().closeDrawer(),

  // 通用查询
  isDrawerOpen: (type) => get().activeDrawer?.type === type,
  selectedDrawerId: (type) => {
    const drawer = get().activeDrawer
    return drawer?.type === type ? drawer.id : undefined
  },

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
