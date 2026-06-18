import { create } from 'zustand'
import { isTauriRuntime } from '../lib/desktopApi'
import { BROWSER_PREVIEW_STATUS, createWorkspaceMutationAdapter } from '../lib/workspaceMutations'
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
  setStatusMessage: (message: string) => void
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
    // 确保 area 非空，默认使用"未分类"
    const normalizedInput = {
      ...input,
      area: input.area?.trim() || '未分类',
    }

    try {
      const { goal: nextGoal, statusMessage, openGoalWorkspace } = await adapter.createGoal(normalizedInput, options)
      if (!nextGoal) return { goal: undefined, openGoalWorkspace: false }

      get().replaceGoal(nextGoal)
      get().setStatusMessage(statusMessage || BROWSER_PREVIEW_STATUS)

      // 刷新领域列表
      const { useUiStore } = require('./uiStore')
      await useUiStore.getState().loadAreas()

      // 打开目标抽屉并切换到 goals 视图
      if (openGoalWorkspace) {
        useUiStore.getState().openGoalDrawer(nextGoal.id)
        useUiStore.getState().setView('goals')
      }

      return { goal: nextGoal, openGoalWorkspace: openGoalWorkspace || false }
    } catch (error) {
      get().setStatusMessage(`Unable to create goal · ${error instanceof Error ? error.message : String(error)}`)
      return { goal: undefined, openGoalWorkspace: false }
    }
  },

  // 更新目标字段
  updateGoalFields: async (goalId, input) => {
    const adapter = createWorkspaceMutationAdapter()

    try {
      const { goal: updatedGoal, statusMessage } = await adapter.updateGoalFields(goalId, input)
      if (!updatedGoal && isTauriRuntime()) return null

      const nextGoal = isTauriRuntime()
        ? (updatedGoal as GoalCard)
        : get().baseGoals.map((goal) =>
            goal.id === goalId
              ? {
                  ...goal,
                  title: input.title.trim(),
                  area: input.area.trim(),
                  description: input.description.trim(),
                  updatedAt: new Date(),
                }
              : goal,
          ).find((goal) => goal.id === goalId) as GoalCard

      get().replaceGoal(nextGoal)
      get().setStatusMessage(statusMessage || BROWSER_PREVIEW_STATUS)
      return nextGoal
    } catch (error) {
      get().setStatusMessage(`Unable to update goal · ${error instanceof Error ? error.message : String(error)}`)
      return null
    }
  },

  // 更新目标状态
  updateGoalStatus: async (goalId, status) => {
    if (status === 'READY_TO_COMPLETE') {
      get().setStatusMessage('READY_TO_COMPLETE is auto-computed and cannot be set manually')
      return null
    }

    const adapter = createWorkspaceMutationAdapter()

    try {
      const { goal: updatedGoal, statusMessage } = await adapter.updateGoalStatus(goalId, status)

      const nextGoal = isTauriRuntime()
        ? (updatedGoal as GoalCard)
        : get().baseGoals.map((goal) =>
            goal.id === goalId
              ? {
                  ...goal,
                  status,
                  updatedAt: new Date(),
                }
              : goal,
          ).find((goal) => goal.id === goalId) as GoalCard

      get().replaceGoal(nextGoal)
      get().setStatusMessage(statusMessage || BROWSER_PREVIEW_STATUS)
      return nextGoal
    } catch (error) {
      get().setStatusMessage(`Unable to update goal status · ${error instanceof Error ? error.message : String(error)}`)
      return null
    }
  },

  // 设置状态消息（桥接到 uiStore）
  setStatusMessage: (message: string) => {
    console.warn('setStatusMessage called before being linked to uiStore')
  },
}))

// 便捷选择器
export function useSelectedGoal(selectedGoalId?: string) {
  return useGoalStore((state) => state.baseGoals.find((goal) => goal.id === selectedGoalId))
}
