import { create } from 'zustand'
import { isTauriRuntime } from '../lib/runtime'
import { createWorkspaceMutationAdapter } from '../lib/workspaceMutations'
import { executeMutation } from './mutationHelper'
import type { Task, TaskActivityAction, TaskStatus } from '../types/task'
import type { GoalCard } from '../types/app'

export interface TaskStoreState {
  tasks: Task[]

  hydrateTasks: (tasks: Task[]) => void
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
  tasks: [],

  hydrateTasks: (tasks) => set({ tasks }),

  replaceTask: (task) => {
    const nextTasks = replaceTaskInArray(get().tasks, task)
    set({ tasks: nextTasks })
    return nextTasks
  },

  syncTasksForSystemReminder: (reminderId, done) => {
    const nextTasks = syncTasksForReminderInArray(get().tasks, reminderId, done)
    set({ tasks: nextTasks })
    return nextTasks
  },

  addTask: async (title) => {
    const adapter = createWorkspaceMutationAdapter()
    const result = await executeMutation(
      (a) => a.createTask(title),
      adapter,
      { onSuccess: ({ task }) => { if (task) get().replaceTask(task) } },
    )
    return result?.task ?? null
  },

  createTaskForGoal: async (goal, title) => {
    const adapter = createWorkspaceMutationAdapter()
    const result = await executeMutation(
      (a) => a.createTaskForGoal(goal, title),
      adapter,
      { onSuccess: ({ task }) => { if (task) get().replaceTask(task) } },
    )
    return result?.task ?? null
  },

  addTaskNote: async (taskId, note) => {
    const adapter = createWorkspaceMutationAdapter()
    await executeMutation(
      (a) => a.addTaskNote(taskId, note),
      adapter,
      { onSuccess: ({ task }) => { if (task) get().replaceTask(task) } },
    )
  },

  updateTaskStatus: async (taskId, status, note) => {
    const adapter = createWorkspaceMutationAdapter()
    await executeMutation(
      (a) => a.updateTaskStatus(taskId, status, note),
      adapter,
      { onSuccess: ({ task }) => { if (task) get().replaceTask(task) } },
    )
  },

  updateTaskContent: async (taskId, content) => {
    const adapter = createWorkspaceMutationAdapter()
    await executeMutation(
      (a) => a.updateTaskContent(taskId, content),
      adapter,
      { onSuccess: ({ task }) => { if (task) get().replaceTask(task) } },
    )
  },

  updateTaskFields: async (taskId, input, availableGoals) => {
    const adapter = createWorkspaceMutationAdapter()
    await executeMutation(
      (a) => a.updateTaskFields(taskId, {
        title: input.title,
        plannedStartAt: input.plannedStartAt,
        dueDate: input.dueDate,
        linkedGoalId: input.linkedGoalId,
        availableGoals,
        showInTimeline: input.showInTimeline,
        systemReminderId: input.systemReminderId,
      }),
      adapter,
      { onSuccess: ({ task }) => { if (task) get().replaceTask(task) } },
    )
  },

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
      console.error('Failed to link task to reminder:', error)
    }
  },

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
      console.error('Failed to unlink task from reminder:', error)
    }
  },

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

export function useSelectedTask(selectedTaskId?: string) {
  return useTaskStore((state) => state.tasks.find((task) => task.id === selectedTaskId))
}
