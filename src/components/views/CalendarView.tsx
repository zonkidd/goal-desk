import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar, List } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { zhCN } from 'date-fns/locale'
import { GlassCard } from '../common/GlassCard'
import { GlassPanel } from '../common/GlassPanel'
import { useAppStore, selectFilteredTimeline } from '../../store/appStore'
import type { TimelineItem } from '../../types/app'
import { TimelineBuilder } from '../../lib/TimelineBuilder'
import { formatDateKey } from '../../lib/calendarUtils'

type ViewMode = 'week' | 'day'

interface WeekDay {
  date: Date
  dayName: string
  dayNumber: number
  isToday: boolean
  events: TimelineItem[]
}

// 获取周视图数据
function getWeekDays(startDate: Date): WeekDay[] {
  const days: WeekDay[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)

    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

    days.push({
      date,
      dayName: dayNames[date.getDay()],
      dayNumber: date.getDate(),
      isToday: date.getTime() === today.getTime(),
      events: [] // 实际应用中从 store 获取
    })
  }

  return days
}

// 事件来源视觉配置
function getEventStyles(source: 'todo' | 'reminder' | 'calendar') {
  const styles = {
    todo: {
      border: 'border-l-indigo-500',
      bg: 'bg-indigo-50',
      text: 'text-indigo-900',
      label: 'text-indigo-600',
      hover: 'hover:bg-indigo-100',
    },
    reminder: {
      border: 'border-l-orange-500',
      bg: 'bg-orange-50',
      text: 'text-orange-900',
      label: 'text-orange-600',
      hover: 'hover:bg-orange-100',
    },
    calendar: {
      border: 'border-l-purple-500',
      bg: 'bg-purple-50',
      text: 'text-purple-900',
      label: 'text-purple-600',
      hover: 'hover:bg-purple-100',
    },
  }
  return styles[source]
}

