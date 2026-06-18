/**
 * WorkspaceEngine - 工作区派生状态计算引擎
 *
 * 这是一个深模块（Deep Module）：
 * - 小接口：3 个高层方法（computeSnapshot, computeTodaySnapshot, computeInboxSnapshot）
 * - 大实现：封装 10+ 个领域计算 + 缓存逻辑 + 增量更新
 *
 * 设计原则：
 * 1. 调用方只需提供原子状态（tasks, goals, timeline, filters），无需理解内部计算顺序
 * 2. 返回不可变快照（Snapshot），视图直接使用
 * 3. 缓存失效逻辑内部处理，调用方无需关心
 * 4. 局部性（Locality）：Today 视图的所有派生逻辑集中在 computeTodaySnapshot 内
 */

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

/**
 * 工作区快照 - 引擎输出的不可变数据结构
 * 包含所有视图所需的派生状态
 */
export interface WorkspaceSnapshot {
  // Goals 视图
  goals: GoalCard[]

  // Today 视图
  today: {
    timeline: TodayAgenda
    focusTasks: Task[]
    attentionGroups: TodayAttentionGroups
    relevantGoals: TodayRelevantGoal[]
  }

  // Inbox 视图
  inbox: InboxTaskGroups

  // 元数据
  meta: {
    computedAt: Date
    activeArea: AreaFilter
    taskCount: number
    goalCount: number
  }
}

/**
 * 输入原子状态
 */
export interface AtomicState {
  baseTimeline: RawAgendaItem[]
  baseGoals: GoalCard[]
  tasks: Task[]
  activeArea: AreaFilter
  showCompletedTodos: boolean
  now?: Date
}

/**
 * 变更类型 - 用于缓存失效判断
 */
export type ChangeType =
  | 'goals' // goals 数据变化
  | 'tasks' // tasks 数据变化
  | 'timeline' // timeline 数据变化
  | 'area-filter' // 领域过滤器变化
  | 'show-completed' // 显示已完成任务开关变化
  | 'full-refresh' // 完整刷新

/**
 * WorkspaceEngine - 派生状态计算引擎
 *
 * 职责：
 * 1. 接收原子状态（AtomicState）
 * 2. 计算派生状态（WorkspaceSnapshot）
 * 3. 内部管理缓存和增量更新
 */
export class WorkspaceEngine {
  private cache: {
    derivedGoals?: GoalCard[]
    filteredGoals?: GoalCard[]
    filteredTasks?: Task[]
    todayFocusTasks?: Task[]
    timeline?: TodayAgenda
    todayAttentionGroups?: TodayAttentionGroups
    todayRelevantGoals?: TodayRelevantGoal[]
    inbox?: InboxTaskGroups
  } = {}

  private atomicState: AtomicState

  constructor(atomicState: AtomicState) {
    this.atomicState = atomicState
  }

