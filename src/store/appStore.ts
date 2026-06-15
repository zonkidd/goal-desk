import { create } from 'zustand'
import {
  getCurrentWindowLabel,
  isTauriRuntime,
  setSystemReminderCompleted as persistSystemReminderCompleted,
  showQuickCaptureWindow as openNativeQuickCaptureWindow,
  requestCalendarAccess as apiRequestCalendarAccess,
  requestRemindersAccess as apiRequestRemindersAccess,
  fetchCalendarEvents,
  fetchReminders,
  type AuthorizationStatus,
} from '../lib/desktopApi'
import { PermissionManager, type PermissionType } from '../lib/PermissionManager'
import { getRuntimeModeStatusMessage } from '../lib/taskPresentation'
import {
  BROWSER_PREVIEW_STATUS,
  createBrowserTaskNote,
  createWorkspaceMutationAdapter,
} from '../lib/workspaceMutations'
import { logActionForTransition } from '../lib/taskPresentation'
import { DerivedStateManager, type ChangeType } from '../lib/DerivedStateManager'
import { StateProducer } from '../lib/StateProducer'
import type { AreaFilter, AreaOption, AreaWithStats, GoalCard, GoalStatus, IntegrationStatus, ReminderItem, TimelineItem, ViewKey } from '../types/app'
import type { Task, TaskActivityAction, TaskStatus } from '../types/task'
import type { InboxTaskGroups, TodayAttentionGroups, TodayRelevantGoal } from '../lib/workspaceDerivation'

interface HydratePayload {
  tasks: Task[]
  timeline: TimelineItem[]
  goals: GoalCard[]
  systemReminders: ReminderItem[]
  integrationStatus: IntegrationStatus
  statusMessage: string
}

export interface AppStoreState {
  currentView: ViewKey
  activeArea: AreaFilter
  allAreas: AreaWithStats[]
  tasks: Task[]
  todayFocusTasks: Task[]
  todayAttentionGroups: TodayAttentionGroups
  todayRelevantGoals: TodayRelevantGoal[]
  timeline: TimelineItem[]
  inbox: InboxTaskGroups
  showCompletedTodos: boolean
  baseTimeline: TimelineItem[]
  goals: GoalCard[]
  baseGoals: GoalCard[]
  systemReminders: ReminderItem[]
  integrationStatus: IntegrationStatus
  eventkitPermissions: {
    calendar: AuthorizationStatus
    reminders: AuthorizationStatus
  }
  eventkitData: {
    calendarEventCount: number
    reminderCount: number
  }
  selectedTaskId?: string
  selectedGoalId?: string
  selectedReminderId?: string
  statusMessage: string
  isLoading: boolean
  isTaskDrawerOpen: boolean
  isGoalDrawerOpen: boolean
  isReminderDrawerOpen: boolean
  isCalendarEventDrawerOpen: boolean
  selectedCalendarEventId?: string
  isQuickCaptureOpen: boolean
  setView: (view: ViewKey) => void
  setActiveArea: (area: AreaFilter) => void
  hydrateApp: (payload: HydratePayload) => void
  setLoading: (value: boolean) => void
  setStatusMessage: (value: string) => void
  receiveExternalTask: (task: Task) => void
  openTaskDrawer: (taskId: string) => void
  closeTaskDrawer: () => void
  openGoalDrawer: (goalId: string) => void
  closeGoalDrawer: () => void
  openReminderDrawer: (reminderId?: string) => void
  closeReminderDrawer: () => void
  openCalendarEventDrawer: (eventId: string) => void
  closeCalendarEventDrawer: () => void
  openQuickCapture: () => void
  closeQuickCapture: () => void
  setShowCompletedTodos: (value: boolean) => void
  addTask: (title: string) => Promise<void>
  createGoal: (
    input: { title: string; area?: string; description?: string },
    options?: { openGoalWorkspace?: boolean },
  ) => Promise<string | undefined>
  updateGoalFields: (goalId: string, input: { title: string; area: string; description: string }) => Promise<void>
  updateGoalStatus: (goalId: string, status: GoalStatus) => Promise<void>
  createTaskForGoal: (goalId: string, title: string) => Promise<void>
  addTaskNote: (taskId: string, note: string) => Promise<void>
  updateTaskStatus: (taskId: string, status: TaskStatus, note?: string) => Promise<void>
  updateTaskContent: (taskId: string, content: string) => Promise<void>
  updateTaskFields: (
    taskId: string,
    input: {
      title: string
      plannedStartAt?: Date
      dueDate?: Date
      linkedGoalId?: string
      linkedGoalLabel?: string
      showInTimeline?: boolean
    },
  ) => Promise<void>
  toggleSystemReminderDone: (reminderId: string, done: boolean) => Promise<void>
  loadAreas: () => Promise<void>
  createArea: (title: string) => Promise<void>
  renameArea: (areaId: string, newTitle: string) => Promise<void>
  deleteArea: (areaId: string, force?: boolean) => Promise<void>
  requestCalendarAccess: () => Promise<void>
  requestRemindersAccess: () => Promise<void>
  refreshEventkitData: () => Promise<void>
}

