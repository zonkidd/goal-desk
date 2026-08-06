import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTaskStore } from './taskStore'
import { setWorkspaceMutationAdapter, resetWorkspaceMutationAdapter } from '../lib/workspaceMutations'
import type { MutationAdapter } from '../lib/mutationAdapter'

function createMockAdapter(): MutationAdapter {
  return {
    createTask: vi.fn().mockResolvedValue({ task: undefined, statusMessage: 'ok' }),
    createTaskForGoal: vi.fn().mockResolvedValue({ task: undefined, statusMessage: 'ok' }),
    addTaskNote: vi.fn().mockResolvedValue({ task: undefined, statusMessage: 'ok' }),
    updateTaskStatus: vi.fn().mockResolvedValue({ task: undefined, statusMessage: 'ok' }),
    updateTaskContent: vi.fn().mockResolvedValue({ task: undefined, statusMessage: 'ok' }),
    updateTaskFields: vi.fn().mockResolvedValue({ task: undefined, statusMessage: 'ok' }),
    createGoal: vi.fn().mockResolvedValue({ goal: undefined, statusMessage: 'ok', openGoalWorkspace: false }),
    updateGoalFields: vi.fn().mockResolvedValue({ goal: undefined, statusMessage: 'ok' }),
    updateGoalStatus: vi.fn().mockResolvedValue({ goal: undefined, statusMessage: 'ok' }),
    listAreas: vi.fn().mockResolvedValue({ areas: [], statusMessage: 'ok' }),
    createArea: vi.fn().mockResolvedValue({ area: undefined, statusMessage: 'ok' }),
    renameArea: vi.fn().mockResolvedValue({ area: undefined, statusMessage: 'ok' }),
    deleteArea: vi.fn().mockResolvedValue({ success: true, message: 'ok', statusMessage: 'ok' }),
    loadGoals: vi.fn().mockResolvedValue([]),
    softDeleteTask: vi.fn().mockResolvedValue(undefined),
    restoreTask: vi.fn().mockResolvedValue({ task: undefined, statusMessage: 'restored' }),
    listDeletedTasks: vi.fn().mockResolvedValue([]),
    softDeleteGoal: vi.fn().mockResolvedValue(undefined),
    restoreGoal: vi.fn().mockResolvedValue({ goal: undefined, statusMessage: 'restored' }),
    listDeletedGoals: vi.fn().mockResolvedValue([]),

      createDailyReviewItem: vi.fn(),
      updateDailyReviewItem: vi.fn(),
      deleteDailyReviewItem: vi.fn(),
      getDailyReviewTimeline: vi.fn(),
  }
}

describe('system Reminder link actions', () => {
  beforeEach(() => {
    resetWorkspaceMutationAdapter()
    useTaskStore.setState({ tasks: [] })
  })

  it('does not expose a system Reminder creation action', () => {
    expect('createAndLinkReminder' in useTaskStore.getState()).toBe(false)
  })

  it('does not expose a system Reminder completion sync action', () => {
    expect('syncTasksForSystemReminder' in useTaskStore.getState()).toBe(false)
  })

  it('should express unlink as a clear Reminder intent', async () => {
    const mockAdapter = createMockAdapter()
    mockAdapter.updateTaskFields = vi.fn(async (_taskId, input: any) => ({
      task: {
        id: 'task-1',
        title: 'Test',
        content: '',
        status: 'TODO' as const,
        activityLogs: [],
        systemReminderId: input.systemReminderId === null ? undefined : 'reminder-123',
      },
      statusMessage: 'ok',
    }))
    setWorkspaceMutationAdapter(mockAdapter)

    useTaskStore.setState({
      tasks: [
        {
          id: 'task-1',
          title: 'Test',
          content: '',
          status: 'TODO',
          systemReminderId: 'reminder-123',
          activityLogs: [],
        },
      ],
    })

    await useTaskStore.getState().unlinkTaskFromReminder('task-1')

    expect(mockAdapter.updateTaskFields).toHaveBeenCalledWith('task-1', expect.objectContaining({
      systemReminderId: null,
    }))
    expect(useTaskStore.getState().tasks[0].systemReminderId).toBeUndefined()
  })

  it('omits systemReminderId during ordinary field saves when caller does not change the Reminder link', async () => {
    const mockAdapter = createMockAdapter()
    setWorkspaceMutationAdapter(mockAdapter)

    useTaskStore.setState({
      tasks: [
        {
          id: 'task-1',
          title: 'Test',
          content: '',
          status: 'TODO',
          systemReminderId: 'reminder-123',
          activityLogs: [],
        },
      ],
    })

    await useTaskStore.getState().updateTaskFields('task-1', {
      title: 'Updated',
      showInTimeline: false,
    }, [])

    expect(mockAdapter.updateTaskFields).toHaveBeenCalledWith('task-1', expect.not.objectContaining({
      systemReminderId: expect.anything(),
    }))
  })
})
