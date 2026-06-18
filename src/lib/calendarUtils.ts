import type { TimelineItem } from '../types/app'

/**
 * 格式化日期为 YYYY-MM-DD
 * @param date - Date 对象
 * @returns 格式化的日期字符串
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 解析时间标签为 Date 对象
 * @param timeLabel - 时间标签字符串（如 "09:00", "14:30"）
 * @param baseDate - 基准日期（默认今天）
 * @returns Date 对象
 */
export function parseTimeLabel(
  timeLabel: string,
  baseDate?: Date
): Date | null {
  const match = timeLabel.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  const base = baseDate || new Date();
  const result = new Date(base);
  result.setHours(hours, minutes, 0, 0);

  return result;
}

/**
 * 将时间线数据按日期分组
 * @param timeline - 时间线项数组
 * @returns Map<日期字符串(YYYY-MM-DD), 该日期的事件数组>
 */
export function groupTimelineByDate(
  timeline: TimelineItem[]
): Map<string, TimelineItem[]> {
  const grouped = new Map<string, TimelineItem[]>();

  for (const item of timeline) {
    // 优先使用 startsAt，如果没有则尝试解析 timeLabel
    let date: Date | null = null;
    if (item.startsAt) {
      date = item.startsAt instanceof Date ? item.startsAt : new Date(item.startsAt);
    } else {
      date = parseTimeLabel(item.timeLabel);
    }

    if (!date) continue;

    const dateKey = formatDateKey(date);
    const existing = grouped.get(dateKey) || [];
    existing.push(item);
    grouped.set(dateKey, existing);
  }

  // 对每个日期的事件按时间排序
  for (const [dateKey, items] of grouped.entries()) {
    items.sort((a, b) => {
      const dateA = a.startsAt instanceof Date ? a.startsAt : (a.startsAt ? new Date(a.startsAt) : null);
      const dateB = b.startsAt instanceof Date ? b.startsAt : (b.startsAt ? new Date(b.startsAt) : null);

      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    });
    grouped.set(dateKey, items);
  }

  return grouped;
}
