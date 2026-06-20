import type { GoalCard, RawAgendaItem, TodayAgenda } from '../types/app'
import type { Task } from '../types/task'

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
  if (state.activeArea === 'ALL') {
    return state.baseGoals
  }
  return state.baseGoals.filter(goal => goal.area === state.activeArea)
}
