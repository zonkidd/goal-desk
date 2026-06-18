import type { RawAgendaItem, TodayAgenda, GroupedAgenda } from '../types/app'
import type { Task } from '../types/task'
import type { GoalCard } from '../types/app'
import { buildTimeline } from './TimelineService'

/**
 * Timeline Builder
 *
 * 深层模块：统一的时间线构建入口
 *
 * 隐藏的复杂度：
 * - EventKit 事件与系统提醒的转换
 * - 日期过滤和时间格式化
 * - 多来源合并和去重
 * - 排序算法
 * - 日期分组逻辑
 *
 * 调用方只需：
 * 1. fromSnapshot() - 构建原始议程数据
 * 2. filterToday() - 过滤到今天的议程
 * 3. groupByDate() - 按日期分组议程
 * 4. applyAreaFilter() - 按领域过滤
 */

export interface CalendarEvent {
  id: string
  title: string
  startsAt: string
  endsAt: string
  calendarTitle?: string
}

export interface ReminderItem {
  id: string
  title: string
  dueAt?: string
  done: boolean
  listTitle?: string
}

export interface TimelineSnapshot {
  events: CalendarEvent[]
  reminders: ReminderItem[]
  tasks: Task[]
}

export type AreaFilter = 'ALL' | 'WORK' | 'PERSONAL' | 'HEALTH' | 'LEARNING' | 'SIDE_PROJECT' | string

export class TimelineBuilder {
  /**
   * 从 desktop snapshot 构建原始议程数据
   * 包含：EventKit 事件、系统提醒、Desk 任务
   *
   * @returns RawAgendaItem[] - 未经过滤的原始议程项
   */
  static fromSnapshot(snapshot: TimelineSnapshot, now = new Date()): RawAgendaItem[] {
    const { events, reminders, tasks } = snapshot

    // 准备 Rust 格式的系统快照
    const systemSnapshot = {
      calendarEvents: events,
      reminders,
      integrationStatus: {
        calendar: 'granted' as const,
        reminders: 'granted' as const,
      },
    }

    // 使用 TimelineService 构建（它已经处理了过滤、排序、去重）
    return buildTimeline([], tasks, systemSnapshot, now)
  }

  /**
   * 过滤到今天的议程项
   * 包含：今天的事件 + 今天的提醒 + 未完成的任务
   *
   * @returns TodayAgenda - 今日议程数组
   */
  static filterToday(timeline: RawAgendaItem[], now = new Date()): TodayAgenda {
    // 防御性检查：确保 timeline 是数组
    if (!Array.isArray(timeline)) {
      console.warn('TimelineBuilder.filterToday: timeline is not an array', timeline)
      return []
    }

    const today = startOfDay(now)

    return timeline.filter((item) => {
      // 任务：保留未完成的
      if (item.source === 'todo') {
        return !item.done
      }

      // 事件和提醒：必须有 startsAt 并且是今天
      if (!item.startsAt) return false

      const itemDate = item.startsAt instanceof Date ? item.startsAt : new Date(item.startsAt)
      return isSameDay(itemDate, today)
    })
  }

  /**
   * 按领域过滤议程
   */
  static applyAreaFilter(
    timeline: RawAgendaItem[],
    area: AreaFilter | null,
    goals: GoalCard[] = []
  ): RawAgendaItem[] {
    // 防御性检查：确保 timeline 是数组
    if (!Array.isArray(timeline)) {
      console.warn('TimelineBuilder.applyAreaFilter: timeline is not an array', timeline)
      return []
    }

    if (!area || area === 'ALL') {
      return timeline
    }

    // 构建 goalId -> area 映射
    const goalAreaMap = new Map<string, string>()
    for (const goal of goals) {
      goalAreaMap.set(goal.id, goal.area)
    }

    return timeline.filter((item) => {
      // 非任务项（事件、提醒）始终保留
      if (item.source !== 'todo') {
        return true
      }

      // 任务项：检查关联目标的领域
      if (!item.linkedGoalId) {
        return false
      }

      const itemArea = goalAreaMap.get(item.linkedGoalId)
      return itemArea === area
    })
  }

  /**
   * 按日期分组（用于日历周视图）
   *
   * @returns GroupedAgenda - 按日期分组的议程
   */
  static groupByDate(timeline: RawAgendaItem[]): GroupedAgenda {
    // 防御性检查：确保 timeline 是数组
    if (!Array.isArray(timeline)) {
      console.warn('TimelineBuilder.groupByDate: timeline is not an array', timeline)
      return new Map()
    }

    const grouped = new Map<string, RawAgendaItem[]>()

    for (const item of timeline) {
      // 只处理有明确日期的项
      if (!item.startsAt) continue

      const date = item.startsAt instanceof Date ? item.startsAt : new Date(item.startsAt)
      const dateKey = formatDateKey(date)

      const existing = grouped.get(dateKey) || []
      existing.push(item)
      grouped.set(dateKey, existing)
    }

    // 对每个日期的事件按时间排序
    for (const [dateKey, items] of grouped.entries()) {
      items.sort((a, b) => {
        const dateA = a.startsAt instanceof Date ? a.startsAt : new Date(a.startsAt!)
        const dateB = b.startsAt instanceof Date ? b.startsAt : new Date(b.startsAt!)
        return dateA.getTime() - dateB.getTime()
      })
      grouped.set(dateKey, items)
    }

    return grouped
  }
}

// 辅助函数：日期工具
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
