import { describe, it, expect } from 'vitest'
import { isTaskInActiveDateRange } from './dateUtils'
import type { Task } from '../types/task'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Task',
    content: '',
    status: 'TODO',
    activityLogs: [],
    showInTimeline: false,
    ...overrides,
  }
}

describe('isTaskInActiveDateRange', () => {
  const today = new Date('2026-06-21T10:00:00')

  it('returns true when plannedStartAt <= today <= dueDate', () => {
    const task = makeTask({
      plannedStartAt: new Date('2026-06-20T00:00:00'),
      dueDate: new Date('2026-06-22T00:00:00'),
    })
    expect(isTaskInActiveDateRange(task, today)).toBe(true)
  })

  it('returns false when today < plannedStartAt', () => {
    const task = makeTask({
      plannedStartAt: new Date('2026-06-22T00:00:00'),
      dueDate: new Date('2026-06-25T00:00:00'),
    })
    expect(isTaskInActiveDateRange(task, today)).toBe(false)
  })

  it('returns false when today > dueDate', () => {
    const task = makeTask({
      plannedStartAt: new Date('2026-06-18T00:00:00'),
      dueDate: new Date('2026-06-20T00:00:00'),
    })
    expect(isTaskInActiveDateRange(task, today)).toBe(false)
  })

  it('returns true when no dueDate and plannedStartAt <= today', () => {
    const task = makeTask({
      plannedStartAt: new Date('2026-06-20T00:00:00'),
    })
    expect(isTaskInActiveDateRange(task, today)).toBe(true)
  })

  it('uses createdAt as fallback when no plannedStartAt', () => {
    const task = makeTask({
      createdAt: new Date('2026-06-20T00:00:00'),
      dueDate: new Date('2026-06-22T00:00:00'),
    })
    expect(isTaskInActiveDateRange(task, today)).toBe(true)
  })

  it('returns false when no start boundary at all', () => {
    const task = makeTask({})
    expect(isTaskInActiveDateRange(task, today)).toBe(false)
  })

  it('prioritizes STARTED activity log over plannedStartAt for IN_PROGRESS tasks', () => {
    const task = makeTask({
      status: 'IN_PROGRESS',
      plannedStartAt: new Date('2026-06-25T00:00:00'), // Future date
      activityLogs: [{ action: 'STARTED', timestamp: new Date('2026-06-20T00:00:00') }],
    })
    expect(isTaskInActiveDateRange(task, today)).toBe(true)
  })
})