function replaceTask(tasks: Task[], nextTask: Task) {
  const index = tasks.findIndex((task) => task.id === nextTask.id)
  if (index === -1) return [nextTask, ...tasks]
  return tasks.map((task) => (task.id === nextTask.id ? nextTask : task))
}

function replaceGoal(goals: GoalCard[], nextGoal: GoalCard) {
  const index = goals.findIndex((goal) => goal.id === nextGoal.id)
  if (index === -1) return [nextGoal, ...goals]
  return goals.map((goal) => (goal.id === nextGoal.id ? nextGoal : goal))
}

/**
 * 应用派生状态到当前 state
 * 根据 changeType 选择性重算受影响的部分
 */
function applyDerivedState(
  state: Pick<AppStoreState, 'baseTimeline' | 'baseGoals' | 'tasks' | 'activeArea' | 'showCompletedTodos'>,
  changeType: ChangeType,
) {
  const manager = new DerivedStateManager(
    state.baseTimeline,
    state.baseGoals,
    state.tasks,
    state.activeArea,
    state.showCompletedTodos,
  )
  return manager.compute(changeType)
}

function replaceTaskState(state: AppStoreState, nextTask: Task) {
  const producer = new StateProducer(state, applyDerivedState)
  producer.replaceTask(nextTask)
  return producer.finalize()
}

function replaceGoalState(state: AppStoreState, nextGoal: GoalCard) {
  const producer = new StateProducer(state, applyDerivedState)
  producer.replaceGoal(nextGoal)
  return producer.finalize()
}

