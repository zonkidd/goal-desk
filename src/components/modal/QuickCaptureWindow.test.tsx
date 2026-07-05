import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Task } from '../../types/task'

const mockAdapter = vi.hoisted(() => ({
  createTask: vi.fn(),
  updateTaskFields: vi.fn(),
}))

vi.mock('../../lib/tauriCommands', () => ({
  captureTask: vi.fn(),
}))

vi.mock('../../lib/runtime', () => ({
  hideCurrentWindow: vi.fn(),
}))

vi.mock('../../lib/workspaceMutations', () => ({
  getWorkspaceMutationAdapter: () => mockAdapter,
}))

import { QuickCaptureWindow } from './QuickCaptureWindow'

describe('QuickCaptureWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render close control', () => {
    render(<QuickCaptureWindow />)
    expect(screen.getByRole('button', { name: /close quick capture/i })).toBeInTheDocument()
  })

  it('creates a local Todo from quick capture', async () => {
    const user = userEvent.setup()
    const plannedStartAt = new Date('2026-07-05T15:00:00+08:00')
    const task: Task = {
      id: 'task-1',
      title: '看熊掌记',
      content: '',
      status: 'TODO',
      showInTimeline: true,
      plannedStartAt,
      activityLogs: [],
    }
    mockAdapter.createTask.mockResolvedValue({ task })

    render(<QuickCaptureWindow />)

    await user.type(screen.getByTestId('quick-capture-input'), '明天下午三点看熊掌记{Enter}')

    expect(mockAdapter.createTask).toHaveBeenCalledWith('明天下午三点看熊掌记')
  })

  it('does not link the created Todo to a system Reminder', async () => {
    const user = userEvent.setup()
    const plannedStartAt = new Date('2026-07-05T15:00:00+08:00')
    const task: Task = {
      id: 'task-1',
      title: '看熊掌记',
      content: '',
      status: 'TODO',
      showInTimeline: true,
      plannedStartAt,
      dueDate: undefined,
      linkedGoalId: undefined,
      linkedGoalLabel: undefined,
      activityLogs: [],
    }
    mockAdapter.createTask.mockResolvedValue({ task })

    render(<QuickCaptureWindow />)

    await user.type(screen.getByTestId('quick-capture-input'), '明天下午三点看熊掌记{Enter}')

    expect(mockAdapter.updateTaskFields).not.toHaveBeenCalled()
  })
})
