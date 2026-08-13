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
        openSettings: vi.fn(),
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

  it('侧栏顶部品牌区可拖动窗口', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-drag-region')).toBeInTheDocument()
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

  it('当视图激活时，应该渲染动态背景块', () => {
    // 默认 currentView 是 'inbox' (见 beforeEach)
    render(<Sidebar />)
    const inboxButton = screen.getByRole('button', { name: /收集箱/i })
    // inboxButton 内应该包含 active-indicator
    const indicator = inboxButton.querySelector('[data-testid="active-indicator"]')
    expect(indicator).toBeInTheDocument()

    const todayButton = screen.getByRole('button', { name: /今日焦点/i })
    const todayIndicator = todayButton.querySelector('[data-testid="active-indicator"]')
    expect(todayIndicator).not.toBeInTheDocument()
  })

  it('底部固定「全局速记」与设置，并与滚动区留出空隙', () => {
    render(<Sidebar />)

    expect(screen.getByRole('button', { name: /全局速记/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Settings 设置/ })).toBeInTheDocument()
    expect(screen.getByTestId('sidebar-scroll')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar-footer')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar-footer-gap')).toBeInTheDocument()
  })
})
