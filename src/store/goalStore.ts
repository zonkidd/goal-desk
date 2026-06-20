import { create } from 'zustand'
import { isTauriRuntime } from '../lib/runtime'
import { createWorkspaceMutationAdapter } from '../lib/workspaceMutations'
import type { GoalCard, GoalStatus } from '../types/app'
import type { TodayRelevantGoal } from '../lib/workspaceDerivation'

export interface GoalStoreState {
  // 基础数据
  baseGoals: GoalCard[]

  // 派生状态（需要跨 store 计算）
  todayRelevantGoals: TodayRelevantGoal[]

  // Actions
  hydrateGoals: (goals: GoalCard[]) => void
  updateTodayRelevantGoals: (goals: TodayRelevantGoal[]) => void
  replaceGoal: (goal: GoalCard) => GoalCard[]
  createGoal: (
    input: { title: string; area?: string; description?: string },
    options?: { openGoalWorkspace?: boolean },
  ) => Promise<{ goal?: GoalCard; openGoalWorkspace: boolean }>
  updateGoalFields: (goalId: string, input: { title: string; area: string; description: string }) => Promise<GoalCard | null>
  updateGoalStatus: (goalId: string, status: GoalStatus) => Promise<GoalCard | null>
}

function replaceGoalInArray(goals: GoalCard[], nextGoal: GoalCard) {
  const index = goals.findIndex((goal) => goal.id === nextGoal.id)
  if (index === -1) return [nextGoal, ...goals]
  return goals.map((goal) => (goal.id === nextGoal.id ? nextGoal : goal))
}

export const useGoalStore = create<GoalStoreState>((set, get) => ({
  // 初始状态
  baseGoals: [],
  todayRelevantGoals: [],

  // Hydrate
  hydrateGoals: (goals) => set({ baseGoals: goals }),

  // 更新派生状态
  updateTodayRelevantGoals: (goals) => set({ todayRelevantGoals: goals }),

  // 替换目标
  replaceGoal: (goal) => {
    const nextGoals = replaceGoalInArray(get().baseGoals, goal)
    set({ baseGoals: nextGoals })
    return nextGoals
  },

  // 创建目标
  createGoal: async (input, options) => {
    const adapter = createWorkspaceMutationAdapter()

    try {
      const { goal: nextGoal, openGoalWorkspace } = await adapter.createGoal(input, options)
      if (!nextGoal) return { goal: undefined, openGoalWorkspace: false }

      get().replaceGoal(nextGoal)

      return { goal: nextGoal, openGoalWorkspace: openGoalWorkspace || false }
    } catch (error) {
      return { goal: undefined, openGoalWorkspace: false }
    }
  },

  // 更新目标字段
  updateGoalFields: async (goalId, input) => {
    const adapter = createWorkspaceMutationAdapter()

    try {
      const { goal: updatedGoal } = await adapter.updateGoalFields(goalId, input)
      if (!updatedGoal) return null

      get().replaceGoal(updatedGoal)
      return updatedGoal
    } catch (error) {
      return null
    }
  },

  // 更新目标状态
  updateGoalStatus: async (goalId, status) => {
    if (status === 'READY_TO_COMPLETE') {
      return null
    }

    const adapter = createWorkspaceMutationAdapter()

    try {
      const { goal: updatedGoal } = await adapter.updateGoalStatus(goalId, status)
      if (!updatedGoal) return null

      get().replaceGoal(updatedGoal)
      return updatedGoal
    } catch (error) {
      return null
    }
  },
}))

// 便捷选择器
export function useSelectedGoal(selectedGoalId?: string) {
  return useGoalStore((state) => state.baseGoals.find((goal) => goal.id === selectedGoalId))
}
