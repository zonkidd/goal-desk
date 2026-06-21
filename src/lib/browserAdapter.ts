import type { GoalCard, GoalStatus, AreaWithStats } from '../types/app'
import type { Task, TaskActivityAction, TaskStatus } from '../types/task'
import type { TaskMutation, GoalMutation, AreaMutation, TaskResult, GoalResult, AreaResult, DeleteAreaResult } from './mutationAdapter'
import { validateTaskTitle, validateGoalInput, validateAreaTitle } from './validation'

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

export class BrowserAdapter implements TaskMutation, GoalMutation, AreaMutation {
  async createTask(title: string): Promise<TaskResult> {
    const validated = validateTaskTitle(title)
    if (!validated) return {}

    const mockTask: Task = {
      id: crypto.randomUUID(),
      title: validated,
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
    const validated = validateTaskTitle(title)
    if (!validated) return {}

    const mockTask: Task = {
      id: crypto.randomUUID(),
      title: validated,
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
    input: { title: string; area?: string; description?: string },
    options?: { openGoalWorkspace?: boolean },
  ): Promise<GoalResult & { openGoalWorkspace: boolean }> {
    const validated = validateGoalInput(input)
    const openGoalWorkspace = options?.openGoalWorkspace ?? true
    if (!validated) return { openGoalWorkspace }

    const mockGoal: GoalCard = {
      id: crypto.randomUUID(),
      title: validated.title,
      area: validated.area,
      description: validated.description,
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
    const validated = validateGoalInput(input)
    if (!validated) return {}

    const goals = loadFromLocalStorage<GoalCard>(BROWSER_STORAGE_GOALS)
    const idx = goals.findIndex(g => g.id === goalId)
    if (idx === -1) return {}

    const updatedGoal: GoalCard = { ...goals[idx], title: validated.title, area: validated.area, description: validated.description }
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
    const validated = validateTaskTitle(note)
    if (!validated) return {}

    const tasks = loadFromLocalStorage<Task>(BROWSER_STORAGE_TASKS)
    const idx = tasks.findIndex(t => t.id === taskId)
    if (idx === -1) return {}

    const updatedTask: Task = {
      ...tasks[idx],
      activityLogs: [
        { action: 'NOTE_ADDED' as TaskActivityAction, note: validated, timestamp: new Date() },
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
    },
  ): Promise<TaskResult> {
    const validatedTitle = validateTaskTitle(input.title)
    if (!validatedTitle) return {}

    const tasks = loadFromLocalStorage<Task>(BROWSER_STORAGE_TASKS)
    const idx = tasks.findIndex(t => t.id === taskId)
    if (idx === -1) return {}

    const existingTask = tasks[idx]
    const linkedGoalLabel = input.linkedGoalLabel ?? existingTask.linkedGoalLabel

    const updatedTask: Task = {
      ...existingTask,
      title: validatedTitle,
      plannedStartAt: input.plannedStartAt,
      dueDate: input.dueDate,
      linkedGoalId: input.linkedGoalId,
      linkedGoalLabel,
      showInTimeline: input.showInTimeline ?? existingTask.showInTimeline,
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
    const validated = validateAreaTitle(title)
    if (!validated) return {}

    const mockArea: AreaWithStats = {
      id: crypto.randomUUID(),
      title: validated,
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
    const validated = validateAreaTitle(newTitle)
    if (!validated) return {}

    const areas = loadFromLocalStorage<AreaWithStats>(BROWSER_STORAGE_AREAS)
    const idx = areas.findIndex(a => a.id === areaId)
    if (idx === -1) return {}

    const updatedArea: AreaWithStats = { ...areas[idx], title: validated }
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
}
