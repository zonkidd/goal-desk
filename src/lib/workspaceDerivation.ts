import type { AreaFilter, GoalCard, RawAgendaItem, TodayAgenda } from '../types/app'
import type { Task } from '../types/task'

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

export interface InboxTaskGroups {
  activeTasks: Task[]
  pausedTasks: Task[]
  completed: {
    totalCount: number
    visibleTasks: Task[]
    isCollapsedByDefault: true
  }
}

export function getInboxTaskGroups(tasks: Task[], showCompleted = false): InboxTaskGroups {
  const activeTasks = sortTasksByRecent(tasks.filter((task) => task.status === 'TODO' || task.status === 'IN_PROGRESS'))
  const pausedTasks = sortTasksByRecent(tasks.filter((task) => task.status === 'PAUSED'))
  const completedTasks = sortTasksByRecent(tasks.filter((task) => task.status === 'DONE'))

  return {
    activeTasks,
    pausedTasks,
    completed: {
      isCollapsedByDefault: true as const,
      totalCount: completedTasks.length,
      visibleTasks: showCompleted ? completedTasks : [],
    },
  }
}

function sortTasksByRecent(tasks: Task[]) {
  return [...tasks].sort((a, b) => {
    const aTime = Math.max(...a.activityLogs.map((log) => log.timestamp.getTime()), 0)
    const bTime = Math.max(...b.activityLogs.map((log) => log.timestamp.getTime()), 0)
    return bTime - aTime
  })
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

export function filterAgendaByArea(agenda: TodayAgenda, visibleTasks: Task[]): TodayAgenda {
  const visibleTaskIds = new Set(visibleTasks.map((task) => task.id))
  return agenda.filter((item) => item.source !== 'todo' || visibleTaskIds.has(item.id))
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
      status: deriveGoalStatus(goal.status, linkedTasks),
      updatedAt: linkedTasks[0]?.updatedAt || goal.updatedAt,
    }
  })
}

function deriveGoalStatus(status: GoalCard['status'], linkedTasks: Task[]): GoalCard['status'] {
  if (status === 'ARCHIVED') return 'ARCHIVED'
  if (status === 'PAUSED') return 'PAUSED'
  if (status === 'COMPLETED') {
    return linkedTasks.some((task) => task.status !== 'DONE') ? 'ACTIVE' : 'COMPLETED'
  }
  if (status === 'READY_TO_COMPLETE' && linkedTasks.some((task) => task.status !== 'DONE')) return 'ACTIVE'
  if (linkedTasks.length > 0 && linkedTasks.every((task) => task.status === 'DONE')) return 'READY_TO_COMPLETE'
  return 'ACTIVE'
}

export function getTodayFocusTasks(tasks: Task[], goals: GoalCard[] = [], areaFilter: AreaFilter = 'ALL', now = new Date()) {
  const today = startOfDay(now)

  let filtered = tasks.filter((task) => {
    // 必须是 IN_PROGRESS 状态
    if (task.status !== 'IN_PROGRESS') return false

    // 时间区间判断：今天在任务的开始和结束时间之间
    const startBoundary = task.plannedStartAt || task.createdAt
    if (!startBoundary) return false

    const startDay = startOfDay(startBoundary)
    const endDay = task.dueDate ? startOfDay(task.dueDate) : undefined

    return startDay.getTime() <= today.getTime() && (!endDay || today.getTime() <= endDay.getTime())
  })

  // 领域筛选
  if (areaFilter !== 'ALL') {
    filtered = filterTasksByArea(filtered, goals, areaFilter)
  }

  return filtered
}

/**
 * 派生今日议程
 *
 * @param baseTimeline - 原始议程数据（来自 EventKit 和 Desk Tasks）
 * @param tasks - 所有任务
 * @param now - 当前时间
 * @returns TodayAgenda - 今日议程（过滤到今天的事件和任务）
 */
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
      // 必须是 IN_PROGRESS 状态
      if (task.status !== 'IN_PROGRESS') return false
      if (overdue.includes(task) || dueToday.includes(task)) return false

      const startBoundary = task.plannedStartAt || task.createdAt
      if (!startBoundary) return false
      const startDay = startOfDay(startBoundary)
      const endDay = task.dueDate ? startOfDay(task.dueDate) : undefined
      return startDay.getTime() <= today.getTime() && (!endDay || today.getTime() <= endDay.getTime())
    })
    .sort((a, b) => {
      const aEndDay = a.dueDate ? startOfDay(a.dueDate) : undefined
      const bEndDay = b.dueDate ? startOfDay(b.dueDate) : undefined
      const aStart = startOfDay(a.plannedStartAt || a.createdAt || new Date(0))
      const bStart = startOfDay(b.plannedStartAt || b.createdAt || new Date(0))

      // 有截止日期的优先，按剩余天数升序（越少越紧急）
      if (aEndDay && bEndDay) {
        const aDaysRemaining = Math.floor((aEndDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        const bDaysRemaining = Math.floor((bEndDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return aDaysRemaining - bDaysRemaining
      }
      if (aEndDay) return -1
      if (bEndDay) return 1

      // 都无截止日期，按已推进天数降序（越久的越需要关注）
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

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate()
}

function formatTimeLabel(date: Date) {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function timeLabelSortValue(timeLabel: string) {
  const [hours, minutes] = timeLabel.split(':').map((value) => Number.parseInt(value, 10))
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return Number.MAX_SAFE_INTEGER
  return hours * 60 + minutes
}
