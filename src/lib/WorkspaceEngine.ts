import type { AreaFilter, GoalCard, RawAgendaItem, TodayAgenda } from '../types/app'
import type { Task } from '../types/task'
import {
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
  const goals = filterGoalsByArea(state.baseGoals, state.activeArea)
  const filteredTasks = filterTasksByArea(state.tasks, state.baseGoals, state.activeArea)
  const focusFiltered = getTodayFocusTasks(state.tasks, state.baseGoals, state.activeArea, now)
  const timeline = deriveTodayAgenda(state.baseTimeline, state.tasks, now)
  const timelineFiltered = state.activeArea === 'ALL' ? timeline : filterAgendaByArea(timeline, filteredTasks)
  const attentionGroups = deriveTodayAttentionGroups(
    state.activeArea === 'ALL' ? state.tasks : filteredTasks,
    now,
  )
  const relevantGoals = deriveTodayRelevantGoals(state.baseGoals, attentionGroups)
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
