import { create } from 'zustand'
import { getWorkspaceMutationAdapter } from '../lib/workspaceMutations'
import { executeMutation } from './mutationHelper'
import { upsertById } from './upsertById'
import type { Task, TaskChecklistItem, TaskStatus } from '../types/task'
import type { GoalCard } from '../types/app'
import type { MutationAdapter, TaskResult } from '../lib/mutationAdapter'

export interface TaskStoreState {
  tasks: Task[]
  deletedTasks: Task[]

  hydrateTasks: (tasks: Task[]) => void
  replaceTask: (task: Task) => Task[]
  addTask: (title: string) => Promise<Task | null>
  createTaskForGoal: (goal: GoalCard, title: string) => Promise<Task | null>
  addTaskNote: (taskId: string, note: string) => Promise<Task | null>
  updateTaskStatus: (taskId: string, status: TaskStatus, note?: string) => Promise<Task | null>
  updateTaskContent: (taskId: string, content: string) => Promise<Task | null>
  updateTaskFields: (
    taskId: string,
    input: {
      title: string
      plannedStartAt?: Date | null
      dueDate?: Date | null
      linkedGoalId?: string
      linkedGoalLabel?: string
      showInTimeline?: boolean
      systemReminderId?: string | null
    },
    availableGoals: GoalCard[],
  ) => Promise<Task | null>
  linkTaskToReminder: (taskId: string, reminderId: string) => Promise<Task | null>
  unlinkTaskFromReminder: (taskId: string) => Promise<Task | null>
  softDeleteTask: (taskId: string) => Promise<void>
  restoreTask: (taskId: string) => Promise<Task | null>
  loadDeletedTasks: () => Promise<void>
  updateTaskChecklists: (taskId: string, items: TaskChecklistItem[]) => Promise<Task | null>
}

async function runTaskMutation(
  get: () => TaskStoreState,
  mutation: (adapter: MutationAdapter) => Promise<TaskResult>,
): Promise<Task | null> {
  const adapter = getWorkspaceMutationAdapter()
  const result = await executeMutation(
    mutation,
    adapter,
    { onSuccess: ({ task }) => { if (task) get().replaceTask(task) } },
  )
  return result?.task ?? null
}

export const useTaskStore = create<TaskStoreState>((set, get) => ({
  tasks: [],
  deletedTasks: [],

  hydrateTasks: (tasks) => set({ tasks }),

  replaceTask: (task) => {
    const nextTasks = upsertById(get().tasks, task)
    set({ tasks: nextTasks })
    return nextTasks
  },

  addTask: async (title) => {
    return runTaskMutation(get, (a) => a.createTask(title))
  },

  createTaskForGoal: async (goal, title) => {
    return runTaskMutation(get, (a) => a.createTaskForGoal(goal, title))
  },

  addTaskNote: async (taskId, note) => {
    return runTaskMutation(get, (a) => a.addTaskNote(taskId, note))
  },

  updateTaskStatus: async (taskId, status, note) => {
    return runTaskMutation(get, (a) => a.updateTaskStatus(taskId, status, note))
  },

  updateTaskContent: async (taskId, content) => {
    return runTaskMutation(get, (a) => a.updateTaskContent(taskId, content))
  },

  updateTaskChecklists: async (taskId, items) => {
    return runTaskMutation(get, (a) => a.updateTaskChecklists(taskId, items))
  },

  updateTaskFields: async (taskId, input, availableGoals) => {
    const linkedGoalLabel = input.linkedGoalLabel ?? (
      input.linkedGoalId && availableGoals
        ? availableGoals.find((g) => g.id === input.linkedGoalId)?.title
        : undefined
    )
    return runTaskMutation(
      get,
      (a) => a.updateTaskFields(taskId, {
        title: input.title,
        plannedStartAt: input.plannedStartAt,
        dueDate: input.dueDate,
        linkedGoalId: input.linkedGoalId,
        linkedGoalLabel,
        showInTimeline: input.showInTimeline,
        ...(input.systemReminderId !== undefined ? { systemReminderId: input.systemReminderId } : {}),
      }),
    )
  },

  linkTaskToReminder: async (taskId: string, reminderId: string) => {
    const task = get().tasks.find((t) => t.id === taskId)
    if (!task) return null
    return runTaskMutation(
      get,
      (a) => a.updateTaskFields(taskId, {
        title: task.title,
        systemReminderId: reminderId,
      }),
    )
  },

  unlinkTaskFromReminder: async (taskId: string) => {
    const task = get().tasks.find((t) => t.id === taskId)
    if (!task) return null
    return runTaskMutation(
      get,
      (a) => a.updateTaskFields(taskId, {
        title: task.title,
        systemReminderId: null,
      }),
    )
  },

  softDeleteTask: async (taskId: string) => {
    const adapter = getWorkspaceMutationAdapter()
    try {
      await adapter.softDeleteTask(taskId)
      set({ tasks: get().tasks.filter((t) => t.id !== taskId) })
      await get().loadDeletedTasks()
    } catch (error) {
      console.error('Failed to soft delete task:', error)
    }
  },

  restoreTask: async (taskId: string) => {
    const adapter = getWorkspaceMutationAdapter()
    const result = await executeMutation(
      (a) => a.restoreTask(taskId),
      adapter,
      {
        onSuccess: async ({ task }) => {
          if (task) get().replaceTask(task)
          await get().loadDeletedTasks()
        },
      },
    )
    return result?.task ?? null
  },

  loadDeletedTasks: async () => {
    const adapter = getWorkspaceMutationAdapter()
    try {
      const deletedTasks = await adapter.listDeletedTasks()
      set({ deletedTasks })
    } catch (error) {
      console.error('Failed to load deleted tasks:', error)
    }
  },
}))

export function useSelectedTask(selectedTaskId?: string) {
  return useTaskStore((state) => state.tasks.find((task) => task.id === selectedTaskId))
}
