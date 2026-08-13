import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppShell } from './AppShell'
import { useUiStore } from '../../store/uiStore'

vi.mock('./Sidebar', () => ({
  Sidebar: () => <div>Sidebar Mock</div>,
}))

vi.mock('../views/InboxView', () => ({
  InboxView: () => <div>InboxView</div>,
}))

vi.mock('../views/TodayView', () => ({
  TodayView: () => <div>TodayView</div>,
}))

vi.mock('../views/BoardView', () => ({
  BoardView: () => <div>BoardView</div>,
}))

vi.mock('../views/GoalsView', () => ({
  GoalsView: () => <div>GoalsView</div>,
}))

vi.mock('../views/AreasView', () => ({
  AreasView: () => <div>AreasView</div>,
}))

vi.mock('../views/CalendarView', () => ({
  CalendarView: () => <div>CalendarView</div>,
}))

vi.mock('../views/RemindersView', () => ({
  RemindersView: () => <div>RemindersView</div>,
}))

vi.mock('../drawer/TaskDrawer', () => ({
  TaskDrawer: () => <div>TaskDrawer</div>,
}))

vi.mock('../drawer/GoalDrawer', () => ({
  GoalDrawer: () => <div>GoalDrawer</div>,
}))

vi.mock('../drawer/CalendarEventDrawer', () => ({
  CalendarEventDrawer: () => <div>CalendarEventDrawer</div>,
}))

vi.mock('../drawer/SystemReminderDrawer', () => ({
  SystemReminderDrawer: () => <div>SystemReminderDrawer</div>,
}))

vi.mock('../modal/QuickCaptureModal', () => ({
  QuickCaptureModal: () => <div>QuickCaptureModal</div>,
}))

vi.mock('../modal/SettingsModal', () => ({
  SettingsModal: () => <div>SettingsModal</div>,
}))

vi.mock('../../lib/runtime', () => ({
  isTauriRuntime: () => false,
  startWindowDrag: vi.fn(),
}))

vi.mock('../../store/uiStore', () => ({
  useUiStore: vi.fn(),
}))

const dismissErrorToast = vi.fn()

function mockUi(overrides: Record<string, unknown> = {}) {
  vi.mocked(useUiStore).mockImplementation((selector: any) => {
    const state = {
      currentView: 'inbox',
      statusMessage: 'Saved to local database',
      isLoading: false,
      errorToast: null,
      dismissErrorToast,
      ...overrides,
    }
    return selector(state)
  })
}

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUi()
  })

  it('当 currentView 是 "calendar" 时应该渲染 CalendarView', () => {
    mockUi({ currentView: 'calendar' })
    render(<AppShell />)
    expect(screen.getByText('CalendarView')).toBeInTheDocument()
  })

  it('当 currentView 是 "reminders" 时应该渲染 RemindersView', () => {
    mockUi({ currentView: 'reminders' })
    render(<AppShell />)
    expect(screen.getByText('RemindersView')).toBeInTheDocument()
  })

  it('应该渲染 SystemReminderDrawer', () => {
    render(<AppShell />)
    expect(screen.getByText('SystemReminderDrawer')).toBeInTheDocument()
  })

  it('不再渲染 TopBar 或右上角「新建待办」', () => {
    render(<AppShell />)
    expect(screen.queryByText('TopBar Mock')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '新建待办' })).not.toBeInTheDocument()
    expect(screen.queryByText('Inbox')).not.toBeInTheDocument()
    expect(screen.queryByText('Today Workbench')).not.toBeInTheDocument()
  })

  it('主窗口顶部有拖拽热区', () => {
    render(<AppShell />)
    expect(screen.getByTestId('window-drag-region')).toBeInTheDocument()
  })

  it('成功文案不出现在主栏', () => {
    render(<AppShell />)
    expect(screen.queryByText('Saved to local database')).not.toBeInTheDocument()
  })

  it('加载中不弹窗、不出现常驻状态条', () => {
    mockUi({ isLoading: true, statusMessage: 'Loading workspace...' })
    render(<AppShell />)
    expect(screen.queryByText('Syncing workspace')).not.toBeInTheDocument()
    expect(screen.queryByText('Loading workspace...')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('浏览器预览不再用黄条占主栏', () => {
    render(<AppShell />)
    expect(screen.queryByText(/Preview mode only/i)).not.toBeInTheDocument()
  })

  it('仅错误时出现可关闭的 toast', async () => {
    const user = userEvent.setup()
    mockUi({ errorToast: 'Unable to load workspace · boom' })
    render(<AppShell />)

    const toast = screen.getByRole('alert')
    expect(toast).toHaveTextContent('Unable to load workspace · boom')

    await user.click(screen.getByRole('button', { name: '关闭通知' }))
    expect(dismissErrorToast).toHaveBeenCalled()
  })
})
