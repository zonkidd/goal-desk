import type { AreaFilter, GoalCard, RawAgendaItem, ReminderItem, TodayAgenda, TimelineItem } from '../types/app'
import type { Task } from '../types/task'
import {
  deriveTodayAttentionGroups,
  deriveTodayRelevantGoals,
  deriveTodayAgenda,
  filterGoalsByArea,
  filterTasksByArea,
  filterAgendaByArea,
  getInboxTaskGroups,
  getTodayFocusTasks,
  type InboxTaskGroups,
  type TodayAttentionGroups,
  type TodayRelevantGoal,
} from './workspaceDerivation'
import { startOfDay, formatTimeLabel } from './dateUtils'

export interface WorkspaceSnapshot {
  goals: GoalCard[]
  today: {
    timeline: TodayAgenda
    focusTasks: Task[]
    attentionGroups: TodayAttentionGroups
    relevantGoals: TodayRelevantGoal[]
  }
  inbox: InboxTaskGroups
  meta: {
    computedAt: Date
    activeArea: AreaFilter
    taskCount: number
    goalCount: number
  }
}

export interface AtomicState {
  baseTimeline: RawAgendaItem[]
  baseGoals: GoalCard[]
  tasks: Task[]
  activeArea: AreaFilter
  showCompletedTodos: boolean
  now?: Date
  systemReminders?: ReminderItem[]
}

export function computeSnapshot(state: AtomicState): WorkspaceSnapshot {
  const now = state.now ?? new Date()
  const goals = filterGoalsByArea(state.baseGoals, state.activeArea)
  const filteredTasks = filterTasksByArea(state.tasks, state.baseGoals, state.activeArea)
  const focusFiltered = getTodayFocusTasks(state.tasks, state.baseGoals, state.activeArea, now)
  const timeline = deriveTodayAgenda(state.baseTimeline, state.tasks, now)
  const timelineFiltered = state.activeArea === 'ALL' ? timeline : filterAgendaByArea(timeline, filteredTasks)

  const linkedReminderIds = new Set(
    state.tasks.filter((t) => t.systemReminderId).map((t) => t.systemReminderId!),
  )
  const attentionGroups = deriveTodayAttentionGroups(
    state.activeArea === 'ALL' ? state.tasks : filteredTasks,
    now,
    state.systemReminders ?? [],
    linkedReminderIds,
  )
  const relevantGoals = deriveTodayRelevantGoals(state.baseGoals, attentionGroups)
  const inbox = getInboxTaskGroups(filteredTasks, state.showCompletedTodos)

  return {
    goals,
    today: {
      timeline: timelineFiltered,
      focusTasks: focusFiltered,
      attentionGroups,
      relevantGoals,
    },
    inbox,
    meta: {
      computedAt: now,
      activeArea: state.activeArea,
      taskCount: state.tasks.length,
      goalCount: state.baseGoals.length,
    },
  }
}

export function computeRangeTimeline(
  baseTimeline: RawAgendaItem[],
  tasks: Task[],
  rangeStart: Date,
  rangeEnd: Date,
): TimelineItem[] {
  const rangeStartDate = startOfDay(rangeStart)
  const rangeEndDate = startOfDay(rangeEnd)

  const baseItems = baseTimeline.filter((item) => {
    if (item.source === 'todo') return false
    const dateSource = item.startsAt ?? item.occurrenceDate
    if (!dateSource) return false
    const d = startOfDay(dateSource instanceof Date ? dateSource : new Date(dateSource))
    return d.getTime() >= rangeStartDate.getTime() && d.getTime() <= rangeEndDate.getTime()
  })

  const taskItems: TimelineItem[] = []
  for (const task of tasks) {
    if (task.status !== 'IN_PROGRESS') continue
    if (!task.plannedStartAt) continue

    const startDay = startOfDay(task.plannedStartAt)
    const endDay = task.dueDate ? startOfDay(task.dueDate) : undefined
    const isMultiDay = endDay && endDay.getTime() > startDay.getTime()

    if (!isMultiDay) {
      if (startDay.getTime() >= rangeStartDate.getTime() && startDay.getTime() <= rangeEndDate.getTime()) {
        taskItems.push({
          id: task.id,
          title: task.title,
          timeLabel: formatTimeLabel(task.plannedStartAt),
          source: 'todo',
          readonly: false,
          done: false,
          sourceLabel: task.linkedGoalLabel || 'Desk Task',
          startsAt: task.plannedStartAt,
          linkedGoalId: task.linkedGoalId,
        })
      }
    } else {
      const dayMs = 24 * 60 * 60 * 1000
      const totalDays = Math.round((endDay!.getTime() - startDay.getTime()) / dayMs)
      for (let i = 0; i <= totalDays; i++) {
        const dayDate = new Date(startDay.getTime() + i * dayMs)
        if (dayDate.getTime() >= rangeStartDate.getTime() && dayDate.getTime() <= rangeEndDate.getTime()) {
          taskItems.push({
            id: task.id,
            title: task.title,
            timeLabel: formatTimeLabel(task.plannedStartAt),
            source: 'todo',
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
  }

  return [...baseItems, ...taskItems].sort(
    (a, b) => (a.timeLabel || '').localeCompare(b.timeLabel || ''),
  )
}
