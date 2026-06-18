import type { AreaFilter, GoalCard, RawAgendaItem, TodayAgenda } from '../types/app'
import type { Task } from '../types/task'
import {
  deriveGoalRecords,
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

export type ChangeType =
  | 'goals' // goals 数据变化
  | 'tasks' // tasks 数据变化
  | 'timeline' // timeline 数据变化
  | 'area-filter' // 领域过滤器变化
  | 'show-completed' // 显示已完成任务开关变化
  | 'full-refresh' // 完整刷新

export interface DerivedState {
  goals: GoalCard[]
  timeline: TodayAgenda
  todayFocusTasks: Task[]
  todayAttentionGroups: TodayAttentionGroups
  todayRelevantGoals: TodayRelevantGoal[]
  inbox: InboxTaskGroups
}

/**
 * 派生状态管理器
 *
 * 提供选择性计算和记忆化缓存，避免不必要的重复计算。
 * 根据变化类型只重算受影响的部分。
 */
export class DerivedStateManager {
  private cache: {
    derivedGoals?: GoalCard[] // goals 加上进度/nextTodo 等派生字段
    filteredGoals?: GoalCard[]
    filteredTasks?: Task[]
    todayFocusTasks?: Task[]
    timeline?: TodayAgenda
    todayAttentionGroups?: TodayAttentionGroups
    todayRelevantGoals?: TodayRelevantGoal[]
    inbox?: InboxTaskGroups
  } = {}

  private baseTimeline: RawAgendaItem[]
  private baseGoals: GoalCard[]
  private tasks: Task[]
  private activeArea: AreaFilter
  private showCompletedTodos: boolean
  private now?: Date

  constructor(
    baseTimeline: RawAgendaItem[],
    baseGoals: GoalCard[],
    tasks: Task[],
    activeArea: AreaFilter,
    showCompletedTodos: boolean,
    now?: Date,
  ) {
    this.baseTimeline = baseTimeline
    this.baseGoals = baseGoals
    this.tasks = tasks
    this.activeArea = activeArea
    this.showCompletedTodos = showCompletedTodos
    this.now = now
  }

  /**
   * 计算派生状态，根据 changeType 选择性重算
   */
  compute(changeType: ChangeType): DerivedState {
    // 根据 changeType 决定哪些缓存失效
    this.invalidateCacheByChangeType(changeType)

    // 选择性计算各部分
    const derivedGoals = this.computeDerivedGoals()
    const goals = this.computeFilteredGoals(derivedGoals)
    const filteredTasks = this.computeFilteredTasks(derivedGoals)
    const todayFocusTasks = this.computeTodayFocusTasks(derivedGoals)
    const timeline = this.computeTimeline(filteredTasks)
    const todayAttentionGroups = this.computeTodayAttentionGroups(filteredTasks)
    const todayRelevantGoals = this.computeTodayRelevantGoals(derivedGoals, todayAttentionGroups)
    const inbox = this.computeInbox(filteredTasks)

    return {
      goals,
      timeline,
      todayFocusTasks,
      todayAttentionGroups,
      todayRelevantGoals,
      inbox,
    }
  }

  private invalidateCacheByChangeType(changeType: ChangeType): void {
    switch (changeType) {
      case 'goals':
        // goals 变化：清空 goals 相关缓存
        this.cache.derivedGoals = undefined
        this.cache.filteredGoals = undefined
        this.cache.todayRelevantGoals = undefined
        break

      case 'tasks':
        // tasks 变化：清空 tasks 和依赖 tasks 的缓存
        // 但保留纯 goals 缓存（如果 baseGoals 没变）
        this.cache.derivedGoals = undefined // goals 的进度依赖 tasks
        this.cache.filteredGoals = undefined
        this.cache.filteredTasks = undefined
        this.cache.todayFocusTasks = undefined
        this.cache.timeline = undefined
        this.cache.todayAttentionGroups = undefined
        this.cache.todayRelevantGoals = undefined
        this.cache.inbox = undefined
        break

      case 'timeline':
        // timeline 变化：只清空 timeline 缓存
        this.cache.timeline = undefined
        break

      case 'area-filter':
        // 领域过滤器变化：清空过滤相关缓存
        this.cache.filteredGoals = undefined
        this.cache.filteredTasks = undefined
        this.cache.todayFocusTasks = undefined
        this.cache.timeline = undefined
        this.cache.todayAttentionGroups = undefined
        this.cache.todayRelevantGoals = undefined
        this.cache.inbox = undefined
        break

      case 'show-completed':
        // 显示已完成开关：只影响 inbox
        this.cache.inbox = undefined
        break

      case 'full-refresh':
        // 完整刷新：清空所有缓存
        this.cache = {}
        break
    }
  }

  private computeDerivedGoals(): GoalCard[] {
    if (this.cache.derivedGoals) {
      return this.cache.derivedGoals
    }
    const derived = deriveGoalRecords(this.baseGoals, this.tasks)
    this.cache.derivedGoals = derived
    return derived
  }

  private computeFilteredGoals(derivedGoals: GoalCard[]): GoalCard[] {
    if (this.cache.filteredGoals) {
      return this.cache.filteredGoals
    }
    const filtered = filterGoalsByArea(derivedGoals, this.activeArea)
    this.cache.filteredGoals = filtered
    return filtered
  }

  private computeFilteredTasks(derivedGoals: GoalCard[]): Task[] {
    if (this.cache.filteredTasks) {
      return this.cache.filteredTasks
    }
    const filtered = filterTasksByArea(this.tasks, derivedGoals, this.activeArea)
    this.cache.filteredTasks = filtered
    return filtered
  }

  private computeTodayFocusTasks(derivedGoals: GoalCard[]): Task[] {
    if (this.cache.todayFocusTasks) {
      return this.cache.todayFocusTasks
    }
    const focusTasks = getTodayFocusTasks(this.tasks, derivedGoals, this.activeArea, this.now)
    const filtered =
      this.activeArea === 'ALL'
        ? focusTasks
        : filterTasksByArea(focusTasks, derivedGoals, this.activeArea)
    this.cache.todayFocusTasks = filtered
    return filtered
  }

  private computeTimeline(filteredTasks: Task[]): TodayAgenda {
    if (this.cache.timeline) {
      return this.cache.timeline
    }
    const derived = deriveTodayAgenda(this.baseTimeline, this.tasks, this.now)
    const filtered =
      this.activeArea === 'ALL'
        ? derived
        : filterAgendaByArea(derived, filteredTasks)
    this.cache.timeline = filtered
    return filtered
  }

  private computeTodayAttentionGroups(filteredTasks: Task[]): TodayAttentionGroups {
    if (this.cache.todayAttentionGroups) {
      return this.cache.todayAttentionGroups
    }
    const groups = deriveTodayAttentionGroups(
      this.activeArea === 'ALL' ? this.tasks : filteredTasks,
      this.now,
    )
    this.cache.todayAttentionGroups = groups
    return groups
  }

  private computeTodayRelevantGoals(
    derivedGoals: GoalCard[],
    todayAttentionGroups: TodayAttentionGroups,
  ): TodayRelevantGoal[] {
    if (this.cache.todayRelevantGoals) {
      return this.cache.todayRelevantGoals
    }
    const relevant = deriveTodayRelevantGoals(derivedGoals, todayAttentionGroups)
    this.cache.todayRelevantGoals = relevant
    return relevant
  }

  private computeInbox(filteredTasks: Task[]): InboxTaskGroups {
    if (this.cache.inbox) {
      return this.cache.inbox
    }
    const inbox = getInboxTaskGroups(filteredTasks, this.showCompletedTodos)
    this.cache.inbox = inbox
    return inbox
  }
}
