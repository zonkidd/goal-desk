import type { Task } from './task'

export interface BearIntegrationStatus {
  tokenConfigured: boolean
}

export interface BearNotePreview {
  taskId: string
  bearNoteId: string
  title: string
  note: string
  tags: string[]
  isTrashed: boolean
  modificationDate?: Date
  creationDate?: Date
  fetchedAt: Date
}

export interface RustBearNotePreview {
  taskId: string
  bearNoteId: string
  title: string
  note: string
  tags: string[]
  isTrashed: boolean
  modificationDate: string | null
  creationDate: string | null
  fetchedAt: string
}

export interface LinkedBearNote {
  task: Task
  preview: BearNotePreview
}

export interface RustLinkedBearNote {
  task: import('../lib/codecs').RustTask
  preview: RustBearNotePreview
}

export interface BearNoteErrorEvent {
  taskId?: string
  message: string
}
