import type { GoalCard, ReminderItem } from '../types/app'
import type { Task } from '../types/task'
import { startOfDay, isSameDay, isTaskInActiveDateRange } from './dateUtils.ts'

export interface TodayAttentionGroups {
  overdue: Task[]
  dueToday: Task[]
  ongoing: Task[]
  systemReminders: ReminderItem[]
}

export interface TodayRelevantGoal {
  id: string
  title: string
  area: string
  progress: number
  todayTaskCount: number
  nextTodo: string
  urgencyScore: number
}

export function deriveTodayAttentionGroups(
  tasks: Task[],
  now = new Date(),
  allSystemReminders: ReminderItem[] = [],
  linkedReminderIds: Set<string> = new Set(),
): TodayAttentionGroups {
  const today = startOfDay(now)
  const activeTasks = tasks.filter((task) => task.status === 'TODO' || task.status === 'IN_PROGRESS')
  const deadlineVisibleTasks = tasks.filter(
    (task) => task.status === 'TODO' || task.status === 'IN_PROGRESS' || task.status === 'PAUSED',
  )

  const ongoingBase = activeTasks
    .filter((task) => {
      if (task.status !== 'IN_PROGRESS') return false
      return isTaskInActiveDateRange(task, now)
    })
    .sort((a, b) => {
      const aEndDay = a.dueDate ? startOfDay(a.dueDate) : undefined
      const bEndDay = b.dueDate ? startOfDay(b.dueDate) : undefined
      const aStart = startOfDay(a.plannedStartAt || a.createdAt || new Date(0))
      const bStart = startOfDay(b.plannedStartAt || b.createdAt || new Date(0))

      if (aEndDay && bEndDay) {
        const aDaysRemaining = Math.floor((aEndDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        const bDaysRemaining = Math.floor((bEndDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return aDaysRemaining - bDaysRemaining
      }
      if (aEndDay) return -1
      if (bEndDay) return 1

      const aDaysElapsed = Math.floor((today.getTime() - aStart.getTime()) / (1000 * 60 * 60 * 24))
      const bDaysElapsed = Math.floor((today.getTime() - bStart.getTime()) / (1000 * 60 * 60 * 24))
      return bDaysElapsed - aDaysElapsed
    })

  const ongoingIds = new Set(ongoingBase.map((t) => t.id))
  
  const linkedTodayTasks = activeTasks
    .filter((task) => {
      if (ongoingIds.has(task.id)) return false
      if (!task.systemReminderId) return false
      const linkedReminder = allSystemReminders.find((r) => r.id === task.systemReminderId)
      if (!linkedReminder || !linkedReminder.dueAt || linkedReminder.done) return false
      return isSameDay(linkedReminder.dueAt, now)
    })
    .sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0))

  const mergedOngoing = [...ongoingBase, ...linkedTodayTasks]
  const mergedOngoingIds = new Set(mergedOngoing.map((t) => t.id))

  const overdue = deadlineVisibleTasks
    .filter((task) => task.dueDate && startOfDay(task.dueDate).getTime() < today.getTime() && !mergedOngoingIds.has(task.id))
    .sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0))

  const dueToday = deadlineVisibleTasks
    .filter((task) => task.dueDate && isSameDay(task.dueDate, today) && !overdue.includes(task) && !mergedOngoingIds.has(task.id))
    .sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0))

  const systemReminders = allSystemReminders
    .filter((r) => {
      if (r.done) return false
      if (linkedReminderIds.has(r.id)) return false
      if (!r.dueAt) return false
      return isSameDay(r.dueAt, now)
    })
    .sort((a, b) => (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0))

  return { overdue, dueToday, ongoing: mergedOngoing, systemReminders }
}

export function deriveTodayRelevantGoals(goals: GoalCard[], attentionGroups: TodayAttentionGroups): TodayRelevantGoal[] {
  const relevantGoals: TodayRelevantGoal[] = []

  for (const goal of goals) {
    const todayTasks = attentionGroups.ongoing.filter((task) => task.linkedGoalId === goal.id)

    if (todayTasks.length === 0) continue

    const urgencyScore = todayTasks.length

    relevantGoals.push({
      id: goal.id,
      title: goal.title,
      area: goal.area,
      progress: goal.progress,
      todayTaskCount: todayTasks.length,
      nextTodo: goal.nextTodo,
      urgencyScore,
    })
  }

  return relevantGoals.sort((a, b) => b.urgencyScore - a.urgencyScore)
}
