import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CalendarView } from './CalendarView'
import { useUiStore } from '../../store/uiStore'
import { useTaskStore } from '../../store/taskStore'

vi.mock('../../store/uiStore', () => ({
  useUiStore: vi.fn()
}))

vi.mock('../../store/taskStore', () => ({
  useTaskStore: vi.fn()
}))

vi.mock('../../store/goalStore', () => ({
  useGoalStore: vi.fn()
}))

vi.mock('../../store/eventkitStore', () => ({
  useEventkitStore: vi.fn()
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('CalendarView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 16, 12, 0, 0))

    ;(useUiStore as any).mockImplementation((selector: any) => {
      const mockState = {
        currentView: 'calendar',
        openTaskDrawer: vi.fn(),
        openReminderDrawer: vi.fn(),
        openCalendarEventDrawer: vi.fn(),
      }
      return selector(mockState)
    })

    ;(useTaskStore as any).mockImplementation((selector: any) => {
      const mockState = {
        todayTimeline: [],
        tasks: [],
      }
      return selector(mockState)
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('应该渲染"日历看板"标题', () => {
    render(<CalendarView />)
    const heading = screen.getByRole('heading', { name: '日历看板' })
    expect(heading).toBeInTheDocument()
  })

  it('应该默认显示周视图内容', () => {
    render(<CalendarView />)
    const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    weekDays.forEach((day) => {
      expect(screen.getByText(day)).toBeInTheDocument()
    })
  })

  it('应该显示周视图导航按钮', () => {
    render(<CalendarView />)
    expect(screen.getByText('上一周')).toBeInTheDocument()
    expect(screen.getByText('下一周')).toBeInTheDocument()
  })

  it('应该显示周视图和日视图切换按钮', () => {
    render(<CalendarView />)
    expect(screen.getByText('周视图')).toBeInTheDocument()
    expect(screen.getByText('日视图')).toBeInTheDocument()
  })

  it('应该显示隐藏已完成开关', () => {
    render(<CalendarView />)
    expect(screen.getByLabelText('隐藏已完成')).toBeInTheDocument()
  })

  it('应该高亮显示今天的日期', () => {
    render(<CalendarView />)
    const todayElement = screen.getByText('16')
    expect(todayElement).toHaveClass('bg-indigo-500')
    expect(todayElement).toHaveClass('text-white')
  })
})
