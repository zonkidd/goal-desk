import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Sidebar } from './Sidebar'
import { useAppStore } from '../../store/appStore'

// Mock Zustand store
vi.mock('../../store/appStore', () => ({
  useAppStore: vi.fn(),
}))

describe('Sidebar', () => {
  const mockSetView = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // 设置默认的 store 状态
    vi.mocked(useAppStore).mockImplementation((selector: any) => {
      const state = {
        currentView: 'inbox',
        activeArea: 'ALL',
        allAreas: [],
        setView: mockSetView,
        setActiveArea: vi.fn(),
        openQuickCapture: vi.fn(),
        baseGoals: [],
        tasks: [],
        eventkitPermissions: { calendar: 'not_determined', reminders: 'not_determined' },
        eventkitData: { calendarEventCount: 0, reminderCount: 0 },
        requestCalendarAccess: vi.fn(),
        requestRemindersAccess: vi.fn(),
      }
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
