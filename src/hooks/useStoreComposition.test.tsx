import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { useTaskStore } from '../store/taskStore'
import { useEventkitStore } from '../store/eventkitStore'
import { useToggleSystemReminder } from './useStoreComposition'
import { setEventKitAdapter, resetEventKitAdapter } from '../lib/workspaceMutations'
import type { EventKitAdapter } from '../lib/eventkitAdapter'

vi.mock('../lib/runtime', () => ({
  isTauriRuntime: vi.fn(() => true),
}))

function createMockAdapter(overrides: Partial<EventKitAdapter> = {}): EventKitAdapter {
  return {
    requestCalendarAccess: vi.fn().mockResolvedValue('granted'),
    requestRemindersAccess: vi.fn().mockResolvedValue('granted'),
    openCalendarEvent: vi.fn().mockResolvedValue(undefined),
    openSystemReminder: vi.fn().mockResolvedValue(undefined),
    setSystemReminderCompleted: vi.fn().mockResolvedValue({
      id: 'reminder-1', title: 'Test', dueAt: undefined, done: true, listTitle: undefined,
    }),
    fetchCalendarEvents: vi.fn().mockResolvedValue([]),
    fetchReminders: vi.fn().mockResolvedValue([]),
    loadCalendarRange: vi.fn().mockResolvedValue({ events: [], reminders: [] }),
    loadRawEventKitData: vi.fn().mockResolvedValue({
      calendarEvents: [], reminders: [], systemReminders: [],
      integrationStatus: { calendar: 'not_determined', reminders: 'not_determined' },
    }),
    ...overrides,
  }
}

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

  afterEach(() => {
    resetEventKitAdapter()
  })

  it('should sync related Task when toggling System Reminder', async () => {
    const adapter = createMockAdapter({
      setSystemReminderCompleted: vi.fn().mockResolvedValue({
        id: 'reminder-1', title: 'Buy milk reminder', dueAt: undefined, done: true, listTitle: undefined,
      }),
    })
    setEventKitAdapter(adapter)

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

    const adapter = createMockAdapter({
      setSystemReminderCompleted: vi.fn().mockResolvedValue({
        id: 'reminder-1', title: 'Buy milk reminder', dueAt: undefined, done: false, listTitle: undefined,
      }),
    })
    setEventKitAdapter(adapter)

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
    const adapter = createMockAdapter({
      setSystemReminderCompleted: vi.fn().mockResolvedValue({
        id: 'reminder-2', title: 'Other reminder', dueAt: undefined, done: true, listTitle: undefined,
      }),
    })
    setEventKitAdapter(adapter)

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
