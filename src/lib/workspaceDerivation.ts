export { deriveGoalRecords, deriveGoalStatus } from './goalDerivation'
export { getTodayFocusTasks, filterGoalsByArea, filterTasksByArea } from './areaFilter'
export { deriveTodayAgenda, filterAgendaByArea } from './todayAgenda'
export { deriveTodayAttentionGroups, deriveTodayRelevantGoals } from './attentionGroups'
export type { TodayAttentionGroups, TodayRelevantGoal } from './attentionGroups'
export { convertEventKitToRawItems, groupByDate } from './eventkitTransform'
export type { EventKitCalendarEvent, EventKitReminder } from './eventkitTransform'

import type { Task } from '../types/task'

export interface InboxTaskGroups {
  activeTasks: Task[]
  pausedTasks: Task[]
  completed: {
    totalCount: number
    visibleTasks: Task[]
    isCollapsedByDefault: true
  }
}

function sortTasksByRecent(tasks: Task[]) {
  return [...tasks].sort((a, b) => {
    const aTime = Math.max(...a.activityLogs.map((log) => log.timestamp.getTime()), 0)
    const bTime = Math.max(...b.activityLogs.map((log) => log.timestamp.getTime()), 0)
    return bTime - aTime
  })
}

export function getInboxTaskGroups(tasks: Task[], showCompleted = false): InboxTaskGroups {
  const activeTasks = sortTasksByRecent(tasks.filter((task) => task.status === 'TODO' || task.status === 'IN_PROGRESS'))
  const pausedTasks = sortTasksByRecent(tasks.filter((task) => task.status === 'PAUSED'))
  const completedTasks = sortTasksByRecent(tasks.filter((task) => task.status === 'DONE'))

  return {
    activeTasks,
    pausedTasks,
    completed: {
      isCollapsedByDefault: true as const,
      totalCount: completedTasks.length,
      visibleTasks: showCompleted ? completedTasks : [],
    },
  }
}
