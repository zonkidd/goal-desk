import { useEffect, useMemo, useState } from 'react'
import { formatDateKey } from '../lib/calendarUtils'
import { addDays, endOfDay } from '../lib/dateUtils'
import {
  mergeById,
  normalizeEventKitRangeData,
  type RawEventKitData,
} from '../lib/eventkitData'
import { getEventKitAdapter } from '../lib/workspaceMutations'
import { useEventkitStore } from '../store/eventkitStore'

const CALENDAR_BOARD_PRELOAD_DAYS = 7

export function useEventKitRange(rangeStart: Date, rangeEnd: Date): RawEventKitData {
  const rawCalendarEvents = useEventkitStore((state) => state.rawEventKit.calendarEvents)
  const rawReminders = useEventkitStore((state) => state.rawEventKit.reminders)
  const mergeEventkitRangeData = useEventkitStore((state) => state.mergeEventkitRangeData)
  const [rangeEventKit, setRangeEventKit] = useState<RawEventKitData | null>(null)

  const rangeStartKey = useMemo(() => formatDateKey(rangeStart), [rangeStart])
  const rangeEndKey = useMemo(() => formatDateKey(rangeEnd), [rangeEnd])

  useEffect(() => {
    let cancelled = false

    void getEventKitAdapter()
      .loadCalendarRange(rangeStartKey, rangeEndKey)
      .then((range) => {
        if (cancelled) return
        const rangeData = normalizeEventKitRangeData(range)
        setRangeEventKit(rangeData)
        mergeEventkitRangeData(rangeData)
      })
      .catch(() => {
        if (!cancelled) setRangeEventKit(null)
      })

    return () => {
      cancelled = true
    }
  }, [mergeEventkitRangeData, rangeStartKey, rangeEndKey])

  return useMemo(
    () => ({
      calendarEvents: mergeById(rawCalendarEvents, rangeEventKit?.calendarEvents ?? []),
      reminders: mergeById(rawReminders, rangeEventKit?.reminders ?? []),
    }),
    [rawCalendarEvents, rawReminders, rangeEventKit],
  )
}

export function useCalendarBoardEventKitRange(visibleStart: Date, visibleEnd: Date): RawEventKitData {
  const rangeStart = useMemo(() => addDays(visibleStart, -CALENDAR_BOARD_PRELOAD_DAYS), [visibleStart])
  const rangeEnd = useMemo(() => endOfDay(addDays(visibleEnd, CALENDAR_BOARD_PRELOAD_DAYS)), [visibleEnd])

  return useEventKitRange(rangeStart, rangeEnd)
}
