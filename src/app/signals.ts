/**
 * 全局 Signals 和响应式引擎实例
 *
 * 这是新架构的中心枢纽，连接 EventBus、Stores 和 Reactive Engine
 */

import { signal } from '@preact/signals-react'
import { DerivationEngine } from '../reactive/DerivationEngine'
import { createReactivDerivations } from '../reactive/derivations'
import { EventBus } from '../events/EventBus'
import { createTaskStore } from '../store/taskStore.refactored'
import { createGoalStore } from '../store/goalStore.refactored'
import type { Task } from '../types/task'
import type { GoalCard, AreaFilter } from '../types/app'

// ===== 创建全局单例 =====

/**
 * 全局事件总线
 */
export const eventBus = new EventBus()

/**
 * 响应式引擎
 */
export const engine = new DerivationEngine()

// ===== 创建 Stores =====

/**
 * Task Store（订阅 EventBus）
 */
export const useTaskStore = createTaskStore(eventBus)

/**
 * Goal Store（订阅 EventBus）
 */
export const useGoalStore = createGoalStore(eventBus)

// ===== 创建基础 Signals =====

/**
 * 任务列表 Signal
 */
export const tasksSignal = signal<Task[]>([])

/**
 * 目标列表 Signal
 */
export const goalsSignal = signal<GoalCard[]>([])

/**
 * 当前领域筛选 Signal
 */
export const areaSignal = signal<AreaFilter>('ALL')

/**
 * 是否显示已完成任务 Signal
 */
export const showCompletedSignal = signal<boolean>(false)

// ===== 同步 Store 到 Signal =====

useTaskStore.subscribe((state) => {
  tasksSignal.value = state.tasks
})

useGoalStore.subscribe((state) => {
  goalsSignal.value = state.baseGoals
})

// ===== 注册派生状态 =====

const derivations = createReactivDerivations(
  engine,
  tasksSignal,
  goalsSignal,
  areaSignal,
  showCompletedSignal
)

/**
 * 今日焦点任务派生
 */
export const todayFocusTasks$ = derivations.todayFocusTasks$

/**
 * Inbox 分组派生
 */
export const inbox$ = derivations.inbox$

/**
 * 今日关注分组派生
 */
export const todayAttentionGroups$ = derivations.todayAttentionGroups$
