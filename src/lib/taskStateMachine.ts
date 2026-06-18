import type { TaskActivityAction, TaskStatus } from '../types/task'

export type { TaskStatus }

export function getValidTransitions(status: TaskStatus): TaskStatus[] {
  switch (status) {
    case 'TODO':
      return ['IN_PROGRESS']
    case 'IN_PROGRESS':
      return ['PAUSED', 'DONE']
    case 'PAUSED':
      return ['IN_PROGRESS']
    case 'DONE':
      return ['TODO']
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
  if (toStatus === 'TODO') return 'NOTE_ADDED'
  return 'NOTE_ADDED'
}

export function getTransitionLabel(status: TaskStatus): string {
  switch (status) {
    case 'PAUSED':
      return 'Resume'
    case 'DONE':
      return 'Reopen'
    case 'IN_PROGRESS':
      return 'Pause'
    default:
      return 'Start'
  }
}

export function canTransitionTo(from: TaskStatus, to: TaskStatus): boolean {
  const validTransitions = getValidTransitions(from)
  return validTransitions.includes(to)
}

export function getNextActions(status: TaskStatus): string[] {
  const actions: string[] = []

  switch (status) {
    case 'TODO':
      actions.push('start')
      break
    case 'IN_PROGRESS':
      actions.push('pause', 'complete')
      break
    case 'PAUSED':
      actions.push('resume')
      break
    case 'DONE':
      actions.push('reopen')
      break
  }

  return actions
}
