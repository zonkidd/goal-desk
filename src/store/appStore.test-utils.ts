import type { GoalCard, RawAgendaItem } from '../types/app'
import type { Task } from '../types/task'

export interface MockTimelineSelectorState {
  todayTimeline: RawAgendaItem[]
  showCompletedTodos: boolean
}

export interface MockGoalSelectorState {
  baseGoals: GoalCard[]
  activeArea: string
  tasks: Task[]
}

export function createMockTimelineState(overrides: Partial<MockTimelineSelectorState> = {}): MockTimelineSelectorState {
  return {
    todayTimeline: [],
    showCompletedTodos: false,
    ...overrides,
  }
}

export function createMockGoalState(overrides: Partial<MockGoalSelectorState> = {}): MockGoalSelectorState {
  return {
    baseGoals: [],
    activeArea: 'ALL',
    tasks: [],
    ...overrides,
  }
}
