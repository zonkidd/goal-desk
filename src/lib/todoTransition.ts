import type { Task, TaskActivityAction, TaskStatus } from '../types/task'
import transitionContract from './todoTransition.contract.json' with { type: 'json' }

export const TODO_TRANSITION_CONTRACT = transitionContract as Record<
  TaskStatus,
  {
    allowedTargets: TaskStatus[]
    activityActions: Partial<Record<TaskStatus, TaskActivityAction>>
  }
>

export function getAllowedTodoStatusActions(status: TaskStatus): TaskStatus[] {
  return [...TODO_TRANSITION_CONTRACT[status].allowedTargets]
}

export function canTransitionTodoStatus(current: TaskStatus, target: TaskStatus): boolean {
  return current === target || TODO_TRANSITION_CONTRACT[current].allowedTargets.includes(target)
}

export function logActionForTodoTransition(fromStatus: TaskStatus, toStatus: TaskStatus): TaskActivityAction {
  return TODO_TRANSITION_CONTRACT[fromStatus].activityActions[toStatus] ?? 'NOTE_ADDED'
}

export function getTodoStatusActionLabel(status: TaskStatus): string {
  switch (status) {
    case 'TODO':
      return 'Start'
    case 'IN_PROGRESS':
      return 'Pause'
    case 'PAUSED':
      return 'Resume'
    case 'DONE':
      return ''
  }
}

export interface ApplyTodoStatusTransitionOptions {
  note?: string
  now?: Date
}

export function applyTodoStatusTransition(
  task: Task,
  targetStatus: TaskStatus,
  options: ApplyTodoStatusTransitionOptions = {},
): Task {
  if (task.status === targetStatus) return task
  if (!canTransitionTodoStatus(task.status, targetStatus)) return task

  return {
    ...task,
    status: targetStatus,
    activityLogs: [
      {
        action: logActionForTodoTransition(task.status, targetStatus),
        note: options.note?.trim() || undefined,
        timestamp: options.now ?? new Date(),
      },
      ...task.activityLogs,
    ],
  }
}
