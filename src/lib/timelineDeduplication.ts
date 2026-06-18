import type { Task } from '../types/task'
import type { TimelineItem } from '../types/app'

/**
 * Timeline 去重逻辑
 *
 * 核心规则：如果一个 System Reminder 已经通过 systemReminderId 关联到某个 Task，
 * 那么在 Timeline 中只显示 Task，不显示这个 Reminder（避免重复）。
 *
 * @param tasks - 所有 Task 列表
 * @param localTimeline - 本地 Task 生成的 Timeline 项
 * @param reminderTimeline - System Reminder 生成的 Timeline 项
 * @param calendarTimeline - Calendar Event 生成的 Timeline 项
 * @returns 去重后的 Timeline 项数组
 */
export function deduplicateTimeline(
  tasks: Task[],
  localTimeline: TimelineItem[],
  reminderTimeline: TimelineItem[],
  calendarTimeline: TimelineItem[],
): TimelineItem[] {
  // 构建已关联的 Reminder ID 集合
  const linkedReminderIds = new Set(
    tasks
      .filter(task => task.systemReminderId)
      .map(task => task.systemReminderId!)
  )

  // 过滤掉已关联的 Reminder
  const filteredReminderTimeline = reminderTimeline.filter(
    item => !linkedReminderIds.has(item.id)
  )

  // 合并 Task Timeline、过滤后的 Reminder Timeline 和 Calendar Timeline
  return [...localTimeline, ...filteredReminderTimeline, ...calendarTimeline]
}
