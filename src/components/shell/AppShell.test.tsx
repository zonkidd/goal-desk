import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppShell } from './AppShell'
import { useUiStore } from '../../store/uiStore'

// Mock all child components
vi.mock('./Sidebar', () => ({
  Sidebar: () => <div>Sidebar Mock</div>,
}))

vi.mock('./TopBar', () => ({
  TopBar: () => <div>TopBar Mock</div>,
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

vi.mock('../drawer/ReminderDrawer', () => ({
  ReminderDrawer: () => <div>ReminderDrawer</div>,
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

vi.mock('../../lib/runtime', () => ({
  isTauriRuntime: () => false,
}))

// Mock Zustand stores
vi.mock('../../store/uiStore', () => ({
  useUiStore: vi.fn(),
}))

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('当 currentView 是 "calendar" 时应该渲染 CalendarView', () => {
    vi.mocked(useUiStore).mockImplementation((selector: any) => {
      const state = {
        currentView: 'calendar',
        statusMessage: 'Test',
        isLoading: false,
      }
      return selector(state)
    })

    render(<AppShell />)
    expect(screen.getByText('CalendarView')).toBeInTheDocument()
  })

  it('当 currentView 是 "reminders" 时应该渲染 RemindersView', () => {
    vi.mocked(useUiStore).mockImplementation((selector: any) => {
      const state = {
        currentView: 'reminders',
        statusMessage: 'Test',
        isLoading: false,
      }
      return selector(state)
    })

    render(<AppShell />)
    expect(screen.getByText('RemindersView')).toBeInTheDocument()
  })
})
