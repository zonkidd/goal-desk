import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TaskDrawer } from './TaskDrawer'
import { useTaskStore } from '../../store/taskStore'
import { useUiStore } from '../../store/uiStore'
import { useEventkitStore } from '../../store/eventkitStore'
import { useAreaStore } from '../../store/areaStore'
import { resetEventKitAdapter, setEventKitAdapter, type EventKitAdapter } from '../../lib/workspaceMutations'
import { resetRuntimeAdapter, setRuntimeAdapter, type RuntimeAdapter } from '../../lib/runtimeAdapter'
import {
  getBearIntegrationStatus,
  linkSelectedBearNote,
  saveBearApiToken,
} from '../../lib/tauriCommands'

const eventHandlers = new Map<string, (event: { payload: unknown }) => void>()

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn((eventName: string, handler: (event: { payload: unknown }) => void) => {
    eventHandlers.set(eventName, handler)
    return Promise.resolve(() => eventHandlers.delete(eventName))
  }),
}))

vi.mock('../../lib/tauriCommands', () => ({
  openTaskInBear: vi.fn().mockResolvedValue(undefined),
  getBearIntegrationStatus: vi.fn().mockResolvedValue({ tokenConfigured: false }),
  saveBearApiToken: vi.fn().mockResolvedValue({ tokenConfigured: true }),
  clearBearApiToken: vi.fn().mockResolvedValue({ tokenConfigured: false }),
  linkSelectedBearNote: vi.fn().mockResolvedValue(undefined),
  refreshBearNotePreview: vi.fn().mockResolvedValue(undefined),
  getBearNotePreview: vi.fn().mockResolvedValue(undefined),
  bearNotePreviewFromRust: vi.fn((preview) => ({
    ...preview,
    modificationDate: preview.modificationDate ? new Date(preview.modificationDate) : undefined,
    creationDate: preview.creationDate ? new Date(preview.creationDate) : undefined,
    fetchedAt: new Date(preview.fetchedAt),
  })),
  unlinkBearNote: vi.fn().mockResolvedValue({
    id: 'task-1',
    title: 'Prepare architecture notes',
    content: '',
    status: 'TODO',
    plannedStartAt: null,
    dueAt: null,
    linkedGoalId: null,
    linkedGoalLabel: null,
    bearNoteId: null,
    systemReminderId: null,
    showInTimeline: false,
    activityLogs: [],
  }),
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
    button: ({ children, ...props }: any) => <button {...stripMotionProps(props)}>{children}</button>,
    aside: ({ children, ...props }: any) => <aside {...stripMotionProps(props)}>{children}</aside>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('TaskDrawer', () => {
  const mockEventKitAdapter: EventKitAdapter = {
    requestCalendarAccess: vi.fn().mockResolvedValue('granted'),
    requestRemindersAccess: vi.fn().mockResolvedValue('granted'),
    openCalendarEvent: vi.fn().mockResolvedValue(undefined),
    openSystemReminder: vi.fn().mockResolvedValue(undefined),
    loadCalendarRange: vi.fn().mockResolvedValue({ events: [], reminders: [] }),
    loadRawEventKitData: vi.fn().mockResolvedValue({
      calendarEvents: [],
      reminders: [],
      systemReminders: [],
      integrationStatus: { calendar: 'granted', reminders: 'granted' },
    }),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    setEventKitAdapter(mockEventKitAdapter)
    useTaskStore.setState({
      tasks: [
        {
          id: 'task-1',
          title: 'Prepare architecture notes',
          content: '',
          status: 'TODO',
          showInTimeline: false,
          activityLogs: [],
        },
      ],
    })
    useUiStore.setState({ activeDrawer: { type: 'task', id: 'task-1' } })
    useAreaStore.setState({ allAreas: [] })
    useEventkitStore.setState({
      systemReminders: [],
      integrationStatus: { calendar: 'granted', reminders: 'granted' },
      eventkitPermissions: { calendar: 'granted', reminders: 'granted' },
      rawEventKit: { calendarEvents: [], reminders: [] },
    })
    eventHandlers.clear()
  })

  afterEach(() => {
    resetEventKitAdapter()
    resetRuntimeAdapter()
  })

  it('does not offer System Reminder creation for an unlinked Todo', () => {
    render(<TaskDrawer />)

    expect(screen.getByDisplayValue('Prepare architecture notes')).toBeInTheDocument()
    expect(screen.queryByText('关联系统提醒获得通知')).not.toBeInTheDocument()
  })

  it('opens a linked System Reminder from the Todo drawer', async () => {
    useTaskStore.setState({
      tasks: [
        {
          id: 'task-1',
          title: 'Prepare architecture notes',
          content: '',
          status: 'TODO',
          showInTimeline: false,
          systemReminderId: 'rem-1',
          activityLogs: [],
        },
      ],
    })
    useEventkitStore.setState({
      systemReminders: [
        { id: 'rem-1', title: 'Prepare architecture notes', dueAt: new Date('2026-07-05T09:00:00+08:00'), done: false },
      ],
    })

    render(<TaskDrawer />)

    screen.getByRole('button', { name: '打开' }).click()

    expect(mockEventKitAdapter.openSystemReminder).toHaveBeenCalledWith('rem-1')
  })

  it('renders a DONE Todo as view-only', () => {
    useTaskStore.setState({
      tasks: [
        {
          id: 'task-1',
          title: 'Completed archive',
          content: 'Final notes',
          status: 'DONE',
          showInTimeline: true,
          plannedStartAt: new Date('2026-07-05T09:00:00+08:00'),
          dueDate: new Date('2026-07-05T18:00:00+08:00'),
          activityLogs: [],
        },
      ],
    })

    render(<TaskDrawer />)

    expect(screen.getByText('Completed archive')).toBeInTheDocument()
    expect(screen.getByText('Final notes')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Completed archive')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('编辑计划开始时间')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('编辑截止时间')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('编辑所属目标')).not.toBeInTheDocument()
    expect(screen.queryByText('在时间轴显示')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('添加进度记录...')).not.toBeInTheDocument()
  })

  it('preserves an unsaved title draft when unrelated area data refreshes', async () => {
    const user = userEvent.setup()

    render(<TaskDrawer />)

    const titleInput = screen.getByDisplayValue('Prepare architecture notes')
    await user.clear(titleInput)
    await user.type(titleInput, 'Draft title still in progress')

    await act(async () => {
      useAreaStore.setState({
        allAreas: [{ id: 'area-1', title: 'Product', goalCount: 0, activeGoalCount: 0, isSystem: false }],
      })
    })

    expect(screen.getByDisplayValue('Draft title still in progress')).toBeInTheDocument()
  })

  it('syncs the title draft to the persisted trimmed value after saving', async () => {
    const user = userEvent.setup()

    render(<TaskDrawer />)

    const titleInput = screen.getByDisplayValue('Prepare architecture notes')
    await user.clear(titleInput)
    await user.type(titleInput, '  Trimmed title  ')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByDisplayValue('Trimmed title')).toBeInTheDocument()
    })
  })

  it('clears pending status UI when switching to another task', async () => {
    const user = userEvent.setup()

    useTaskStore.setState({
      tasks: [
        {
          id: 'task-1',
          title: 'Prepare architecture notes',
          content: '',
          status: 'TODO',
          showInTimeline: false,
          activityLogs: [],
        },
        {
          id: 'task-2',
          title: 'Review integration edge cases',
          content: '',
          status: 'TODO',
          showInTimeline: false,
          activityLogs: [],
        },
      ],
    })

    render(<TaskDrawer />)

    await user.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.getByPlaceholderText('写一句，后续回看会轻松很多... (按回车确认)')).toBeInTheDocument()

    await act(async () => {
      useUiStore.setState({ activeDrawer: { type: 'task', id: 'task-2' } })
    })

    expect(screen.queryByPlaceholderText('写一句，后续回看会轻松很多... (按回车确认)')).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('Review integration edge cases')).toBeInTheDocument()
  })

  it('configures Bear token and renders the linked Bear note preview', async () => {
    const user = userEvent.setup()
    const runtimeAdapter: RuntimeAdapter = {
      isTauri: () => true,
      getWindowLabel: () => 'main',
      hideWindow: vi.fn().mockResolvedValue(undefined),
      canOpenInBear: () => true,
      canSyncTasks: () => true,
      canLoadDesktopSnapshot: () => true,
    }
    setRuntimeAdapter(runtimeAdapter)

    render(<TaskDrawer />)

    expect(await screen.findByText('Bear 笔记')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '配置 Bear Token' }))
    await user.type(screen.getByLabelText('Bear API Token'), 'token-123')
    await user.click(screen.getByRole('button', { name: '保存 Token' }))

    await waitFor(() => {
      expect(saveBearApiToken).toHaveBeenCalledWith('token-123')
    })

    await user.click(screen.getByRole('button', { name: '链接当前 Bear 笔记' }))

    expect(linkSelectedBearNote).toHaveBeenCalledWith('task-1')

    const linkedHandler = eventHandlers.get('bear-note:linked')
    expect(linkedHandler).toBeDefined()

    await act(async () => {
      linkedHandler?.({
        payload: {
          task: {
            id: 'task-1',
            title: 'Prepare architecture notes',
            content: '',
            status: 'TODO',
            plannedStartAt: null,
            dueAt: null,
            linkedGoalId: null,
            linkedGoalLabel: null,
            bearNoteId: 'bear-note-123',
            systemReminderId: null,
            showInTimeline: false,
            activityLogs: [],
          },
          preview: {
            taskId: 'task-1',
            bearNoteId: 'bear-note-123',
            title: 'Launch Plan',
            note: '# Launch Plan\n\nHello Bear',
            tags: ['work'],
            isTrashed: false,
            modificationDate: '2026-07-07T09:00:00+08:00',
            creationDate: '2026-07-06T09:00:00+08:00',
            fetchedAt: '2026-07-07T09:05:00+08:00',
          },
        },
      })
    })

    expect(await screen.findByText('Launch Plan')).toBeInTheDocument()
    expect(screen.getByText('Hello Bear')).toBeInTheDocument()
    expect(getBearIntegrationStatus).toHaveBeenCalled()
  })
})