  /**
   * 计算完整工作区快照
   * 外部入口，返回所有视图所需的派生状态
   */
  computeSnapshot(changeType: ChangeType = 'full-refresh'): WorkspaceSnapshot {
    // 根据 changeType 失效缓存
    this.invalidateCacheByChangeType(changeType)

    // 计算派生状态
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
      today: {
        timeline,
        focusTasks: todayFocusTasks,
        attentionGroups: todayAttentionGroups,
        relevantGoals: todayRelevantGoals,
      },
      inbox,
      meta: {
        computedAt: new Date(),
        activeArea: this.atomicState.activeArea,
        taskCount: this.atomicState.tasks.length,
        goalCount: this.atomicState.baseGoals.length,
      },
    }
  }

  /**
   * 计算 Today 视图快照（子集）
   * 优化：只计算 Today 视图需要的字段
   */
  computeTodaySnapshot(changeType: ChangeType = 'full-refresh') {
    this.invalidateCacheByChangeType(changeType)

    const derivedGoals = this.computeDerivedGoals()
    const filteredTasks = this.computeFilteredTasks(derivedGoals)
    const todayFocusTasks = this.computeTodayFocusTasks(derivedGoals)
    const timeline = this.computeTimeline(filteredTasks)
    const todayAttentionGroups = this.computeTodayAttentionGroups(filteredTasks)
    const todayRelevantGoals = this.computeTodayRelevantGoals(derivedGoals, todayAttentionGroups)

    return {
      timeline,
      focusTasks: todayFocusTasks,
      attentionGroups: todayAttentionGroups,
      relevantGoals: todayRelevantGoals,
    }
  }

  /**
   * 计算 Inbox 视图快照（子集）
   */
  computeInboxSnapshot(changeType: ChangeType = 'full-refresh') {
    this.invalidateCacheByChangeType(changeType)

    const derivedGoals = this.computeDerivedGoals()
    const filteredTasks = this.computeFilteredTasks(derivedGoals)
    const inbox = this.computeInbox(filteredTasks)

    return inbox
  }

  /**
   * 更新原子状态（用于增量更新）
   */
  updateAtomicState(partial: Partial<AtomicState>) {
    this.atomicState = { ...this.atomicState, ...partial }
  }

  // ==================== 私有方法：缓存管理 ====================

  private invalidateCacheByChangeType(changeType: ChangeType): void {
    switch (changeType) {
      case 'goals':
        this.cache.derivedGoals = undefined
        this.cache.filteredGoals = undefined
        this.cache.todayRelevantGoals = undefined
        break

      case 'tasks':
        this.cache.derivedGoals = undefined
        this.cache.filteredGoals = undefined
        this.cache.filteredTasks = undefined
        this.cache.todayFocusTasks = undefined
        this.cache.timeline = undefined
        this.cache.todayAttentionGroups = undefined
        this.cache.todayRelevantGoals = undefined
        this.cache.inbox = undefined
        break

      case 'timeline':
        this.cache.timeline = undefined
        break

      case 'area-filter':
        this.cache.filteredGoals = undefined
        this.cache.filteredTasks = undefined
        this.cache.todayFocusTasks = undefined
        this.cache.timeline = undefined
        this.cache.todayAttentionGroups = undefined
        this.cache.todayRelevantGoals = undefined
        this.cache.inbox = undefined
        break

      case 'show-completed':
        this.cache.inbox = undefined
        break

      case 'full-refresh':
        this.cache = {}
        break
    }
  }

  // ==================== 私有方法：派生计算 ====================

  private computeDerivedGoals(): GoalCard[] {
    if (this.cache.derivedGoals) {
      return this.cache.derivedGoals
    }
    const derived = deriveGoalRecords(this.atomicState.baseGoals, this.atomicState.tasks)
    this.cache.derivedGoals = derived
    return derived
  }

  private computeFilteredGoals(derivedGoals: GoalCard[]): GoalCard[] {
    if (this.cache.filteredGoals) {
      return this.cache.filteredGoals
    }
    const filtered = filterGoalsByArea(derivedGoals, this.atomicState.activeArea)
    this.cache.filteredGoals = filtered
    return filtered
  }

  private computeFilteredTasks(derivedGoals: GoalCard[]): Task[] {
    if (this.cache.filteredTasks) {
      return this.cache.filteredTasks
    }
    const filtered = filterTasksByArea(this.atomicState.tasks, derivedGoals, this.atomicState.activeArea)
    this.cache.filteredTasks = filtered
    return filtered
  }

  private computeTodayFocusTasks(derivedGoals: GoalCard[]): Task[] {
    if (this.cache.todayFocusTasks) {
      return this.cache.todayFocusTasks
    }
    const focusTasks = getTodayFocusTasks(
      this.atomicState.tasks,
      derivedGoals,
      this.atomicState.activeArea,
      this.atomicState.now,
    )
    const filtered =
      this.atomicState.activeArea === 'ALL'
        ? focusTasks
        : filterTasksByArea(focusTasks, derivedGoals, this.atomicState.activeArea)
    this.cache.todayFocusTasks = filtered
    return filtered
  }

  private computeTimeline(filteredTasks: Task[]): TodayAgenda {
    if (this.cache.timeline) {
      return this.cache.timeline
    }
    const derived = deriveTodayAgenda(this.atomicState.baseTimeline, this.atomicState.tasks, this.atomicState.now)
    const filtered =
      this.atomicState.activeArea === 'ALL' ? derived : filterAgendaByArea(derived, filteredTasks)
    this.cache.timeline = filtered
    return filtered
  }

  private computeTodayAttentionGroups(filteredTasks: Task[]): TodayAttentionGroups {
    if (this.cache.todayAttentionGroups) {
      return this.cache.todayAttentionGroups
    }
    const groups = deriveTodayAttentionGroups(
      this.atomicState.activeArea === 'ALL' ? this.atomicState.tasks : filteredTasks,
      this.atomicState.now,
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
    const inbox = getInboxTaskGroups(filteredTasks, this.atomicState.showCompletedTodos)
    this.cache.inbox = inbox
    return inbox
  }
}
