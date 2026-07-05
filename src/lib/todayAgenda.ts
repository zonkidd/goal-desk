import type { RawAgendaItem, TodayAgenda } from '../types/app'
import type { Task } from '../types/task'
import { startOfDay } from './dateUtils.ts'
import { computeAgendaTimeline } from './agendaTimeline.ts'

export function deriveTodayAgenda(baseTimeline: RawAgendaItem[], tasks: Task[], now = new Date()): TodayAgenda {
  const today = startOfDay(now)
  const todayBaseTimeline = baseTimeline.map((item) => {
    if (item.source === 'todo' || item.occurrenceDate || item.startsAt) return item
    return { ...item, occurrenceDate: today }
  })

  return computeAgendaTimeline({
    baseTimeline: todayBaseTimeline,
    tasks,
    rangeStart: today,
    rangeEnd: today,
  })
}

export function filterAgendaByArea(agenda: TodayAgenda, visibleTasks: Task[]): TodayAgenda {
  const visibleTaskIds = new Set(visibleTasks.map((task) => task.id))
  return agenda.filter((item) => item.source !== 'todo' || visibleTaskIds.has(item.id))
}
