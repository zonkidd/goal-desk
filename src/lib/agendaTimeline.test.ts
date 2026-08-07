import { describe, expect, it } from 'vitest'
import { computeAgendaTimeline, computeImportedRangeTimeline } from './agendaTimeline'
import { startOfDay } from './dateUtils'
import type { Task } from '../types/task'

describe('computeImportedRangeTimeline', () => {
  it('keeps Calendar Events that overlap the range after starting on an earlier day', () => {
    const rangeStart = new Date('2026-06-20T00:00:00+08:00')
    const rangeEnd = new Date('2026-06-20T23:59:59+08:00')

    const timeline = computeImportedRangeTimeline({
      calendarEvents: [
        {
          id: 'overnight-event',
          title: 'Overnight deployment',
          startsAt: '2026-06-19T23:00:00+08:00',
          endsAt: '2026-06-20T01:00:00+08:00',
          calendarTitle: 'Work',
        },
      ],
      reminders: [],
      tasks: [],
      rangeStart,
      rangeEnd,
    })

    expect(timeline).toHaveLength(1)
    expect(timeline[0]).toMatchObject({
      id: 'overnight-event',
      title: 'Overnight deployment',
      source: 'calendar',
      occurrenceDate: startOfDay(rangeStart),
    })
  })

  it('treats a Calendar Event end time at range start as outside the range', () => {
    const timeline = computeImportedRangeTimeline({
      calendarEvents: [
        {
          id: 'ending-at-midnight',
          title: 'Previous day only',
          startsAt: '2026-06-19T23:00:00+08:00',
          endsAt: '2026-06-20T00:00:00+08:00',
          calendarTitle: 'Work',
        },
      ],
      reminders: [],
      tasks: [],
      rangeStart: new Date('2026-06-20T00:00:00+08:00'),
      rangeEnd: new Date('2026-06-20T23:59:59+08:00'),
    })

    expect(timeline).toEqual([])
  })

  it('keeps due-only Todos out of the range timeline', () => {
    const dueOnlyTask: Task = {
      id: 'deadline-only',
      title: 'Submit expense report',
      content: '',
      status: 'TODO',
      dueDate: new Date('2026-06-20T18:00:00+08:00'),
      showInTimeline: true,
      activityLogs: [],
    }

    const timeline = computeImportedRangeTimeline({
      calendarEvents: [],
      reminders: [],
      tasks: [dueOnlyTask],
      rangeStart: new Date('2026-06-20T00:00:00+08:00'),
      rangeEnd: new Date('2026-06-20T23:59:59+08:00'),
    })

    expect(timeline).toEqual([])
  })

  it('carries a planned-start Todo across later due dates in the range timeline if showInTimeline is true', () => {
    const task: Task = {
      id: 'planned-yesterday',
      title: 'Started yesterday',
      content: '',
      status: 'IN_PROGRESS',
      plannedStartAt: new Date('2026-06-19T09:00:00+08:00'),
      dueDate: new Date('2026-06-21T18:00:00+08:00'),
      showInTimeline: true,
      activityLogs: [],
    }

    const rangeStart = new Date('2026-06-20T00:00:00+08:00')
    const rangeEnd = new Date('2026-06-20T23:59:59+08:00')

    const timeline = computeImportedRangeTimeline({
      calendarEvents: [],
      reminders: [],
      tasks: [task],
      rangeStart,
      rangeEnd,
    })

    expect(timeline).toHaveLength(1)
    expect(timeline[0]).toMatchObject({
      id: 'planned-yesterday',
      source: 'todo',
      occurrenceDate: startOfDay(rangeStart),
    })
  })
})

describe('computeAgendaTimeline', () => {
  it('places Todos in a range only by Planned Start Time, never by Due Time alone', () => {
    const plannedTodo: Task = {
      id: 'planned-todo',
      title: 'Begin architecture cleanup',
      content: '',
      status: 'IN_PROGRESS',
      plannedStartAt: new Date('2026-06-20T09:00:00+08:00'),
      dueDate: new Date('2026-06-22T18:00:00+08:00'),
      showInTimeline: true,
      activityLogs: [],
    }
    const dueOnlyTodo: Task = {
      id: 'due-only-todo',
      title: 'Submit status note',
      content: '',
      status: 'TODO',
      dueDate: new Date('2026-06-20T17:00:00+08:00'),
      showInTimeline: true,
      activityLogs: [],
    }

    const timeline = computeAgendaTimeline({
      baseTimeline: [],
      tasks: [plannedTodo, dueOnlyTodo],
      rangeStart: new Date('2026-06-20T00:00:00+08:00'),
      rangeEnd: new Date('2026-06-20T23:59:59+08:00'),
    })

    expect(timeline.map((item) => item.id)).toEqual(['planned-todo'])
    expect(timeline[0]).toMatchObject({
      source: 'todo',
      title: 'Begin architecture cleanup',
      timeLabel: '09:00',
      startsAt: plannedTodo.plannedStartAt,
    })
  })

  it('automatically includes planned-start Todos in the timeline even when showInTimeline is false', () => {
    const hiddenTodo: Task = {
      id: 'hidden-planned-todo',
      title: 'Keep off timeline',
      content: '',
      status: 'IN_PROGRESS',
      plannedStartAt: new Date('2026-06-20T09:00:00+08:00'),
      showInTimeline: false,
      activityLogs: [],
    }

    const timeline = computeAgendaTimeline({
      baseTimeline: [],
      tasks: [hiddenTodo],
      rangeStart: new Date('2026-06-20T00:00:00+08:00'),
      rangeEnd: new Date('2026-06-20T23:59:59+08:00'),
    })

    expect(timeline.length).toBe(1)
    expect(timeline[0].title).toBe('Keep off timeline')
  })
})
