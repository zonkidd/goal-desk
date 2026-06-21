import { Calendar, CheckSquare, Link } from 'lucide-react'
import { useEventkitStore } from '../../store/eventkitStore'

export function EventKitStatusCard() {
  const eventkitPermissions = useEventkitStore((state) => state.eventkitPermissions)
  const calendarEventCount = useEventkitStore((state) => state.rawEventKit.calendarEvents.length)
  const reminderCount = useEventkitStore((state) => state.rawEventKit.reminders.length)
  const requestCalendarAccess = useEventkitStore((state) => state.requestCalendarAccess)
  const requestRemindersAccess = useEventkitStore((state) => state.requestRemindersAccess)

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white/50 p-4 shadow-sm backdrop-blur-md">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
        <Link className="h-4 w-4" />
        System Integration
      </div>

      <div className="mb-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 font-semibold text-slate-700">
          <Calendar className="h-4 w-4 text-purple-500" />
          <span>日历</span>
        </div>
        {eventkitPermissions.calendar === 'granted' ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-green-600">✓ 已授权</span>
            <span className="text-xs text-slate-400">{calendarEventCount} 个</span>
          </div>
        ) : eventkitPermissions.calendar === 'denied' ? (
          <span className="text-xs font-bold text-red-600">✗ 已拒绝</span>
        ) : eventkitPermissions.calendar === 'restricted' ? (
          <span className="text-xs font-bold text-amber-600">🔒 限制</span>
        ) : eventkitPermissions.calendar === 'error' ? (
          <span className="text-xs font-bold text-red-600">⚠️ 错误</span>
        ) : (
          <button
            onClick={requestCalendarAccess}
            className="rounded-lg bg-purple-50 px-3 py-1 text-xs font-bold text-purple-600 transition-colors hover:bg-purple-100"
          >
            授权
          </button>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 font-semibold text-slate-700">
          <CheckSquare className="h-4 w-4 text-orange-500" />
          <span>提醒</span>
        </div>
        {eventkitPermissions.reminders === 'granted' ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-green-600">✓ 已授权</span>
            <span className="text-xs text-slate-400">{reminderCount} 个</span>
          </div>
        ) : eventkitPermissions.reminders === 'denied' ? (
          <span className="text-xs font-bold text-red-600">✗ 已拒绝</span>
        ) : eventkitPermissions.reminders === 'restricted' ? (
          <span className="text-xs font-bold text-amber-600">🔒 限制</span>
        ) : eventkitPermissions.reminders === 'error' ? (
          <span className="text-xs font-bold text-red-600">⚠️ 错误</span>
        ) : (
          <button
            onClick={requestRemindersAccess}
            className="rounded-lg bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600 transition-colors hover:bg-orange-100"
          >
            授权
          </button>
        )}
      </div>
    </div>
  )
}
