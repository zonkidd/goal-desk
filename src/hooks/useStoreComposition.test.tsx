import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { useTaskStore } from '../store/taskStore'
import { useEventkitStore } from '../store/eventkitStore'
import { useToggleSystemReminder } from './useStoreComposition'

vi.mock('../lib/runtime', () => ({
  isTauriRuntime: vi.fn(() => true),
}))

vi.mock('../lib/eventkitIntegration', () => ({
  setSystemReminderCompleted: vi.fn(),
}))

describe('useToggleSystemReminder', () => {
  beforeEach(() => {
    useTaskStore.setState({
      tasks: [
        {
          id: 'task-1',
          title: 'Buy milk',
          status: 'TODO',
          systemReminderId: 'reminder-1',
          areaId: 'inbox',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          activityLogs: [],
        },
        {
          id: 'task-2',
          title: 'Other task',
          status: 'TODO',
          systemReminderId: undefined,
          areaId: 'inbox',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          activityLogs: [],
        },
      ],
    })

    useEventkitStore.setState({
      systemReminders: [
        {
          id: 'reminder-1',
          title: 'Buy milk reminder',
          done: false,
        },
      ],
    })

    vi.clearAllMocks()
  })

  it('should sync related Task when toggling System Reminder', async () => {
    const { setSystemReminderCompleted } = await import('../lib/eventkitIntegration')
    vi.mocked(setSystemReminderCompleted).mockResolvedValue({
      id: 'reminder-1',
      title: 'Buy milk reminder',
      done: true,
    })

    const { result } = renderHook(() => useToggleSystemReminder(), {
      wrapper: ({ children }) => <>{children}</>,
    })

    await act(async () => {
      await result.current('reminder-1', true)
    })

    const taskState = useTaskStore.getState()
    const task = taskState.tasks.find((t) => t.id === 'task-1')
    expect(task?.status).toBe('DONE')
  })

  it('should sync Task back to TODO when unmarking reminder', async () => {
    useTaskStore.setState({
      tasks: [
        {
          id: 'task-1',
          title: 'Buy milk',
          status: 'DONE',
          systemReminderId: 'reminder-1',
          areaId: 'inbox',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          activityLogs: [],
        },
      ],
    })

    const { setSystemReminderCompleted } = await import('../lib/eventkitIntegration')
    vi.mocked(setSystemReminderCompleted).mockResolvedValue({
      id: 'reminder-1',
      title: 'Buy milk reminder',
      done: false,
    })

    const { result } = renderHook(() => useToggleSystemReminder(), {
      wrapper: ({ children }) => <>{children}</>,
    })

    await act(async () => {
      await result.current('reminder-1', false)
    })

    const taskState = useTaskStore.getState()
    const task = taskState.tasks.find((t) => t.id === 'task-1')
    expect(task?.status).toBe('TODO')
  })

  it('should not sync unrelated Tasks', async () => {
    const { setSystemReminderCompleted } = await import('../lib/eventkitIntegration')
    vi.mocked(setSystemReminderCompleted).mockResolvedValue({
      id: 'reminder-2',
      title: 'Other reminder',
      done: true,
    })

    const { result } = renderHook(() => useToggleSystemReminder(), {
      wrapper: ({ children }) => <>{children}</>,
    })

    await act(async () => {
      await result.current('reminder-2', true)
    })

    const taskState = useTaskStore.getState()
    const task = taskState.tasks.find((t) => t.id === 'task-2')
    expect(task?.status).toBe('TODO')
  })
})
