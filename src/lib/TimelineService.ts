import type { TimelineItem } from '../types/app'
import type { Task } from '../types/task'

/**
 * Timeline Service
 *
 * 深层模块：封装 Timeline 构建的全部复杂度
 *
 * 接口：给原始数据，返回可渲染的 Timeline
 * 实现：类型转换、日期过滤、时间格式化、排序、去重
 *
 * 调用方无需理解：
 * - RustSystemSnapshot 结构
 * - 时间标签格式化规则
 * - 排序算法
 * - Task-Reminder 去重逻辑
 */

interface RustCalendarEvent {
  id: string
  title: string
  startsAt: string
  endsAt: string
  calendarTitle?: string
}

interface RustReminder {
  id: string
  title: string
  dueAt?: string
  done: boolean
  listTitle?: string
}

interface RustSystemSnapshot {
  calendarEvents: RustCalendarEvent[]
  reminders: RustReminder[]
  integrationStatus: {
    calendar: 'granted' | 'denied' | 'not_determined' | 'restricted' | 'error'
    reminders: 'granted' | 'denied' | 'not_determined' | 'restricted' | 'error'
  }
}

// __CONTINUE_1__

/**
 * 构建今日 Timeline
 *
 * 单一入口：调用方提供原始数据，返回排序后、去重的 Timeline
 */
export function buildTimeline(
  localTodoItems: TimelineItem[],
  tasks: Task[],
  systemSnapshot?: RustSystemSnapshot,
  now = new Date()
): TimelineItem[] {
  if (!systemSnapshot) {
    return localTodoItems
  }

  const today = startOfDay(now)

  // 转换日历事件
  const calendarItems = convertCalendarEvents(systemSnapshot.calendarEvents, today)

  // 转换系统提醒
  const reminderItems = convertReminders(systemSnapshot.reminders, today)

  // 合并所有来源
  const allItems = [...localTodoItems, ...calendarItems, ...reminderItems]

  // 排序
  const sorted = sortByTime(allItems)

  // 去重：过滤已被 Task 关联的 System Reminder
  return deduplicateByTaskLink(sorted, tasks)
}

// 内部实现：类型转换
function convertCalendarEvents(
  events: RustCalendarEvent[],
  today: Date
): TimelineItem[] {
  const items: TimelineItem[] = []

  for (const event of events) {
    const startsAt = new Date(event.startsAt)
    if (Number.isNaN(startsAt.getTime()) || !sameDay(startsAt, today)) {
      continue
    }

    items.push({
      id: event.id,
      title: event.title,
      timeLabel: formatTimeLabel(event.startsAt),
      source: 'calendar',
      readonly: true,
      done: false,
      sourceLabel: event.calendarTitle,
    })
  }

  return items
}

// __CONTINUE_2__

function convertReminders(
  reminders: RustReminder[],
  today: Date
): TimelineItem[] {
  const items: TimelineItem[] = []

  for (const reminder of reminders) {
    if (!reminder.dueAt) continue

    const dueAt = new Date(reminder.dueAt)
    if (Number.isNaN(dueAt.getTime()) || !sameDay(dueAt, today)) {
      continue
    }

    items.push({
      id: reminder.id,
      title: reminder.title,
      timeLabel: formatTimeLabel(reminder.dueAt),
      source: 'reminder',
      readonly: false,
      done: reminder.done,
      sourceLabel: reminder.listTitle,
    })
  }

  return items
}

// 内部实现：排序
function sortByTime(items: TimelineItem[]): TimelineItem[] {
  return [...items].sort((a, b) => {
    const aValue = timeLabelSortValue(a.timeLabel)
    const bValue = timeLabelSortValue(b.timeLabel)
    return aValue - bValue
  })
}

// 内部实现：去重
function deduplicateByTaskLink(
  items: TimelineItem[],
  tasks: Task[]
): TimelineItem[] {
  const linkedReminderIds = new Set(
    tasks
      .filter((task) => task.systemReminderId)
      .map((task) => task.systemReminderId!)
  )

  return items.filter((item) => {
    if (item.source !== 'reminder') return true
    return !linkedReminderIds.has(item.id)
  })
}

// __CONTINUE_3__

// 辅助函数：日期工具
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function sameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function formatTimeLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function timeLabelSortValue(timeLabel: string): number {
  const [hours, minutes] = timeLabel.split(':').map((v) => Number.parseInt(v, 10))
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return Number.MAX_SAFE_INTEGER
  return hours * 60 + minutes
}



