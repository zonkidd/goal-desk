import type { GoalCard, GoalStatus, AreaWithStats } from '../types/app'
import type { Task, TaskActivityAction, TaskChecklistItem, TaskStatus } from '../types/task'
import type { TaskMutation, GoalMutation, AreaMutation, QueryAdapter, TaskResult, GoalResult, AreaResult, DeleteAreaResult, SystemMutation } from './mutationAdapter'
import { loadBrowserTasks } from './browserCodec'
import { UNCATEGORIZED_AREA_TITLE } from './constants'
import { validateTaskTitle, validateGoalInput, validateAreaTitle } from './validation'
import { computeGoalProgress } from './goalProgress'
import { parseBrowserQuickCapture } from './quickCapture'
import { applyTodoStatusTransition } from './todoTransition'
import { applyTodoFieldPatch, coerceTodoFieldPatchInput } from './todoFieldPatch'

export const BROWSER_PREVIEW_STATUS = 'Browser preview only · local database is unavailable'

const BROWSER_STORAGE_TASKS = 'goal-desk-browser-tasks'
const BROWSER_STORAGE_GOALS = 'goal-desk-browser-goals'
const BROWSER_STORAGE_AREAS = 'goal-desk-browser-areas'
const BROWSER_STORAGE_DELETED_TASKS = 'goal-desk-browser-deleted-tasks'
const BROWSER_STORAGE_DELETED_GOALS = 'goal-desk-browser-deleted-goals'
const BROWSER_STORAGE_DAILY_REVIEWS = 'goal-desk-browser-daily-reviews'

type BrowserDeletedTask = Omit<Task, 'deletedAt'> & { deletedAt?: string }

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

function recalculateGoalProgress(goalId: string): void {
  const goals = loadFromLocalStorage<GoalCard>(BROWSER_STORAGE_GOALS)
  const tasks = loadBrowserTasks()
  const idx = goals.findIndex(g => g.id === goalId)
  if (idx === -1) return

  const { progress, taskCount } = computeGoalProgress(tasks, goalId)
  const nextTodo = tasks
    .find((task) => task.linkedGoalId === goalId && task.status !== 'DONE')
    ?.title ?? ''

  goals[idx] = { ...goals[idx], taskCount, progress, nextTodo }
  saveToLocalStorage(BROWSER_STORAGE_GOALS, goals)
}

function syncAreaStatsFromGoals(): void {
  const goals = loadFromLocalStorage<GoalCard>(BROWSER_STORAGE_GOALS)
  const existingAreas = loadFromLocalStorage<AreaWithStats>(BROWSER_STORAGE_AREAS)
  const areas = existingAreas.map((area) => ({
    ...area,
    goalCount: 0,
    activeGoalCount: 0,
  }))
  const indexByNormalizedTitle = new Map<string, number>()

  areas.forEach((area, index) => {
    indexByNormalizedTitle.set(area.title.toLowerCase(), index)
  })

  for (const goal of goals) {
    const normalizedArea = goal.area.toLowerCase()
    let areaIndex = indexByNormalizedTitle.get(normalizedArea)

    if (areaIndex === undefined) {
      areaIndex = areas.length
      areas.push({
        id: crypto.randomUUID(),
        title: goal.area,
        goalCount: 0,
        activeGoalCount: 0,
        isSystem: false,
      })
      indexByNormalizedTitle.set(normalizedArea, areaIndex)
    }

    areas[areaIndex].goalCount += 1
    if (goal.status === 'ACTIVE' || goal.status === 'READY_TO_COMPLETE') {
      areas[areaIndex].activeGoalCount += 1
    }
  }

  saveToLocalStorage(BROWSER_STORAGE_AREAS, areas)
}

export class BrowserAdapter implements TaskMutation, GoalMutation, AreaMutation, QueryAdapter, SystemMutation {
  async createTask(title: string): Promise<TaskResult> {
    const validated = validateTaskTitle(title)
    if (!validated) return {}

    const parsed = parseBrowserQuickCapture(validated)
    const mockTask: Task = {
      id: crypto.randomUUID(),
      title: parsed.title || validated,
      content: '',
      status: 'TODO',
      plannedStartAt: parsed.plannedStartAt,
      dueDate: parsed.dueDate,
      showInTimeline: parsed.plannedStartAt !== undefined,
      activityLogs: [{ action: 'CREATED', timestamp: new Date() }],
    }

    const tasks = loadBrowserTasks()
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

    const tasks = loadBrowserTasks()
    tasks.unshift(mockTask)
    saveToLocalStorage(BROWSER_STORAGE_TASKS, tasks)

    recalculateGoalProgress(goal.id)

    return { task: mockTask, statusMessage: BROWSER_PREVIEW_STATUS }
  }

