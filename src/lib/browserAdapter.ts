import type { GoalCard, GoalStatus, AreaWithStats } from '../types/app'
import type { Task, TaskActivityAction, TaskStatus } from '../types/task'
import type { TaskMutation, GoalMutation, AreaMutation, QueryAdapter, TaskResult, GoalResult, AreaResult, DeleteAreaResult } from './mutationAdapter'

export const BROWSER_PREVIEW_STATUS = 'Browser preview only · local database is unavailable'

const BROWSER_STORAGE_TASKS = 'goal-desk-browser-tasks'
const BROWSER_STORAGE_GOALS = 'goal-desk-browser-goals'
const BROWSER_STORAGE_AREAS = 'goal-desk-browser-areas'

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
  }
}

export class BrowserAdapter implements TaskMutation, GoalMutation, AreaMutation, QueryAdapter {
  async createTask(title: string): Promise<TaskResult> {
    const mockTask: Task = {
      id: crypto.randomUUID(),
      title,
      content: '',
      status: 'TODO',
      showInTimeline: false,
      activityLogs: [{ action: 'CREATED', timestamp: new Date() }],
    }

    const tasks = loadFromLocalStorage<Task>(BROWSER_STORAGE_TASKS)
    tasks.unshift(mockTask)
    saveToLocalStorage(BROWSER_STORAGE_TASKS, tasks)

    return { task: mockTask, statusMessage: BROWSER_PREVIEW_STATUS }
  }

  async createTaskForGoal(goal: GoalCard, title: string): Promise<TaskResult> {
    const mockTask: Task = {
      id: crypto.randomUUID(),
      title,
      content: '',
      status: 'TODO',
      showInTimeline: false,
      linkedGoalId: goal.id,
      linkedGoalLabel: goal.title,
      activityLogs: [{ action: 'CREATED', timestamp: new Date() }],
    }

    const tasks = loadFromLocalStorage<Task>(BROWSER_STORAGE_TASKS)
    tasks.unshift(mockTask)
    saveToLocalStorage(BROWSER_STORAGE_TASKS, tasks)

    return { task: mockTask, statusMessage: BROWSER_PREVIEW_STATUS }
  }

  async createGoal(
    input: { title: string; area: string; description: string },
    options?: { openGoalWorkspace?: boolean },
  ): Promise<GoalResult & { openGoalWorkspace: boolean }> {
    const openGoalWorkspace = options?.openGoalWorkspace ?? true

    const mockGoal: GoalCard = {
      id: crypto.randomUUID(),
      title: input.title,
      area: input.area,
      description: input.description,
      status: 'ACTIVE',
      progress: 0,
      nextTodo: '',
      taskCount: 0,
    }

    const goals = loadFromLocalStorage<GoalCard>(BROWSER_STORAGE_GOALS)
    goals.unshift(mockGoal)
    saveToLocalStorage(BROWSER_STORAGE_GOALS, goals)

    return { goal: mockGoal, statusMessage: BROWSER_PREVIEW_STATUS, openGoalWorkspace }
  }

  async updateGoalFields(goalId: string, input: { title: string; area: string; description: string }): Promise<GoalResult> {
    const goals = loadFromLocalStorage<GoalCard>(BROWSER_STORAGE_GOALS)
    const idx = goals.findIndex(g => g.id === goalId)
    if (idx === -1) return {}

    const updatedGoal: GoalCard = { ...goals[idx], title: input.title, area: input.area, description: input.description }
    goals[idx] = updatedGoal
    saveToLocalStorage(BROWSER_STORAGE_GOALS, goals)

    return { goal: updatedGoal, statusMessage: BROWSER_PREVIEW_STATUS }
  }

  async updateGoalStatus(goalId: string, status: GoalStatus): Promise<GoalResult> {
    const goals = loadFromLocalStorage<GoalCard>(BROWSER_STORAGE_GOALS)
    const idx = goals.findIndex(g => g.id === goalId)
    if (idx === -1) return {}

    const updatedGoal: GoalCard = { ...goals[idx], status }
    goals[idx] = updatedGoal
    saveToLocalStorage(BROWSER_STORAGE_GOALS, goals)

    return { goal: updatedGoal, statusMessage: BROWSER_PREVIEW_STATUS }
  }

  async addTaskNote(taskId: string, note: string): Promise<TaskResult> {
    const tasks = loadFromLocalStorage<Task>(BROWSER_STORAGE_TASKS)
    const idx = tasks.findIndex(t => t.id === taskId)
    if (idx === -1) return {}

    const updatedTask: Task = {
      ...tasks[idx],
      activityLogs: [
        { action: 'NOTE_ADDED' as TaskActivityAction, note, timestamp: new Date() },
        ...tasks[idx].activityLogs,
      ],
    }
    tasks[idx] = updatedTask
    saveToLocalStorage(BROWSER_STORAGE_TASKS, tasks)

    return { task: updatedTask, statusMessage: BROWSER_PREVIEW_STATUS }
  }

