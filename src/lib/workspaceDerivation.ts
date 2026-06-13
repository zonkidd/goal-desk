import type { AreaFilter, GoalCard, TimelineItem } from '../types/app'
import type { Task, TaskStatus } from '../types/task'

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

export interface WorkspaceDerivedState {
  goals: GoalCard[]
  timeline: TimelineItem[]
  todayFocusTasks: Task[]
  todayAttentionGroups: TodayAttentionGroups
  todayRelevantGoals: TodayRelevantGoal[]
  inbox: InboxTaskGroups
  visibleTasks: Task[]
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

interface DeriveWorkspaceStateInput {
  baseTimeline: TimelineItem[]
  baseGoals: GoalCard[]
  tasks: Task[]
  activeArea: AreaFilter
  showCompletedTodos?: boolean
  now?: Date
}

export function deriveWorkspaceState(input: DeriveWorkspaceStateInput): WorkspaceDerivedState {
  const goals = deriveGoalRecords(input.baseGoals, input.tasks)
  const visibleGoals = filterGoalsByArea(goals, input.activeArea)
  const visibleTasks = filterTasksByArea(input.tasks, goals, input.activeArea)
  const todayFocusTasks =
    input.activeArea === 'ALL'
      ? getTodayFocusTasks(input.tasks, input.now)
      : filterTasksByArea(getTodayFocusTasks(input.tasks, input.now), goals, input.activeArea)
  const timeline =
    input.activeArea === 'ALL'
      ? deriveTodayTimeline(input.baseTimeline, input.tasks, input.now)
      : filterTimelineByArea(deriveTodayTimeline(input.baseTimeline, input.tasks, input.now), visibleTasks)
  const todayAttentionGroups =
    input.activeArea === 'ALL'
      ? deriveTodayAttentionGroups(input.tasks, input.now)
      : deriveTodayAttentionGroups(visibleTasks, input.now)
  const todayRelevantGoals = deriveTodayRelevantGoals(goals, todayAttentionGroups)

  return {
    goals: visibleGoals,
    timeline,
    todayFocusTasks,
    todayAttentionGroups,
    todayRelevantGoals,
    inbox: getInboxTaskGroups(visibleTasks, input.showCompletedTodos ?? false),
    visibleTasks,
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

export function filterTimelineByArea(timeline: TimelineItem[], visibleTasks: Task[]) {
  const visibleTaskIds = new Set(visibleTasks.map((task) => task.id))
  return timeline.filter((item) => item.source !== 'todo' || visibleTaskIds.has(item.id))
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

export function getTodayFocusTasks(tasks: Task[], now = new Date()) {
  const today = startOfDay(now)
  return tasks.filter((task) => {
    // 必须是 IN_PROGRESS 状态
    if (task.status !== 'IN_PROGRESS') return false

    // 时间区间判断：今天在任务的开始和结束时间之间
    const startBoundary = task.plannedStartAt || task.createdAt
    if (!startBoundary) return false

    const startDay = startOfDay(startBoundary)
    const endDay = task.dueDate ? startOfDay(task.dueDate) : undefined

    return startDay.getTime() <= today.getTime() && (!endDay || today.getTime() <= endDay.getTime())
  })
}

export function deriveTodayTimeline(baseTimeline: TimelineItem[], tasks: Task[], now = new Date()): TimelineItem[] {
  const today = startOfDay(now)
  const taskItems = tasks
    .filter((task) => {
      // 必须是进行中状态
      if (task.status !== 'IN_PROGRESS') return false

      // 必须有计划开始时间
      if (!task.plannedStartAt) return false

      // 时间区间判断：今天在任务的开始和结束时间之间
      const startDay = startOfDay(task.plannedStartAt)
      const endDay = task.dueDate ? startOfDay(task.dueDate) : undefined

      // 判断今天是否在时间范围内
      const isInTimeRange = startDay.getTime() <= today.getTime() && (!endDay || today.getTime() <= endDay.getTime())
      if (!isInTimeRange) return false

      // 判断是否是今天开始的任务
      const isStartingToday = startDay.getTime() === today.getTime()

      // 逻辑：今天开始的任务自动显示，跨天任务需要勾选 showInTimeline
      if (isStartingToday) {
        return true // 今天开始的任务，自动显示
      } else {
        return task.showInTimeline === true // 跨天任务，需要勾选
      }
    })
    .map((task) => ({
      id: task.id,
      title: task.title,
      timeLabel: formatTimeLabel(task.plannedStartAt as Date),
      source: 'todo' as const,
      readonly: false,
      done: false,
      sourceLabel: task.linkedGoalLabel || 'Desk Task',
    }))

  const merged = [...baseTimeline.filter((item) => item.source !== 'todo'), ...taskItems]
  return merged.sort((left, right) => timeLabelSortValue(left.timeLabel) - timeLabelSortValue(right.timeLabel))
}

export function deriveTodayAttentionGroups(tasks: Task[], now = new Date()): TodayAttentionGroups {
  const today = startOfDay(now)
  const activeTasks = tasks.filter((task) => task.status !== 'DONE' && task.status !== 'PAUSED')

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
