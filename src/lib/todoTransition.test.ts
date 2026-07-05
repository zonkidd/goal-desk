import { describe, expect, it } from 'vitest'
import { applyTodoStatusTransition, getAllowedTodoStatusActions, getTodoStatusActionLabel } from './todoTransition'
import type { Task } from '../types/task'

function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Write architecture note',
    content: '',
    status: 'TODO',
    activityLogs: [],
    ...overrides,
  }
}

describe('TODO_TRANSITION_CONTRACT', () => {
  it('exposes valid Todo Status actions through the lifecycle interface', () => {
    expect(getAllowedTodoStatusActions('PAUSED')).toEqual(['IN_PROGRESS', 'DONE'])
  })

  it('applies a Todo Status transition with an activity log and leaves invalid transitions untouched', () => {
    const now = new Date('2026-07-04T10:30:00+08:00')
    const todo = buildTask()

    const completed = applyTodoStatusTransition(todo, 'DONE', { note: 'Finished cleanly', now })
    const paused = buildTask({ status: 'PAUSED' })
    const completedFromPaused = applyTodoStatusTransition(paused, 'DONE', { now })

    expect(completed).toEqual({
      ...todo,
      status: 'DONE',
      activityLogs: [
        { action: 'COMPLETED', note: 'Finished cleanly', timestamp: now },
      ],
    })
    expect(completedFromPaused).toEqual({
      ...paused,
      status: 'DONE',
      activityLogs: [
        { action: 'COMPLETED', note: undefined, timestamp: now },
      ],
    })
  })

  it('keeps completed Todos view-only', () => {
    const done = buildTask({ status: 'DONE' })

    expect(getAllowedTodoStatusActions('DONE')).toEqual([])
    expect(applyTodoStatusTransition(done, 'TODO')).toBe(done)
  })

  it('exposes Todo Status action labels from the transition module', () => {
    expect(getTodoStatusActionLabel('TODO')).toBe('Start')
    expect(getTodoStatusActionLabel('IN_PROGRESS')).toBe('Pause')
    expect(getTodoStatusActionLabel('PAUSED')).toBe('Resume')
    expect(getTodoStatusActionLabel('DONE')).toBe('')
  })
})
