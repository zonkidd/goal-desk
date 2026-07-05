import type { Task, TaskActivityAction, TaskStatus } from '../types/task'
import { startOfDay } from './dateUtils.ts'
import { getAllowedTodoStatusActions, getTodoStatusActionLabel, logActionForTodoTransition } from './todoTransition.ts'

export function getRuntimeModeStatusMessage(isTauri: boolean) {
  return isTauri ? 'Rust + Tauri data' : 'Browser preview only · no SQLite or Tauri IPC'
}

export function getTaskPrimaryStatusLabel(status: TaskStatus) {
  return getTodoStatusActionLabel(status)
}

export function getTaskStatusActions(status: TaskStatus): TaskStatus[] {
  return getAllowedTodoStatusActions(status)
}

export function logActionForTransition(fromStatus: TaskStatus, toStatus: TaskStatus): TaskActivityAction {
  return logActionForTodoTransition(fromStatus, toStatus)
}

export function getTaskContentBadgeLabel(content: string) {
  return content.trim() ? '包含 Markdown 笔记' : '暂无笔记'
}

export type TaskUrgency = 'critical' | 'warning' | 'normal' | 'none'

export interface TaskTimeInfo {
  daysElapsed: number
  daysRemaining: number | null
  urgency: TaskUrgency
  startDate: Date
  todayDate: Date
  endDate: Date | null
  totalDays: number | null
  progressPercent: number | null
}

export function getTaskTimeInfo(task: Task, now = new Date()): TaskTimeInfo {
  const today = startOfDay(now)
  const startDate = task.plannedStartAt || task.createdAt || now
  const startDay = startOfDay(startDate)

  // 计算已推进天数
  const daysElapsed = Math.max(0, Math.floor((today.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)))

  // 计算剩余天数和紧急度
  let daysRemaining: number | null = null
  let urgency: TaskUrgency = 'none'
  let endDate: Date | null = null
  let totalDays: number | null = null
  let progressPercent: number | null = null

  if (task.dueDate) {
    endDate = task.dueDate
    const dueDay = startOfDay(task.dueDate)
    daysRemaining = Math.floor((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysRemaining <= 2) urgency = 'critical'
    else if (daysRemaining <= 7) urgency = 'warning'
    else urgency = 'normal'

    // 计算总天数和进度百分比
    totalDays = Math.max(1, Math.floor((dueDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)))
    progressPercent = Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)))
  }

  return {
    daysElapsed,
    daysRemaining,
    urgency,
    startDate: startDay,
    todayDate: today,
    endDate,
    totalDays,
    progressPercent,
  }
}

export function getUrgencyColor(urgency: TaskUrgency): string {
  switch (urgency) {
    case 'critical':
      return 'text-red-600'
    case 'warning':
      return 'text-orange-600'
    case 'normal':
      return 'text-green-600'
    case 'none':
      return 'text-slate-400'
  }
}

export function getUrgencyIcon(urgency: TaskUrgency): string {
  switch (urgency) {
    case 'critical':
      return '🔥'
    case 'warning':
      return '⏰'
    case 'normal':
      return '✅'
    case 'none':
      return '∞'
  }
}
