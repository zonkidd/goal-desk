import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState, useEffect } from 'react'
import type { ReminderItem } from '../types/app'

function useReminderEditState(reminder: ReminderItem | undefined) {
  const [editedTitle, setEditedTitle] = useState(reminder?.title || '')
  const [editedDueAt, setEditedDueAt] = useState(reminder?.dueAt)
  const [isDone, setIsDone] = useState(reminder?.done || false)

  useEffect(() => {
    setEditedTitle(reminder?.title || '')
    setEditedDueAt(reminder?.dueAt)
    setIsDone(reminder?.done || false)
  }, [reminder?.id])

  return { editedTitle, setEditedTitle, editedDueAt, isDone, setIsDone }
}

describe('useReminderEditState', () => {
  it('should initialize with reminder data', () => {
    const reminder: ReminderItem = {
      id: 'r1',
      title: 'First Reminder',
      dueAt: new Date('2026-06-22T10:00:00'),
      done: false,
    }

    const { result } = renderHook(() => useReminderEditState(reminder))

    expect(result.current.editedTitle).toBe('First Reminder')
    expect(result.current.isDone).toBe(false)
  })

  it('should reset state when reminder changes', () => {
    const reminder1: ReminderItem = {
      id: 'r1',
      title: 'First Reminder',
      dueAt: new Date('2026-06-22T10:00:00'),
      done: false,
    }
    const reminder2: ReminderItem = {
      id: 'r2',
      title: 'Second Reminder',
      dueAt: new Date('2026-06-23T14:00:00'),
      done: true,
    }

    const { result, rerender } = renderHook(
      ({ reminder }) => useReminderEditState(reminder),
      { initialProps: { reminder: reminder1 } },
    )

    act(() => {
      result.current.setEditedTitle('Modified Title')
    })
    expect(result.current.editedTitle).toBe('Modified Title')

    rerender({ reminder: reminder2 })

    expect(result.current.editedTitle).toBe('Second Reminder')
    expect(result.current.isDone).toBe(true)
  })

  it('should reset to empty when reminder becomes undefined', () => {
    const reminder: ReminderItem = {
      id: 'r1',
      title: 'Some Reminder',
      done: false,
    }

    const { result, rerender } = renderHook(
      ({ reminder }) => useReminderEditState(reminder),
      { initialProps: { reminder: reminder as ReminderItem | undefined } },
    )

    rerender({ reminder: undefined as ReminderItem | undefined })

    expect(result.current.editedTitle).toBe('')
    expect(result.current.isDone).toBe(false)
  })
})
