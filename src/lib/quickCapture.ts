export interface BrowserQuickCaptureDraft {
  title: string
  plannedStartAt?: Date
  dueDate?: Date
}

export function parseBrowserQuickCapture(input: string, now: Date = new Date()): BrowserQuickCaptureDraft {
  const trimmed = input.trim()
  if (!trimmed) {
    return { title: '' }
  }

  let title = trimmed
  let plannedStartAt: Date | undefined
  let dueDate: Date | undefined

  // 检测截止时间关键词
  const isDeadline = title.includes('前') || title.includes('之前') || title.includes('截止')

  // 1. Determine dayOffset (default to 0: today)
  let dayOffset = 0
  let hasDateKeyword = false

  if (title.includes('明天')) {
    dayOffset = 1
    hasDateKeyword = true
    title = title.replace('明天', '')
  } else if (title.includes('后天')) {
    dayOffset = 2
    hasDateKeyword = true
    title = title.replace('后天', '')
  } else if (title.includes('今晚')) {
    dayOffset = 0
    hasDateKeyword = true
    title = title.replace('今晚', '')
  } else if (title.includes('今天')) {
    dayOffset = 0
    hasDateKeyword = true
    title = title.replace('今天', '')
  } else if (title.match(/(\d+)天后/)) {
    const match = title.match(/(\d+)天后/)!
    dayOffset = parseInt(match[1])
    hasDateKeyword = true
    title = title.replace(match[0], '')
  } else if (title.includes('下周一')) {
    const dayOfWeek = now.getDay()
    const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
    dayOffset = daysUntilNextMonday
    hasDateKeyword = true
    title = title.replace('下周一', '')
  }

  // 2. Determine time (hour and minute)
  let hour: number | undefined
  let minute: number | undefined
  let hasTimeKeyword = false

  // HH:MM 格式
  const hhmmMatch = title.match(/(\d{1,2}):(\d{2})/)
  if (hhmmMatch) {
    hour = parseInt(hhmmMatch[1])
    minute = parseInt(hhmmMatch[2])
    hasTimeKeyword = true
    title = title.replace(hhmmMatch[0], '')
  }
  // 中文或数字小时: N点
  else {
    const hourMatch = title.match(/([一二三四五六七八九十\d]{1,2})\s*点/)
    if (hourMatch) {
      hour = parseChineseOrDigitHour(hourMatch[1])
      hasTimeKeyword = true
      title = title.replace(hourMatch[0], '')

      // 检测分钟: M分 或 半
      const minMatch = title.match(/(\d{1,2})\s*分/)
      if (minMatch) {
        minute = parseInt(minMatch[1])
        title = title.replace(minMatch[0], '')
      } else if (title.includes('半')) {
        minute = 30
        title = title.replace('半', '')
      } else {
        minute = 0
      }
    }
  }

  // 处理时间段指示词
  let isPm = false
  if (title.includes('下午') || title.includes('晚上') || trimmed.includes('今晚')) {
    isPm = true
    title = title.replace('下午', '').replace('晚上', '')
  } else if (title.includes('上午') || title.includes('早上') || title.includes('中午')) {
    title = title.replace('上午', '').replace('早上', '').replace('中午', '')
  }

  if (hour !== undefined) {
    if (isPm && hour >= 1 && hour <= 12) {
      hour += 12
    } else if (!isPm && hour >= 1 && hour <= 7) {
      // 智能上下午判断：无明确指示词时，1-7点智能视为下午
      hour += 12
    }
  }

  // 3. Assemble Date
  if (hasDateKeyword || hasTimeKeyword) {
    const parsedHour = hour !== undefined ? hour : (trimmed.includes('今晚') ? 20 : 9)
    const parsedMinute = minute !== undefined ? minute : 0
    const parsedTime = relativeDayTime(now, dayOffset, parsedHour, parsedMinute)

    if (isDeadline) {
      dueDate = parsedTime
    } else {
      plannedStartAt = parsedTime
    }
  }

  // 移除截止时间关键词
  if (isDeadline) {
    title = title.replace('之前', '').replace('前', '').replace('截止', '')
  }
  title = title.trim()

  return {
    title,
    plannedStartAt,
    dueDate,
  }
}



const ChineseDigitMap: Record<string, number> = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15,
  '十六': 16, '十七': 17, '十八': 18, '十九': 19, '二十': 20,
  '二十一': 21, '二十二': 22, '二十三': 23,
}

function parseChineseOrDigitHour(value: string): number {
  if (ChineseDigitMap[value] !== undefined) return ChineseDigitMap[value]
  return parseInt(value, 10)
}

function relativeDayTime(now: Date, dayOffset: number, hour: number, minute: number) {
  const target = new Date(now)
  target.setDate(target.getDate() + dayOffset)
  target.setHours(hour, minute, 0, 0)
  return target
}
