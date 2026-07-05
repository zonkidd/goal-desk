import { describe, it, expect } from 'vitest'
import { getTaskStatusActions, getTaskTimeInfo } from './taskPresentation'
import type { Task } from '../types/task'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test Task',
    status: 'TODO',
    content: '',
    plannedStartAt: undefined,
    dueDate: undefined,
    createdAt: new Date('2026-06-10'),
    updatedAt: new Date('2026-06-10'),
    activityLogs: [],
    systemReminderId: undefined,
    showInTimeline: false,
    ...overrides,
  }
}

describe('getTaskTimeInfo', () => {
  it('should calculate critical urgency when 2 days remaining', () => {
    const now = new Date('2026-06-13')
    const task = makeTask({
      plannedStartAt: new Date('2026-06-10'),
      dueDate: new Date('2026-06-15'),
    })
    const result = getTaskTimeInfo(task, now)
    expect(result.daysElapsed).toBe(3)
    expect(result.daysRemaining).toBe(2)
    expect(result.urgency).toBe('critical')
    expect(result.totalDays).toBe(5)
    expect(result.progressPercent).toBe(60)
  })

  it('should calculate warning urgency when 6 days remaining', () => {
    const now = new Date('2026-06-13')
    const task = makeTask({
      plannedStartAt: new Date('2026-06-12'),
      dueDate: new Date('2026-06-19'),
    })
    const result = getTaskTimeInfo(task, now)
    expect(result.daysElapsed).toBe(1)
    expect(result.daysRemaining).toBe(6)
    expect(result.urgency).toBe('warning')
    expect(result.totalDays).toBe(7)
    expect(result.progressPercent).toBe(14)
  })

  it('should calculate normal urgency when 15 days remaining', () => {
    const now = new Date('2026-06-13')
    const task = makeTask({
      plannedStartAt: new Date('2026-06-11'),
      dueDate: new Date('2026-06-28'),
    })
    const result = getTaskTimeInfo(task, now)
    expect(result.daysElapsed).toBe(2)
    expect(result.daysRemaining).toBe(15)
    expect(result.urgency).toBe('normal')
    expect(result.totalDays).toBe(17)
    expect(result.progressPercent).toBe(12)
  })

  it('should handle no due date', () => {
    const now = new Date('2026-06-13')
    const task = makeTask({
      plannedStartAt: new Date('2026-06-08'),
      dueDate: undefined,
    })
    const result = getTaskTimeInfo(task, now)
    expect(result.daysElapsed).toBe(5)
    expect(result.daysRemaining).toBeNull()
    expect(result.urgency).toBe('none')
    expect(result.totalDays).toBeNull()
    expect(result.progressPercent).toBeNull()
  })

  it('should handle start day = today', () => {
    const now = new Date('2026-06-13')
    const task = makeTask({
      plannedStartAt: new Date('2026-06-13'),
      dueDate: new Date('2026-06-20'),
    })
    const result = getTaskTimeInfo(task, now)
    expect(result.daysElapsed).toBe(0)
    expect(result.daysRemaining).toBe(7)
    expect(result.urgency).toBe('warning')
  })

  it('should handle due day = today', () => {
    const now = new Date('2026-06-13')
    const task = makeTask({
      plannedStartAt: new Date('2026-06-10'),
      dueDate: new Date('2026-06-13'),
    })
    const result = getTaskTimeInfo(task, now)
    expect(result.daysElapsed).toBe(3)
    expect(result.daysRemaining).toBe(0)
    expect(result.urgency).toBe('critical')
  })

  it('should fall back to createdAt when no plannedStartAt', () => {
    const now = new Date('2026-06-15')
    const task = makeTask({
      plannedStartAt: undefined,
      createdAt: new Date('2026-06-10'),
      dueDate: new Date('2026-06-20'),
    })
    const result = getTaskTimeInfo(task, now)
    expect(result.daysElapsed).toBe(5)
  })
})

describe('getTaskStatusActions', () => {
  it('should expose Resume and Done as actions for a paused Todo', () => {
    expect(getTaskStatusActions('PAUSED')).toEqual(['IN_PROGRESS', 'DONE'])
  })
})
