import type { GoalCard, RawAgendaItem, TodayAgenda } from '../types/app'
import type { Task } from '../types/task'
import { startOfDay, formatTimeLabel, timeLabelSortValue } from './dateUtils'

export function deriveTodayAgenda(baseTimeline: RawAgendaItem[], tasks: Task[], now = new Date()): TodayAgenda {
  const today = startOfDay(now)
  const taskItems: RawAgendaItem[] = []

  for (const task of tasks) {
    if (task.status !== 'IN_PROGRESS') continue
    if (!task.plannedStartAt) continue

    const startDay = startOfDay(task.plannedStartAt)
    const endDay = task.dueDate ? startOfDay(task.dueDate) : undefined

    const isInTimeRange = startDay.getTime() <= today.getTime() && (!endDay || today.getTime() <= endDay.getTime())
    if (!isInTimeRange) continue

    const isStartingToday = startDay.getTime() === today.getTime()
    if (!isStartingToday && task.showInTimeline !== true) continue

    const isMultiDay = endDay && endDay.getTime() > startDay.getTime()

    if (!isMultiDay) {
      taskItems.push({
        id: task.id,
        title: task.title,
        timeLabel: formatTimeLabel(task.plannedStartAt),
        source: 'todo' as const,
        readonly: false,
        done: false,
        sourceLabel: task.linkedGoalLabel || 'Desk Task',
        startsAt: task.plannedStartAt,
        linkedGoalId: task.linkedGoalId,
      })
    } else {
      const dayMs = 24 * 60 * 60 * 1000
      const totalDays = Math.round((endDay.getTime() - startDay.getTime()) / dayMs)

      for (let i = 0; i <= totalDays; i++) {
        const dayDate = new Date(startDay.getTime() + i * dayMs)
        taskItems.push({
          id: task.id,
          title: task.title,
          timeLabel: formatTimeLabel(task.plannedStartAt),
          source: 'todo' as const,
          readonly: false,
          done: false,
          sourceLabel: task.linkedGoalLabel || 'Desk Task',
          startsAt: task.plannedStartAt,
          occurrenceDate: dayDate,
          linkedGoalId: task.linkedGoalId,
        })
      }
    }
  }

  const merged = [...baseTimeline.filter((item) => item.source !== 'todo'), ...taskItems]
  return merged.sort((left, right) => timeLabelSortValue(left.timeLabel) - timeLabelSortValue(right.timeLabel))
}

export function filterAgendaByArea(agenda: TodayAgenda, visibleTasks: Task[]): TodayAgenda {
  const visibleTaskIds = new Set(visibleTasks.map((task) => task.id))
  return agenda.filter((item) => item.source !== 'todo' || visibleTaskIds.has(item.id))
}
