import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TaskEditingSession } from './TaskEditingSession'
import type { Task } from '../types/task'

describe('TaskEditingSession', () => {
  let mockSaveFunction: any
  let session: TaskEditingSession

  beforeEach(() => {
    mockSaveFunction = vi.fn().mockResolvedValue(undefined)

    const task: Task = {
      id: 'task-1',
      title: 'Original Task',
      status: 'TODO',
      content: 'Original content',
      activityLogs: [],
      createdAt: new Date('2026-06-15'),
      updatedAt: new Date('2026-06-15'),
    }

    session = new TaskEditingSession(task, mockSaveFunction)
  })

  it('should extend EditingSession for Task', () => {
    // Act
    const draft = session.getDraft()

    // Assert
    expect(draft.title).toBe('Original Task')
    expect(draft.content).toBe('Original content')
    expect(draft.status).toBe('TODO')
  })

  it('should update task-specific fields', () => {
    // Act
    session.updateField('title', 'Updated Task')
    session.updateField('content', 'Updated content')

    const draft = session.getDraft()

    // Assert
    expect(draft.title).toBe('Updated Task')
    expect(draft.content).toBe('Updated content')
  })

  it('should track dirty state for task edits', () => {
    // Initially not dirty
    expect(session.isDirty()).toBe(false)

    // Act
    session.updateField('title', 'Modified')

    // Assert
    expect(session.isDirty()).toBe(true)
  })

  it('should save task changes', async () => {
    // Arrange
    session.updateField('title', 'New Title')
    session.updateField('content', 'New Content')

    // Act
    await session.saveChanges()

    // Assert
    expect(mockSaveFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Title',
        content: 'New Content',
      })
    )
  })
})
