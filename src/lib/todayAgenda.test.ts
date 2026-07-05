import { describe, it, expect } from 'vitest'
import { deriveTodayAgenda } from './todayAgenda'
import type { Task } from '../types/task'

describe('deriveTodayAgenda - multi-day task filtering', () => {
  it('does not expand a Todo from Planned Start Time through Due Time', () => {
    const now = new Date('2026-06-03T10:00:00+08:00')
    const tasks: Task[] = [
      {
        id: 't1',
        title: '跨天任务',
        status: 'IN_PROGRESS',
        plannedStartAt: new Date('2026-06-01T09:00:00+08:00'),
        dueDate: new Date('2026-06-05T18:00:00+08:00'),
        content: '',
        activityLogs: [],
        showInTimeline: true,
      },
    ]

    const agenda = deriveTodayAgenda([], tasks, now)
    const todoItems = agenda.filter((item) => item.source === 'todo')

    expect(todoItems).toEqual([])
  })
})
