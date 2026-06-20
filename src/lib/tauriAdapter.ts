import {
  addTaskNote as persistTaskNote,
  captureTask,
  createArea as persistCreateArea,
  createGoal as persistGoal,
  createTaskForGoal as persistTaskForGoal,
  createSystemReminder as persistCreateSystemReminder,
  deleteArea as persistDeleteArea,
  listAreas as persistListAreas,
  renameArea as persistRenameArea,
  updateGoalFields as persistGoalFields,
  updateGoalStatus as persistGoalStatus,
  updateTaskContent as persistTaskContent,
  updateTaskFields as persistTaskFields,
  updateTaskStatus as persistTaskStatus,
} from './tauriCommands'
import type { GoalCard, GoalStatus } from '../types/app'
import type { Task, TaskStatus } from '../types/task'
import type { TaskMutation, GoalMutation, AreaMutation, TaskResult, GoalResult, AreaResult, DeleteAreaResult } from './mutationAdapter'
import { validateTaskTitle, validateGoalInput, validateAreaTitle } from './validation'

export class TauriAdapter implements TaskMutation, GoalMutation, AreaMutation {
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
    input: { title: string; area?: string; description?: string },
    options?: { openGoalWorkspace?: boolean },
  ): Promise<GoalResult & { openGoalWorkspace: boolean }> {
    const validated = validateGoalInput(input)
    const openGoalWorkspace = options?.openGoalWorkspace ?? true
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
      plannedStartAt?: Date
      dueDate?: Date
      linkedGoalId?: string
      availableGoals?: GoalCard[]
      showInTimeline?: boolean
      systemReminderId?: string
    },
  ): Promise<TaskResult> {
    const validatedTitle = validateTaskTitle(input.title)
    if (!validatedTitle) return {}
    const linkedGoalLabel = input.linkedGoalId
      ? input.availableGoals?.find((goal) => goal.id === input.linkedGoalId)?.title
      : undefined
    return {
      task: await persistTaskFields(taskId, {
        title: validatedTitle,
        plannedStartAt: input.plannedStartAt,
        dueAt: input.dueDate,
        linkedGoalId: input.linkedGoalId,
        linkedGoalLabel,
        showInTimeline: input.showInTimeline,
        systemReminderId: input.systemReminderId,
      }),
      statusMessage: 'Task details saved',
    }
  }

  async listAreas(): Promise<{ areas?: import('../types/app').AreaWithStats[]; statusMessage?: string }> {
    return {
      areas: await persistListAreas(),
      statusMessage: 'Areas loaded',
    }
  }

  async createArea(title: string): Promise<AreaResult> {
    const validated = validateAreaTitle(title)
    if (!validated) return {}
    const area = await persistCreateArea(validated)
    return {
      area: { id: area.id, title: area.title, goalCount: 0, activeGoalCount: 0, isSystem: false },
      statusMessage: 'Area created',
    }
  }

  async renameArea(areaId: string, newTitle: string): Promise<AreaResult> {
    const validated = validateAreaTitle(newTitle)
    if (!validated) return {}
    const area = await persistRenameArea(areaId, validated)
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
}
