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

  // 相对日期 + 时间点解析
  let parsedTime: Date | undefined

  // 检测"明天"
  if (title.includes('明天')) {
    const tomorrow = relativeDayTime(now, 1, 9, 0)

    // HH:MM 格式
    const hhmmMatch = title.match(/(\d{1,2}):(\d{2})/)
    if (hhmmMatch) {
      const hour = parseInt(hhmmMatch[1])
      const minute = parseInt(hhmmMatch[2])
      parsedTime = relativeDayTime(now, 1, hour, minute)
      title = title.replace(hhmmMatch[0], '').replace('明天', '').trim()
    }
    // 时间点：下午N点、N点
    else if (title.includes('点')) {
      const hourMatch = title.match(/(\d{1,2})点/)
      if (hourMatch) {
        let hour = parseInt(hourMatch[1])
        // 智能判断：1-7点视为下午
        if (hour >= 1 && hour <= 7) {
          hour += 12
        }
        parsedTime = relativeDayTime(now, 1, hour, 0)
        title = title.replace(hourMatch[0], '').replace('明天', '')
                     .replace('下午', '').replace('上午', '').replace('早上', '').replace('晚上', '').trim()
      }
    } else {
      parsedTime = tomorrow
      title = title.replace('明天', '').trim()
    }
  }
  // 检测"后天"
  else if (title.includes('后天')) {
    parsedTime = relativeDayTime(now, 2, 9, 0)

    // 时间段关键词
    if (title.includes('下午')) {
      parsedTime = relativeDayTime(now, 2, 14, 0)
      title = title.replace('下午', '')
    } else if (title.includes('上午')) {
      parsedTime = relativeDayTime(now, 2, 9, 0)
      title = title.replace('上午', '')
    }

    title = title.replace('后天', '').trim()
  }
  // 检测"今晚"
  else if (title.includes('今晚')) {
    parsedTime = relativeDayTime(now, 0, 20, 0)
    title = title.replace('今晚', '').trim()
  }
  // 检测"今天"
  else if (title.includes('今天')) {
    parsedTime = relativeDayTime(now, 0, 9, 0)
    title = title.replace('今天', '').trim()
  }
  // 检测"N天后"
  else if (title.match(/(\d+)天后/)) {
    const match = title.match(/(\d+)天后/)!
    const days = parseInt(match[1])
    parsedTime = relativeDayTime(now, days, 9, 0)
    title = title.replace(match[0], '').trim()
  }

  // 移除截止时间关键词（长模式优先，避免 '前' 先移除导致 '之前' 无法匹配）
  if (isDeadline) {
    title = title.replace('之前', '').replace('前', '').replace('截止', '').trim()
  }

  // 根据截止时间标志分配到不同字段
  if (parsedTime) {
    if (isDeadline) {
      dueDate = parsedTime
    } else {
      plannedStartAt = parsedTime
    }
  }

  return {
    title,
    plannedStartAt,
    dueDate,
  }
}

function relativeDayTime(now: Date, dayOffset: number, hour: number, minute: number) {
  const target = new Date(now)
  target.setDate(target.getDate() + dayOffset)
  target.setHours(hour, minute, 0, 0)
  return target
}
