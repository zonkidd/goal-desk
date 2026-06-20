export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function isSameDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate()
}

export function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function timeLabelSortValue(timeLabel: string): number {
  const [hours, minutes] = timeLabel.split(':').map((v) => Number.parseInt(v, 10))
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return Number.MAX_SAFE_INTEGER
  return hours * 60 + minutes
}

export function getRelativeDay(offset: number): Date {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return date
}

export function parseDatetimeLocal(value: string): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export function toTimeInputValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function toDatetimeLocalValue(day: Date, time: string): string {
  const [hours, minutes] = time.split(':').map((item) => Number.parseInt(item, 10))
  const date = new Date(day)
  date.setHours(Number.isNaN(hours) ? 9 : hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16)
}

export function formatDateTimeLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
