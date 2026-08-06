import type { AreaFilter, GoalCard } from '../types/app'
import type { Task } from '../types/task'
import { isTaskInActiveDateRange } from './dateUtils.ts'
import { UNCATEGORIZED_AREA_TITLE } from './constants.ts'

export function getTodayFocusTasks(tasks: Task[], goals: GoalCard[] = [], areaFilter: AreaFilter = 'ALL', now = new Date()) {
  let filtered = tasks.filter((task) => {
    if (task.status !== 'IN_PROGRESS') return false
    return isTaskInActiveDateRange(task, now)
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
  if (activeArea === UNCATEGORIZED_AREA_TITLE) {
    return tasks.filter((task) => !task.linkedGoalId || goalIds.has(task.linkedGoalId))
  }
  return tasks.filter((task) => task.linkedGoalId && goalIds.has(task.linkedGoalId))
}

export function filterTimelineByArea<T extends { id: string; source: string }>(
  timeline: T[],
  filteredTasks: { id: string }[],
): T[] {
  const taskIds = new Set(filteredTasks.map((t) => t.id))
  return timeline.filter((item) => item.source !== 'todo' || taskIds.has(item.id))
}