  async updateTaskStatus(taskId: string, status: TaskStatus, note?: string): Promise<TaskResult> {
    const tasks = loadFromLocalStorage<Task>(BROWSER_STORAGE_TASKS)
    const idx = tasks.findIndex(t => t.id === taskId)
    if (idx === -1) return {}

    const updatedTask: Task = { ...tasks[idx], status }
    if (note?.trim()) {
      const action: TaskActivityAction = status === 'DONE' ? 'COMPLETED' : 
                                         status === 'PAUSED' ? 'PAUSED' :
                                         status === 'IN_PROGRESS' ? 'RESUMED' : 'STARTED'
      updatedTask.activityLogs = [
        { action, note: note.trim(), timestamp: new Date() },
        ...tasks[idx].activityLogs,
      ]
    }
    tasks[idx] = updatedTask
    saveToLocalStorage(BROWSER_STORAGE_TASKS, tasks)

    return { task: updatedTask, statusMessage: BROWSER_PREVIEW_STATUS }
  }

  async updateTaskContent(taskId: string, content: string): Promise<TaskResult> {
    const tasks = loadFromLocalStorage<Task>(BROWSER_STORAGE_TASKS)
    const idx = tasks.findIndex(t => t.id === taskId)
    if (idx === -1) return {}

    const updatedTask: Task = { ...tasks[idx], content }
    tasks[idx] = updatedTask
    saveToLocalStorage(BROWSER_STORAGE_TASKS, tasks)

    return { task: updatedTask, statusMessage: BROWSER_PREVIEW_STATUS }
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
    const tasks = loadFromLocalStorage<Task>(BROWSER_STORAGE_TASKS)
    const idx = tasks.findIndex(t => t.id === taskId)
    if (idx === -1) return {}

    const existingTask = tasks[idx]
    const linkedGoalLabel = input.linkedGoalLabel ?? existingTask.linkedGoalLabel

    const updatedTask: Task = {
      ...existingTask,
      title: input.title,
      plannedStartAt: input.plannedStartAt,
      dueDate: input.dueDate,
      linkedGoalId: input.linkedGoalId,
      linkedGoalLabel,
      showInTimeline: input.showInTimeline ?? existingTask.showInTimeline,
      systemReminderId: input.systemReminderId,
    }
    tasks[idx] = updatedTask
    saveToLocalStorage(BROWSER_STORAGE_TASKS, tasks)

    return { task: updatedTask, statusMessage: BROWSER_PREVIEW_STATUS }
  }

  async listAreas(): Promise<{ areas?: AreaWithStats[]; statusMessage?: string }> {
    return {
      areas: loadFromLocalStorage<AreaWithStats>(BROWSER_STORAGE_AREAS),
      statusMessage: BROWSER_PREVIEW_STATUS,
    }
  }

  async createArea(title: string): Promise<AreaResult> {
    const mockArea: AreaWithStats = {
      id: crypto.randomUUID(),
      title,
      goalCount: 0,
      activeGoalCount: 0,
      isSystem: false,
    }

    const areas = loadFromLocalStorage<AreaWithStats>(BROWSER_STORAGE_AREAS)
    areas.push(mockArea)
    saveToLocalStorage(BROWSER_STORAGE_AREAS, areas)

    return { area: mockArea, statusMessage: BROWSER_PREVIEW_STATUS }
  }

  async renameArea(areaId: string, newTitle: string): Promise<AreaResult> {
    const areas = loadFromLocalStorage<AreaWithStats>(BROWSER_STORAGE_AREAS)
    const idx = areas.findIndex(a => a.id === areaId)
    if (idx === -1) return {}

    const updatedArea: AreaWithStats = { ...areas[idx], title: newTitle }
    areas[idx] = updatedArea
    saveToLocalStorage(BROWSER_STORAGE_AREAS, areas)

    return { area: updatedArea, statusMessage: BROWSER_PREVIEW_STATUS }
  }

  async deleteArea(_areaId: string, _force = false): Promise<DeleteAreaResult> {
    return {
      success: false,
      message: BROWSER_PREVIEW_STATUS,
      statusMessage: BROWSER_PREVIEW_STATUS,
    }
  }

  async createSystemReminder(_title: string, _dueAt?: Date): Promise<string> {
    return `mock-reminder-${Date.now()}`
  }

  async loadGoals(): Promise<GoalCard[]> {
    return loadFromLocalStorage<GoalCard>(BROWSER_STORAGE_GOALS)
  }
}
