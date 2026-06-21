import { describe, it, expect } from 'vitest'
import { deriveTodayAgenda } from './todayAgenda'
import type { Task } from '../types/task'
import { startOfDay } from './dateUtils'

describe('deriveTodayAgenda - multi-day task filtering', () => {
  it('should only include today occurrence for multi-day tasks', () => {
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

    // 多日任务展开为 5 天
    expect(todoItems).toHaveLength(5)

    // 只有 occurrenceDate 等于今天的条目应该被 TodayView 显示
    const today = startOfDay(now)
    const todayItems = todoItems.filter((item) => {
      if (!item.occurrenceDate) return true
      return startOfDay(item.occurrenceDate).getTime() === today.getTime()
    })

    expect(todayItems).toHaveLength(1)
    expect(todayItems[0].title).toBe('跨天任务')
  })
})
