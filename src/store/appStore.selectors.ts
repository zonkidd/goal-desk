import type { GoalCard, RawAgendaItem, TodayAgenda } from '../types/app'
import type { Task } from '../types/task'
import { filterGoalsByArea } from '../lib/areaFilter'

interface TimelineSelectorState {
  todayTimeline: RawAgendaItem[]
  showCompletedTodos: boolean
}

interface GoalSelectorState {
  baseGoals: GoalCard[]
  activeArea: string
}

export const selectFilteredTimeline = (state: TimelineSelectorState): TodayAgenda => {
  if (state.showCompletedTodos) {
    return state.todayTimeline
  }
  return state.todayTimeline.filter(item => !item.done)
}

export const selectFilteredGoals = (state: GoalSelectorState): GoalCard[] => {
  return filterGoalsByArea(state.baseGoals, state.activeArea)
}
