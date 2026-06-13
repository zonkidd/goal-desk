import type { TaskActivityAction, TaskStatus } from '../types/task'

export function getValidTransitions(status: TaskStatus): TaskStatus[] {
  switch (status) {
    case 'TODO':
      return ['IN_PROGRESS', 'DONE']
    case 'IN_PROGRESS':
      return ['PAUSED', 'DONE']
    case 'PAUSED':
      return ['IN_PROGRESS', 'DONE']
    case 'DONE':
      return []
    default:
      return []
  }
}

export function getTransitionAction(fromStatus: TaskStatus, toStatus: TaskStatus): TaskActivityAction {
  if (toStatus === 'IN_PROGRESS') {
    return fromStatus === 'PAUSED' ? 'RESUMED' : 'STARTED'
  }
  if (toStatus === 'PAUSED') return 'PAUSED'
  if (toStatus === 'DONE') return 'COMPLETED'
  return 'NOTE_ADDED'
}

export function getTransitionLabel(status: TaskStatus): string {
  switch (status) {
    case 'PAUSED':
      return 'Resume'
    case 'DONE':
      return ''
    case 'IN_PROGRESS':
      return 'Pause'
    default:
      return 'Start'
  }
}
