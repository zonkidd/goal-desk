import type { Task } from '../types/task'

export interface GoalProgress {
  progress: number
  taskCount: number
  doneCount: number
}

export function computeGoalProgress(tasks: Task[], goalId: string): GoalProgress {
  const linkedTasks = tasks.filter((t) => t.linkedGoalId === goalId)
  const taskCount = linkedTasks.length
  const doneCount = linkedTasks.filter((t) => t.status === 'DONE').length
  const progress = taskCount === 0 ? 0 : Math.round((doneCount / taskCount) * 100)
  return { progress, taskCount, doneCount }
}
