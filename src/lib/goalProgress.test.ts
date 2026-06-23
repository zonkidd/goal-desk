import { describe, it, expect } from 'vitest'
import { computeGoalProgress } from './goalProgress'
import type { Task } from '../types/task'

describe('computeGoalProgress', () => {
  it('returns 0 progress when no tasks linked', () => {
    const result = computeGoalProgress([], 'goal-1')
    expect(result).toEqual({ progress: 0, taskCount: 0, doneCount: 0 })
  })

  it('returns 0 progress when no tasks are done', () => {
    const tasks: Task[] = [
      { id: 't1', title: 'Task 1', content: '', status: 'TODO', showInTimeline: false, linkedGoalId: 'goal-1', activityLogs: [] },
      { id: 't2', title: 'Task 2', content: '', status: 'IN_PROGRESS', showInTimeline: false, linkedGoalId: 'goal-1', activityLogs: [] },
    ]
    const result = computeGoalProgress(tasks, 'goal-1')
    expect(result).toEqual({ progress: 0, taskCount: 2, doneCount: 0 })
  })

  it('returns 50 progress when half tasks are done', () => {
    const tasks: Task[] = [
      { id: 't1', title: 'Task 1', content: '', status: 'DONE', showInTimeline: false, linkedGoalId: 'goal-1', activityLogs: [] },
      { id: 't2', title: 'Task 2', content: '', status: 'TODO', showInTimeline: false, linkedGoalId: 'goal-1', activityLogs: [] },
    ]
    const result = computeGoalProgress(tasks, 'goal-1')
    expect(result).toEqual({ progress: 50, taskCount: 2, doneCount: 1 })
  })

  it('returns 100 progress when all tasks are done', () => {
    const tasks: Task[] = [
      { id: 't1', title: 'Task 1', content: '', status: 'DONE', showInTimeline: false, linkedGoalId: 'goal-1', activityLogs: [] },
      { id: 't2', title: 'Task 2', content: '', status: 'DONE', showInTimeline: false, linkedGoalId: 'goal-1', activityLogs: [] },
    ]
    const result = computeGoalProgress(tasks, 'goal-1')
    expect(result).toEqual({ progress: 100, taskCount: 2, doneCount: 2 })
  })

  it('ignores tasks linked to other goals', () => {
    const tasks: Task[] = [
      { id: 't1', title: 'Task 1', content: '', status: 'DONE', showInTimeline: false, linkedGoalId: 'goal-1', activityLogs: [] },
      { id: 't2', title: 'Task 2', content: '', status: 'TODO', showInTimeline: false, linkedGoalId: 'goal-2', activityLogs: [] },
    ]
    const result = computeGoalProgress(tasks, 'goal-1')
    expect(result).toEqual({ progress: 100, taskCount: 1, doneCount: 1 })
  })

  it('ignores tasks with no linked goal', () => {
    const tasks: Task[] = [
      { id: 't1', title: 'Task 1', content: '', status: 'DONE', showInTimeline: false, linkedGoalId: 'goal-1', activityLogs: [] },
      { id: 't2', title: 'Task 2', content: '', status: 'TODO', showInTimeline: false, activityLogs: [] },
    ]
    const result = computeGoalProgress(tasks, 'goal-1')
    expect(result).toEqual({ progress: 100, taskCount: 1, doneCount: 1 })
  })
})
