export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'PAUSED' | 'DONE'

export type TaskActivityAction =
  | 'CREATED'
  | 'PAUSED'
  | 'RESUMED'
  | 'COMPLETED'
  | 'NOTE_ADDED'

export interface TaskActivityLog {
  action: TaskActivityAction
  note?: string
  timestamp: Date
}

export interface Task {
  id: string
  title: string
  content: string
  status: TaskStatus
  dueDate?: Date
  isOngoing?: boolean
  linkedGoalId?: string
  linkedGoalLabel?: string
  bearNoteId?: string
  systemReminderId?: string
  createdAt?: Date
  updatedAt?: Date
  activityLogs: TaskActivityLog[]
}
