import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EditingSession } from './EditingSession'

interface TestEntity {
  id: string
  title: string
  description: string
}

interface TestDraft extends TestEntity {
  tempField?: string
}

describe('EditingSession', () => {
  let mockSaveFunction: any
  let session: EditingSession<TestEntity, TestDraft>

  beforeEach(() => {
    mockSaveFunction = vi.fn().mockResolvedValue(undefined)

    const initialEntity: TestEntity = {
      id: 'test-1',
      title: 'Original Title',
      description: 'Original Description',
    }

    session = new EditingSession(initialEntity, mockSaveFunction)
  })

  it('should initialize with entity data', () => {
    // Act
    const draft = session.getDraft()

    // Assert
    expect(draft.title).toBe('Original Title')
    expect(draft.description).toBe('Original Description')
  })

  it('should update single field', () => {
    // Act
    session.updateField('title', 'New Title')
    const draft = session.getDraft()

    // Assert
    expect(draft.title).toBe('New Title')
    expect(draft.description).toBe('Original Description') // Unchanged
  })

  it('should update multiple fields', () => {
    // Act
    session.updateField('title', 'New Title')
    session.updateField('description', 'New Description')
    const draft = session.getDraft()

    // Assert
    expect(draft.title).toBe('New Title')
    expect(draft.description).toBe('New Description')
  })

  it('should track dirty state', () => {
    // Initially not dirty
    expect(session.isDirty()).toBe(false)

    // Act - modify field
    session.updateField('title', 'Modified')

    // Assert - now dirty
    expect(session.isDirty()).toBe(true)
  })

  it('should not be dirty when value unchanged', () => {
    // Act - set to same value
    session.updateField('title', 'Original Title')

    // Assert - still not dirty
    expect(session.isDirty()).toBe(false)
  })

  it('should save changes', async () => {
    // Arrange
    session.updateField('title', 'New Title')
    session.updateField('description', 'New Description')

    // Act
    await session.saveChanges()

    // Assert
    expect(mockSaveFunction).toHaveBeenCalledWith({
      id: 'test-1',
      title: 'New Title',
      description: 'New Description',
    })
  })

  it('should reset dirty state after save', async () => {
    // Arrange
    session.updateField('title', 'New Title')
    expect(session.isDirty()).toBe(true)

    // Act
    await session.saveChanges()

    // Assert
    expect(session.isDirty()).toBe(false)
  })

  it('should not save when not dirty', async () => {
    // Act - save without changes
    await session.saveChanges()

    // Assert
    expect(mockSaveFunction).not.toHaveBeenCalled()
  })

  it('should discard changes', () => {
    // Arrange
    session.updateField('title', 'Modified Title')
    expect(session.isDirty()).toBe(true)

    // Act
    session.discardChanges()

    // Assert
    const draft = session.getDraft()
    expect(draft.title).toBe('Original Title')
    expect(session.isDirty()).toBe(false)
  })
})
