import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetWorkspaceMutationAdapter, setWorkspaceMutationAdapter } from '../lib/workspaceMutations'
import type { MutationAdapter } from '../lib/mutationAdapter'
import type { Task } from '../types/task'
import { useTaskStore } from './taskStore'

function createMockAdapter(updatedTask: Task, restoredTask?: Task): MutationAdapter {
  return {
    createTask: vi.fn().mockResolvedValue({ task: undefined }),
    createTaskForGoal: vi.fn().mockResolvedValue({ task: undefined }),
    addTaskNote: vi.fn().mockResolvedValue({ task: undefined }),
    updateTaskStatus: vi.fn().mockResolvedValue({ task: updatedTask }),
    updateTaskContent: vi.fn().mockResolvedValue({ task: undefined }),
    updateTaskFields: vi.fn().mockResolvedValue({ task: updatedTask }),
    createGoal: vi.fn().mockResolvedValue({ goal: undefined, openGoalWorkspace: false }),
    updateGoalFields: vi.fn().mockResolvedValue({ goal: undefined }),
    updateGoalStatus: vi.fn().mockResolvedValue({ goal: undefined }),
    softDeleteGoal: vi.fn().mockResolvedValue(undefined),
    restoreGoal: vi.fn().mockResolvedValue({ goal: undefined }),
    listDeletedGoals: vi.fn().mockResolvedValue([]),
    listAreas: vi.fn().mockResolvedValue({ areas: [] }),
    createArea: vi.fn().mockResolvedValue({ area: undefined }),
    renameArea: vi.fn().mockResolvedValue({ area: undefined }),
    deleteArea: vi.fn().mockResolvedValue({ success: true, message: 'ok' }),
    loadGoals: vi.fn().mockResolvedValue([]),
    softDeleteTask: vi.fn().mockResolvedValue(undefined),
    restoreTask: vi.fn().mockResolvedValue({ task: restoredTask }),
    listDeletedTasks: vi.fn().mockResolvedValue([]),
  }
}

describe('taskStore mutation result handling', () => {
  beforeEach(() => {
    resetWorkspaceMutationAdapter()
    useTaskStore.setState({ tasks: [], deletedTasks: [] })
  })

  it('returns and stores the updated Todo from a status mutation', async () => {
    const existingTask: Task = {
      id: 'task-1',
      title: 'Draft',
      content: '',
      status: 'TODO',
      showInTimeline: false,
      activityLogs: [],
    }
    const updatedTask: Task = {
      ...existingTask,
      status: 'IN_PROGRESS',
      activityLogs: [{ action: 'STARTED', timestamp: new Date('2026-07-05T08:00:00.000Z') }],
    }
    setWorkspaceMutationAdapter(createMockAdapter(updatedTask))
    useTaskStore.setState({ tasks: [existingTask] })

    const result = await useTaskStore.getState().updateTaskStatus('task-1', 'IN_PROGRESS')

    expect(result).toEqual(updatedTask)
    expect(useTaskStore.getState().tasks).toEqual([updatedTask])
  })

  it('returns and stores the updated Todo from a Reminder link mutation', async () => {
    const existingTask: Task = {
      id: 'task-1',
      title: 'Draft',
      content: '',
      status: 'TODO',
      showInTimeline: false,
      activityLogs: [],
    }
    const updatedTask: Task = {
      ...existingTask,
      systemReminderId: 'reminder-1',
    }
    setWorkspaceMutationAdapter(createMockAdapter(updatedTask))
    useTaskStore.setState({ tasks: [existingTask] })

    const result = await useTaskStore.getState().linkTaskToReminder('task-1', 'reminder-1')

    expect(result).toEqual(updatedTask)
    expect(useTaskStore.getState().tasks).toEqual([updatedTask])
  })

  it('returns and replaces the restored Todo when it is already loaded', async () => {
    const existingTask: Task = {
      id: 'task-1',
      title: 'Draft',
      content: '',
      status: 'TODO',
      showInTimeline: false,
      activityLogs: [],
    }
    const restoredTask: Task = {
      ...existingTask,
      title: 'Restored draft',
    }
    setWorkspaceMutationAdapter(createMockAdapter(existingTask, restoredTask))
    useTaskStore.setState({ tasks: [existingTask], deletedTasks: [restoredTask] })

    const result = await useTaskStore.getState().restoreTask('task-1')

    expect(result).toEqual(restoredTask)
    expect(useTaskStore.getState().tasks).toEqual([restoredTask])
    expect(useTaskStore.getState().deletedTasks).toEqual([])
  })
})
