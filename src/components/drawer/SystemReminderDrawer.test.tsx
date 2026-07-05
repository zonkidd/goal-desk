import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SystemReminderDrawer } from './SystemReminderDrawer'
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
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('SystemReminderDrawer', () => {
  beforeEach(() => {
    useUiStore.setState({ activeDrawer: null })
    useEventkitStore.setState({
      integrationStatus: { calendar: 'granted', reminders: 'granted' },
      eventkitPermissions: { calendar: 'granted', reminders: 'granted' },
      systemReminders: [],
    })
  })

  it('presents imported system Reminders as read-only in Kairos', () => {
    useEventkitStore.setState({
      systemReminders: [
        {
          id: 'reminder-1',
          title: 'Prepare architecture notes',
          dueAt: new Date('2026-06-20T09:30:00'),
          done: false,
          listTitle: 'Work',
        },
      ],
    })
    useUiStore.getState().openDrawer('reminder', 'reminder-1')

    render(<SystemReminderDrawer />)

    expect(screen.getByText('Prepare architecture notes')).toBeInTheDocument()
    expect(screen.getByText('System Reminders are edited in Apple Reminders.')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Prepare architecture notes')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /在提醒事项 App 中打开/i })).toBeInTheDocument()
  })

  it('shows EventKit permission status inside the reminder drawer', () => {
    useEventkitStore.setState({
      eventkitPermissions: { calendar: 'granted', reminders: 'denied' },
      systemReminders: [
        {
          id: 'reminder-1',
          title: 'Prepare architecture notes',
          dueAt: new Date('2026-06-20T09:30:00'),
          done: false,
          listTitle: 'Work',
        },
      ],
    })
    useUiStore.getState().openDrawer('reminder', 'reminder-1')

    render(<SystemReminderDrawer />)

    expect(screen.getByText('Calendar')).toBeInTheDocument()
    expect(screen.getByText('Reminders')).toBeInTheDocument()
    expect(screen.getByText('Granted')).toBeInTheDocument()
    expect(screen.getByText('Denied')).toBeInTheDocument()
  })

  it('warns when Reminders permission is not granted', () => {
    useEventkitStore.setState({
      eventkitPermissions: { calendar: 'granted', reminders: 'denied' },
      systemReminders: [
        {
          id: 'reminder-1',
          title: 'Prepare architecture notes',
          dueAt: new Date('2026-06-20T09:30:00'),
          done: false,
          listTitle: 'Work',
        },
      ],
    })
    useUiStore.getState().openDrawer('reminder', 'reminder-1')

    render(<SystemReminderDrawer />)

    expect(screen.getByText('提醒事项权限未就绪。首次打开会触发系统授权；若已拒绝，需要到系统设置里重新开启。')).toBeInTheDocument()
  })

  it('labels unrequested EventKit permissions as Not Asked', () => {
    useEventkitStore.setState({
      eventkitPermissions: { calendar: 'not_determined', reminders: 'not_determined' },
      systemReminders: [
        {
          id: 'reminder-1',
          title: 'Prepare architecture notes',
          dueAt: new Date('2026-06-20T09:30:00'),
          done: false,
          listTitle: 'Work',
        },
      ],
    })
    useUiStore.getState().openDrawer('reminder', 'reminder-1')

    render(<SystemReminderDrawer />)

    expect(screen.getAllByText('Not Asked')).toHaveLength(2)
    expect(screen.queryByText('Not Determined')).not.toBeInTheDocument()
  })
})
