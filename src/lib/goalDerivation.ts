import type { GoalCard, GoalStatus } from '../types/app'
import type { Task } from '../types/task'

export function deriveGoalRecords(goals: GoalCard[], tasks: Task[]): GoalCard[] {
  return goals.map((goal) => {
    const linkedTasks = tasks.filter((task) => task.linkedGoalId === goal.id)

    if (linkedTasks.length === 0) {
      return goal
    }

    if (goal.taskCount > 0) {
      return {
        ...goal,
        nextTodo:
          goal.nextTodo ||
          linkedTasks
            .filter((task) => task.status !== 'DONE')
            .sort((left, right) => {
              const leftTime = left.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER
              const rightTime = right.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER
              return leftTime - rightTime
            })[0]?.title ||
          'Keep going',
        updatedAt: linkedTasks[0]?.updatedAt ?? goal.updatedAt ?? new Date(),
      }
    }

    const completedTaskCount = linkedTasks.filter((task) => task.status === 'DONE').length
    const nextTodo =
      linkedTasks
        .filter((task) => task.status !== 'DONE')
        .sort((left, right) => {
          const leftTime = left.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER
          const rightTime = right.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER
          return leftTime - rightTime
        })[0]?.title || 'Keep going'

    return {
      ...goal,
      progress: Math.round((completedTaskCount / linkedTasks.length) * 100),
      nextTodo,
      taskCount: linkedTasks.length,
      status: deriveGoalStatus(goal.status, linkedTasks),
      updatedAt: linkedTasks[0]?.updatedAt ?? goal.updatedAt ?? new Date(),
    }
  })
}

export function deriveGoalStatus(status: GoalCard['status'], linkedTasks: Task[]): GoalCard['status'] {
  if (status === 'ARCHIVED') return 'ARCHIVED'
  if (status === 'PAUSED') return 'PAUSED'
  if (status === 'COMPLETED') {
    return linkedTasks.some((task) => task.status !== 'DONE') ? 'ACTIVE' : 'COMPLETED'
  }
  if (status === 'READY_TO_COMPLETE' && linkedTasks.some((task) => task.status !== 'DONE')) return 'ACTIVE'
  if (linkedTasks.length > 0 && linkedTasks.every((task) => task.status === 'DONE')) return 'READY_TO_COMPLETE'
  return 'ACTIVE'
}
