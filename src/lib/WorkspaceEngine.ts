import type { AreaFilter, GoalCard, RawAgendaItem, TodayAgenda } from '../types/app'
import type { Task } from '../types/task'
import {
  deriveGoalRecords,
  deriveTodayAttentionGroups,
  deriveTodayRelevantGoals,
  deriveTodayAgenda,
  filterGoalsByArea,
  filterTasksByArea,
  filterAgendaByArea,
  getInboxTaskGroups,
  getTodayFocusTasks,
  type InboxTaskGroups,
  type TodayAttentionGroups,
  type TodayRelevantGoal,
} from './workspaceDerivation'

export interface WorkspaceSnapshot {
  goals: GoalCard[]
  today: {
    timeline: TodayAgenda
    focusTasks: Task[]
    attentionGroups: TodayAttentionGroups
    relevantGoals: TodayRelevantGoal[]
  }
  inbox: InboxTaskGroups
  meta: {
    computedAt: Date
    activeArea: AreaFilter
    taskCount: number
    goalCount: number
  }
}

export interface AtomicState {
  baseTimeline: RawAgendaItem[]
  baseGoals: GoalCard[]
  tasks: Task[]
  activeArea: AreaFilter
  showCompletedTodos: boolean
  now?: Date
}

export function computeSnapshot(state: AtomicState): WorkspaceSnapshot {
  const now = state.now ?? new Date()
  const derivedGoals = deriveGoalRecords(state.baseGoals, state.tasks)
  const goals = filterGoalsByArea(derivedGoals, state.activeArea)
  const filteredTasks = filterTasksByArea(state.tasks, derivedGoals, state.activeArea)
  const todayFocusTasks = getTodayFocusTasks(state.tasks, derivedGoals, state.activeArea, now)
  const focusFiltered = state.activeArea === 'ALL'
    ? todayFocusTasks
    : filterTasksByArea(todayFocusTasks, derivedGoals, state.activeArea)
  const timeline = deriveTodayAgenda(state.baseTimeline, state.tasks, now)
  const timelineFiltered = state.activeArea === 'ALL' ? timeline : filterAgendaByArea(timeline, filteredTasks)
  const attentionGroups = deriveTodayAttentionGroups(
    state.activeArea === 'ALL' ? state.tasks : filteredTasks,
    now,
  )
  const relevantGoals = deriveTodayRelevantGoals(derivedGoals, attentionGroups)
  const inbox = getInboxTaskGroups(filteredTasks, state.showCompletedTodos)

  return {
    goals,
    today: {
      timeline: timelineFiltered,
      focusTasks: focusFiltered,
      attentionGroups,
      relevantGoals,
    },
    inbox,
    meta: {
      computedAt: now,
      activeArea: state.activeArea,
      taskCount: state.tasks.length,
      goalCount: state.baseGoals.length,
    },
  }
}
