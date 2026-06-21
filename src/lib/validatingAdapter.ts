import { validateRequiredString, validateTaskTitle, validateGoalInput, validateAreaTitle } from './validation'
import type { MutationAdapter, TaskResult, GoalResult, AreaResult, DeleteAreaResult } from './mutationAdapter'
import type { GoalCard, GoalStatus, AreaWithStats } from '../types/app'
import type { Task, TaskStatus } from '../types/task'

export class ValidatingMutationAdapter implements MutationAdapter {
  constructor(private inner: MutationAdapter) {}

  async createTask(title: string): Promise<TaskResult> {
    const validated = validateTaskTitle(title)
    if (!validated) return {}
    return this.inner.createTask(validated)
  }

  async createTaskForGoal(goal: GoalCard, title: string): Promise<TaskResult> {
    const validated = validateTaskTitle(title)
    if (!validated) return {}
    return this.inner.createTaskForGoal(goal, validated)
  }

  async createGoal(
    input: { title: string; area?: string; description?: string },
    options?: { openGoalWorkspace?: boolean },
  ): Promise<GoalResult & { openGoalWorkspace: boolean }> {
    const validated = validateGoalInput(input)
    const openGoalWorkspace = options?.openGoalWorkspace ?? true
    if (!validated) return { openGoalWorkspace }
    return this.inner.createGoal(validated, options)
  }

  async updateGoalFields(goalId: string, input: { title: string; area: string; description: string }): Promise<GoalResult> {
    const validated = validateGoalInput(input)
    if (!validated) return {}
    return this.inner.updateGoalFields(goalId, validated)
  }

  async updateGoalStatus(goalId: string, status: GoalStatus): Promise<GoalResult> {
    return this.inner.updateGoalStatus(goalId, status)
  }

  async addTaskNote(taskId: string, note: string): Promise<TaskResult> {
    const validated = validateRequiredString(note)
    if (!validated) return {}
    return this.inner.addTaskNote(taskId, validated)
  }

  async updateTaskStatus(taskId: string, status: TaskStatus, note?: string): Promise<TaskResult> {
    return this.inner.updateTaskStatus(taskId, status, note)
  }

  async updateTaskContent(taskId: string, content: string): Promise<TaskResult> {
    return this.inner.updateTaskContent(taskId, content)
  }

  async updateTaskFields(
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
  ): Promise<TaskResult> {
    const validatedTitle = validateTaskTitle(input.title)
    if (!validatedTitle) return {}
    return this.inner.updateTaskFields(taskId, { ...input, title: validatedTitle })
  }

  async listAreas(): Promise<{ areas?: AreaWithStats[]; statusMessage?: string }> {
    return this.inner.listAreas()
  }

  async createArea(title: string): Promise<AreaResult> {
    const validated = validateAreaTitle(title)
    if (!validated) return {}
    return this.inner.createArea(validated)
  }

  async renameArea(areaId: string, newTitle: string): Promise<AreaResult> {
    const validated = validateAreaTitle(newTitle)
    if (!validated) return {}
    return this.inner.renameArea(areaId, validated)
  }

  async deleteArea(areaId: string, force?: boolean): Promise<DeleteAreaResult> {
    return this.inner.deleteArea(areaId, force)
  }

  async createSystemReminder(title: string, dueAt?: Date): Promise<string> {
    return this.inner.createSystemReminder(title, dueAt)
  }

  async loadGoals(): Promise<GoalCard[]> {
    return this.inner.loadGoals()
  }
}
