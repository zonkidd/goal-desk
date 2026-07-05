import { describe, expect, it } from 'vitest'
import { applyTodoFieldPatch, toTauriTaskFieldArgs } from './todoFieldPatch'
import type { Task } from '../types/task'

describe('Todo field patch semantics', () => {
  it('preserves omitted fields, clears explicit nulls, and serializes changed fields once', () => {
    const existingTask: Task = {
      id: 'task-1',
      title: 'Original title',
      content: '',
      status: 'TODO',
      plannedStartAt: new Date('2026-06-15T10:00:00.000Z'),
      dueDate: new Date('2026-06-20T18:00:00.000Z'),
      linkedGoalId: 'goal-1',
      linkedGoalLabel: 'Original goal',
      showInTimeline: true,
      systemReminderId: 'reminder-1',
      activityLogs: [],
    }

    const patch = {
      title: ' Updated title ',
      plannedStartAt: null,
      dueDate: new Date('2026-06-21T09:30:00.000Z'),
      linkedGoalId: '',
      linkedGoalLabel: 'Stale goal label',
      systemReminderId: undefined,
    }

    expect(applyTodoFieldPatch(existingTask, patch)).toEqual({
      ...existingTask,
      title: 'Updated title',
      plannedStartAt: undefined,
      dueDate: patch.dueDate,
      linkedGoalId: undefined,
      linkedGoalLabel: undefined,
      systemReminderId: 'reminder-1',
    })

    expect(toTauriTaskFieldArgs('task-1', patch)).toEqual({
      taskId: 'task-1',
      title: 'Updated title',
      plannedStartAt: { value: null },
      dueAt: { value: '2026-06-21T09:30:00.000Z' },
      showInTimeline: null,
      linkedGoalId: { value: null },
      linkedGoalLabel: { value: null },
    })
  })

  it('ignores a goal label without a goal id so the goal link stays coherent', () => {
    const existingTask: Task = {
      id: 'task-1',
      title: 'Original title',
      content: '',
      status: 'TODO',
      linkedGoalId: 'goal-1',
      linkedGoalLabel: 'Original goal',
      showInTimeline: false,
      activityLogs: [],
    }

    const patch = {
      title: 'Original title',
      linkedGoalLabel: 'Different goal',
    } as unknown as Parameters<typeof applyTodoFieldPatch>[1]

    expect(applyTodoFieldPatch(existingTask, patch)).toEqual(existingTask)
    expect(toTauriTaskFieldArgs('task-1', patch)).toEqual({
      taskId: 'task-1',
      title: 'Original title',
      showInTimeline: null,
    })
  })
})