  async createGoal(
    input: { title: string; area: string; description: string },
    options?: { openGoalWorkspace?: boolean },
  ): Promise<GoalResult & { openGoalWorkspace: boolean }> {
    const openGoalWorkspace = options?.openGoalWorkspace ?? true
    const validated = validateGoalInput(input)
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
    syncAreaStatsFromGoals()

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
    syncAreaStatsFromGoals()

    return { goal: updatedGoal, statusMessage: BROWSER_PREVIEW_STATUS }
  }

  async updateGoalStatus(goalId: string, status: GoalStatus): Promise<GoalResult> {
    if (status === 'READY_TO_COMPLETE') {
      return {}
    }

    const goals = loadFromLocalStorage<GoalCard>(BROWSER_STORAGE_GOALS)
    const idx = goals.findIndex(g => g.id === goalId)
    if (idx === -1) return {}

    const updatedGoal: GoalCard = { ...goals[idx], status }
    goals[idx] = updatedGoal
    saveToLocalStorage(BROWSER_STORAGE_GOALS, goals)
    syncAreaStatsFromGoals()

    return { goal: updatedGoal, statusMessage: BROWSER_PREVIEW_STATUS }
  }

  async addTaskNote(taskId: string, note: string): Promise<TaskResult> {
    const validated = validateTaskTitle(note)
    if (!validated) return {}

    const tasks = loadBrowserTasks()
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
    const tasks = loadBrowserTasks()
    const idx = tasks.findIndex(t => t.id === taskId)
    if (idx === -1) return {}

    const updatedTask = applyTodoStatusTransition(tasks[idx], status, { note })
    if (updatedTask === tasks[idx]) {
      return { task: tasks[idx], statusMessage: BROWSER_PREVIEW_STATUS }
    }

    tasks[idx] = updatedTask
    saveToLocalStorage(BROWSER_STORAGE_TASKS, tasks)

    if (updatedTask.linkedGoalId) {
      recalculateGoalProgress(updatedTask.linkedGoalId)
    }

    return { task: updatedTask, statusMessage: BROWSER_PREVIEW_STATUS }
  }

  async updateTaskContent(taskId: string, content: string): Promise<TaskResult> {
    const tasks = loadBrowserTasks()
    const idx = tasks.findIndex(t => t.id === taskId)
    if (idx === -1) return {}

    const updatedTask: Task = { ...tasks[idx], content }
    tasks[idx] = updatedTask
    saveToLocalStorage(BROWSER_STORAGE_TASKS, tasks)

    return { task: updatedTask, statusMessage: BROWSER_PREVIEW_STATUS }
  }

  async updateTaskChecklists(taskId: string, items: TaskChecklistItem[]): Promise<TaskResult> {
    const tasks = loadBrowserTasks()
    const idx = tasks.findIndex(t => t.id === taskId)
    if (idx === -1) return {}
    if (tasks[idx].status === 'DONE') {
      return { task: tasks[idx], statusMessage: BROWSER_PREVIEW_STATUS }
    }

    const updatedTask: Task = {
      ...tasks[idx],
      checklists: items
        .map((item, index) => ({
          ...item,
          title: item.title.trim(),
          sortOrder: index,
        }))
        .filter((item) => item.title.length > 0),
    }
    tasks[idx] = updatedTask
    saveToLocalStorage(BROWSER_STORAGE_TASKS, tasks)

    return { task: updatedTask, statusMessage: BROWSER_PREVIEW_STATUS }
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

    const tasks = loadBrowserTasks()
    const idx = tasks.findIndex(t => t.id === taskId)
    if (idx === -1) return {}

    const existingTask = tasks[idx]

    const updatedTask: Task = applyTodoFieldPatch(existingTask, coerceTodoFieldPatchInput({
      ...input,
      title: validatedTitle,
    }))
    tasks[idx] = updatedTask
    saveToLocalStorage(BROWSER_STORAGE_TASKS, tasks)

    if (existingTask.linkedGoalId && existingTask.linkedGoalId !== updatedTask.linkedGoalId) {
      recalculateGoalProgress(existingTask.linkedGoalId)
    }
    if (updatedTask.linkedGoalId) {
      recalculateGoalProgress(updatedTask.linkedGoalId)
    }

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

    const areas = loadFromLocalStorage<AreaWithStats>(BROWSER_STORAGE_AREAS)
    if (areas.some((area) => area.title.toLowerCase() === validated.toLowerCase())) {
      return {}
    }

    const mockArea: AreaWithStats = {
      id: crypto.randomUUID(),
      title: validated,
      goalCount: 0,
      activeGoalCount: 0,
      isSystem: false,
    }

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
    if (areas.some((area) => area.id !== areaId && area.title.toLowerCase() === validated.toLowerCase())) {
      return {}
    }

    const previousTitle = areas[idx].title
    const updatedArea: AreaWithStats = { ...areas[idx], title: validated }
    areas[idx] = updatedArea
    saveToLocalStorage(BROWSER_STORAGE_AREAS, areas)

    const goals = loadFromLocalStorage<GoalCard>(BROWSER_STORAGE_GOALS)
    let changed = false
    for (const goal of goals) {
      if (goal.area.toLowerCase() === previousTitle.toLowerCase()) {
        goal.area = validated
        changed = true
      }
    }
    if (changed) {
      saveToLocalStorage(BROWSER_STORAGE_GOALS, goals)
      syncAreaStatsFromGoals()
    }

    return { area: updatedArea, statusMessage: BROWSER_PREVIEW_STATUS }
  }

