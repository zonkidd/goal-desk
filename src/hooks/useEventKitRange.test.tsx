import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEventkitStore } from '../store/eventkitStore'
import { useEventKitRange } from './useEventKitRange'

const mockEventKitAdapter = vi.hoisted(() => ({
  loadCalendarRange: vi.fn(),
}))

vi.mock('../lib/workspaceMutations', () => ({
  getEventKitAdapter: () => mockEventKitAdapter,
}))

describe('useEventKitRange', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useEventkitStore.setState({
      rawEventKit: {
        calendarEvents: [
          {
            id: 'existing-event',
            title: 'Existing standup',
            startsAt: '2026-06-20T09:00:00.000Z',
            endsAt: '2026-06-20T09:30:00.000Z',
            calendarTitle: 'Work',
          },
        ],
        reminders: [],
      },
      systemReminders: [],
      integrationStatus: { calendar: 'granted', reminders: 'granted' },
      eventkitPermissions: { calendar: 'granted', reminders: 'granted' },
    })
    mockEventKitAdapter.loadCalendarRange.mockResolvedValue({
      events: [
        {
          id: 'range-event',
          title: 'Range architecture review',
          startsAt: new Date('2026-06-21T10:00:00.000Z'),
          endsAt: new Date('2026-06-21T11:00:00.000Z'),
          calendarTitle: 'Work',
        },
      ],
      reminders: [
        {
          id: 'range-reminder',
          title: 'Prepare review notes',
          dueAt: new Date('2026-06-21T12:00:00.000Z'),
          done: false,
          listTitle: 'Work',
        },
      ],
    })
  })

  it('loads, normalizes, and merges EventKit range data behind one interface', async () => {
    const rangeStart = new Date('2026-06-13T00:00:00')
    const rangeEnd = new Date('2026-06-27T23:59:59')

    const { result } = renderHook(() => useEventKitRange(rangeStart, rangeEnd))

    expect(result.current.calendarEvents.map((event) => event.id)).toEqual(['existing-event'])

    await waitFor(() => {
      expect(result.current.calendarEvents.map((event) => event.id)).toEqual([
        'existing-event',
        'range-event',
      ])
    })

    expect(result.current.reminders).toEqual([
      {
        id: 'range-reminder',
        title: 'Prepare review notes',
        dueAt: '2026-06-21T12:00:00.000Z',
        done: false,
        listTitle: 'Work',
      },
    ])
    expect(useEventkitStore.getState().systemReminders[0].dueAt).toBeInstanceOf(Date)
    expect(mockEventKitAdapter.loadCalendarRange).toHaveBeenCalledWith('2026-06-13', '2026-06-27')
  })

  it('uses freshly loaded EventKit range data when an imported item already exists', async () => {
    useEventkitStore.setState({
      rawEventKit: {
        calendarEvents: [
          {
            id: 'existing-event',
            title: 'Cached standup',
            startsAt: '2026-06-20T09:00:00.000Z',
            endsAt: '2026-06-20T09:30:00.000Z',
            calendarTitle: 'Old calendar',
          },
        ],
        reminders: [
          {
            id: 'existing-reminder',
            title: 'Cached reminder',
            dueAt: '2026-06-20T11:00:00.000Z',
            done: false,
            listTitle: 'Old list',
          },
        ],
      },
      systemReminders: [
        {
          id: 'existing-reminder',
          title: 'Cached reminder',
          dueAt: new Date('2026-06-20T11:00:00.000Z'),
          done: false,
          listTitle: 'Old list',
        },
      ],
    })
    mockEventKitAdapter.loadCalendarRange.mockResolvedValue({
      events: [
        {
          id: 'existing-event',
          title: 'Moved architecture review',
          startsAt: new Date('2026-06-20T10:00:00.000Z'),
          endsAt: new Date('2026-06-20T11:00:00.000Z'),
          calendarTitle: 'Current calendar',
        },
      ],
      reminders: [
        {
          id: 'existing-reminder',
          title: 'Updated reminder',
          dueAt: new Date('2026-06-20T12:00:00.000Z'),
          done: true,
          listTitle: 'Current list',
        },
      ],
    })

    const { result } = renderHook(() => useEventKitRange(
      new Date('2026-06-13T00:00:00'),
      new Date('2026-06-27T23:59:59'),
    ))

    await waitFor(() => {
      expect(result.current.calendarEvents[0]).toMatchObject({
        id: 'existing-event',
        title: 'Moved architecture review',
        startsAt: '2026-06-20T10:00:00.000Z',
        endsAt: '2026-06-20T11:00:00.000Z',
        calendarTitle: 'Current calendar',
      })
    })
    expect(result.current.reminders[0]).toMatchObject({
      id: 'existing-reminder',
      title: 'Updated reminder',
      dueAt: '2026-06-20T12:00:00.000Z',
      done: true,
      listTitle: 'Current list',
    })
    expect(useEventkitStore.getState().systemReminders[0]).toMatchObject({
      id: 'existing-reminder',
      title: 'Updated reminder',
      done: true,
      listTitle: 'Current list',
    })
  })
})
