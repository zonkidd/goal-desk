import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getWorkspaceMutationAdapter, setWorkspaceMutationAdapter, resetWorkspaceMutationAdapter } from './workspaceMutations'
import type { MutationAdapter } from './mutationAdapter'
import type { GoalCard } from '../types/app'
import type { Task } from '../types/task'

function createMockAdapter(): MutationAdapter {
  return {
    createTask: vi.fn().mockResolvedValue({ task: { id: 'mock-task', title: 'Mock', status: 'TODO', content: '', showInTimeline: false, activityLogs: [] } as Task }),
    createTaskForGoal: vi.fn().mockResolvedValue({ task: { id: 'mock-task', title: 'Mock', status: 'TODO', content: '', showInTimeline: false, activityLogs: [] } as Task }),
    createGoal: vi.fn().mockResolvedValue({ goal: { id: 'mock-goal', title: 'Mock', area: 'Inbox', description: '', status: 'ACTIVE', progress: 0, nextTodo: '', taskCount: 0, createdAt: new Date(), updatedAt: new Date() } as GoalCard, openGoalWorkspace: true }),
    updateGoalFields: vi.fn().mockResolvedValue({}),
    updateGoalStatus: vi.fn().mockResolvedValue({}),
    addTaskNote: vi.fn().mockResolvedValue({}),
    updateTaskStatus: vi.fn().mockResolvedValue({}),
    updateTaskContent: vi.fn().mockResolvedValue({}),
    updateTaskFields: vi.fn().mockResolvedValue({}),
    listAreas: vi.fn().mockResolvedValue({}),
    createArea: vi.fn().mockResolvedValue({}),
    renameArea: vi.fn().mockResolvedValue({}),
    deleteArea: vi.fn().mockResolvedValue({ success: true, message: 'ok' }),
    createSystemReminder: vi.fn().mockResolvedValue('mock-id'),
  }
}

describe('workspaceMutations adapter injection', () => {
  beforeEach(() => {
    resetWorkspaceMutationAdapter()
  })

  it('getWorkspaceMutationAdapter returns a valid adapter', () => {
    const adapter = getWorkspaceMutationAdapter()
    expect(adapter).toBeDefined()
    expect(typeof adapter.createTask).toBe('function')
  })

  it('setWorkspaceMutationAdapter overrides the default', () => {
    const mock = createMockAdapter()
    setWorkspaceMutationAdapter(mock)

    const retrieved = getWorkspaceMutationAdapter()
    expect(retrieved).toBe(mock)
  })

  it('resetWorkspaceMutationAdapter clears the override', () => {
    const mock = createMockAdapter()
    setWorkspaceMutationAdapter(mock)
    resetWorkspaceMutationAdapter()

    const retrieved = getWorkspaceMutationAdapter()
    expect(retrieved).not.toBe(mock)
  })

  it('injected adapter is used by getWorkspaceMutationAdapter', () => {
    const mock = createMockAdapter()
    setWorkspaceMutationAdapter(mock)

    const adapter = getWorkspaceMutationAdapter()
    expect(adapter.createTask).toBe(mock.createTask)
  })
})
