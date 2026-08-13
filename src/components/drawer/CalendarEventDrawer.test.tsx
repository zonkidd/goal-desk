import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CalendarEventDrawer } from './CalendarEventDrawer'
import { useEventkitStore } from '../../store/eventkitStore'
import { useUiStore } from '../../store/uiStore'

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
    button: ({ children, ...props }: any) => <button {...stripMotionProps(props)}>{children}</button>,
    aside: ({ children, ...props }: any) => <aside {...stripMotionProps(props)}>{children}</aside>,
    div: ({ children, ...props }: any) => <div {...stripMotionProps(props)}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('CalendarEventDrawer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-16T12:00:00+08:00'))
    useUiStore.setState({
      activeDrawer: null,
      activeArea: 'ALL',
      showCompletedTodos: false,
    })
    useEventkitStore.setState({
      rawEventKit: { calendarEvents: [], reminders: [] },
      systemReminders: [],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders a selected future Calendar Event from imported EventKit data', () => {
    useEventkitStore.setState({
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
    })
    useUiStore.getState().openDrawer('calendarEvent', 'future-calendar-event')

    render(<CalendarEventDrawer />)

    expect(screen.getByRole('heading', { name: 'Architecture review' })).toBeInTheDocument()
    expect(screen.getByText('Work')).toBeInTheDocument()
  })
})
