import type { Task } from '../types/task'
import type { GoalCard } from '../types/app'

const BROWSER_STORAGE_TASKS = 'goal-desk-browser-tasks'
const BROWSER_STORAGE_GOALS = 'goal-desk-browser-goals'

function deserializeDates(obj: Record<string, any>, dateFields: string[]): void {
  for (const field of dateFields) {
    if (obj[field] && typeof obj[field] === 'string') {
      obj[field] = new Date(obj[field])
    }
  }
}

export function loadBrowserTasks(): Task[] {
  try {
    const data = localStorage.getItem(BROWSER_STORAGE_TASKS)
    if (!data) return []
    const tasks: Task[] = JSON.parse(data)
    for (const task of tasks) {
      deserializeDates(task as any, ['plannedStartAt', 'dueDate', 'createdAt', 'updatedAt', 'deletedAt'])
      if (task.activityLogs) {
        for (const log of task.activityLogs) {
          deserializeDates(log as any, ['timestamp'])
        }
      }
      task.checklists = task.checklists ?? []
    }
    return tasks
  } catch {
    return []
  }
}

export function loadBrowserGoals(): GoalCard[] {
  try {
    const data = localStorage.getItem(BROWSER_STORAGE_GOALS)
    if (!data) return []
    const goals: GoalCard[] = JSON.parse(data)
    return goals
  } catch {
    return []
  }
}

export function loadBrowserData(): { tasks: Task[]; goals: GoalCard[] } {
  return { tasks: loadBrowserTasks(), goals: loadBrowserGoals() }
}
