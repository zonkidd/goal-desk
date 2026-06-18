import type { AppStoreState } from './appStore'
import type { GoalCard, TodayAgenda } from '../types/app'
import { deriveGoalRecords, filterGoalsByArea } from '../lib/workspaceDerivation'

/**
 * 选择过滤后的今日议程
 * 根据 showCompletedTodos 过滤已完成项
 *
 * 注意：此 selector 在每次调用时都会创建新数组
 * Zustand 会使用浅比较来判断组件是否需要重渲染
 */
export const selectFilteredTimeline = (state: AppStoreState): TodayAgenda => {
  // 当 showCompletedTodos 为 true 时，显示全部（包括已完成）
  if (state.showCompletedTodos) {
    return state.baseTimeline
  }

  // 过滤掉已完成项
  return state.baseTimeline.filter(item => !item.done)
}

/**
 * 选择派生后的目标列表
 * 应用进度计算、nextTodo 等派生逻辑
 */
export const selectDerivedGoals = (state: AppStoreState): GoalCard[] => {
  return deriveGoalRecords(state.baseGoals, state.tasks)
}

/**
 * 选择过滤后的目标列表
 * 应用 area 过滤
 */
export const selectFilteredGoals = (state: AppStoreState): GoalCard[] => {
  const derivedGoals = selectDerivedGoals(state)
  return filterGoalsByArea(derivedGoals, state.activeArea)
}
