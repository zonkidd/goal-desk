import type { GoalCard, GoalStatus, TimelineItem } from '../types/app'
import type { TaskStatus } from '../types/task'
import type { Task } from '../types/task'

export function getRuntimeModeStatusMessage(isTauri: boolean) {
  return isTauri ? 'Rust + Tauri data' : 'Browser preview only · no SQLite or Tauri IPC'
}

export function getTaskPrimaryStatusLabel(status: TaskStatus) {
  switch (status) {
    case 'PAUSED':
      return 'Resume'
    case 'DONE':
      return 'Reopen'
    case 'IN_PROGRESS':
      return 'In Progress'
    default:
      return 'Start'
  }
}

export function getTaskContentBadgeLabel(content: string) {
  return content.trim() ? '包含 Markdown 笔记' : '暂无笔记'
}

export function filterGoalsByArea(goals: GoalCard[], activeArea: string) {
  if (activeArea === 'ALL') return goals
  return goals.filter((goal) => goal.area === activeArea)
}

export function filterTasksByArea(tasks: Task[], goals: GoalCard[], activeArea: string) {
  if (activeArea === 'ALL') return tasks

  const goalIds = new Set(filterGoalsByArea(goals, activeArea).map((goal) => goal.id))
  return tasks.filter((task) => task.linkedGoalId && goalIds.has(task.linkedGoalId))
}

export function filterTimelineByArea(timeline: TimelineItem[], visibleTasks: Task[]) {
  const visibleTaskIds = new Set(visibleTasks.map((task) => task.id))
  return timeline.filter((item) => item.source !== 'todo' || visibleTaskIds.has(item.id))
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate()
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function deriveGoalStatus(goal: GoalCard, linkedTasks: Task[]): GoalStatus {
  if (goal.status === 'ARCHIVED') return 'ARCHIVED'
  if (goal.status === 'PAUSED') return 'PAUSED'
  if (goal.status === 'COMPLETED' && linkedTasks.some((task) => task.status !== 'DONE')) return 'ACTIVE'
  if (linkedTasks.length > 0 && linkedTasks.every((task) => task.status === 'DONE')) return 'READY_TO_COMPLETE'
  if (goal.status === 'READY_TO_COMPLETE' && linkedTasks.some((task) => task.status !== 'DONE')) return 'ACTIVE'
  return goal.status === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE'
}

export function deriveGoalRecords(goals: GoalCard[], tasks: Task[]): GoalCard[] {
  return goals.map((goal) => {
    const linkedTasks = tasks.filter((task) => task.linkedGoalId === goal.id)
    const completedTaskCount = linkedTasks.filter((task) => task.status === 'DONE').length
    const nextTodo =
      linkedTasks
        .filter((task) => task.status !== 'DONE')
        .sort((left, right) => {
          const leftTime = left.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER
          const rightTime = right.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER
          return leftTime - rightTime
        })[0]?.title || 'Keep going'

    return {
      ...goal,
      progress: linkedTasks.length === 0 ? 0 : Math.round((completedTaskCount / linkedTasks.length) * 100),
      nextTodo,
      taskCount: linkedTasks.length,
      status: deriveGoalStatus(goal, linkedTasks),
      updatedAt: linkedTasks[0]?.updatedAt || goal.updatedAt,
    }
  })
}

export function getTodayFocusTasks(tasks: Task[], now = new Date()) {
  const today = startOfDay(now)
  return tasks.filter((task) => {
    if (task.status === 'DONE' || task.status === 'PAUSED') return false
    if (task.isOngoing) {
      const createdAt = startOfDay(task.createdAt || now)
      const dueDay = task.dueDate ? startOfDay(task.dueDate) : undefined
      return createdAt.getTime() <= today.getTime() && (!dueDay || today.getTime() <= dueDay.getTime())
    }

    return task.dueDate ? isSameDay(task.dueDate, today) : false
  })
}
