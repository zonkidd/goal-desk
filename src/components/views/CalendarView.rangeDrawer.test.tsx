import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CalendarView } from './CalendarView'
import { CalendarEventDrawer } from '../drawer/CalendarEventDrawer'
import { SystemReminderDrawer } from '../drawer/SystemReminderDrawer'
import { useEventkitStore } from '../../store/eventkitStore'
import { useTaskStore } from '../../store/taskStore'
import { useUiStore } from '../../store/uiStore'

const mockEventKitAdapter = vi.hoisted(() => ({
  loadCalendarRange: vi.fn(),
  openCalendarEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../lib/workspaceMutations', () => ({
  getEventKitAdapter: () => mockEventKitAdapter,
}))

const MOTION_KEYS = new Set([
  'initial',
  'animate',
  'exit',
  'transition',
  'whileHover',
  'whileTap',
  'whileFocus',
  'whileDrag',
  'whileInView',
  'layout',
  'layoutId',
  'drag',
  'dragConstraints',
  'onAnimationStart',
  'onAnimationComplete',
  'variants',
])

function stripMotionProps(props: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(props).filter(([key]) => !MOTION_KEYS.has(key)),
  )
}

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...stripMotionProps(props)}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...stripMotionProps(props)}>{children}</button>,
    aside: ({ children, ...props }: any) => <aside {...stripMotionProps(props)}>{children}</aside>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('CalendarView range-loaded drawer integration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 16, 12, 0, 0))
    vi.clearAllMocks()
    useTaskStore.setState({ tasks: [] })
    useUiStore.setState({ activeDrawer: null })
    useEventkitStore.setState({
      rawEventKit: { calendarEvents: [], reminders: [] },
      systemReminders: [],
      integrationStatus: { calendar: 'granted', reminders: 'granted' },
      eventkitPermissions: { calendar: 'granted', reminders: 'granted' },
    })
    mockEventKitAdapter.loadCalendarRange.mockResolvedValue({
      events: [
        {
          id: 'range-calendar-event',
          title: 'Range architecture review',
          startsAt: new Date('2026-06-20T09:30:00+08:00'),
          endsAt: new Date('2026-06-20T10:30:00+08:00'),
          calendarTitle: 'Work',
        },
      ],
      reminders: [
        {
          id: 'range-system-reminder',
          title: 'Prepare reminder notes',
          dueAt: new Date('2026-06-20T11:30:00+08:00'),
          done: false,
          listTitle: 'Work',
        },
      ],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens a drawer for a Calendar Event loaded from the surrounding calendar range', async () => {
    render(
      <>
        <CalendarView />
        <CalendarEventDrawer />
      </>,
    )
    await act(async () => {
      await Promise.resolve()
    })

    fireEvent.click(screen.getByRole('button', { name: '日视图' }))
    fireEvent.click(screen.getByText('20'))
    const eventButton = screen.getByRole('button', { name: /Range architecture review/i })

    fireEvent.click(eventButton)

    expect(screen.getByRole('heading', { name: 'Range architecture review' })).toBeInTheDocument()
  })

  it('opens a drawer for a System Reminder loaded from the surrounding calendar range', async () => {
    render(
      <>
        <CalendarView />
        <SystemReminderDrawer />
      </>,
    )
    await act(async () => {
      await Promise.resolve()
    })

    fireEvent.click(screen.getByRole('button', { name: '日视图' }))
    fireEvent.click(screen.getByText('20'))
    const reminderButton = screen.getByRole('button', { name: /Prepare reminder notes/i })

    fireEvent.click(reminderButton)

    expect(screen.getByRole('heading', { name: 'Prepare reminder notes' })).toBeInTheDocument()
    expect(screen.getByText('只读 - 在系统提醒事项中编辑')).toBeInTheDocument()
  })
})
