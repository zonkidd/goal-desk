import { describe, it, expect } from 'vitest'
import { deduplicateTimeline } from './timelineDeduplication'
import type { Task } from '../types/task'
import type { ReminderItem, TimelineItem } from '../types/app'

describe('deduplicateTimeline', () => {
  describe('Task-Reminder 去重', () => {
    it('场景 1：Task 关联了 Reminder → Reminder 被过滤', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          title: '完成报告',
          content: '',
          status: 'TODO',
          showInTimeline: true,
          systemReminderId: 'reminder-1', // 关联了系统提醒
          activityLogs: [],
        },
      ]

      const localTimeline: TimelineItem[] = [
        {
          id: 'task-1',
          title: '完成报告',
          timeLabel: '14:00',
          source: 'todo',
          readonly: false,
          done: false,
        },
      ]

      const reminderTimeline: TimelineItem[] = [
        {
          id: 'reminder-1',
          title: '完成报告',
          timeLabel: '14:00',
          source: 'reminder',
          readonly: false,
          done: false,
          sourceLabel: '工作',
        },
      ]

      const calendarTimeline: TimelineItem[] = []

      const result = deduplicateTimeline(tasks, localTimeline, reminderTimeline, calendarTimeline)

      // 预期：只保留 Task，Reminder 被过滤
      expect(result).toHaveLength(1)
      expect(result[0].source).toBe('todo')
      expect(result[0].id).toBe('task-1')
    })

    it('场景 2：Task 没有关联 Reminder → Reminder 保留', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          title: '完成报告',
          content: '',
          status: 'TODO',
          showInTimeline: true,
          systemReminderId: undefined, // 没有关联
          activityLogs: [],
        },
      ]

      const localTimeline: TimelineItem[] = [
        {
          id: 'task-1',
          title: '完成报告',
          timeLabel: '14:00',
          source: 'todo',
          readonly: false,
          done: false,
        },
      ]

      const reminderTimeline: TimelineItem[] = [
        {
          id: 'reminder-1',
          title: '买菜',
          timeLabel: '18:00',
          source: 'reminder',
          readonly: false,
          done: false,
          sourceLabel: '生活',
        },
      ]

      const calendarTimeline: TimelineItem[] = []

      const result = deduplicateTimeline(tasks, localTimeline, reminderTimeline, calendarTimeline)

      // 预期：Task 和 Reminder 都保留
      expect(result).toHaveLength(2)
      expect(result.find(item => item.source === 'todo')).toBeDefined()
      expect(result.find(item => item.source === 'reminder')).toBeDefined()
    })

    it('场景 3：Reminder 没有对应的 Task → Reminder 保留', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          title: '完成报告',
          content: '',
          status: 'TODO',
          showInTimeline: true,
          systemReminderId: 'reminder-999', // 关联了不存在的 reminder
          activityLogs: [],
        },
      ]

      const localTimeline: TimelineItem[] = [
        {
          id: 'task-1',
          title: '完成报告',
          timeLabel: '14:00',
          source: 'todo',
          readonly: false,
          done: false,
        },
      ]

      const reminderTimeline: TimelineItem[] = [
        {
          id: 'reminder-1',
          title: '买菜',
          timeLabel: '18:00',
          source: 'reminder',
          readonly: false,
          done: false,
          sourceLabel: '生活',
        },
      ]

      const calendarTimeline: TimelineItem[] = []

      const result = deduplicateTimeline(tasks, localTimeline, reminderTimeline, calendarTimeline)

      // 预期：Task 和 Reminder 都保留（因为 reminder-1 没有被任何 Task 关联）
      expect(result).toHaveLength(2)
      expect(result.find(item => item.id === 'task-1')).toBeDefined()
      expect(result.find(item => item.id === 'reminder-1')).toBeDefined()
    })

    it('场景 4：多个 Task 和 Reminder，部分关联', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          title: '完成报告',
          content: '',
          status: 'TODO',
          showInTimeline: true,
          systemReminderId: 'reminder-1',
          activityLogs: [],
        },
        {
          id: 'task-2',
          title: '准备会议',
          content: '',
          status: 'TODO',
          showInTimeline: true,
          systemReminderId: undefined,
          activityLogs: [],
        },
      ]

      const localTimeline: TimelineItem[] = [
        {
          id: 'task-1',
          title: '完成报告',
          timeLabel: '14:00',
          source: 'todo',
          readonly: false,
          done: false,
        },
        {
          id: 'task-2',
          title: '准备会议',
          timeLabel: '16:00',
          source: 'todo',
          readonly: false,
          done: false,
        },
      ]

      const reminderTimeline: TimelineItem[] = [
        {
          id: 'reminder-1',
          title: '完成报告',
          timeLabel: '14:00',
          source: 'reminder',
          readonly: false,
          done: false,
          sourceLabel: '工作',
        },
        {
          id: 'reminder-2',
          title: '买菜',
          timeLabel: '18:00',
          source: 'reminder',
          readonly: false,
          done: false,
          sourceLabel: '生活',
        },
      ]

      const calendarTimeline: TimelineItem[] = []

      const result = deduplicateTimeline(tasks, localTimeline, reminderTimeline, calendarTimeline)

      // 预期：2 个 Task + 1 个独立的 Reminder（reminder-1 被过滤）
      expect(result).toHaveLength(3)
      expect(result.filter(item => item.source === 'todo')).toHaveLength(2)
      expect(result.filter(item => item.source === 'reminder')).toHaveLength(1)
      expect(result.find(item => item.id === 'reminder-1')).toBeUndefined()
      expect(result.find(item => item.id === 'reminder-2')).toBeDefined()
    })
  })

  describe('边界情况', () => {
    it('空输入返回空数组', () => {
      const result = deduplicateTimeline([], [], [], [])
      expect(result).toEqual([])
    })

    it('只有 Task 时正常返回', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          title: '完成报告',
          content: '',
          status: 'TODO',
          showInTimeline: true,
          activityLogs: [],
        },
      ]

      const localTimeline: TimelineItem[] = [
        {
          id: 'task-1',
          title: '完成报告',
          timeLabel: '14:00',
          source: 'todo',
          readonly: false,
          done: false,
        },
      ]

      const result = deduplicateTimeline(tasks, localTimeline, [], [])
      expect(result).toHaveLength(1)
      expect(result[0].source).toBe('todo')
    })

    it('只有 Reminder 时正常返回', () => {
      const reminderTimeline: TimelineItem[] = [
        {
          id: 'reminder-1',
          title: '买菜',
          timeLabel: '18:00',
          source: 'reminder',
          readonly: false,
          done: false,
          sourceLabel: '生活',
        },
      ]

      const result = deduplicateTimeline([], [], reminderTimeline, [])
      expect(result).toHaveLength(1)
      expect(result[0].source).toBe('reminder')
    })

    it('只有 Calendar 时正常返回', () => {
      const calendarTimeline: TimelineItem[] = [
        {
          id: 'event-1',
          title: '团队会议',
          timeLabel: '10:00',
          source: 'calendar',
          readonly: true,
          done: false,
          sourceLabel: '工作日历',
        },
      ]

      const result = deduplicateTimeline([], [], [], calendarTimeline)
      expect(result).toHaveLength(1)
      expect(result[0].source).toBe('calendar')
    })
  })
})
