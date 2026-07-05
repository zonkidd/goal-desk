import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import * as tauriCommands from './tauriCommands'
import { updateTaskFields } from './tauriCommands'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue({
    id: 'task-1',
    title: 'Updated task',
    content: '',
    status: 'TODO',
    plannedStartAt: null,
    dueAt: null,
    linkedGoalId: null,
    linkedGoalLabel: null,
    bearNoteId: null,
    systemReminderId: null,
    showInTimeline: false,
    activityLogs: [],
  }),
}))

describe('updateTaskFields', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('omits system Reminder link changes unless the caller explicitly sets or clears the link', async () => {
    await updateTaskFields('task-1', { title: 'Updated task' })

    expect(invoke).toHaveBeenCalledWith('update_task_fields', expect.not.objectContaining({
      systemReminderId: expect.anything(),
    }))

    await updateTaskFields('task-1', { title: 'Updated task', systemReminderId: null })

    expect(invoke).toHaveBeenLastCalledWith('update_task_fields', expect.objectContaining({
      systemReminderId: { value: null },
    }))
  })

  it('sends planned and due time patches only when the caller changes them', async () => {
    await updateTaskFields('task-1', { title: 'Updated task' })

    expect(invoke).toHaveBeenCalledWith('update_task_fields', expect.not.objectContaining({
      plannedStartAt: expect.anything(),
      dueAt: expect.anything(),
    }))

    await updateTaskFields('task-1', {
      title: 'Updated task',
      plannedStartAt: null,
      dueAt: new Date('2026-06-20T10:00:00.000Z'),
    })

    expect(invoke).toHaveBeenLastCalledWith('update_task_fields', expect.objectContaining({
      plannedStartAt: { value: null },
      dueAt: { value: '2026-06-20T10:00:00.000Z' },
    }))
  })
})

describe('System Reminder write commands', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not expose a create command', () => {
    expect('createSystemReminder' in tauriCommands).toBe(false)
  })
})
