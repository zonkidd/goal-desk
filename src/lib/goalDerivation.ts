import type { GoalCard, GoalStatus } from '../types/app'
import type { Task } from '../types/task'

/**
 * Derive Goal status from persisted status + linked task completion.
 * Rust stores the raw status; this computes the effective status.
 * Called once after loading goals from Rust, not per-render.
 */
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
