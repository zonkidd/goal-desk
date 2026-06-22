import { motion } from 'framer-motion'
import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { zhCN } from 'date-fns/locale'
import { isSameDay, getRelativeDay, parseDatetimeLocal, toTimeInputValue, toDatetimeLocalValue } from '../../lib/dateUtils'

const quickTimes = ['09:00', '10:30', '12:30', '14:00', '15:30', '18:00', '20:00', '22:00']

export function DateTimePickerPopover({
  value,
  defaultTime,
  onChange,
  onClose,
  onApply,
}: {
  value: string
  defaultTime: string
  onChange: (value: string) => void
  onClose: () => void
  onApply?: (value: string) => void
}) {
  const parsed = parseDatetimeLocal(value)
  const current = parsed || new Date()
  const [selectedDay, setSelectedDay] = useState<Date>(current)
  const [currentMonth, setCurrentMonth] = useState<Date>(current)
  const [timeValue, setTimeValue] = useState(parsed ? toTimeInputValue(parsed) : defaultTime)
  const today = getRelativeDay(0)
  const tomorrow = getRelativeDay(1)

  const selectDay = (day: Date) => {
    setSelectedDay(day)
    setCurrentMonth(day)
  }

  const apply = () => {
    onChange(toDatetimeLocalValue(selectedDay, timeValue))
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close date picker"
        onPointerDown={onClose}
        className="fixed inset-0 z-[70] cursor-default bg-transparent"
      />
      <motion.div
        data-date-picker-panel
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        className="absolute left-0 top-full z-[80] mt-3 w-[330px] rounded-3xl border border-white/80 bg-white/90 p-4 shadow-2xl shadow-slate-900/10 backdrop-blur-md"
      >
        <div className="relative z-10 mb-3 grid grid-cols-2 gap-2">
          <DateShortcutButton label="今天" day={today} selectedDay={selectedDay} onSelect={selectDay} />
          <DateShortcutButton label="明天" day={tomorrow} selectedDay={selectedDay} onSelect={selectDay} />
        </div>

        <DayPicker
          mode="single"
          selected={selectedDay}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          onSelect={(day) => {
            if (!day) return
            selectDay(day)
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
            today: 'text-indigo-600',
            outside: 'text-slate-300',
            disabled: 'text-slate-200',
          }}
        />

        <div className="mt-3 border-t border-white/70 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">时间</span>
            <input
              type="time"
              value={timeValue}
              onChange={(event) => setTimeValue(event.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white/80 px-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {quickTimes.map((time) => {
              const isActive = time === timeValue
              return (
                <button
                  key={time}
                  type="button"
                  onClick={() => setTimeValue(time)}
                  className={`rounded-xl px-2 py-2 text-xs font-bold transition-colors ${
                    isActive ? 'bg-slate-900 text-white' : 'bg-white/70 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                >
                  {time}
                </button>
              )
            })}
          </div>
          <div className="mt-4 flex justify-between">
            <button
              type="button"
              onClick={() => {
                onClose()
                onChange('')
              }}
              className="rounded-xl px-3 py-2 text-xs font-bold text-slate-400 transition-colors hover:bg-white/80 hover:text-slate-600"
            >
              清除
            </button>
            <button
              type="button"
              onClick={() => {
                const appliedValue = toDatetimeLocalValue(selectedDay, timeValue)
                if (onApply) {
                  onApply(appliedValue)
                } else {
                  onClose()
                  onChange(appliedValue)
                }
              }}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-500/30 transition-colors hover:bg-indigo-700"
            >
              完成
            </button>
          </div>
        </div>
      </motion.div>
    </>
  )
}

function DateShortcutButton({
  label,
  day,
  selectedDay,
  onSelect,
}: {
  label: string
  day: Date
  selectedDay: Date
  onSelect: (day: Date) => void
}) {
  const isActive = isSameDay(selectedDay, day)

  return (
    <button
      type="button"
      onPointerDown={(event) => {
        event.stopPropagation()
        onSelect(day)
      }}
      className={`rounded-2xl px-3 py-2 text-xs font-bold transition-colors ${
        isActive ? 'bg-slate-900 text-white' : 'bg-white/70 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
      }`}
    >
      {label}
    </button>
  )
}
