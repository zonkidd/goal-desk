import {
  addTaskNote as persistTaskNote,
  captureTask,
  createArea as persistCreateArea,
  createGoal as persistGoal,
  createTaskForGoal as persistTaskForGoal,
  deleteArea as persistDeleteArea,
  listAreas as persistListAreas,
  loadGoalList as persistLoadGoalList,
  renameArea as persistRenameArea,
  updateGoalFields as persistGoalFields,
  updateGoalStatus as persistGoalStatus,
  updateTaskContent as persistTaskContent,
  updateTaskFields as persistTaskFields,
  updateTaskStatus as persistTaskStatus,
  softDeleteTask as persistSoftDeleteTask,
  restoreTask as persistRestoreTask,
  listDeletedTasks as persistListDeletedTasks,
  softDeleteGoal as persistSoftDeleteGoal,
  restoreGoal as persistRestoreGoal,
  listDeletedGoals as persistListDeletedGoals,
  createDailyReviewItem as persistCreateDailyReviewItem,
  updateDailyReviewItem as persistUpdateDailyReviewItem,
  deleteDailyReviewItem as persistDeleteDailyReviewItem,
  getDailyReviewTimeline as persistGetDailyReviewTimeline,
} from './tauriCommands'
import type { GoalCard, GoalStatus, AreaWithStats } from '../types/app'
import type { Task, TaskStatus } from '../types/task'
import type { TaskMutation, GoalMutation, AreaMutation, QueryAdapter, TaskResult, GoalResult, AreaResult, DeleteAreaResult } from './mutationAdapter'
import { validateTaskTitle, validateGoalInput, validateAreaTitle } from './validation'

export class TauriAdapter implements TaskMutation, GoalMutation, AreaMutation, QueryAdapter {
  async createTask(title: string): Promise<TaskResult> {
    const validated = validateTaskTitle(title)
    if (!validated) return {}
    return {
      task: await captureTask(validated),
      statusMessage: 'Saved to local database',
    }
  }

  async createTaskForGoal(goal: GoalCard, title: string): Promise<TaskResult> {
    const validated = validateTaskTitle(title)
    if (!validated) return {}
    return {
      task: await persistTaskForGoal(goal.id, validated),
      statusMessage: 'Task linked to goal and saved to local database',
    }
  }

  async createGoal(
    input: { title: string; area: string; description: string },
    options?: { openGoalWorkspace?: boolean },
  ): Promise<GoalResult & { openGoalWorkspace: boolean }> {
    const openGoalWorkspace = options?.openGoalWorkspace ?? true
    const validated = validateGoalInput(input)
    if (!validated) return { openGoalWorkspace }
    return {
      goal: await persistGoal({
        title: validated.title,
        area: validated.area,
        description: validated.description,
        status: 'ACTIVE',
      }),
      statusMessage: 'Goal saved to local database',
      openGoalWorkspace,
    }
  }

  async updateGoalFields(goalId: string, input: { title: string; area: string; description: string }): Promise<GoalResult> {
    const validated = validateGoalInput(input)
    if (!validated) return {}
    return {
      goal: await persistGoalFields(goalId, { title: validated.title, area: validated.area, description: validated.description }),
      statusMessage: 'Goal details saved',
    }
  }

  async updateGoalStatus(goalId: string, status: GoalStatus): Promise<GoalResult> {
    return {
      goal: await persistGoalStatus(goalId, status),
      statusMessage: 'Goal status saved',
    }
  }

  async addTaskNote(taskId: string, note: string): Promise<TaskResult> {
    const validated = validateTaskTitle(note)
    if (!validated) return {}
    return {
      task: await persistTaskNote(taskId, validated),
      statusMessage: 'Activity log updated',
    }
  }

  async updateTaskStatus(taskId: string, status: TaskStatus, note?: string): Promise<TaskResult> {
    return {
      task: await persistTaskStatus(taskId, status, note),
      statusMessage: 'Task status saved',
    }
  }