  async deleteArea(areaId: string, force = false): Promise<DeleteAreaResult> {
    const areas = loadFromLocalStorage<AreaWithStats>(BROWSER_STORAGE_AREAS)
    const idx = areas.findIndex(a => a.id === areaId)
    if (idx === -1) {
      return { success: false, message: 'Area not found', statusMessage: BROWSER_PREVIEW_STATUS }
    }
    const deletedAreaTitle = areas[idx].title

    const goals = loadFromLocalStorage<GoalCard>(BROWSER_STORAGE_GOALS)
    const affectedGoals = goals.filter((goal) => goal.area.toLowerCase() === deletedAreaTitle.toLowerCase())
    if (affectedGoals.length > 0 && !force) {
      return {
        success: false,
        message: `该领域有 ${affectedGoals.length} 个关联目标，请先处理或使用强制删除`,
        statusMessage: BROWSER_PREVIEW_STATUS,
      }
    }

    areas.splice(idx, 1)
    saveToLocalStorage(BROWSER_STORAGE_AREAS, areas)

    let changed = false
    for (const goal of goals) {
      if (goal.area.toLowerCase() === deletedAreaTitle.toLowerCase()) {
        goal.area = UNCATEGORIZED_AREA_TITLE
        changed = true
      }
    }
    if (changed) {
      saveToLocalStorage(BROWSER_STORAGE_GOALS, goals)
      syncAreaStatsFromGoals()
    }

    return { success: true, message: 'Area deleted', statusMessage: BROWSER_PREVIEW_STATUS }
  }

  async loadGoals(): Promise<GoalCard[]> {
    return loadFromLocalStorage<GoalCard>(BROWSER_STORAGE_GOALS)
  }

  async softDeleteTask(taskId: string): Promise<void> {
    const tasks = loadBrowserTasks()
    const idx = tasks.findIndex(t => t.id === taskId)
    if (idx === -1) return
    const [deleted] = tasks.splice(idx, 1)
    saveToLocalStorage(BROWSER_STORAGE_TASKS, tasks)
    if (deleted.linkedGoalId) {
      recalculateGoalProgress(deleted.linkedGoalId)
    }
    const deletedTasks = loadFromLocalStorage<BrowserDeletedTask>(BROWSER_STORAGE_DELETED_TASKS)
    deletedTasks.unshift({ ...deleted, deletedAt: new Date().toISOString() })
    saveToLocalStorage(BROWSER_STORAGE_DELETED_TASKS, deletedTasks)
  }

  async restoreTask(taskId: string): Promise<TaskResult> {
    const deletedTasks = loadFromLocalStorage<BrowserDeletedTask>(BROWSER_STORAGE_DELETED_TASKS)
    const idx = deletedTasks.findIndex(t => t.id === taskId)
    if (idx === -1) return { task: undefined, statusMessage: 'Task not found in recycle bin' }
    const [restored] = deletedTasks.splice(idx, 1)
    const { deletedAt: _deletedAt, ...restoredTask } = restored
    saveToLocalStorage(BROWSER_STORAGE_DELETED_TASKS, deletedTasks)
    const tasks = loadBrowserTasks()
    tasks.unshift(restoredTask)
    saveToLocalStorage(BROWSER_STORAGE_TASKS, tasks)
    if (restoredTask.linkedGoalId) {
      recalculateGoalProgress(restoredTask.linkedGoalId)
    }
    return { task: restoredTask, statusMessage: 'Task restored from recycle bin' }
  }

