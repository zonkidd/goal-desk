import { describe, expect, it, vi } from 'vitest'
import { runQuickCapture, type QuickCapturePort } from './quickCaptureFlow'
import type { Task } from '../types/task'

function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: '看熊掌记',
    content: '',
    status: 'TODO',
    showInTimeline: true,
    plannedStartAt: new Date('2026-07-05T15:00:00+08:00'),
    activityLogs: [],
    ...overrides,
  }
}

describe('runQuickCapture', () => {
  it('captures a local Todo', async () => {
    const task = buildTask()
    const port = {
      createTask: vi.fn().mockResolvedValue(task),
    }

    const result = await runQuickCapture({
      input: '明天下午三点看熊掌记',
      port,
    })

    expect(port.createTask).toHaveBeenCalledWith('明天下午三点看熊掌记')
    expect(result).toEqual({
      task,
      statusMessage: '已保存到本地收集箱',
    })
  })

  it('ignores empty input', async () => {
    const port = {
      createTask: vi.fn(),
    }
    const result = await runQuickCapture({
      input: '   ',
      port,
    })

    expect(port.createTask).not.toHaveBeenCalled()
    expect(result).toEqual({})
  })
})
