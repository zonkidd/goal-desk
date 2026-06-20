import { create } from 'zustand'
import { isTauriRuntime } from '../lib/runtime'
import { createWorkspaceMutationAdapter } from '../lib/workspaceMutations'
import type { Task, TaskActivityAction, TaskStatus } from '../types/task'
import type { InboxTaskGroups, TodayAttentionGroups } from '../lib/workspaceDerivation'
import type { GoalCard, TodayAgenda } from '../types/app'

export interface TaskStoreState {
  // 基础数据
  tasks: Task[]

  // 派生状态（需要跨 store 计算）
  todayFocusTasks: Task[]
  todayAttentionGroups: TodayAttentionGroups
  todayTimeline: TodayAgenda
  inbox: InboxTaskGroups

  // Actions
  hydrateTasks: (tasks: Task[]) => void
  updateTodayFocusTasks: (tasks: Task[]) => void
  updateTodayAttentionGroups: (groups: TodayAttentionGroups) => void
  updateTodayTimeline: (timeline: TodayAgenda) => void
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
  linkTaskToReminder: (taskId: string, reminderId: string) => Promise<void>
  unlinkTaskFromReminder: (taskId: string) => Promise<void>
  createAndLinkReminder: (taskId: string, title: string, dueAt?: Date) => Promise<string>
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
  todayTimeline: [],
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
  updateTodayTimeline: (timeline) => set({ todayTimeline: timeline }),
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
      const { task: nextTask } = await adapter.createTask(title)
      if (!nextTask) return null

      get().replaceTask(nextTask)
      return nextTask
    } catch (error) {
      return null
    }
  },

  // 为目标创建任务
  createTaskForGoal: async (goal, title) => {
    const adapter = createWorkspaceMutationAdapter()

    try {
      const { task: nextTask } = await adapter.createTaskForGoal(goal, title)
      if (!nextTask) return null

      get().replaceTask(nextTask)
      return nextTask
    } catch (error) {
      return null
    }
  },

  // 添加任务备注
  addTaskNote: async (taskId, note) => {
    const adapter = createWorkspaceMutationAdapter()
    try {
      const { task: updatedTask } = await adapter.addTaskNote(taskId, note)
      if (updatedTask) {
        get().replaceTask(updatedTask)
      }
    } catch (error) {
      // error handled by caller
    }
  },

  // 更新任务状态
  updateTaskStatus: async (taskId, status, note) => {
    const adapter = createWorkspaceMutationAdapter()
    try {
      const { task: updatedTask } = await adapter.updateTaskStatus(taskId, status, note)
      if (updatedTask) {
        get().replaceTask(updatedTask)
      }
    } catch (error) {
      // error handled by caller
    }
  },

  // 更新任务内容
  updateTaskContent: async (taskId, content) => {
    const adapter = createWorkspaceMutationAdapter()
    try {
      const { task: updatedTask } = await adapter.updateTaskContent(taskId, content)
      if (updatedTask) {
        get().replaceTask(updatedTask)
      }
    } catch (error) {
      // error handled by caller
    }
  },

  // 更新任务字段
  updateTaskFields: async (taskId, input, availableGoals) => {
    const adapter = createWorkspaceMutationAdapter()
    try {
      const { task: updatedTask } = await adapter.updateTaskFields(taskId, {
        title: input.title,
        plannedStartAt: input.plannedStartAt,
        dueDate: input.dueDate,
        linkedGoalId: input.linkedGoalId,
        availableGoals,
        showInTimeline: input.showInTimeline,
        systemReminderId: input.systemReminderId,
      })
      if (updatedTask) {
        get().replaceTask(updatedTask)
      }
    } catch (error) {
      // error handled by caller
    }
  },



  // 关联任务到系统提醒
  linkTaskToReminder: async (taskId: string, reminderId: string) => {
    const adapter = createWorkspaceMutationAdapter()
    const task = get().tasks.find((t) => t.id === taskId)
    if (!task) return

    try {
      const { task: updatedTask } = await adapter.updateTaskFields(taskId, {
        title: task.title,
        systemReminderId: reminderId,
      })
      if (updatedTask) {
        get().replaceTask(updatedTask)
      }
    } catch (error) {
      // error handled by caller
    }
  },

  // 解除任务与系统提醒的关联
  unlinkTaskFromReminder: async (taskId: string) => {
    const adapter = createWorkspaceMutationAdapter()
    const task = get().tasks.find((t) => t.id === taskId)
    if (!task) return

    try {
      const { task: updatedTask } = await adapter.updateTaskFields(taskId, {
        title: task.title,
        systemReminderId: undefined,
      })
      if (updatedTask) {
        get().replaceTask(updatedTask)
      }
    } catch (error) {
      // error handled by caller
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
      return mockReminderId
    } catch (error) {
      return ''
    }
  },
}))

// 便捷选择器
export function useSelectedTask(selectedTaskId?: string) {
  return useTaskStore((state) => state.tasks.find((task) => task.id === selectedTaskId))
}
