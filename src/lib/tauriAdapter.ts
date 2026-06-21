import {
  addTaskNote as persistTaskNote,
  captureTask,
  createArea as persistCreateArea,
  createGoal as persistGoal,
  createTaskForGoal as persistTaskForGoal,
  createSystemReminder as persistCreateSystemReminder,
  deleteArea as persistDeleteArea,
  listAreas as persistListAreas,
  loadGoalList as persistLoadGoalList,
  renameArea as persistRenameArea,
  updateGoalFields as persistGoalFields,
  updateGoalStatus as persistGoalStatus,
  updateTaskContent as persistTaskContent,
  updateTaskFields as persistTaskFields,
  updateTaskStatus as persistTaskStatus,
} from './tauriCommands'
import type { GoalCard, GoalStatus, AreaWithStats } from '../types/app'
import type { Task, TaskStatus } from '../types/task'
import type { TaskMutation, GoalMutation, AreaMutation, QueryAdapter, TaskResult, GoalResult, AreaResult, DeleteAreaResult } from './mutationAdapter'

export class TauriAdapter implements TaskMutation, GoalMutation, AreaMutation, QueryAdapter {
  async createTask(title: string): Promise<TaskResult> {
    return {
      task: await captureTask(title),
      statusMessage: 'Saved to local database',
    }
  }

  async createTaskForGoal(goal: GoalCard, title: string): Promise<TaskResult> {
    return {
      task: await persistTaskForGoal(goal.id, title),
      statusMessage: 'Task linked to goal and saved to local database',
    }
  }

  async createGoal(
    input: { title: string; area: string; description: string },
    options?: { openGoalWorkspace?: boolean },
  ): Promise<GoalResult & { openGoalWorkspace: boolean }> {
    const openGoalWorkspace = options?.openGoalWorkspace ?? true
    return {
      goal: await persistGoal({
        title: input.title,
        area: input.area,
        description: input.description,
        status: 'ACTIVE',
      }),
      statusMessage: 'Goal saved to local database',
      openGoalWorkspace,
    }
  }

  async updateGoalFields(goalId: string, input: { title: string; area: string; description: string }): Promise<GoalResult> {
    return {
      goal: await persistGoalFields(goalId, { title: input.title, area: input.area, description: input.description }),
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
    return {
      task: await persistTaskNote(taskId, note),
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
      plannedStartAt?: Date
      dueDate?: Date
      linkedGoalId?: string
      linkedGoalLabel?: string
      showInTimeline?: boolean
      systemReminderId?: string
    },
  ): Promise<TaskResult> {
    return {
      task: await persistTaskFields(taskId, {
        title: input.title,
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
    const area = await persistCreateArea(title)
    return {
      area: { id: area.id, title: area.title, goalCount: 0, activeGoalCount: 0, isSystem: false },
      statusMessage: 'Area created',
    }
  }

  async renameArea(areaId: string, newTitle: string): Promise<AreaResult> {
    const area = await persistRenameArea(areaId, newTitle)
    return {
      area: { id: area.id, title: area.title, goalCount: 0, activeGoalCount: 0, isSystem: false },
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

  async createSystemReminder(title: string, dueAt?: Date): Promise<string> {
    return persistCreateSystemReminder(title, dueAt)
  }

  async loadGoals(): Promise<GoalCard[]> {
    return persistLoadGoalList()
  }
}
