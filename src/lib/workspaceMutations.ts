import {
  addTaskNote as persistTaskNote,
  captureTask,
  createArea as persistCreateArea,
  createGoal as persistGoal,
  createTaskForGoal as persistTaskForGoal,
  deleteArea as persistDeleteArea,
  isTauriRuntime,
  listAreas as persistListAreas,
  renameArea as persistRenameArea,
  updateGoalFields as persistGoalFields,
  updateGoalStatus as persistGoalStatus,
  updateTaskContent as persistTaskContent,
  updateTaskFields as persistTaskFields,
  updateTaskStatus as persistTaskStatus,
} from './desktopApi'
import type { AreaWithStats, GoalCard, GoalStatus } from '../types/app'
import type { Task, TaskActivityAction, TaskStatus } from '../types/task'

export const BROWSER_PREVIEW_STATUS = 'Browser preview only · local database is unavailable'

// Browser mode localStorage keys
const BROWSER_STORAGE_TASKS = 'goal-desk-browser-tasks'
const BROWSER_STORAGE_GOALS = 'goal-desk-browser-goals'
const BROWSER_STORAGE_AREAS = 'goal-desk-browser-areas'

// Browser mode storage helpers
function loadFromLocalStorage<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveToLocalStorage<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // Ignore storage errors
  }
}

export class TauriMutations {
  async createTask(title: string): Promise<{ task?: Task; statusMessage?: string }> {
    const trimmed = title.trim()
    if (!trimmed) return {}

    return {
      task: await captureTask(trimmed),
      statusMessage: 'Saved to local database',
    }
  }

  async createTaskForGoal(goal: GoalCard, title: string): Promise<{ task?: Task; statusMessage?: string }> {
    const trimmed = title.trim()
    if (!trimmed) return {}

    return {
      task: await persistTaskForGoal(goal.id, trimmed),
      statusMessage: 'Task linked to goal and saved to local database',
    }
  }

  async createGoal(
    input: { title: string; area?: string; description?: string },
    options?: { openGoalWorkspace?: boolean },
  ): Promise<{ goal?: GoalCard; statusMessage?: string; openGoalWorkspace: boolean }> {
    const title = input.title.trim()
    const area = input.area?.trim()
    const openGoalWorkspace = options?.openGoalWorkspace ?? true
    if (!title) return { openGoalWorkspace }

    return {
      goal: await persistGoal({
        title,
        area,
        description: input.description?.trim() || '',
        status: 'ACTIVE',
      }),
      statusMessage: 'Goal saved to local database',
      openGoalWorkspace,
    }
  }

  async updateGoalFields(goalId: string, input: { title: string; area: string; description: string }): Promise<{ goal?: GoalCard; statusMessage?: string }> {
    const title = input.title.trim()
    const area = input.area.trim()
    if (!title || !area) return {}

    return {
      goal: await persistGoalFields(goalId, {
        title,
        area,
        description: input.description.trim(),
      }),
      statusMessage: 'Goal details saved',
    }
  }

  async updateGoalStatus(goalId: string, status: GoalStatus): Promise<{ goal?: GoalCard; statusMessage?: string }> {
    return {
      goal: await persistGoalStatus(goalId, status),
      statusMessage: 'Goal status saved',
    }
  }

  async addTaskNote(taskId: string, note: string): Promise<{ task?: Task; statusMessage?: string }> {
    const trimmed = note.trim()
    if (!trimmed) return {}

    return {
      task: await persistTaskNote(taskId, trimmed),
      statusMessage: 'Activity log updated',
    }
  }

  async updateTaskStatus(taskId: string, status: TaskStatus, note?: string): Promise<{ task?: Task; statusMessage?: string }> {
    return {
      task: await persistTaskStatus(taskId, status, note),
      statusMessage: 'Task status saved',
    }
  }

