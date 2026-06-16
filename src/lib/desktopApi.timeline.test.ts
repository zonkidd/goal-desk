import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadCalendarRange } from './desktopApi'

// Mock Tauri runtime
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

describe('loadCalendarRange', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset window.__TAURI_INTERNALS__ for each test
    delete (window as any).__TAURI_INTERNALS__
  })

  it('在非 Tauri 环境返回空数据', async () => {
    const result = await loadCalendarRange('2026-06-09', '2026-06-29')
    expect(result.events).toEqual([])
    expect(result.reminders).toEqual([])
  })

  it('在 Tauri 环境调用 load_calendar_range command', async () => {
    // Mock Tauri runtime
    ;(window as any).__TAURI_INTERNALS__ = true

    const { invoke } = await import('@tauri-apps/api/core')
    const mockInvoke = invoke as any
    mockInvoke.mockResolvedValue({
      events: [
        {
          id: 'event-1',
          title: 'Team Meeting',
          startsAt: '2026-06-15T10:00:00+08:00',
          endsAt: '2026-06-15T11:00:00+08:00',
          calendarTitle: 'Work',
        },
      ],
      reminders: [
        {
          id: 'reminder-1',
          title: 'Submit Report',
          dueAt: '2026-06-16T17:00:00+08:00',
          done: false,
          listTitle: 'Tasks',
        },
      ],
    })

    const result = await loadCalendarRange('2026-06-09', '2026-06-29')

    expect(mockInvoke).toHaveBeenCalledWith('load_calendar_range', {
      startDate: '2026-06-09',
      endDate: '2026-06-29',
    })

    expect(result.events).toHaveLength(1)
    expect(result.events[0].id).toBe('event-1')
    expect(result.events[0].title).toBe('Team Meeting')
    expect(result.events[0].startsAt).toBeInstanceOf(Date)

    expect(result.reminders).toHaveLength(1)
    expect(result.reminders[0].id).toBe('reminder-1')
    expect(result.reminders[0].title).toBe('Submit Report')
    expect(result.reminders[0].dueAt).toBeInstanceOf(Date)
  })

  it('正确转换日期格式', async () => {
    ;(window as any).__TAURI_INTERNALS__ = true

    const { invoke } = await import('@tauri-apps/api/core')
    const mockInvoke = invoke as any
    mockInvoke.mockResolvedValue({
      events: [
        {
          id: 'event-1',
          title: 'Event',
          startsAt: '2026-06-15T10:00:00Z',
          endsAt: '2026-06-15T11:00:00Z',
          calendarTitle: 'Work',
        },
      ],
      reminders: [],
    })

    const result = await loadCalendarRange('2026-06-09', '2026-06-29')

    expect(result.events[0].startsAt).toEqual(new Date('2026-06-15T10:00:00Z'))
    expect(result.events[0].endsAt).toEqual(new Date('2026-06-15T11:00:00Z'))
  })
})
