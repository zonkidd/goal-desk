import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTaskStore } from './taskStore'
import { setWorkspaceMutationAdapter, resetWorkspaceMutationAdapter } from '../lib/workspaceMutations'
import { setRuntimeAdapter, resetRuntimeAdapter } from '../lib/runtimeAdapter'
import type { MutationAdapter } from '../lib/mutationAdapter'
import type { RuntimeAdapter } from '../lib/runtimeAdapter'

function createMockAdapter(): MutationAdapter {
  return {
    createTask: vi.fn().mockResolvedValue({ task: undefined, statusMessage: 'ok' }),
    createTaskForGoal: vi.fn().mockResolvedValue({ task: undefined, statusMessage: 'ok' }),
    addTaskNote: vi.fn().mockResolvedValue({ task: undefined, statusMessage: 'ok' }),
    updateTaskStatus: vi.fn().mockResolvedValue({ task: undefined, statusMessage: 'ok' }),
    updateTaskContent: vi.fn().mockResolvedValue({ task: undefined, statusMessage: 'ok' }),
    updateTaskFields: vi.fn().mockResolvedValue({ task: undefined, statusMessage: 'ok' }),
    createSystemReminder: vi.fn().mockResolvedValue('reminder-123'),
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
  }
}

function createMockRuntime(isTauri: boolean): RuntimeAdapter {
  return {
    isTauri: () => isTauri,
    getWindowLabel: () => 'main',
    hideWindow: vi.fn().mockResolvedValue(undefined),
    canOpenInBear: () => false,
    canSyncTasks: () => false,
    canLoadDesktopSnapshot: () => false,
  }
}

describe('createAndLinkReminder', () => {
  beforeEach(() => {
    resetWorkspaceMutationAdapter()
    resetRuntimeAdapter()
    useTaskStore.setState({ tasks: [] })
  })

  it('should create reminder and link to task when taskId is provided', async () => {
    const mockAdapter = createMockAdapter()
    mockAdapter.updateTaskFields = vi.fn().mockResolvedValue({
      task: { id: 'task-1', title: 'Test', systemReminderId: 'reminder-123' },
      statusMessage: 'ok',
    })
    setWorkspaceMutationAdapter(mockAdapter)
    setRuntimeAdapter(createMockRuntime(true))

    useTaskStore.setState({
      tasks: [{ id: 'task-1', title: 'Test', content: '', status: 'TODO', activityLogs: [] }],
    })

    const result = await useTaskStore.getState().createAndLinkReminder('task-1', 'Reminder Title')

    expect(result).toBe('reminder-123')
    expect(mockAdapter.createSystemReminder).toHaveBeenCalledWith('Reminder Title', undefined)
    expect(mockAdapter.updateTaskFields).toHaveBeenCalled()
  })

  it('should create reminder without calling linkTaskToReminder when taskId is empty', async () => {
    const mockAdapter = createMockAdapter()
    setWorkspaceMutationAdapter(mockAdapter)
    setRuntimeAdapter(createMockRuntime(true))

    const linkSpy = vi.spyOn(useTaskStore.getState(), 'linkTaskToReminder')

    const result = await useTaskStore.getState().createAndLinkReminder('', 'Reminder Title')

    expect(result).toBe('reminder-123')
    expect(mockAdapter.createSystemReminder).toHaveBeenCalledWith('Reminder Title', undefined)
    expect(linkSpy).not.toHaveBeenCalled()
  })

  it('should create reminder without linking when taskId is empty in browser mode', async () => {
    const mockAdapter = createMockAdapter()
    setWorkspaceMutationAdapter(mockAdapter)
    setRuntimeAdapter(createMockRuntime(false))

    const result = await useTaskStore.getState().createAndLinkReminder('', 'Reminder Title')

    expect(result).toContain('mock-reminder-')
    const tasks = useTaskStore.getState().tasks
    expect(tasks.every(t => !t.systemReminderId)).toBe(true)
  })

  it('should persist reminder link via adapter in browser mode when taskId is provided', async () => {
    const mockAdapter = createMockAdapter()
    mockAdapter.updateTaskFields = vi.fn().mockResolvedValue({
      task: { id: 'task-1', title: 'Test', systemReminderId: 'mock-reminder-123' },
      statusMessage: 'ok',
    })
    setWorkspaceMutationAdapter(mockAdapter)
    setRuntimeAdapter(createMockRuntime(false))

    useTaskStore.setState({
      tasks: [{ id: 'task-1', title: 'Test', content: '', status: 'TODO', activityLogs: [] }],
    })

    const result = await useTaskStore.getState().createAndLinkReminder('task-1', 'Reminder Title')

    expect(result).toContain('mock-reminder-')
    expect(mockAdapter.updateTaskFields).toHaveBeenCalledWith('task-1', expect.objectContaining({
      systemReminderId: expect.stringContaining('mock-reminder-'),
    }))
  })
})