  async updateTaskContent(taskId: string, content: string): Promise<{ task?: Task; statusMessage?: string }> {
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
    },
  ): Promise<{ task?: Task; statusMessage?: string }> {
    const trimmedTitle = input.title.trim()
    if (!trimmedTitle) return {}
    const linkedGoalLabel = input.linkedGoalId
      ? input.availableGoals?.find((goal) => goal.id === input.linkedGoalId)?.title
      : undefined

    return {
      task: await persistTaskFields(taskId, {
        title: trimmedTitle,
        plannedStartAt: input.plannedStartAt,
        dueAt: input.dueDate,
        linkedGoalId: input.linkedGoalId,
        linkedGoalLabel,
        showInTimeline: input.showInTimeline,
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

  async createArea(title: string): Promise<{ area?: AreaWithStats; statusMessage?: string }> {
    const trimmed = title.trim()
    if (!trimmed) return {}

    const area = await persistCreateArea(trimmed)
    // 重新加载所有 areas 以获取正确的统计数据
    const allAreas = await persistListAreas()
    const createdArea = allAreas.find(a => a.id === area.id)

    return {
      area: createdArea || {
        id: area.id,
        title: area.title,
        goalCount: 0,
        activeGoalCount: 0,
        isSystem: false,
      },
      statusMessage: 'Area created',
    }
  }

  async renameArea(areaId: string, newTitle: string): Promise<{ area?: AreaWithStats; statusMessage?: string }> {
    const trimmed = newTitle.trim()
    if (!trimmed) return {}

    const area = await persistRenameArea(areaId, trimmed)
    // 重新加载所有 areas 以获取正确的统计数据
    const allAreas = await persistListAreas()
    const renamedArea = allAreas.find(a => a.id === area.id)

    return {
      area: renamedArea || {
        id: area.id,
        title: area.title,
        goalCount: 0,
        activeGoalCount: 0,
        isSystem: false,
      },
      statusMessage: 'Area renamed',
    }
  }

  async deleteArea(areaId: string, force = false): Promise<{ success: boolean; message: string; statusMessage?: string }> {
    const result = await persistDeleteArea(areaId, force)
    return {
      success: result.success,
      message: result.message,
      statusMessage: result.success ? 'Area deleted' : result.message,
    }
  }
}

export class BrowserMutations {
  async createTask(title: string): Promise<{ task?: Task; statusMessage?: string }> {
    const trimmed = title.trim()
    if (!trimmed) return {}

    const mockTask: Task = {
      id: crypto.randomUUID(),
      title: trimmed,
      content: '',
      status: 'TODO',
      showInTimeline: false,
      activityLogs: [
        {
          action: 'CREATED',
          timestamp: new Date(),
        },
      ],
    }

    const tasks = loadFromLocalStorage<Task>(BROWSER_STORAGE_TASKS)
    tasks.unshift(mockTask)
    saveToLocalStorage(BROWSER_STORAGE_TASKS, tasks)

    return { task: mockTask, statusMessage: BROWSER_PREVIEW_STATUS }
  }

  async createTaskForGoal(goal: GoalCard, title: string): Promise<{ task?: Task; statusMessage?: string }> {
    const trimmed = title.trim()
    if (!trimmed) return {}

    const mockTask: Task = {
      id: crypto.randomUUID(),
      title: trimmed,
      content: '',
      status: 'TODO',
      showInTimeline: false,
      linkedGoalId: goal.id,
      linkedGoalLabel: goal.title,
      activityLogs: [
        {
          action: 'CREATED',
          timestamp: new Date(),
        },
      ],
    }

    const tasks = loadFromLocalStorage<Task>(BROWSER_STORAGE_TASKS)
    tasks.unshift(mockTask)
    saveToLocalStorage(BROWSER_STORAGE_TASKS, tasks)

    return { task: mockTask, statusMessage: BROWSER_PREVIEW_STATUS }
  }

  async createGoal(
    input: { title: string; area?: string; description?: string },
    options?: { openGoalWorkspace?: boolean },
  ): Promise<{ goal?: GoalCard; statusMessage?: string; openGoalWorkspace: boolean }> {
    const title = input.title.trim()
    const area = input.area?.trim()
    const openGoalWorkspace = options?.openGoalWorkspace ?? true
    if (!title) return { openGoalWorkspace }

    const mockGoal: GoalCard = {
      id: crypto.randomUUID(),
      title,
      area: area || 'Inbox',
      description: input.description?.trim() || '',
      status: 'ACTIVE',
      progress: 0,
      nextTodo: '',
      taskCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const goals = loadFromLocalStorage<GoalCard>(BROWSER_STORAGE_GOALS)
    goals.unshift(mockGoal)
    saveToLocalStorage(BROWSER_STORAGE_GOALS, goals)

    return {
      goal: mockGoal,
      statusMessage: BROWSER_PREVIEW_STATUS,
      openGoalWorkspace,
    }
  }

  async updateGoalFields(goalId: string, input: { title: string; area: string; description: string }): Promise<{ goal?: GoalCard; statusMessage?: string }> {
    const title = input.title.trim()
    const area = input.area.trim()
    if (!title || !area) return {}

    return { statusMessage: BROWSER_PREVIEW_STATUS }
  }

  async updateGoalStatus(goalId: string, status: GoalStatus): Promise<{ goal?: GoalCard; statusMessage?: string }> {
    return { statusMessage: BROWSER_PREVIEW_STATUS }
  }

  async addTaskNote(taskId: string, note: string): Promise<{ task?: Task; statusMessage?: string }> {
    const trimmed = note.trim()
    if (!trimmed) return {}

    return { statusMessage: BROWSER_PREVIEW_STATUS }
  }

  async updateTaskStatus(taskId: string, status: TaskStatus, note?: string): Promise<{ task?: Task; statusMessage?: string }> {
    return { statusMessage: BROWSER_PREVIEW_STATUS }
  }

  async updateTaskContent(taskId: string, content: string): Promise<{ task?: Task; statusMessage?: string }> {
    return { statusMessage: BROWSER_PREVIEW_STATUS }
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
    },
  ): Promise<{ task?: Task; statusMessage?: string }> {
    const trimmedTitle = input.title.trim()
    if (!trimmedTitle) return {}

    return { statusMessage: BROWSER_PREVIEW_STATUS, task: undefined }
  }

  async listAreas(): Promise<{ areas?: AreaWithStats[]; statusMessage?: string }> {
    const areas = loadFromLocalStorage<AreaWithStats>(BROWSER_STORAGE_AREAS)
    return {
      areas,
      statusMessage: BROWSER_PREVIEW_STATUS,
    }
  }

  async createArea(title: string): Promise<{ area?: AreaWithStats; statusMessage?: string }> {
    const trimmed = title.trim()
    if (!trimmed) return {}

    const mockArea: AreaWithStats = {
      id: crypto.randomUUID(),
      title: trimmed,
      goalCount: 0,
      activeGoalCount: 0,
      isSystem: false,
    }

    const areas = loadFromLocalStorage<AreaWithStats>(BROWSER_STORAGE_AREAS)
    areas.push(mockArea)
    saveToLocalStorage(BROWSER_STORAGE_AREAS, areas)

    return { area: mockArea, statusMessage: BROWSER_PREVIEW_STATUS }
  }

  async renameArea(areaId: string, newTitle: string): Promise<{ area?: AreaWithStats; statusMessage?: string }> {
    const trimmed = newTitle.trim()
    if (!trimmed) return {}

    return { statusMessage: BROWSER_PREVIEW_STATUS }
  }

  async deleteArea(areaId: string, force = false): Promise<{ success: boolean; message: string; statusMessage?: string }> {
    return {
      success: false,
      message: BROWSER_PREVIEW_STATUS,
      statusMessage: BROWSER_PREVIEW_STATUS,
    }
  }
}

export function createWorkspaceMutationAdapter(): TauriMutations | BrowserMutations {
  if (isTauriRuntime()) {
    return new TauriMutations()
  }
  return new BrowserMutations()
}

export function createBrowserTaskNote(note: string) {
  return {
    action: 'NOTE_ADDED' as TaskActivityAction,
    note,
    timestamp: new Date(),
  }
}
