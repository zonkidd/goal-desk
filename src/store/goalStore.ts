import { create } from 'zustand'
import { getWorkspaceMutationAdapter } from '../lib/workspaceMutations'
import { executeMutation } from './mutationHelper'
import { upsertById } from './upsertById'
import type { GoalCard, GoalStatus } from '../types/app'

export interface GoalStoreState {
  baseGoals: GoalCard[]
  deletedGoals: GoalCard[]

  hydrateGoals: (goals: GoalCard[]) => void
  replaceGoal: (goal: GoalCard) => GoalCard[]
  refreshGoals: () => Promise<void>
  createGoal: (
    input: { title: string; area?: string; description?: string },
    options?: { openGoalWorkspace?: boolean },
  ) => Promise<{ goal?: GoalCard; openGoalWorkspace: boolean }>
  updateGoalFields: (goalId: string, input: { title: string; area: string; description: string }) => Promise<GoalCard | null>
  updateGoalStatus: (goalId: string, status: GoalStatus) => Promise<GoalCard | null>
  softDeleteGoal: (goalId: string) => Promise<void>
  restoreGoal: (goalId: string) => Promise<GoalCard | null>
  loadDeletedGoals: () => Promise<void>
}

export const useGoalStore = create<GoalStoreState>((set, get) => ({
  baseGoals: [],
  deletedGoals: [],

  hydrateGoals: (goals) => set({ baseGoals: goals }),

  replaceGoal: (goal) => {
    const nextGoals = upsertById(get().baseGoals, goal)
    set({ baseGoals: nextGoals })
    return nextGoals
  },

  refreshGoals: async () => {
    try {
      const adapter = getWorkspaceMutationAdapter()
      const goals = await adapter.loadGoals()
      set({ baseGoals: goals })
    } catch (error) {
      console.error('Failed to refresh goals:', error)
    }
  },

  createGoal: async (input, options) => {
    const adapter = getWorkspaceMutationAdapter()
    const result = await executeMutation(
      (a) => a.createGoal(input, options),
      adapter,
    )
    if (!result?.goal) return { goal: undefined, openGoalWorkspace: false }
    get().replaceGoal(result.goal)
    return { goal: result.goal, openGoalWorkspace: result.openGoalWorkspace || false }
  },

  updateGoalFields: async (goalId, input) => {
    const adapter = getWorkspaceMutationAdapter()
    const result = await executeMutation(
      (a) => a.updateGoalFields(goalId, input),
      adapter,
      { onSuccess: ({ goal }) => { if (goal) get().replaceGoal(goal) } },
    )
    return result?.goal ?? null
  },

  updateGoalStatus: async (goalId, status) => {
    if (status === 'READY_TO_COMPLETE') {
      return null
    }

    const adapter = getWorkspaceMutationAdapter()
    const result = await executeMutation(
      (a) => a.updateGoalStatus(goalId, status),
      adapter,
      { onSuccess: ({ goal }) => { if (goal) get().replaceGoal(goal) } },
    )
    return result?.goal ?? null
  },

  softDeleteGoal: async (goalId: string) => {
    const adapter = getWorkspaceMutationAdapter()
    try {
      await adapter.softDeleteGoal(goalId)
      set({ baseGoals: get().baseGoals.filter((g) => g.id !== goalId) })
      await get().loadDeletedGoals()
    } catch (error) {
      console.error('Failed to soft delete goal:', error)
    }
  },

  restoreGoal: async (goalId: string) => {
    const adapter = getWorkspaceMutationAdapter()
    const result = await executeMutation(
      (a) => a.restoreGoal(goalId),
      adapter,
      {
        onSuccess: async ({ goal }) => {
          if (goal) get().replaceGoal(goal)
          await get().loadDeletedGoals()
        },
      },
    )
    return result?.goal ?? null
  },

  loadDeletedGoals: async () => {
    const adapter = getWorkspaceMutationAdapter()
    try {
      const deletedGoals = await adapter.listDeletedGoals()
      set({ deletedGoals })
    } catch (error) {
      console.error('Failed to load deleted goals:', error)
    }
  },
}))

export function useSelectedGoal(selectedGoalId?: string) {
  return useGoalStore((state) => state.baseGoals.find((goal) => goal.id === selectedGoalId))
}
