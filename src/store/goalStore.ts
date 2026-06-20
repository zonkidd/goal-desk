import { create } from 'zustand'
import { createWorkspaceMutationAdapter } from '../lib/workspaceMutations'
import { executeMutation } from './mutationHelper'
import type { GoalCard, GoalStatus } from '../types/app'

export interface GoalStoreState {
  baseGoals: GoalCard[]

  hydrateGoals: (goals: GoalCard[]) => void
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
  baseGoals: [],

  hydrateGoals: (goals) => set({ baseGoals: goals }),

  replaceGoal: (goal) => {
    const nextGoals = replaceGoalInArray(get().baseGoals, goal)
    set({ baseGoals: nextGoals })
    return nextGoals
  },

  createGoal: async (input, options) => {
    const adapter = createWorkspaceMutationAdapter()
    const result = await executeMutation(
      (a) => a.createGoal(input, options),
      adapter,
    )
    if (!result?.goal) return { goal: undefined, openGoalWorkspace: false }
    get().replaceGoal(result.goal)
    return { goal: result.goal, openGoalWorkspace: result.openGoalWorkspace || false }
  },

  updateGoalFields: async (goalId, input) => {
    const adapter = createWorkspaceMutationAdapter()
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

    const adapter = createWorkspaceMutationAdapter()
    const result = await executeMutation(
      (a) => a.updateGoalStatus(goalId, status),
      adapter,
      { onSuccess: ({ goal }) => { if (goal) get().replaceGoal(goal) } },
    )
    return result?.goal ?? null
  },
}))

export function useSelectedGoal(selectedGoalId?: string) {
  return useGoalStore((state) => state.baseGoals.find((goal) => goal.id === selectedGoalId))
}