export function CalendarView() {
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const day = today.getDay()
    const diff = day === 0 ? -6 : 1 - day // 周一作为起始
    const monday = new Date(today)
    monday.setDate(today.getDate() + diff)
    return monday
  })
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [hideCompleted, setHideCompleted] = useState(false)

  const baseTimeline = useAppStore((state) => state.baseTimeline)
  const openTaskDrawer = useAppStore((state) => state.openTaskDrawer)
  const openReminderDrawer = useAppStore((state) => state.openReminderDrawer)
  const openCalendarEventDrawer = useAppStore((state) => state.openCalendarEventDrawer)

  const weekDays = getWeekDays(weekStart)

  const handlePrevWeek = () => {
    const newStart = new Date(weekStart)
    newStart.setDate(weekStart.getDate() - 7)
    setWeekStart(newStart)
  }

  const handleNextWeek = () => {
    const newStart = new Date(weekStart)
    newStart.setDate(weekStart.getDate() + 7)
    setWeekStart(newStart)
  }

  const handleEventClick = (event: TimelineItem) => {
    if (event.source === 'todo') {
      openTaskDrawer(event.id)
    } else if (event.source === 'reminder') {
      openReminderDrawer(event.id)
    } else if (event.source === 'calendar') {
      openCalendarEventDrawer?.(event.id)
    }
  }

  return (
    <section id="calendar" className="screen active">
      <div className="mb-8 flex items-end justify-between animate-spring">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">日历看板</h1>
          <p className="mt-2 font-medium text-slate-500">在周视图或日视图中查看所有日程安排。</p>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="mb-6 flex items-center gap-4">
        <GlassPanel className="inline-flex rounded-2xl p-1">
          <button
            onClick={() => setViewMode('week')}
            className={`flex items-center gap-2 rounded-xl px-6 py-2 text-sm font-bold transition-all ${
              viewMode === 'week'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="h-4 w-4" />
            周视图
          </button>
          <button
            onClick={() => setViewMode('day')}
            className={`flex items-center gap-2 rounded-xl px-6 py-2 text-sm font-bold transition-all ${
              viewMode === 'day'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="h-4 w-4" />
            日视图
          </button>
        </GlassPanel>

        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={hideCompleted}
            onChange={(e) => setHideCompleted(e.target.checked)}
            className="rounded"
          />
          隐藏已完成
        </label>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'week' ? (
          <motion.div
            key="week"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <WeekView
              weekDays={weekDays}
              onPrevWeek={handlePrevWeek}
              onNextWeek={handleNextWeek}
              hideCompleted={hideCompleted}
              onEventClick={handleEventClick}
            />
          </motion.div>
        ) : (
          <motion.div
            key="day"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <DayView
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              hideCompleted={hideCompleted}
              onEventClick={handleEventClick}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

// Week View Component
function WeekView({
  weekDays,
  onPrevWeek,
  onNextWeek,
  hideCompleted,
  onEventClick,
}: {
  weekDays: WeekDay[]
  onPrevWeek: () => void
  onNextWeek: () => void
  hideCompleted: boolean
  onEventClick: (event: TimelineItem) => void
}) {
  const weekRange = `${weekDays[0].date.getFullYear()}年${weekDays[0].date.getMonth() + 1}月${weekDays[0].dayNumber}日 - ${weekDays[6].date.getMonth() + 1}月${weekDays[6].dayNumber}日`

  // 从 store 获取 baseTimeline (CalendarView 有自己的 hideCompleted 过滤逻辑)
  const baseTimeline = useAppStore((state) => state.baseTimeline)

  // 按日期分组
  const timelineByDate = TimelineBuilder.groupByDate(baseTimeline)

  return (
    <GlassPanel className="rounded-3xl p-6">
      {/* Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPrevWeek}
          className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
        >
          <ChevronLeft className="h-4 w-4" />
          上一周
        </motion.button>

        <h2 className="text-lg font-bold text-slate-900">{weekRange}</h2>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onNextWeek}
          className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
        >
          下一周
          <ChevronRight className="h-4 w-4" />
        </motion.button>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-0 overflow-hidden rounded-2xl border border-slate-200/50">
        {/* Day Headers */}
        {weekDays.map((day, index) => (
          <div
            key={index}
            className={`border-b border-r border-slate-200/50 bg-gradient-to-b px-3 py-3 text-center ${
              day.isToday
                ? 'from-indigo-50 to-indigo-100'
                : 'from-slate-50/50 to-white'
            } ${index === 6 ? 'border-r-0' : ''}`}
          >
            <div className="text-xs font-black uppercase text-slate-400">
              {day.dayName}
            </div>
            <motion.div
              className={`mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-2xl font-bold ${
                day.isToday
                  ? 'bg-indigo-500 text-white'
                  : 'text-slate-900'
              }`}
              animate={day.isToday ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5 }}
            >
              {day.dayNumber}
            </motion.div>
          </div>
        ))}

        {/* Day Columns */}
        {weekDays.map((day, index) => (
          <WeekDayColumn
            key={index}
            day={day}
            events={Array.from(timelineByDate.get(formatDateKey(day.date)) || [])}
            isLast={index === 6}
            hideCompleted={hideCompleted}
            onEventClick={onEventClick}
          />
        ))}
      </div>
    </GlassPanel>
  )
}

// Week Day Column Component
function WeekDayColumn({
  day,
  events,
  isLast,
  hideCompleted,
  onEventClick,
}: {
  day: WeekDay
  events: TimelineItem[]
  isLast: boolean
  hideCompleted: boolean
  onEventClick: (event: TimelineItem) => void
}) {
  const filteredEvents = hideCompleted ? events.filter(e => !e.done) : events

  return (
    <div
      className={`min-h-[500px] bg-white p-2 ${
        !isLast ? 'border-r border-slate-200/50' : ''
      }`}
    >
      <div className="space-y-2">
        <AnimatePresence>
          {filteredEvents.map((event, idx) => (
            <WeekEventCard
              key={event.id}
              event={event}
              index={idx}
              onClick={() => onEventClick(event)}
            />
          ))}
        </AnimatePresence>

        {filteredEvents.length === 0 && (
          <div className="pt-8 text-center text-xs text-slate-400">
            无日程
          </div>
        )}
      </div>
    </div>
  )
}

// Week Event Card Component
function WeekEventCard({
  event,
  index,
  onClick,
}: {
  event: TimelineItem
  index: number
  onClick: () => void
}) {
  const styles = getEventStyles(event.source)

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ x: 4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full rounded-lg border-l-2 ${styles.border} ${styles.bg} ${styles.hover} p-2 text-left transition-all`}
    >
      <div className={`text-[11px] font-bold leading-tight ${styles.text}`}>
        {event.timeLabel} {event.title}
      </div>
      <div className={`mt-0.5 text-[9px] font-semibold ${styles.label}`}>
        {event.sourceLabel}
      </div>
    </motion.button>
  )
}

// Day View Component
function DayView({
  selectedDate,
  onDateSelect,
  hideCompleted,
  onEventClick,
}: {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  hideCompleted: boolean
  onEventClick: (event: TimelineItem) => void
}) {
  const baseTimeline = useAppStore((state) => state.baseTimeline)
  const timelineByDate = TimelineBuilder.groupByDate(baseTimeline)

  // 获取选中日期的事件
  const selectedDateKey = formatDateKey(selectedDate)
  const dayEvents = timelineByDate.get(selectedDateKey) || []
  const filteredEvents = hideCompleted ? dayEvents.filter(e => !e.done) : dayEvents

  // 格式化选中日期为中文
  const formatDateChinese = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return `${year}年${month}月${day}日 ${dayNames[date.getDay()]}`
  }

  // 有事件的日期集合（用于月历标记）
  const datesWithEvents = new Set<string>()
  for (const [dateKey] of timelineByDate) {
    datesWithEvents.add(dateKey)
  }

  return (
    <div className="grid grid-cols-[360px_1fr] gap-8">
      {/* 左侧月历选择器 */}
      <GlassPanel className="rounded-3xl p-6">
        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={(day) => {
            if (day) onDateSelect(day)
          }}
          locale={zhCN}
          showOutsideDays
          classNames={{
            months: 'space-y-3',
            month: 'space-y-3',
            month_caption: 'flex items-center justify-center px-2 pb-1 text-sm font-black text-slate-800',
            caption_label: 'text-sm font-black',
            nav: 'absolute left-4 right-4 top-4 flex items-center justify-between',
            button_previous: 'flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-slate-700',
            button_next: 'flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-slate-700',
            weekdays: 'grid grid-cols-7 border-b border-slate-200 pb-2 text-center text-[11px] font-bold text-slate-400',
            weekday: 'text-center',
            week: 'grid grid-cols-7 gap-1',
            day: 'flex h-8 w-8 items-center justify-center rounded-xl text-sm font-semibold text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-600',
            selected: 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-600 hover:text-white',
            today: 'text-indigo-600 font-bold',
            outside: 'text-slate-300',
            disabled: 'text-slate-200',
          }}
          modifiers={{
            hasEvents: (date) => datesWithEvents.has(formatDateKey(date)),
          }}
          modifiersClassNames={{
            hasEvents: 'relative after:absolute after:bottom-0.5 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-indigo-500',
          }}
        />
      </GlassPanel>

      {/* 右侧当日事件列表 */}
      <GlassPanel className="rounded-3xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">
            {formatDateChinese(selectedDate)}
          </h3>
          <span className="text-sm font-semibold text-slate-500">
            {filteredEvents.length} 个日程
          </span>
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event, idx) => (
                <DayEventCard
                  key={event.id}
                  event={event}
                  index={idx}
                  onClick={() => onEventClick(event)}
                />
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 text-center text-sm text-slate-400"
              >
                暂无日程
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </GlassPanel>
    </div>
  )
}

// Day Event Card Component
function DayEventCard({
  event,
  index,
  onClick,
}: {
  event: TimelineItem
  index: number
  onClick: () => void
}) {
  const styles = getEventStyles(event.source)

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ x: 4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full rounded-xl border-l-4 ${styles.border} ${styles.bg} ${styles.hover} p-4 text-left transition-all`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className={`text-sm font-bold ${styles.text}`}>
            {event.title}
          </div>
          <div className={`mt-1 text-xs font-semibold ${styles.label}`}>
            {event.timeLabel} · {event.sourceLabel}
          </div>
        </div>
        <div className={`ml-3 shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold uppercase ${styles.label} bg-white/50`}>
          {event.source === 'calendar' ? '日历' : event.source === 'reminder' ? '提醒' : '待办'}
        </div>
      </div>
    </motion.button>
  )
}
