import { create } from 'zustand'
import { getRuntimeAdapter } from '../lib/runtimeAdapter'
import { getWorkspaceMutationAdapter } from '../lib/workspaceMutations'
import { executeMutation } from './mutationHelper'
import { upsertById } from './upsertById'
import { useGoalStore } from './goalStore'
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
    const nextTasks = upsertById(get().tasks, task)
    set({ tasks: nextTasks })
    return nextTasks
  },

  syncTasksForSystemReminder: (reminderId, done) => {
    const nextTasks = syncTasksForReminderInArray(get().tasks, reminderId, done)
    set({ tasks: nextTasks })
    return nextTasks
  },

  addTask: async (title) => {
    const adapter = getWorkspaceMutationAdapter()
    const result = await executeMutation(
      (a) => a.createTask(title),
      adapter,
      { onSuccess: ({ task }) => { if (task) get().replaceTask(task) } },
    )
    return result?.task ?? null
  },

  createTaskForGoal: async (goal, title) => {
    const adapter = getWorkspaceMutationAdapter()
    const result = await executeMutation(
      (a) => a.createTaskForGoal(goal, title),
      adapter,
      { onSuccess: ({ task }) => { if (task) get().replaceTask(task) } },
    )
    return result?.task ?? null
  },

  addTaskNote: async (taskId, note) => {
    const adapter = getWorkspaceMutationAdapter()
    await executeMutation(
      (a) => a.addTaskNote(taskId, note),
      adapter,
      { onSuccess: ({ task }) => { if (task) get().replaceTask(task) } },
    )
  },

  updateTaskStatus: async (taskId, status, note) => {
    const adapter = getWorkspaceMutationAdapter()
    await executeMutation(
      (a) => a.updateTaskStatus(taskId, status, note),
      adapter,
      { onSuccess: ({ task }) => { 
        if (task) {
          get().replaceTask(task)
          // Refresh Goal progress after Task completion
          if (status === 'DONE') {
            useGoalStore.getState().refreshGoals()
          }
        }
      } },
    )
  },

  updateTaskContent: async (taskId, content) => {
    const adapter = getWorkspaceMutationAdapter()
    await executeMutation(
      (a) => a.updateTaskContent(taskId, content),
      adapter,
      { onSuccess: ({ task }) => { if (task) get().replaceTask(task) } },
    )
  },

  updateTaskFields: async (taskId, input, availableGoals) => {
    const adapter = getWorkspaceMutationAdapter()
    const linkedGoalLabel = input.linkedGoalLabel ?? (
      input.linkedGoalId && availableGoals
        ? availableGoals.find((g) => g.id === input.linkedGoalId)?.title
        : undefined
    )
    await executeMutation(
      (a) => a.updateTaskFields(taskId, {
        title: input.title,
        plannedStartAt: input.plannedStartAt,
        dueDate: input.dueDate,
        linkedGoalId: input.linkedGoalId,
        linkedGoalLabel,
        showInTimeline: input.showInTimeline,
        systemReminderId: input.systemReminderId,
      }),
      adapter,
      { onSuccess: ({ task }) => { if (task) get().replaceTask(task) } },
    )
  },

  linkTaskToReminder: async (taskId: string, reminderId: string) => {
    const adapter = getWorkspaceMutationAdapter()
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
    const adapter = getWorkspaceMutationAdapter()
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
    const adapter = getWorkspaceMutationAdapter()
    try {
      if (getRuntimeAdapter().isTauri()) {
        const reminderId = await adapter.createSystemReminder(title, dueAt)
        if (reminderId && taskId) {
          await get().linkTaskToReminder(taskId, reminderId)
        }
        return reminderId || ''
      }

      const mockReminderId = `mock-reminder-${Date.now()}`
      if (taskId) {
        await get().linkTaskToReminder(taskId, mockReminderId)
      }
      return mockReminderId
    } catch (error) {
      return ''
    }
  },
}))

export function useSelectedTask(selectedTaskId?: string) {
  return useTaskStore((state) => state.tasks.find((task) => task.id === selectedTaskId))
}
