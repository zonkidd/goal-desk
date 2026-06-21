import type { GoalCard } from '../types/app'
import type { Task } from '../types/task'
import { startOfDay, isSameDay, isTaskInActiveDateRange } from './dateUtils'

export interface TodayAttentionGroups {
  overdue: Task[]
  dueToday: Task[]
  ongoing: Task[]
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

export function deriveTodayAttentionGroups(tasks: Task[], now = new Date()): TodayAttentionGroups {
  const today = startOfDay(now)
  const activeTasks = tasks.filter((task) => task.status !== 'DONE')

  const overdue = activeTasks
    .filter((task) => task.dueDate && startOfDay(task.dueDate).getTime() < today.getTime())
    .sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0))

  const dueToday = activeTasks
    .filter((task) => task.dueDate && isSameDay(task.dueDate, today) && !overdue.includes(task))
    .sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0))

  const ongoing = activeTasks
    .filter((task) => {
      if (task.status !== 'IN_PROGRESS') return false
      if (overdue.includes(task) || dueToday.includes(task)) return false
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

  return { overdue, dueToday, ongoing }
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
