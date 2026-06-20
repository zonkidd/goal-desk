import type { AreaFilter, GoalCard } from '../types/app'
import type { Task } from '../types/task'
import { startOfDay } from './dateUtils'

export function getTodayFocusTasks(tasks: Task[], goals: GoalCard[] = [], areaFilter: AreaFilter = 'ALL', now = new Date()) {
  const today = startOfDay(now)

  let filtered = tasks.filter((task) => {
    if (task.status !== 'IN_PROGRESS') return false

    const startBoundary = task.plannedStartAt || task.createdAt
    if (!startBoundary) return false

    const startDay = startOfDay(startBoundary)
    const endDay = task.dueDate ? startOfDay(task.dueDate) : undefined

    return startDay.getTime() <= today.getTime() && (!endDay || today.getTime() <= endDay.getTime())
  })

  if (areaFilter !== 'ALL') {
    filtered = filterTasksByArea(filtered, goals, areaFilter)
  }

  return filtered
}

export function filterGoalsByArea(goals: GoalCard[], activeArea: AreaFilter) {
  if (activeArea === 'ALL') return goals
  return goals.filter((goal) => goal.area === activeArea)
}

export function filterTasksByArea(tasks: Task[], goals: GoalCard[], activeArea: AreaFilter) {
  if (activeArea === 'ALL') return tasks
  const goalIds = new Set(filterGoalsByArea(goals, activeArea).map((goal) => goal.id))
  return tasks.filter((task) => task.linkedGoalId && goalIds.has(task.linkedGoalId))
}