  async updateTaskContent(taskId: string, content: string): Promise<TaskResult> {
    return {
      task: await persistTaskContent(taskId, content),
      statusMessage: 'Markdown notes saved',
    }
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
    return {
      task: await persistTaskFields(taskId, {
        title: validatedTitle,
        plannedStartAt: input.plannedStartAt,
        dueAt: input.dueDate,
        linkedGoalId: input.linkedGoalId,
        linkedGoalLabel: input.linkedGoalLabel,
        showInTimeline: input.showInTimeline,
        systemReminderId: input.systemReminderId,
      }),
      statusMessage: 'Task details saved',
    }
  }

  async listAreas(): Promise<{ areas?: AreaWithStats[]; statusMessage?: string }> {
    return {
      areas: await persistListAreas(),
      statusMessage: 'Areas loaded',
    }
  }

  async createArea(title: string): Promise<AreaResult> {
    const validated = validateAreaTitle(title)
    if (!validated) return {}
    const area = await persistCreateArea(validated)
    const areas = await persistListAreas()
    const fullArea = areas.find(a => a.id === area.id)
    return {
      area: fullArea ?? { id: area.id, title: area.title, goalCount: 0, activeGoalCount: 0, isSystem: false },
      statusMessage: 'Area created',
    }
  }

  async renameArea(areaId: string, newTitle: string): Promise<AreaResult> {
    const validated = validateAreaTitle(newTitle)
    if (!validated) return {}
    const area = await persistRenameArea(areaId, validated)
    const areas = await persistListAreas()
    const fullArea = areas.find(a => a.id === area.id)
    return {
      area: fullArea ?? { id: area.id, title: area.title, goalCount: 0, activeGoalCount: 0, isSystem: false },
      statusMessage: 'Area renamed',
    }
  }

  async deleteArea(areaId: string, force = false): Promise<DeleteAreaResult> {
    const result = await persistDeleteArea(areaId, force)
    return {
      success: result.success,
      message: result.message,
      statusMessage: result.success ? 'Area deleted' : result.message,
    }
  }

  async loadGoals(): Promise<GoalCard[]> {
    return persistLoadGoalList()
  }

  async softDeleteTask(taskId: string): Promise<void> {
    return persistSoftDeleteTask(taskId)
  }

  async restoreTask(taskId: string): Promise<TaskResult> {
    return {
      task: await persistRestoreTask(taskId),
      statusMessage: 'Task restored from recycle bin',
    }
  }

  async listDeletedTasks(): Promise<Task[]> {
    return persistListDeletedTasks()
  }

  async softDeleteGoal(goalId: string): Promise<void> {
    return persistSoftDeleteGoal(goalId)
  }

  async restoreGoal(goalId: string): Promise<GoalResult> {
    return {
      goal: await persistRestoreGoal(goalId),
      statusMessage: 'Goal restored from recycle bin',
    }
  }

  async listDeletedGoals(): Promise<GoalCard[]> {
    return persistListDeletedGoals()
  }

  async createDailyReviewItem(date: string, blocks: import('../types/dailyReview').DailyReviewBlock[]): Promise<import('./mutationAdapter').DailyReviewResult> {
    try {
      const item = await persistCreateDailyReviewItem(date, blocks)
      return { item, statusMessage: 'Daily review created' }
    } catch (e: any) {
      return { statusMessage: `Failed to create daily review: ${e}` }
    }
  }

  async updateDailyReviewItem(id: string, blocks: import('../types/dailyReview').DailyReviewBlock[]): Promise<import('./mutationAdapter').DailyReviewResult> {
    try {
      const item = await persistUpdateDailyReviewItem(id, blocks)
      return { item, statusMessage: 'Daily review updated' }
    } catch (e: any) {
      return { statusMessage: `Failed to update daily review: ${e}` }
    }
  }

  async deleteDailyReviewItem(id: string): Promise<void> {
    return persistDeleteDailyReviewItem(id)
  }

  async getDailyReviewTimeline(limit?: number, beforeDate?: string): Promise<import('../types/dailyReview').DailyReviewItem[]> {
    return persistGetDailyReviewTimeline(limit, beforeDate)
  }
}
