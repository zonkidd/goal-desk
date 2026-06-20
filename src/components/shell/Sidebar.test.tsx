import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Sidebar } from './Sidebar'
import { useUiStore } from '../../store/uiStore'
import { useGoalStore } from '../../store/goalStore'
import { useAreaStore } from '../../store/areaStore'

vi.mock('../../store/uiStore', () => ({
  useUiStore: vi.fn(),
}))
vi.mock('../../store/goalStore', () => ({
  useGoalStore: vi.fn(),
}))
vi.mock('../../store/areaStore', () => ({
  useAreaStore: vi.fn(),
}))
vi.mock('../../hooks/useWorkspaceDerived', () => ({
  useWorkspaceDerived: vi.fn(() => ({
    inbox: { activeTasks: [], pausedTasks: [], completed: { totalCount: 0, visibleTasks: [], isCollapsedByDefault: true } },
    today: { focusTasks: [], timeline: [], attentionGroups: { overdue: [], dueToday: [], ongoing: [] }, relevantGoals: [] },
    goals: [],
    meta: { computedAt: new Date(), activeArea: 'ALL', taskCount: 0, goalCount: 0 },
  })),
}))
vi.mock('./EventKitStatusCard', () => ({
  EventKitStatusCard: () => <div data-testid="eventkit-status" />,
}))

describe('Sidebar', () => {
  const mockSetView = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useUiStore).mockImplementation((selector: any) => {
      const state = {
        currentView: 'inbox',
        activeArea: 'ALL',
        setView: mockSetView,
        setActiveArea: vi.fn(),
        openQuickCapture: vi.fn(),
      }
      return selector(state)
    })
    vi.mocked(useGoalStore).mockImplementation((selector: any) => {
      const state = { baseGoals: [] }
      return selector(state)
    })
    vi.mocked(useAreaStore).mockImplementation((selector: any) => {
      const state = { allAreas: [] }
      return selector(state)
    })
  })

  it('应该渲染"📅 日历看板"按钮', () => {
    render(<Sidebar />)
    expect(screen.getByRole('button', { name: /日历看板/i })).toBeInTheDocument()
  })

  it('应该渲染"⏰ 提醒看板"按钮', () => {
    render(<Sidebar />)
    expect(screen.getByRole('button', { name: /提醒看板/i })).toBeInTheDocument()
  })

  it('点击"📅 日历看板"按钮应该调用 setView("calendar")', async () => {
    const user = userEvent.setup()
    render(<Sidebar />)

    const calendarButton = screen.getByRole('button', { name: /日历看板/i })
    await user.click(calendarButton)

    expect(mockSetView).toHaveBeenCalledWith('calendar')
  })

  it('点击"⏰ 提醒看板"按钮应该调用 setView("reminders")', async () => {
    const user = userEvent.setup()
    render(<Sidebar />)

    const remindersButton = screen.getByRole('button', { name: /提醒看板/i })
    await user.click(remindersButton)

    expect(mockSetView).toHaveBeenCalledWith('reminders')
  })
})