  async listDeletedTasks(): Promise<Task[]> {
    const deletedTasks = loadFromLocalStorage<BrowserDeletedTask>(BROWSER_STORAGE_DELETED_TASKS)
    return deletedTasks.map((task) => ({
      ...task,
      deletedAt: task.deletedAt ? new Date(task.deletedAt) : undefined,
      activityLogs: task.activityLogs.map((log) => ({
        ...log,
        timestamp: log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp),
      })),
    }))
  }

  async softDeleteGoal(goalId: string): Promise<void> {
    const goals = loadFromLocalStorage<GoalCard>(BROWSER_STORAGE_GOALS)
    const idx = goals.findIndex(g => g.id === goalId)
    if (idx === -1) return
    const [deleted] = goals.splice(idx, 1)
    saveToLocalStorage(BROWSER_STORAGE_GOALS, goals)
    syncAreaStatsFromGoals()
    const deletedGoals = loadFromLocalStorage<GoalCard & { deletedAt?: string }>(BROWSER_STORAGE_DELETED_GOALS)
    deletedGoals.unshift({ ...deleted, deletedAt: new Date().toISOString() })
    saveToLocalStorage(BROWSER_STORAGE_DELETED_GOALS, deletedGoals)
  }

  async restoreGoal(goalId: string): Promise<GoalResult> {
    const deletedGoals = loadFromLocalStorage<GoalCard & { deletedAt?: string }>(BROWSER_STORAGE_DELETED_GOALS)
    const idx = deletedGoals.findIndex(g => g.id === goalId)
    if (idx === -1) return { goal: undefined, statusMessage: 'Goal not found in recycle bin' }
    const [restored] = deletedGoals.splice(idx, 1)
    delete restored.deletedAt
    saveToLocalStorage(BROWSER_STORAGE_DELETED_GOALS, deletedGoals)
    const goals = loadFromLocalStorage<GoalCard>(BROWSER_STORAGE_GOALS)
    goals.unshift(restored)
    saveToLocalStorage(BROWSER_STORAGE_GOALS, goals)
    syncAreaStatsFromGoals()
    return { goal: restored, statusMessage: 'Goal restored from recycle bin' }
  }

  async listDeletedGoals(): Promise<GoalCard[]> {
    return loadFromLocalStorage<GoalCard & { deletedAt?: string }>(BROWSER_STORAGE_DELETED_GOALS)
  }

  // ============================================================================
  // Daily Review (Browser Mock)
  // ============================================================================

  async createDailyReviewItem(date: string, blocks: import('../types/dailyReview').DailyReviewBlock[]): Promise<import('./mutationAdapter').DailyReviewResult> {
    const items = loadFromLocalStorage<import('../types/dailyReview').DailyReviewItem>(BROWSER_STORAGE_DAILY_REVIEWS)
    const now = new Date()
    const newItem: import('../types/dailyReview').DailyReviewItem = {
      id: crypto.randomUUID(),
      date,
      blocks,
      createdAt: now,
      updatedAt: now,
    }
    items.unshift(newItem)
    saveToLocalStorage(BROWSER_STORAGE_DAILY_REVIEWS, items)
    return { item: newItem, statusMessage: BROWSER_PREVIEW_STATUS }
  }

  async updateDailyReviewItem(id: string, blocks: import('../types/dailyReview').DailyReviewBlock[]): Promise<import('./mutationAdapter').DailyReviewResult> {
    const items = loadFromLocalStorage<import('../types/dailyReview').DailyReviewItem>(BROWSER_STORAGE_DAILY_REVIEWS)
    const idx = items.findIndex((i) => i.id === id)
    if (idx === -1) {
      return { statusMessage: 'Daily review not found' }
    }
    items[idx] = { ...items[idx], blocks, updatedAt: new Date() }
    saveToLocalStorage(BROWSER_STORAGE_DAILY_REVIEWS, items)
    return { item: items[idx], statusMessage: BROWSER_PREVIEW_STATUS }
  }

  async deleteDailyReviewItem(id: string): Promise<void> {
    const items = loadFromLocalStorage<import('../types/dailyReview').DailyReviewItem>(BROWSER_STORAGE_DAILY_REVIEWS)
    const filtered = items.filter((i) => i.id !== id)
    saveToLocalStorage(BROWSER_STORAGE_DAILY_REVIEWS, filtered)
  }

  async getDailyReviewTimeline(limit?: number, beforeDate?: string): Promise<import('../types/dailyReview').DailyReviewItem[]> {
    let items = loadFromLocalStorage<import('../types/dailyReview').DailyReviewItem>(BROWSER_STORAGE_DAILY_REVIEWS)
    
    // Sort by date descending
    items.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date > b.date ? -1 : 1
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    if (beforeDate) {
      items = items.filter(item => item.date < beforeDate)
    }

    if (limit && limit > 0) {
      items = items.slice(0, limit)
    }

    return items
  }

  async exportDatabase(targetPath?: string): Promise<{ statusMessage?: string; success: boolean }> {
    return { success: false, statusMessage: 'Database backup is not supported in browser preview' }
  }

  async importDatabase(defaultPath?: string): Promise<{ statusMessage?: string; success: boolean }> {
    return { success: false, statusMessage: 'Database restore is not supported in browser preview' }
  }

  async pickDirectory(): Promise<string | null> {
    return null
  }
}
