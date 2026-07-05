import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecycleBinView } from './RecycleBinView'
import { useTaskStore } from '../../store/taskStore'
import { useGoalStore } from '../../store/goalStore'
import { useUiStore } from '../../store/uiStore'

describe('RecycleBinView', () => {
  beforeEach(() => {
    useTaskStore.setState({
      deletedTasks: [],
      loadDeletedTasks: vi.fn().mockResolvedValue(undefined),
    })
    useGoalStore.setState({
      deletedGoals: [],
      loadDeletedGoals: vi.fn().mockResolvedValue(undefined),
    })
    useUiStore.setState({
      openDrawer: vi.fn(),
    })
  })

  it('shows the real deletedAt timestamp for deleted tasks', () => {
    const deletedAt = new Date('2026-07-05T10:30:00+08:00')
    const activityTime = new Date('2026-07-04T08:00:00+08:00')

    useTaskStore.setState({
      deletedTasks: [
        {
          id: 'task-1',
          title: 'Deleted task',
          content: '',
          status: 'TODO',
          showInTimeline: false,
          linkedGoalLabel: 'Goal 1',
          deletedAt,
          activityLogs: [{ action: 'CREATED', timestamp: activityTime }],
        } as any,
      ],
    })

    render(<RecycleBinView />)

    expect(screen.getByText(`Goal 1 · 删除于 ${deletedAt.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })}`)).toBeInTheDocument()
  })
})
