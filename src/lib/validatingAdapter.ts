import { validateRequiredString, validateTaskTitle, validateGoalInput, validateAreaTitle } from './validation'
import type { MutationAdapter, TaskResult, GoalResult, AreaResult, DeleteAreaResult } from './mutationAdapter'
import type { GoalCard, GoalStatus, AreaWithStats } from '../types/app'
import type { Task, TaskChecklistItem, TaskStatus } from '../types/task'

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

  async updateTaskChecklists(taskId: string, items: TaskChecklistItem[]): Promise<TaskResult> {
    return this.inner.updateTaskChecklists(taskId, items)
  }

  async updateTaskFields(
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

  async loadGoals(): Promise<GoalCard[]> {
    return this.inner.loadGoals()
  }

  async softDeleteTask(taskId: string): Promise<void> {
    return this.inner.softDeleteTask(taskId)
  }

  async restoreTask(taskId: string): Promise<TaskResult> {
    return this.inner.restoreTask(taskId)
  }

  async listDeletedTasks(): Promise<Task[]> {
    return this.inner.listDeletedTasks()
  }

  async softDeleteGoal(goalId: string): Promise<void> {
    return this.inner.softDeleteGoal(goalId)
  }

  async restoreGoal(goalId: string): Promise<GoalResult> {
    return this.inner.restoreGoal(goalId)
  }

  async listDeletedGoals(): Promise<GoalCard[]> {
    return this.inner.listDeletedGoals()
  }

  async createDailyReviewItem(date: string, blocks: import('../types/dailyReview').DailyReviewBlock[]): Promise<import('./mutationAdapter').DailyReviewResult> {
    return this.inner.createDailyReviewItem(date, blocks)
  }

  async updateDailyReviewItem(id: string, blocks: import('../types/dailyReview').DailyReviewBlock[]): Promise<import('./mutationAdapter').DailyReviewResult> {
    return this.inner.updateDailyReviewItem(id, blocks)
  }

  async deleteDailyReviewItem(id: string): Promise<void> {
    return this.inner.deleteDailyReviewItem(id)
  }

  async getDailyReviewTimeline(limit?: number, beforeDate?: string): Promise<import('../types/dailyReview').DailyReviewItem[]> {
    return this.inner.getDailyReviewTimeline(limit, beforeDate)
  }

  async exportDatabase(targetPath?: string): Promise<{ statusMessage?: string; success: boolean }> {
    return this.inner.exportDatabase(targetPath)
  }

  async importDatabase(defaultPath?: string): Promise<{ statusMessage?: string; success: boolean }> {
    return this.inner.importDatabase(defaultPath)
  }

  async pickDirectory(): Promise<string | null> {
    return this.inner.pickDirectory()
  }
}
