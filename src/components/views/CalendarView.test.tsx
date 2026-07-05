import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CalendarView } from './CalendarView'
import { useUiStore } from '../../store/uiStore'
import { useTaskStore } from '../../store/taskStore'
import { useEventkitStore } from '../../store/eventkitStore'

vi.mock('../../store/uiStore', () => ({
  useUiStore: vi.fn()
}))

vi.mock('../../store/taskStore', () => ({
  useTaskStore: vi.fn((selector?: any) => {
    const state = { tasks: [] }
    return selector ? selector(state) : state
  })
}))

vi.mock('../../store/goalStore', () => ({
  useGoalStore: vi.fn(() => ({ baseGoals: [] }))
}))

vi.mock('../../store/eventkitStore', () => ({
  useEventkitStore: vi.fn()
}))

const mockEventKitAdapter = vi.hoisted(() => ({
  loadCalendarRange: vi.fn().mockResolvedValue({ events: [], reminders: [] }),
}))

vi.mock('../../lib/workspaceMutations', () => ({
  getEventKitAdapter: () => mockEventKitAdapter,
}))

vi.mock('../../hooks/useWorkspaceDerived', () => ({
  useWorkspaceDerived: vi.fn(() => ({
    today: { timeline: [], focusTasks: [], attentionGroups: { overdue: [], dueToday: [], ongoing: [], systemReminders: [] }, relevantGoals: [] },
    goals: [],
    inbox: { activeTasks: [], pausedTasks: [], completed: { totalCount: 0, visibleTasks: [], isCollapsedByDefault: true } },
    meta: { computedAt: new Date(), activeArea: 'ALL', taskCount: 0, goalCount: 0 },
  })),
}))

// Mock framer-motion — strip motion-specific props before spreading to DOM
const MOTION_KEYS = new Set(['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'whileFocus', 'whileDrag', 'whileInView', 'layout', 'layoutId', 'drag', 'dragConstraints', 'onAnimationStart', 'onAnimationComplete', 'variants'])
function stripMotionProps({ children, ...props }: any) {
  const domProps: Record<string, any> = {}
  for (const key of Object.keys(props)) {
    if (!MOTION_KEYS.has(key)) domProps[key] = props[key]
  }
  return <>{children ? <div {...domProps}>{children}</div> : <div {...domProps} />}</>
}
vi.mock('framer-motion', () => ({
  motion: {
    div: stripMotionProps,
    button: ({ children, ...props }: any) => {
      const domProps: Record<string, any> = {}
      for (const key of Object.keys(props)) {
        if (!MOTION_KEYS.has(key)) domProps[key] = props[key]
      }
      return <button {...domProps}>{children}</button>
    },
    aside: ({ children, ...props }: any) => {
      const domProps: Record<string, any> = {}
      for (const key of Object.keys(props)) {
        if (!MOTION_KEYS.has(key)) domProps[key] = props[key]
      }
      return <aside {...domProps}>{children}</aside>
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('CalendarView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 16, 12, 0, 0))
    mockEventKitAdapter.loadCalendarRange.mockResolvedValue({ events: [], reminders: [] })
    mockEventKitAdapter.loadCalendarRange.mockClear()

    ;(useUiStore as any).mockImplementation((selector: any) => {
      const mockState = {
        currentView: 'calendar',
        openDrawer: vi.fn(),
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

    ;(useEventkitStore as any).mockImplementation((selector: any) => {
      const mockState = {
        rawEventKit: { calendarEvents: [], reminders: [] },
        mergeEventkitRangeData: vi.fn(),
        systemReminders: [],
      }
      return selector ? selector(mockState) : mockState
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

  it('应该加载当前周前后一周的 EventKit 范围数据', async () => {
    render(<CalendarView />)

    expect(mockEventKitAdapter.loadCalendarRange).toHaveBeenCalledWith('2026-06-08', '2026-06-28')
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

  it('应该在日视图显示选中日期的未来日历事件', () => {
    ;(useEventkitStore as any).mockImplementation((selector: any) => {
      const mockState = {
        rawEventKit: {
          calendarEvents: [
            {
              id: 'future-calendar-event',
              title: 'Architecture review',
              startsAt: '2026-06-20T09:30:00.000+08:00',
              endsAt: '2026-06-20T10:30:00.000+08:00',
              calendarTitle: 'Work',
            },
          ],
          reminders: [],
        },
        mergeEventkitRangeData: vi.fn(),
        systemReminders: [],
      }
      return selector ? selector(mockState) : mockState
    })

    render(<CalendarView />)

    fireEvent.click(screen.getByRole('button', { name: '日视图' }))
    fireEvent.click(screen.getByText('20'))

    expect(screen.getByText('Architecture review')).toBeInTheDocument()
    expect(screen.getByText('09:30 · Work')).toBeInTheDocument()
  })

  it('应该在日视图默认显示今天的日历事件', () => {
    ;(useEventkitStore as any).mockImplementation((selector: any) => {
      const mockState = {
        rawEventKit: {
          calendarEvents: [
            {
              id: 'today-calendar-event',
              title: 'Morning planning',
              startsAt: '2026-06-16T09:30:00.000+08:00',
              endsAt: '2026-06-16T10:00:00.000+08:00',
              calendarTitle: 'Work',
            },
          ],
          reminders: [],
        },
        mergeEventkitRangeData: vi.fn(),
        systemReminders: [],
      }
      return selector ? selector(mockState) : mockState
    })

    render(<CalendarView />)

    fireEvent.click(screen.getByRole('button', { name: '日视图' }))

    expect(screen.getByText('Morning planning')).toBeInTheDocument()
    expect(screen.getByText('09:30 · Work')).toBeInTheDocument()
  })
})
