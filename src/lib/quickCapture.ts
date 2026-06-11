export interface BrowserQuickCaptureDraft {
  title: string
  dueDate?: Date
}

export function parseBrowserQuickCapture(input: string, now: Date = new Date()): BrowserQuickCaptureDraft {
  const trimmed = input.trim()
  if (!trimmed) {
    return { title: '' }
  }

  let title = trimmed
  let dueDate: Date | undefined

  if (title.includes('明天下午三点')) {
    title = title.replace('明天下午三点', '').trim()
    dueDate = relativeDayTime(now, 1, 15, 0)
  } else if (title.includes('明天三点')) {
    title = title.replace('明天三点', '').trim()
    dueDate = relativeDayTime(now, 1, 15, 0)
  } else if (title.includes('明天')) {
    title = title.replace('明天', '').trim()
    dueDate = relativeDayTime(now, 1, 9, 0)
  } else if (title.includes('今晚')) {
    title = title.replace('今晚', '').trim()
    dueDate = relativeDayTime(now, 0, 20, 0)
  }

  return {
    title,
    dueDate,
  }
}

function relativeDayTime(now: Date, dayOffset: number, hour: number, minute: number) {
  const target = new Date(now)
  target.setDate(target.getDate() + dayOffset)
  target.setHours(hour, minute, 0, 0)
  return target
}