function syncTasksForSystemReminder(tasks: Task[], reminderId: string, done: boolean): Task[] {
  return tasks.map((task) =>
    task.systemReminderId === reminderId
      ? {
          ...task,
          status: (done ? 'DONE' : 'TODO') as TaskStatus,
          activityLogs:
            task.status === ((done ? 'DONE' : 'TODO') as TaskStatus)
              ? task.activityLogs
              : [
                  {
                    action: (done ? 'COMPLETED' : 'RESUMED') as TaskActivityAction,
                    note: 'Synced from Apple Reminders.',
                    timestamp: new Date(),
                  },
                  ...task.activityLogs,
                ],
        }
      : task,
  )
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function createDateRange() {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
  return { startOfDay, endOfDay }
}

// 创建权限管理器实例
const permissionManager = new PermissionManager(async (type: PermissionType) => {
  if (type === 'calendar') {
    return await apiRequestCalendarAccess()
  } else {
    return await apiRequestRemindersAccess()
  }
})

export const useAppStore = create<AppStoreState>((set, get) => ({
  currentView: 'inbox',
  activeArea: 'ALL',
  allAreas: [],
  tasks: [],
  todayFocusTasks: [],
  todayAttentionGroups: { overdue: [], dueToday: [], ongoing: [] },
  todayRelevantGoals: [],
  timeline: [],
  inbox: {
    activeTasks: [],
    pausedTasks: [],
    completed: {
      totalCount: 0,
      visibleTasks: [],
      isCollapsedByDefault: true,
    },
  },
  showCompletedTodos: false,
  baseTimeline: [],
  goals: [],
  baseGoals: [],
  systemReminders: [],
  integrationStatus: {
    calendar: 'not_determined',
    reminders: 'not_determined',
  },
  eventkitPermissions: {
    calendar: 'not_determined',
    reminders: 'not_determined',
  },
  eventkitData: {
    calendarEventCount: 0,
    reminderCount: 0,
  },
  statusMessage: '',
  isLoading: true,
  isTaskDrawerOpen: false,
  isGoalDrawerOpen: false,
  isReminderDrawerOpen: false,
  isQuickCaptureOpen: false,
  isCalendarEventDrawerOpen: false,
  selectedCalendarEventId: undefined,
  setView: (view) => set({ currentView: view }),
  setActiveArea: (area) =>
    set((state) => {
      const producer = new StateProducer(state, applyDerivedState)
      producer.setActiveArea(area)
      return producer.finalize()
    }),
  hydrateApp: (payload) =>
    set((state) => {
      // 同步权限状态到 PermissionManager
      permissionManager.updateState(payload.integrationStatus)

      const derived = applyDerivedState(
        {
          baseTimeline: payload.timeline,
          baseGoals: payload.goals,
          tasks: payload.tasks,
          activeArea: state.activeArea,
          showCompletedTodos: state.showCompletedTodos,
        },
        'full-refresh',
      )
      return {
        tasks: payload.tasks,
        todayFocusTasks: derived.todayFocusTasks,
        todayAttentionGroups: derived.todayAttentionGroups,
        todayRelevantGoals: derived.todayRelevantGoals,
        timeline: derived.timeline,
        inbox: derived.inbox,
        baseTimeline: payload.timeline,
        goals: derived.goals,
        baseGoals: payload.goals,
        systemReminders: payload.systemReminders,
        integrationStatus: payload.integrationStatus,
        eventkitPermissions: permissionManager.getState(),
        statusMessage: payload.statusMessage,
      }
    }),
  setLoading: (value) => set({ isLoading: value }),
  setStatusMessage: (value) => set({ statusMessage: value }),
  setShowCompletedTodos: (value) =>
    set((state) => {
      const producer = new StateProducer(state, applyDerivedState)
      producer.setShowCompletedTodos(value)
      return producer.finalize()
    }),
  receiveExternalTask: (task) =>
    set((state) => {
      const nextTasks = replaceTask(state.tasks, task)
      return {
        tasks: nextTasks,
        ...applyDerivedState({ ...state, tasks: nextTasks }, 'tasks'),
        statusMessage: 'Quick capture synced',
      }
    }),
  openTaskDrawer: (taskId) => set({ selectedTaskId: taskId, isTaskDrawerOpen: true }),
  closeTaskDrawer: () => set({ isTaskDrawerOpen: false }),
  openGoalDrawer: (goalId) => set({ selectedGoalId: goalId, isGoalDrawerOpen: true }),
  closeGoalDrawer: () => set({ isGoalDrawerOpen: false }),
  openReminderDrawer: (reminderId) => set({ selectedReminderId: reminderId, isReminderDrawerOpen: true }),
  closeReminderDrawer: () => set({ isReminderDrawerOpen: false, selectedReminderId: undefined }),
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
  openCalendarEventDrawer: (eventId: string) => set({ selectedCalendarEventId: eventId, isCalendarEventDrawerOpen: true }),
  closeCalendarEventDrawer: () => set({ isCalendarEventDrawerOpen: false }),
  addTask: async (title) => {
    const adapter = createWorkspaceMutationAdapter()

    try {
      const { task: nextTask, statusMessage } = await adapter.createTask(title)
      if (!nextTask) return

      set((state) => ({
        tasks: replaceTask(state.tasks, nextTask),
        ...applyDerivedState(
          { ...state, tasks: replaceTask(state.tasks, nextTask) },
          'tasks',
        ),
        selectedTaskId: nextTask.id,
        isTaskDrawerOpen: true,
        currentView: 'inbox',
        statusMessage: statusMessage || BROWSER_PREVIEW_STATUS,
      }))
    } catch (error) {
      set({ statusMessage: `Unable to save task · ${error instanceof Error ? error.message : String(error)}` })
    }
  },
  createGoal: async (input, options) => {
    const adapter = createWorkspaceMutationAdapter()
    // 确保 area 非空，默认使用"未分类"
    const normalizedInput = {
      ...input,
      area: input.area?.trim() || '未分类',
    }

    try {
      const { goal: nextGoal, statusMessage, openGoalWorkspace } = await adapter.createGoal(normalizedInput, options)
      if (!nextGoal) return undefined

      set((state) => {
        return {
          ...replaceGoalState(state, nextGoal),
          selectedGoalId: openGoalWorkspace ? nextGoal.id : state.selectedGoalId,
          isGoalDrawerOpen: openGoalWorkspace,
          currentView: openGoalWorkspace ? 'goals' : state.currentView,
          statusMessage: statusMessage || BROWSER_PREVIEW_STATUS,
        }
      })

      // 刷新领域列表
      void get().loadAreas()

      return nextGoal.id
    } catch (error) {
      set({ statusMessage: `Unable to create goal · ${error instanceof Error ? error.message : String(error)}` })
      return undefined
    }
  },
  updateGoalFields: async (goalId, input) => {
    const adapter = createWorkspaceMutationAdapter()

    try {
      const { goal: updatedGoal, statusMessage } = await adapter.updateGoalFields(goalId, input)
      if (!updatedGoal && isTauriRuntime()) return

      set((state) => {
        const nextGoal = isTauriRuntime()
          ? (updatedGoal as GoalCard)
          : state.baseGoals.map((goal) =>
              goal.id === goalId
                ? {
                    ...goal,
                    title: input.title.trim(),
                    area: input.area.trim(),
                    description: input.description.trim(),
                    updatedAt: new Date(),
                  }
                : goal,
            ).find((goal) => goal.id === goalId) as GoalCard
        return {
          ...replaceGoalState(state, nextGoal),
          statusMessage: statusMessage || BROWSER_PREVIEW_STATUS,
        }
      })
    } catch (error) {
      set({ statusMessage: `Unable to update goal · ${error instanceof Error ? error.message : String(error)}` })
    }
  },
  updateGoalStatus: async (goalId, status) => {
    if (status === 'READY_TO_COMPLETE') {
      set({ statusMessage: 'READY_TO_COMPLETE is auto-computed and cannot be set manually' })
      return
    }

    const adapter = createWorkspaceMutationAdapter()

    try {
      const { goal: updatedGoal, statusMessage } = await adapter.updateGoalStatus(goalId, status)

      set((state) => {
        const nextGoal = isTauriRuntime()
          ? (updatedGoal as GoalCard)
          : state.baseGoals.map((goal) =>
              goal.id === goalId
                ? {
                    ...goal,
                    status,
                    updatedAt: new Date(),
                  }
                : goal,
            ).find((goal) => goal.id === goalId) as GoalCard
        return {
          ...replaceGoalState(state, nextGoal),
          statusMessage: statusMessage || BROWSER_PREVIEW_STATUS,
        }
      })
    } catch (error) {
      set({ statusMessage: `Unable to update goal status · ${error instanceof Error ? error.message : String(error)}` })
    }
  },
  createTaskForGoal: async (goalId, title) => {
    const adapter = createWorkspaceMutationAdapter()

    const goal = get().baseGoals.find((item) => item.id === goalId)
    if (!goal) return

    try {
      const { task: nextTask, statusMessage } = await adapter.createTaskForGoal(goal, title)
      if (!nextTask) return

      set((state) => {
        const nextTasks = replaceTask(state.tasks, nextTask)
        return {
          tasks: nextTasks,
          ...applyDerivedState({ ...state, tasks: nextTasks }, 'tasks'),
          selectedTaskId: nextTask.id,
          isTaskDrawerOpen: true,
          isGoalDrawerOpen: false,
          statusMessage: statusMessage || BROWSER_PREVIEW_STATUS,
        }
      })
    } catch (error) {
      set({ statusMessage: `Unable to create task · ${error instanceof Error ? error.message : String(error)}` })
    }
  },
  addTaskNote: async (taskId, note) => {
    const trimmed = note.trim()
    if (!trimmed) return
    const adapter = createWorkspaceMutationAdapter()

    try {
      if (isTauriRuntime()) {
        const { task: updatedTask, statusMessage } = await adapter.addTaskNote(taskId, trimmed)
        set((state) => ({
          ...replaceTaskState(state, updatedTask as Task),
          statusMessage: statusMessage || BROWSER_PREVIEW_STATUS,
        }))
        return
      }

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                activityLogs: [
                  createBrowserTaskNote(trimmed),
                  ...task.activityLogs,
                ],
              }
            : task,
        ),
        ...applyDerivedState(
          {
            ...state,
            tasks: state.tasks.map((task) =>
              task.id === taskId
                ? {
                    ...task,
                    activityLogs: [createBrowserTaskNote(trimmed), ...task.activityLogs],
                  }
                : task,
            ),
          },
          'tasks',
        ),
        statusMessage: BROWSER_PREVIEW_STATUS,
      }))
    } catch (error) {
      set({ statusMessage: `Unable to save activity log · ${error instanceof Error ? error.message : String(error)}` })
    }
  },
  updateTaskStatus: async (taskId, status, note) => {
    const adapter = createWorkspaceMutationAdapter()
    try {
      if (isTauriRuntime()) {
        const { task: updatedTask, statusMessage } = await adapter.updateTaskStatus(taskId, status, note)
        set((state) => ({
          ...replaceTaskState(state, updatedTask as Task),
          statusMessage: statusMessage || BROWSER_PREVIEW_STATUS,
        }))
        return
      }

      set((state) => {
        const currentTask = state.tasks.find((task) => task.id === taskId)
        const fromStatus = currentTask?.status || 'TODO'
        const action = logActionForTransition(fromStatus, status)

        return {
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  status,
                  activityLogs: [
                    {
                      action,
                      note: note?.trim() || undefined,
                      timestamp: new Date(),
                    },
                    ...task.activityLogs,
                  ],
                }
              : task,
          ),
          ...applyDerivedState(
            {
              ...state,
              tasks: state.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      status,
                      activityLogs: [
                        {
                          action,
                          note: note?.trim() || undefined,
                          timestamp: new Date(),
                        },
                        ...task.activityLogs,
                      ],
                    }
                  : task,
              ),
            },
            'tasks',
          ),
          statusMessage: BROWSER_PREVIEW_STATUS,
        }
      })
    } catch (error) {
      set({ statusMessage: `Unable to save task status · ${error instanceof Error ? error.message : String(error)}` })
    }
  },
  updateTaskContent: async (taskId, content) => {
    const adapter = createWorkspaceMutationAdapter()
    try {
      if (isTauriRuntime()) {
        const { task: updatedTask, statusMessage } = await adapter.updateTaskContent(taskId, content)
        set((state) => ({
          ...replaceTaskState(state, updatedTask as Task),
          statusMessage: statusMessage || BROWSER_PREVIEW_STATUS,
        }))
        return
      }

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                content,
              }
            : task,
        ),
        ...applyDerivedState(
          {
            ...state,
            tasks: state.tasks.map((task) =>
              task.id === taskId
                ? {
                    ...task,
                    content,
                  }
                : task,
            ),
          },
          'tasks',
        ),
        statusMessage: BROWSER_PREVIEW_STATUS,
      }))
    } catch (error) {
      set({ statusMessage: `Unable to save markdown notes · ${error instanceof Error ? error.message : String(error)}` })
    }
  },
  updateTaskFields: async (taskId, input) => {
    const trimmedTitle = input.title.trim()
    if (!trimmedTitle) return
    const adapter = createWorkspaceMutationAdapter()

    try {
      if (isTauriRuntime()) {
        const { task: updatedTask, statusMessage } = await adapter.updateTaskFields(taskId, {
          title: trimmedTitle,
          plannedStartAt: input.plannedStartAt,
          dueDate: input.dueDate,
          linkedGoalId: input.linkedGoalId,
          availableGoals: get().baseGoals,
          showInTimeline: input.showInTimeline,
        })
        set((state) => ({
          ...replaceTaskState(state, updatedTask as Task),
          statusMessage: statusMessage || BROWSER_PREVIEW_STATUS,
        }))
        return
      }

      set((state) => {
        const nextTasks = state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                title: trimmedTitle,
                plannedStartAt: input.plannedStartAt,
                dueDate: input.dueDate,
                linkedGoalId: input.linkedGoalId,
                linkedGoalLabel: input.linkedGoalId
                  ? state.baseGoals.find((goal) => goal.id === input.linkedGoalId)?.title
                  : undefined,
                showInTimeline: input.showInTimeline ?? task.showInTimeline,
                updatedAt: new Date(),
              }
            : task,
        )
        return {
          tasks: nextTasks,
          ...applyDerivedState({ ...state, tasks: nextTasks }, 'tasks'),
          statusMessage: BROWSER_PREVIEW_STATUS,
        }
      })
    } catch (error) {
      set({ statusMessage: `Unable to save task details · ${error instanceof Error ? error.message : String(error)}` })
    }
  },
  toggleSystemReminderDone: async (reminderId, done) => {
    try {
      if (!isTauriRuntime()) {
        set((state) => ({
          systemReminders: state.systemReminders.map((reminder) =>
            reminder.id === reminderId
              ? {
                  ...reminder,
                  done,
                }
              : reminder,
          ),
          timeline: state.timeline.map((item) => (item.id === reminderId ? { ...item, done } : item)),
          statusMessage: getRuntimeModeStatusMessage(false),
        }))
        return
      }

      const updatedReminder = await persistSystemReminderCompleted(reminderId, done)
      set((state) => {
        const syncedTasks = syncTasksForSystemReminder(state.tasks, reminderId, updatedReminder.done)
        return {
          systemReminders: state.systemReminders.map((reminder) =>
            reminder.id === reminderId ? updatedReminder : reminder,
          ),
          tasks: syncedTasks,
          ...applyDerivedState(
            { ...state, tasks: syncedTasks },
            'tasks',
          ),
          timeline: state.timeline.map((item) =>
            item.id === reminderId
              ? {
                  ...item,
                  done: updatedReminder.done,
                }
              : item,
          ),
          statusMessage: updatedReminder.done ? 'Apple Reminder completed' : 'Apple Reminder reopened',
        }
      })
    } catch (error) {
      set({
        statusMessage: `Unable to update Apple Reminder · ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  },
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

        // 重新加载工作区以更新 Goal 的显示
        if (isTauriRuntime()) {
          const { hydrateApp } = get()
          const { loadDesktopSnapshot } = await import('../lib/desktopApi')
          const snapshot = await loadDesktopSnapshot()
          hydrateApp({
            goals: snapshot.goals,
            timeline: snapshot.timeline,
            tasks: snapshot.tasks,
            systemReminders: snapshot.systemReminders,
            integrationStatus: snapshot.integrationStatus,
            statusMessage: statusMessage || '',
          })
        }
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

        // 重新加载工作区以更新 Goal 的 area
        if (isTauriRuntime()) {
          const { hydrateApp } = get()
          const { loadDesktopSnapshot } = await import('../lib/desktopApi')
          const snapshot = await loadDesktopSnapshot()
          hydrateApp({
            goals: snapshot.goals,
            timeline: snapshot.timeline,
            tasks: snapshot.tasks,
            systemReminders: snapshot.systemReminders,
            integrationStatus: snapshot.integrationStatus,
            statusMessage: statusMessage || '',
          })
        }
      } else {
        set({ statusMessage: message })
      }
    } catch (error) {
      set({ statusMessage: `Unable to delete area · ${error instanceof Error ? error.message : String(error)}` })
    }
  },
  requestCalendarAccess: async () => {
    try {
      const status = await permissionManager.request('calendar')
      set({
        eventkitPermissions: permissionManager.getState(),
        statusMessage: status === 'granted' ? 'Calendar access granted' : `Calendar access ${status}`,
      })
    } catch (error) {
      permissionManager.updateState({
        ...permissionManager.getState(),
        calendar: 'error',
      })
      set({
        eventkitPermissions: permissionManager.getState(),
        statusMessage: `Unable to request calendar access · ${formatErrorMessage(error)}`,
      })
    }
  },
  requestRemindersAccess: async () => {
    try {
      const status = await permissionManager.request('reminders')
      set({
        eventkitPermissions: permissionManager.getState(),
        statusMessage: status === 'granted' ? 'Reminders access granted' : `Reminders access ${status}`,
      })
    } catch (error) {
      permissionManager.updateState({
        ...permissionManager.getState(),
        reminders: 'error',
      })
      set({
        eventkitPermissions: permissionManager.getState(),
        statusMessage: `Unable to request reminders access · ${formatErrorMessage(error)}`,
      })
    }
  },
  refreshEventkitData: async () => {
    const state = get()

    // 只有在权限授权后才获取数据
    if (state.eventkitPermissions.calendar !== 'granted' && state.eventkitPermissions.reminders !== 'granted') {
      return
    }

    try {
      let calendarEventCount = 0
      let reminderCount = 0

      if (state.eventkitPermissions.calendar === 'granted') {
        const { startOfDay, endOfDay } = createDateRange()
        const events = await fetchCalendarEvents(startOfDay, endOfDay)
        calendarEventCount = events.length
      }

      if (state.eventkitPermissions.reminders === 'granted') {
        const reminders = await fetchReminders()
        reminderCount = reminders.length
      }

      set({
        eventkitData: {
          calendarEventCount,
          reminderCount,
        },
        statusMessage: 'EventKit data refreshed',
      })
    } catch (error) {
      set({
        statusMessage: `Unable to refresh EventKit data · ${formatErrorMessage(error)}`,
      })
    }
  },
}))

export function useSelectedTask() {
  const selectedTaskId = useAppStore((state) => state.selectedTaskId)
  return useAppStore((state) => state.tasks.find((task) => task.id === selectedTaskId))
}

export function useSelectedGoal() {
  const selectedGoalId = useAppStore((state) => state.selectedGoalId)
  return useAppStore((state) => state.baseGoals.find((goal) => goal.id === selectedGoalId))
}
