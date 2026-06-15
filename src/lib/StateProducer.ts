/**
 * State Producer：自动追踪状态变更并触发派生逻辑
 *
 * 职责：
 * - 自动检测哪些基础状态被修改
 * - 统一调用 applyDerivedState
 * - 消除 appStore actions 中的样板代码
 *
 * 使用方式：
 * ```ts
 * set(state => {
 *   const producer = new StateProducer(state, applyDerivedStateFn)
 *   producer.replaceTask(updatedTask)
 *   producer.replaceGoal(updatedGoal)
 *   return producer.finalize()
 * })
 * ```
 */

import type { AppStoreState } from '../store/appStore'
import type { ChangeType } from '../lib/DerivedStateManager'
import type { Task } from '../types/task'
import type { GoalCard } from '../types/app'

type ApplyDerivedStateFn = (state: AppStoreState, changeType: ChangeType) => Partial<AppStoreState>

export class StateProducer {
  private draft: AppStoreState
  private changes = new Set<ChangeType>()
  private applyDerived: ApplyDerivedStateFn

  constructor(state: AppStoreState, applyDerivedStateFn: ApplyDerivedStateFn) {
    this.draft = { ...state }
    this.applyDerived = applyDerivedStateFn
  }

  /**
   * 替换单个 Task
   */
  replaceTask(task: Task) {
    const index = this.draft.tasks.findIndex((t: Task) => t.id === task.id)
    if (index !== -1) {
      this.draft.tasks = this.draft.tasks.map((t: Task) => t.id === task.id ? task : t)
      this.changes.add('tasks')
    }
    return this
  }

  /**
   * 批量替换 Tasks
   */
  replaceTasks(tasks: Task[]) {
    this.draft.tasks = tasks
    this.changes.add('tasks')
    return this
  }

  /**
   * 替换单个 Goal
   */
  replaceGoal(goal: GoalCard) {
    const index = this.draft.baseGoals.findIndex((g: GoalCard) => g.id === goal.id)
    if (index !== -1) {
      this.draft.baseGoals = this.draft.baseGoals.map((g: GoalCard) => g.id === goal.id ? goal : g)
      this.changes.add('goals')
    }
    return this
  }

  /**
   * 批量替换 Goals
   */
  replaceGoals(goals: GoalCard[]) {
    this.draft.baseGoals = goals
    this.changes.add('goals')
    return this
  }

  /**
   * 设置 activeArea
   */
  setActiveArea(area: string) {
    if (this.draft.activeArea !== area) {
      this.draft.activeArea = area
      this.changes.add('area-filter')
    }
    return this
  }

  /**
   * 设置 showCompletedTodos
   */
  setShowCompletedTodos(value: boolean) {
    if (this.draft.showCompletedTodos !== value) {
      this.draft.showCompletedTodos = value
      this.changes.add('show-completed')
    }
    return this
  }

  /**
   * 完成并应用派生状态
   */
  finalize(): AppStoreState {
    // 自动选择 changeType
    const changeType = this.selectChangeType()

    // 应用派生逻辑
    const derived = this.applyDerived(this.draft, changeType)

    return {
      ...this.draft,
      ...derived,
    }
  }

  /**
   * 根据变更集自动选择 changeType
   */
  private selectChangeType(): ChangeType {
    if (this.changes.size === 0) {
      return 'full-refresh'
    }

    // 单一变更类型
    if (this.changes.size === 1) {
      return Array.from(this.changes)[0]
    }

    // 多个变更类型，返回 full-refresh
    return 'full-refresh'
  }
}
