import type { MutationAdapter, TaskResult, GoalResult, AreaResult, DeleteAreaResult } from '../lib/mutationAdapter'
import type { GoalCard, GoalStatus, AreaWithStats } from '../types/app'
import type { TaskStatus } from '../types/task'

export interface MutationOrchestrator {
  run<T>(
    fn: (adapter: MutationAdapter) => Promise<T>,
    options?: {
      onSuccess?: (result: T) => void
      onError?: (error: unknown) => void
    },
  ): Promise<T | null>

  task: {
    createTask(title: string): Promise<TaskResult | null>
    createTaskForGoal(goal: GoalCard, title: string): Promise<TaskResult | null>
    addTaskNote(taskId: string, note: string): Promise<TaskResult | null>
    updateTaskStatus(taskId: string, status: TaskStatus, note?: string): Promise<TaskResult | null>
    updateTaskContent(taskId: string, content: string): Promise<TaskResult | null>
    updateTaskFields(
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
    ): Promise<TaskResult | null>
    createSystemReminder(title: string, dueAt?: Date): Promise<string | null>
  }

  goal: {
    createGoal(
      input: { title: string; area?: string; description?: string },
      options?: { openGoalWorkspace?: boolean },
    ): Promise<(GoalResult & { openGoalWorkspace: boolean }) | null>
    updateGoalFields(goalId: string, input: { title: string; area: string; description: string }): Promise<GoalResult | null>
    updateGoalStatus(goalId: string, status: GoalStatus): Promise<GoalResult | null>
  }

  area: {
    listAreas(): Promise<{ areas?: AreaWithStats[]; statusMessage?: string } | null>
    createArea(title: string): Promise<AreaResult | null>
    renameArea(areaId: string, newTitle: string): Promise<AreaResult | null>
    deleteArea(areaId: string, force?: boolean): Promise<DeleteAreaResult | null>
  }
}

export function createMutationOrchestrator(adapter: MutationAdapter): MutationOrchestrator {
  async function run<T>(
    fn: (adapter: MutationAdapter) => Promise<T>,
    options?: {
      onSuccess?: (result: T) => void
      onError?: (error: unknown) => void
    },
  ): Promise<T | null> {
    try {
      const result = await fn(adapter)
      options?.onSuccess?.(result)
      return result
    } catch (error) {
      console.error('Mutation failed:', error)
      options?.onError?.(error)
      return null
    }
  }

  return {
    run,

    task: {
      createTask: (title) => run((a) => a.createTask(title)),
      createTaskForGoal: (goal, title) => run((a) => a.createTaskForGoal(goal, title)),
      addTaskNote: (taskId, note) => run((a) => a.addTaskNote(taskId, note)),
      updateTaskStatus: (taskId, status, note) => run((a) => a.updateTaskStatus(taskId, status, note)),
      updateTaskContent: (taskId, content) => run((a) => a.updateTaskContent(taskId, content)),
      updateTaskFields: (taskId, input) => run((a) => a.updateTaskFields(taskId, input)),
      createSystemReminder: (title, dueAt) => run((a) => a.createSystemReminder(title, dueAt)),
    },

    goal: {
      createGoal: (input, options) => run((a) => a.createGoal(input, options)),
      updateGoalFields: (goalId, input) => run((a) => a.updateGoalFields(goalId, input)),
      updateGoalStatus: (goalId, status) => run((a) => a.updateGoalStatus(goalId, status)),
    },

    area: {
      listAreas: () => run((a) => a.listAreas()),
      createArea: (title) => run((a) => a.createArea(title)),
      renameArea: (areaId, newTitle) => run((a) => a.renameArea(areaId, newTitle)),
      deleteArea: (areaId, force) => run((a) => a.deleteArea(areaId, force)),
    },
  }
}
