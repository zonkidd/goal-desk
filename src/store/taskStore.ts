import { create } from 'zustand'
import { isTauriRuntime } from '../lib/desktopApi'
import { BROWSER_PREVIEW_STATUS, createBrowserTaskNote, createWorkspaceMutationAdapter } from '../lib/workspaceMutations'
import { logActionForTransition } from '../lib/taskPresentation'
import type { Task, TaskActivityAction, TaskStatus } from '../types/task'
import type { InboxTaskGroups, TodayAttentionGroups } from '../lib/workspaceDerivation'
import type { GoalCard } from '../types/app'

export interface TaskStoreState {
  // 基础数据
  tasks: Task[]

  // 派生状态（需要跨 store 计算）
  todayFocusTasks: Task[]
  todayAttentionGroups: TodayAttentionGroups
  inbox: InboxTaskGroups

  // Actions
  hydrateTasks: (tasks: Task[]) => void
  updateTodayFocusTasks: (tasks: Task[]) => void
  updateTodayAttentionGroups: (groups: TodayAttentionGroups) => void
  updateInbox: (inbox: InboxTaskGroups) => void
  replaceTask: (task: Task) => Task[]
  syncTasksForSystemReminder: (reminderId: string, done: boolean) => Task[]
  addTask: (title: string) => Promise<Task | null>
  createTaskForGoal: (goal: GoalCard, title: string) => Promise<Task | null>
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
      systemReminderId?: string
    },
    availableGoals: GoalCard[],
  ) => Promise<void>
  setStatusMessage: (message: string) => void
}

function replaceTaskInArray(tasks: Task[], nextTask: Task) {
  const index = tasks.findIndex((task) => task.id === nextTask.id)
  if (index === -1) return [nextTask, ...tasks]
  return tasks.map((task) => (task.id === nextTask.id ? nextTask : task))
}

