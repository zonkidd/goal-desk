import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { useTaskStore } from '../store/taskStore'
import { useEventkitStore } from '../store/eventkitStore'
import { useToggleSystemReminder } from './useStoreComposition'
import * as desktopApi from '../lib/desktopApi'

// Mock desktopApi
vi.mock('../lib/desktopApi', () => ({
  isTauriRuntime: vi.fn(() => true),
  setSystemReminderCompleted: vi.fn(),
}))

describe('useToggleSystemReminder', () => {
  beforeEach(() => {
    // Reset stores
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

  it('应该在切换 System Reminder 时同步关联的 Task', async () => {
    // Mock the desktopApi to return updated reminder
    vi.mocked(desktopApi.setSystemReminderCompleted).mockResolvedValue({
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

    // Verify task was synced
    const taskState = useTaskStore.getState()
    const task = taskState.tasks.find((t) => t.id === 'task-1')
    expect(task?.status).toBe('DONE')
  })

  it('应该在取消完成时同步 Task 状态回 TODO', async () => {
    // Set task as DONE first
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

    vi.mocked(desktopApi.setSystemReminderCompleted).mockResolvedValue({
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

    // Verify task was synced back to TODO
    const taskState = useTaskStore.getState()
    const task = taskState.tasks.find((t) => t.id === 'task-1')
    expect(task?.status).toBe('TODO')
  })

  it('不应同步没有关联 System Reminder 的 Task', async () => {
    vi.mocked(desktopApi.setSystemReminderCompleted).mockResolvedValue({
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

    // Verify task-2 was not affected
    const taskState = useTaskStore.getState()
    const task = taskState.tasks.find((t) => t.id === 'task-2')
    expect(task?.status).toBe('TODO')
  })
})
