import { create } from 'zustand'
import type { EventBus } from '../events/EventBus'
import type { GoalCard } from '../types/app'
import type { DomainEvent } from '../events/DomainEvents'

/**
 * GoalStore (Refactored) - 纯数据容器
 *
 * 职责：
 * - 存储 goals 基础数据
 * - 订阅 EventBus 自动更新
 * - 无派生状态
 * - 无跨 store 依赖
 */
export interface GoalStoreState {
  // 基础数据
  baseGoals: GoalCard[]

  // 内部方法（由 EventBus 调用）
  _replaceGoal: (goal: GoalCard) => void
  _removeGoal: (goalId: string) => void
}

function replaceGoalInArray(goals: GoalCard[], nextGoal: GoalCard): GoalCard[] {
  const index = goals.findIndex((goal) => goal.id === nextGoal.id)
  if (index === -1) {
    return [nextGoal, ...goals]
  }
  return goals.map((goal) => (goal.id === nextGoal.id ? nextGoal : goal))
}

/**
 * 创建 GoalStore 实例
 * @param eventBus Event Bus 实例用于订阅事件
 */
export function createGoalStore(eventBus: EventBus) {
  const useGoalStore = create<GoalStoreState>((set) => {
    // 订阅 Event Bus
    eventBus.subscribe((event: DomainEvent) => {
      if (event.type === 'goal.created' || event.type === 'goal.updated') {
        set((state) => ({
          baseGoals: replaceGoalInArray(state.baseGoals, event.payload),
        }))
      } else if (event.type === 'goal.deleted') {
        set((state) => ({
          baseGoals: state.baseGoals.filter((goal) => goal.id !== event.payload.goalId),
        }))
      }
    })

    return {
      baseGoals: [],

      _replaceGoal: (goal: GoalCard) => {
        set((state) => ({
          baseGoals: replaceGoalInArray(state.baseGoals, goal),
        }))
      },

      _removeGoal: (goalId: string) => {
        set((state) => ({
          baseGoals: state.baseGoals.filter((goal) => goal.id !== goalId),
        }))
      },
    }
  })

  return useGoalStore
}
