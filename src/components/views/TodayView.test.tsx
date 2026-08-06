import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodayView } from './TodayView'
import { useUiStore } from '../../store/uiStore'
import { useEventkitStore } from '../../store/eventkitStore'
import { useWorkspaceDerived } from '../../hooks/useWorkspaceDerived'

vi.mock('../../store/uiStore', () => ({
  useUiStore: vi.fn(),
}))

vi.mock('../../store/eventkitStore', () => ({
  useEventkitStore: vi.fn(),
}))

vi.mock('../../hooks/useWorkspaceDerived', () => ({
  useWorkspaceDerived: vi.fn(),
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

const mockOpenQuickCapture = vi.fn()
const mockSetView = vi.fn()
const mockOpenDrawer = vi.fn()
const mockRequestCalendarAccess = vi.fn()
const mockRequestRemindersAccess = vi.fn()

function emptyWorkspaceSnapshot() {
  return {
    today: {
      timeline: [],
      focusTasks: [],
      attentionGroups: {
        overdue: [],
        dueToday: [],
        ongoing: [],
        systemReminders: [],
      },
      relevantGoals: [],
    },
    goals: [],
    inbox: {
      activeTasks: [],
      pausedTasks: [],
      completed: { totalCount: 0, visibleTasks: [], isCollapsedByDefault: true },
    },
    meta: { computedAt: new Date('2026-07-07T10:00:00+08:00'), activeArea: 'ALL', taskCount: 0, goalCount: 0 },
  }
}

function mockUiStore() {
  ;(useUiStore as any).mockImplementation((selector: any) => {
    const state = {
      showCompletedTodos: false,
      openDrawer: mockOpenDrawer,
      openQuickCapture: mockOpenQuickCapture,
      setView: mockSetView,
    }
    return selector(state)
  })
}

function mockEventkitStore() {
  ;(useEventkitStore as any).mockImplementation((selector: any) => {
    const state = {
      eventkitPermissions: { calendar: 'granted', reminders: 'granted' },
      requestCalendarAccess: mockRequestCalendarAccess,
      requestRemindersAccess: mockRequestRemindersAccess,
    }
    return selector(state)
  })
}

describe('TodayView guided empty states', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    })
    mockUiStore()
    mockEventkitStore()
    ;(useWorkspaceDerived as any).mockReturnValue(emptyWorkspaceSnapshot())
  })

  it('guides an empty ongoing section to quick capture or the inbox', async () => {
    const user = userEvent.setup()

    render(<TodayView />)

    expect(screen.getByText('今天还没有正在推进的待办')).toBeInTheDocument()
    expect(screen.getByText('从收集箱挑一个，或新建一个今天要推进的动作。')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '新建待办' }))
    expect(mockOpenQuickCapture).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: '去收集箱' }))
    expect(mockSetView).toHaveBeenCalledWith('inbox')
  })

  it('guides an empty goals section to goals or the inbox', async () => {
    const user = userEvent.setup()

    render(<TodayView />)

    expect(screen.getByText('今天还没有目标被待办牵引')).toBeInTheDocument()
    expect(screen.getByText('把待办关联到目标后，这里会显示目标进度和下一步。')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '查看目标' }))
    expect(mockSetView).toHaveBeenCalledWith('goals')

    await user.click(screen.getByRole('button', { name: '去收集箱（今日目标看点）' }))
    expect(mockSetView).toHaveBeenCalledWith('inbox')
  })

  it('guides empty or passive-only timelines without hiding passive calendar items', async () => {
    const user = userEvent.setup()

    const emptyRender = render(<TodayView />)

    expect(screen.getByText('今天还没有安排到具体时间的事项')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '添加时间事项' }))
    expect(mockOpenQuickCapture).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: '查看日历' }))
    expect(mockSetView).toHaveBeenCalledWith('calendar')

    emptyRender.unmount()
    vi.clearAllMocks()
    mockUiStore()
    mockEventkitStore()
    ;(useWorkspaceDerived as any).mockReturnValue({
      ...emptyWorkspaceSnapshot(),
      today: {
        ...emptyWorkspaceSnapshot().today,
        timeline: [
          {
            id: 'holiday-1',
            title: '小暑',
            timeLabel: '00:00',
            startsAt: new Date(),
            occurrenceDate: new Date(),
            source: 'calendar',
            readonly: true,
            done: false,
            sourceLabel: '中国大陆节假日',
          },
        ],
      },
    })

    render(<TodayView />)

    expect(screen.getByText('小暑')).toBeInTheDocument()
    expect(screen.getByText('今天的日程很轻')).toBeInTheDocument()
  })
})