function syncTasksForReminderInArray(tasks: Task[], reminderId: string, done: boolean): Task[] {
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

export const useTaskStore = create<TaskStoreState>((set, get) => ({
  // 初始状态
  tasks: [],
  todayFocusTasks: [],
  todayAttentionGroups: { overdue: [], dueToday: [], ongoing: [] },
  inbox: {
    activeTasks: [],
    pausedTasks: [],
    completed: {
      totalCount: 0,
      visibleTasks: [],
      isCollapsedByDefault: true,
    },
  },

  // Hydrate
  hydrateTasks: (tasks) => set({ tasks }),

  // 更新派生状态
  updateTodayFocusTasks: (tasks) => set({ todayFocusTasks: tasks }),
  updateTodayAttentionGroups: (groups) => set({ todayAttentionGroups: groups }),
  updateInbox: (inbox) => set({ inbox }),

  // 替换任务
  replaceTask: (task) => {
    const nextTasks = replaceTaskInArray(get().tasks, task)
    set({ tasks: nextTasks })
    return nextTasks
  },

  // 同步系统提醒关联的任务
  syncTasksForSystemReminder: (reminderId, done) => {
    const nextTasks = syncTasksForReminderInArray(get().tasks, reminderId, done)
    set({ tasks: nextTasks })
    return nextTasks
  },

  // 添加任务
  addTask: async (title) => {
    const adapter = createWorkspaceMutationAdapter()

    try {
      const { task: nextTask, statusMessage } = await adapter.createTask(title)
      if (!nextTask) return null

      get().replaceTask(nextTask)
      get().setStatusMessage(statusMessage || BROWSER_PREVIEW_STATUS)

      // 打开任务抽屉并切换到 inbox 视图
      const { useUiStore } = require('./uiStore')
      useUiStore.getState().openTaskDrawer(nextTask.id)
      useUiStore.getState().setView('inbox')

      return nextTask
    } catch (error) {
      get().setStatusMessage(`Unable to save task · ${error instanceof Error ? error.message : String(error)}`)
      return null
    }
  },

  // 为目标创建任务
  createTaskForGoal: async (goal, title) => {
    const adapter = createWorkspaceMutationAdapter()

    try {
      const { task: nextTask, statusMessage } = await adapter.createTaskForGoal(goal, title)
      if (!nextTask) return null

      get().replaceTask(nextTask)
      get().setStatusMessage(statusMessage || BROWSER_PREVIEW_STATUS)

      // 打开任务抽屉并关闭目标抽屉
      const { useUiStore } = require('./uiStore')
      useUiStore.getState().openTaskDrawer(nextTask.id)
      useUiStore.getState().closeGoalDrawer()

      return nextTask
    } catch (error) {
      get().setStatusMessage(`Unable to create task · ${error instanceof Error ? error.message : String(error)}`)
      return null
    }
  },

  // 添加任务备注
  addTaskNote: async (taskId, note) => {
    const trimmed = note.trim()
    if (!trimmed) return
    const adapter = createWorkspaceMutationAdapter()

    try {
      if (isTauriRuntime()) {
        const { task: updatedTask, statusMessage } = await adapter.addTaskNote(taskId, trimmed)
        get().replaceTask(updatedTask as Task)
        get().setStatusMessage(statusMessage || BROWSER_PREVIEW_STATUS)
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
      }))
      get().setStatusMessage(BROWSER_PREVIEW_STATUS)
    } catch (error) {
      get().setStatusMessage(`Unable to save activity log · ${error instanceof Error ? error.message : String(error)}`)
    }
  },

  // 更新任务状态
  updateTaskStatus: async (taskId, status, note) => {
    const adapter = createWorkspaceMutationAdapter()
    try {
      if (isTauriRuntime()) {
        const { task: updatedTask, statusMessage } = await adapter.updateTaskStatus(taskId, status, note)
        get().replaceTask(updatedTask as Task)
        get().setStatusMessage(statusMessage || BROWSER_PREVIEW_STATUS)
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
        }
      })
      get().setStatusMessage(BROWSER_PREVIEW_STATUS)
    } catch (error) {
      get().setStatusMessage(`Unable to save task status · ${error instanceof Error ? error.message : String(error)}`)
    }
  },

  // 更新任务内容
  updateTaskContent: async (taskId, content) => {
    const adapter = createWorkspaceMutationAdapter()
    try {
      if (isTauriRuntime()) {
        const { task: updatedTask, statusMessage } = await adapter.updateTaskContent(taskId, content)
        get().replaceTask(updatedTask as Task)
        get().setStatusMessage(statusMessage || BROWSER_PREVIEW_STATUS)
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
      }))
      get().setStatusMessage(BROWSER_PREVIEW_STATUS)
    } catch (error) {
      get().setStatusMessage(`Unable to save markdown notes · ${error instanceof Error ? error.message : String(error)}`)
    }
  },

  // 更新任务字段
  updateTaskFields: async (taskId, input, availableGoals) => {
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
          availableGoals,
          showInTimeline: input.showInTimeline,
          systemReminderId: input.systemReminderId,
        })
        get().replaceTask(updatedTask as Task)
        get().setStatusMessage(statusMessage || BROWSER_PREVIEW_STATUS)
        return
      }

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                title: trimmedTitle,
                plannedStartAt: input.plannedStartAt,
                dueDate: input.dueDate,
                linkedGoalId: input.linkedGoalId,
                linkedGoalLabel: input.linkedGoalId
                  ? availableGoals.find((goal) => goal.id === input.linkedGoalId)?.title
                  : undefined,
                showInTimeline: input.showInTimeline ?? task.showInTimeline,
                systemReminderId: input.systemReminderId ?? task.systemReminderId,
                updatedAt: new Date(),
              }
            : task,
        ),
      }))
      get().setStatusMessage(BROWSER_PREVIEW_STATUS)
    } catch (error) {
      get().setStatusMessage(`Unable to save task details · ${error instanceof Error ? error.message : String(error)}`)
    }
  },

  // 设置状态消息（桥接到 uiStore）
  setStatusMessage: (message: string) => {
    console.warn('setStatusMessage called before being linked to uiStore')
  },

  // 关联任务到系统提醒
  linkTaskToReminder: async (taskId: string, reminderId: string) => {
    const adapter = createWorkspaceMutationAdapter()
    const task = get().tasks.find((t) => t.id === taskId)
    if (!task) return

    try {
      if (isTauriRuntime()) {
        const { task: updatedTask, statusMessage } = await adapter.updateTaskFields(taskId, {
          title: task.title,
          systemReminderId: reminderId,
        }, [])
        get().replaceTask(updatedTask as Task)
        get().setStatusMessage(statusMessage || BROWSER_PREVIEW_STATUS)
        return
      }

      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId
            ? { ...t, systemReminderId: reminderId, updatedAt: new Date() }
            : t,
        ),
      }))
      get().setStatusMessage(BROWSER_PREVIEW_STATUS)
    } catch (error) {
      get().setStatusMessage(`Unable to link reminder · ${error instanceof Error ? error.message : String(error)}`)
    }
  },

  // 解除任务与系统提醒的关联
  unlinkTaskFromReminder: async (taskId: string) => {
    const adapter = createWorkspaceMutationAdapter()
    const task = get().tasks.find((t) => t.id === taskId)
    if (!task) return

    try {
      if (isTauriRuntime()) {
        const { task: updatedTask, statusMessage } = await adapter.updateTaskFields(taskId, {
          title: task.title,
          systemReminderId: undefined,
        }, [])
        get().replaceTask(updatedTask as Task)
        get().setStatusMessage(statusMessage || BROWSER_PREVIEW_STATUS)
        return
      }

      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId
            ? { ...t, systemReminderId: undefined, updatedAt: new Date() }
            : t,
        ),
      }))
      get().setStatusMessage(BROWSER_PREVIEW_STATUS)
    } catch (error) {
      get().setStatusMessage(`Unable to unlink reminder · ${error instanceof Error ? error.message : String(error)}`)
    }
  },

  // 创建系统提醒并关联到任务
  createAndLinkReminder: async (taskId: string, title: string, dueAt?: Date) => {
    const adapter = createWorkspaceMutationAdapter()
    try {
      if (isTauriRuntime()) {
        const reminderId = await adapter.createSystemReminder(title, dueAt)
        if (reminderId) {
          await get().linkTaskToReminder(taskId, reminderId)
        }
        return reminderId || ''
      }

      // 浏览器预览模式：创建 mock 提醒 ID
      const mockReminderId = `mock-reminder-${Date.now()}`
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? { ...task, systemReminderId: mockReminderId, updatedAt: new Date() }
            : task,
        ),
      }))
      get().setStatusMessage(BROWSER_PREVIEW_STATUS)
      return mockReminderId
    } catch (error) {
      get().setStatusMessage(`Unable to create reminder · ${error instanceof Error ? error.message : String(error)}`)
      return ''
    }
  },
}))

// 便捷选择器
export function useSelectedTask(selectedTaskId?: string) {
  return useTaskStore((state) => state.tasks.find((task) => task.id === selectedTaskId))
}
