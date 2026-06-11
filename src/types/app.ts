export interface TimelineItem {
  id: string
  title: string
  timeLabel: string
  source: 'todo' | 'reminder' | 'calendar'
  readonly: boolean
  done: boolean
  sourceLabel?: string
}

export type GoalStatus = 'ACTIVE' | 'PAUSED' | 'READY_TO_COMPLETE' | 'COMPLETED' | 'ARCHIVED'

export interface GoalCard {
  id: string
  title: string
  area: string
  description: string
  status: GoalStatus
  progress: number
  nextTodo: string
  taskCount: number
  createdAt: Date
  updatedAt: Date
}

export type ViewKey = 'inbox' | 'today' | 'board' | 'goals'
export type AreaFilter = 'ALL' | string

export type AccessStatus = 'granted' | 'denied' | 'restricted' | 'not_determined' | 'error'

export interface ReminderItem {
  id: string
  title: string
  dueAt?: Date
  done: boolean
  listTitle?: string
}

export interface IntegrationStatus {
  calendar: AccessStatus
  reminders: AccessStatus
}
