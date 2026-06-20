import { describe, it, expect } from 'vitest'
import { TimelineBuilder } from './TimelineBuilder'
import type { TimelineItem } from '../types/app'
import type { Task } from '../types/task'

describe('TimelineBuilder', () => {
  describe('fromSnapshot', () => {
    it('应该将空快照转换为空时间线', () => {
      const result = TimelineBuilder.fromSnapshot({
        events: [],
        reminders: [],
        tasks: [],
      })

      expect(result).toEqual([])
    })

    it('应该转换日历事件为时间线项', () => {
      const today = new Date('2026-06-16T10:00:00')

      const result = TimelineBuilder.fromSnapshot(
        {
          events: [
            {
              id: 'event-1',
              title: '团队会议',
              startsAt: '2026-06-16T14:00:00',
              endsAt: '2026-06-16T15:00:00',
              calendarTitle: '工作日历',
            },
          ],
          reminders: [],
          tasks: [],
        },
        today
      )

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'event-1',
        title: '团队会议',
        timeLabel: '14:00',
        source: 'calendar',
        readonly: true,
        done: false,
        sourceLabel: '工作日历',
      })
    })

    it('应该转换系统提醒为时间线项', () => {
      const today = new Date('2026-06-16T10:00:00')

      const result = TimelineBuilder.fromSnapshot(
        {
          events: [],
          reminders: [
            {
              id: 'reminder-1',
              title: '买菜',
              dueAt: '2026-06-16T18:00:00',
              done: false,
              listTitle: '购物清单',
            },
          ],
          tasks: [],
        },
        today
      )

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'reminder-1',
        title: '买菜',
        timeLabel: '18:00',
        source: 'reminder',
        readonly: false,
        done: false,
        sourceLabel: '购物清单',
      })
    })

    it('应该过滤掉非今天的事件和提醒', () => {
      const today = new Date('2026-06-16T10:00:00')

      const result = TimelineBuilder.fromSnapshot(
        {
          events: [
            {
              id: 'event-today',
              title: '今天的会议',
              startsAt: '2026-06-16T14:00:00',
              endsAt: '2026-06-16T15:00:00',
            },
            {
              id: 'event-tomorrow',
              title: '明天的会议',
              startsAt: '2026-06-17T14:00:00',
              endsAt: '2026-06-17T15:00:00',
            },
          ],
          reminders: [
            {
              id: 'reminder-today',
              title: '今天的提醒',
              dueAt: '2026-06-16T18:00:00',
              done: false,
            },
            {
              id: 'reminder-yesterday',
              title: '昨天的提醒',
              dueAt: '2026-06-15T18:00:00',
              done: false,
            },
          ],
          tasks: [],
        },
        today
      )

      expect(result).toHaveLength(2)
      expect(result.map((item) => item.id)).toEqual(['event-today', 'reminder-today'])
    })

    it('应该按时间排序', () => {
      const today = new Date('2026-06-16T10:00:00')

      const result = TimelineBuilder.fromSnapshot(
        {
          events: [
            {
              id: 'event-2',
              title: '下午会议',
              startsAt: '2026-06-16T15:00:00',
              endsAt: '2026-06-16T16:00:00',
            },
            {
              id: 'event-1',
              title: '早会',
              startsAt: '2026-06-16T09:00:00',
              endsAt: '2026-06-16T10:00:00',
            },
          ],
          reminders: [],
          tasks: [],
        },
        today
      )

      expect(result.map((item) => item.id)).toEqual(['event-1', 'event-2'])
      expect(result.map((item) => item.timeLabel)).toEqual(['09:00', '15:00'])
    })

    it('应该去重已关联任务的系统提醒', () => {
      const today = new Date('2026-06-16T10:00:00')

      const tasks: Task[] = [
        {
          id: 'task-1',
          title: '完成报告',
          content: '',
          status: 'IN_PROGRESS',
          systemReminderId: 'reminder-1', // 关联了 reminder-1
          activityLogs: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      const result = TimelineBuilder.fromSnapshot(
        {
          events: [],
          reminders: [
            {
              id: 'reminder-1',
              title: '完成报告',
              dueAt: '2026-06-16T18:00:00',
              done: false,
            },
            {
              id: 'reminder-2',
              title: '买菜',
              dueAt: '2026-06-16T19:00:00',
              done: false,
            },
          ],
          tasks,
        },
        today
      )

      // reminder-1 应该被过滤掉
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('reminder-2')
    })

    it('应该合并多种来源并保持排序', () => {
      const today = new Date('2026-06-16T10:00:00')

      const result = TimelineBuilder.fromSnapshot(
        {
          events: [
            {
              id: 'event-1',
              title: '早会',
              startsAt: '2026-06-16T09:00:00',
              endsAt: '2026-06-16T10:00:00',
            },
          ],
          reminders: [
            {
              id: 'reminder-1',
              title: '午餐提醒',
              dueAt: '2026-06-16T12:00:00',
              done: false,
            },
          ],
          tasks: [],
        },
        today
      )

      expect(result).toHaveLength(2)
      expect(result.map((item) => item.timeLabel)).toEqual(['09:00', '12:00'])
      expect(result.map((item) => item.source)).toEqual(['calendar', 'reminder'])
    })
  })

  describe('filterToday', () => {
    const createTimelineItem = (overrides: Partial<TimelineItem>): TimelineItem => ({
      id: 'item-1',
      title: 'Test',
      timeLabel: '09:00',
      source: 'todo',
      readonly: false,
      done: false,
      ...overrides,
    })

    it('应该保留今天的事件', () => {
      const today = new Date('2026-06-16T10:00:00')
      const timeline: TimelineItem[] = [
        createTimelineItem({
          id: 'event-1',
          startsAt: new Date('2026-06-16T14:00:00'),
          source: 'calendar',
        }),
      ]

      const result = TimelineBuilder.filterToday(timeline, today)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('event-1')
    })

    it('应该过滤掉非今天的事件', () => {
      const today = new Date('2026-06-16T10:00:00')
      const timeline: TimelineItem[] = [
        createTimelineItem({
          id: 'event-yesterday',
          startsAt: new Date('2026-06-15T14:00:00'),
          source: 'calendar',
        }),
        createTimelineItem({
          id: 'event-tomorrow',
          startsAt: new Date('2026-06-17T14:00:00'),
          source: 'calendar',
        }),
      ]

      const result = TimelineBuilder.filterToday(timeline, today)

      expect(result).toHaveLength(0)
    })

    it('应该保留未完成的任务', () => {
      const today = new Date('2026-06-16T10:00:00')
      const timeline: TimelineItem[] = [
        createTimelineItem({
          id: 'task-1',
          source: 'todo',
          done: false,
        }),
      ]

      const result = TimelineBuilder.filterToday(timeline, today)

      expect(result).toHaveLength(1)
    })

    it('应该过滤掉已完成的任务', () => {
      const today = new Date('2026-06-16T10:00:00')
      const timeline: TimelineItem[] = [
        createTimelineItem({
          id: 'task-done',
          source: 'todo',
          done: true,
        }),
      ]

      const result = TimelineBuilder.filterToday(timeline, today)

      expect(result).toHaveLength(0)
    })
  })

  describe('groupByDate', () => {
    const createTimelineItem = (id: string, startsAt: Date): TimelineItem => ({
      id,
      title: `Event ${id}`,
      timeLabel: '09:00',
      source: 'calendar',
      readonly: true,
      done: false,
      startsAt,
    })

    it('应该按日期分组', () => {
      const timeline: TimelineItem[] = [
        createTimelineItem('event-1', new Date('2026-06-16T09:00:00')),
        createTimelineItem('event-2', new Date('2026-06-16T14:00:00')),
        createTimelineItem('event-3', new Date('2026-06-17T10:00:00')),
      ]

      const result = TimelineBuilder.groupByDate(timeline)

      expect(result.size).toBe(2)
      expect(result.get('2026-06-16')).toHaveLength(2)
      expect(result.get('2026-06-17')).toHaveLength(1)
    })

    it('应该在每个日期内按时间排序', () => {
      const timeline: TimelineItem[] = [
        createTimelineItem('event-2', new Date('2026-06-16T15:00:00')),
        createTimelineItem('event-1', new Date('2026-06-16T09:00:00')),
        createTimelineItem('event-3', new Date('2026-06-16T12:00:00')),
      ]

      const result = TimelineBuilder.groupByDate(timeline)
      const dayItems = result.get('2026-06-16')!

      expect(dayItems.map((item) => item.id)).toEqual(['event-1', 'event-3', 'event-2'])
    })

    it('应该处理空时间线', () => {
      const result = TimelineBuilder.groupByDate([])

      expect(result.size).toBe(0)
    })

    it('应该忽略没有 startsAt 的项', () => {
      const timeline: TimelineItem[] = [
        {
          id: 'event-no-date',
          title: 'No Date Event',
          timeLabel: '09:00',
          source: 'todo',
          readonly: false,
          done: false,
        },
        createTimelineItem('event-with-date', new Date('2026-06-16T10:00:00')),
      ]

      const result = TimelineBuilder.groupByDate(timeline)

      expect(result.size).toBe(1)
      expect(result.get('2026-06-16')).toHaveLength(1)
    })

    it('应该按 occurrenceDate 分组而非 startsAt', () => {
      const timeline: TimelineItem[] = [
        {
          id: 't1',
          title: '跨天任务 第1天',
          timeLabel: '09:00',
          source: 'todo',
          readonly: false,
          done: false,
          startsAt: new Date('2026-06-01T09:00:00'),
          occurrenceDate: new Date('2026-06-01T00:00:00'),
        },
        {
          id: 't1',
          title: '跨天任务 第2天',
          timeLabel: '09:00',
          source: 'todo',
          readonly: false,
          done: false,
          startsAt: new Date('2026-06-01T09:00:00'),
          occurrenceDate: new Date('2026-06-02T00:00:00'),
        },
        {
          id: 't1',
          title: '跨天任务 第3天',
          timeLabel: '09:00',
          source: 'todo',
          readonly: false,
          done: false,
          startsAt: new Date('2026-06-01T09:00:00'),
          occurrenceDate: new Date('2026-06-03T00:00:00'),
        },
      ]

      const result = TimelineBuilder.groupByDate(timeline)

      expect(result.size).toBe(3)
      expect(result.get('2026-06-01')).toHaveLength(1)
      expect(result.get('2026-06-02')).toHaveLength(1)
      expect(result.get('2026-06-03')).toHaveLength(1)
    })
  })

  describe('applyAreaFilter', () => {
    it('应该在 ALL 过滤器下返回全部项', () => {
      const timeline: TimelineItem[] = [
        {
          id: 'item-1',
          title: 'Test',
          timeLabel: '09:00',
          source: 'todo',
          readonly: false,
          done: false,
        },
      ]

      const result = TimelineBuilder.applyAreaFilter(timeline, 'ALL')

      expect(result).toEqual(timeline)
    })

    it('应该过滤特定领域的任务', () => {
      const timeline: TimelineItem[] = [
        {
          id: 'task-work',
          title: 'Work Task',
          timeLabel: '09:00',
          source: 'todo',
          readonly: false,
          done: false,
          linkedGoalId: 'goal-work',
        },
        {
          id: 'task-personal',
          title: 'Personal Task',
          timeLabel: '10:00',
          source: 'todo',
          readonly: false,
          done: false,
          linkedGoalId: 'goal-personal',
        },
      ]

      const goals: GoalCard[] = [
        {
          id: 'goal-work',
          area: 'WORK',
          title: 'Work Goal',
          description: '',
          status: 'ACTIVE',
          progress: { totalTasks: 0, completedTasks: 0, percentage: 0 },
          nextTodo: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'goal-personal',
          area: 'PERSONAL',
          title: 'Personal Goal',
          description: '',
          status: 'ACTIVE',
          progress: { totalTasks: 0, completedTasks: 0, percentage: 0 },
          nextTodo: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      const result = TimelineBuilder.applyAreaFilter(timeline, 'WORK', goals)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('task-work')
    })

    it('应该保留非任务项（事件、提醒）', () => {
      const timeline: TimelineItem[] = [
        {
          id: 'event-1',
          title: 'Calendar Event',
          timeLabel: '09:00',
          source: 'calendar',
          readonly: true,
          done: false,
        },
      ]

      const result = TimelineBuilder.applyAreaFilter(timeline, 'WORK', [])

      expect(result).toHaveLength(1)
    })
  })
})
