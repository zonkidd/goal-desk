import type { ReminderItem } from '../types/app'

/**
 * 时间分组结果类型
 */
export interface TimeGroupedReminders {
  overdue: ReminderItem[]      // 已过期
  today: ReminderItem[]         // 今天
  next7days: ReminderItem[]     // 未来7天
  later: ReminderItem[]         // 更晚
  nodate: ReminderItem[]        // 无日期
}

/**
 * 获取日期的开始时间（00:00:00）
 */
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * 按清单分组提醒
 * @param reminders - 提醒数组
 * @returns Map<清单名称, 该清单的提醒数组>
 */
export function groupRemindersByList(
  reminders: ReminderItem[]
): Map<string, ReminderItem[]> {
  const map = new Map<string, ReminderItem[]>()

  for (const reminder of reminders) {
    const listName = reminder.listTitle || '未分类'
    if (!map.has(listName)) {
      map.set(listName, [])
    }
    map.get(listName)!.push(reminder)
  }

  return map
}

/**
 * 判断日期是否为今天
 */
export function isToday(date: Date): boolean {
  const today = new Date()
  return date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
}

/**
 * 判断日期是否在未来N天内
 */
export function isWithinDays(date: Date, days: number): boolean {
  const now = new Date()
  const future = new Date()
  future.setDate(future.getDate() + days)

  const startOfToday = startOfDay(now)
  const startOfFuture = startOfDay(future)
  const startOfDate = startOfDay(date)

  return startOfDate > startOfToday && startOfDate <= startOfFuture
}

/**
 * 按时间维度分组提醒
 * @param reminders - 提醒数组
 * @returns 按时间分组的提醒对象
 */
export function groupRemindersByTime(
  reminders: ReminderItem[]
): TimeGroupedReminders {
  const result: TimeGroupedReminders = {
    overdue: [],
    today: [],
    next7days: [],
    later: [],
    nodate: []
  }

  const startOfToday = startOfDay(new Date())

  for (const reminder of reminders) {
    if (!reminder.dueAt) {
      result.nodate.push(reminder)
      continue
    }

    const dueDate = new Date(reminder.dueAt)
    const startOfDueDate = startOfDay(dueDate)

    if (startOfDueDate < startOfToday) {
      result.overdue.push(reminder)
    } else if (isToday(dueDate)) {
      result.today.push(reminder)
    } else if (isWithinDays(dueDate, 7)) {
      result.next7days.push(reminder)
    } else {
      result.later.push(reminder)
    }
  }

  return result
}
