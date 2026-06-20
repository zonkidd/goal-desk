import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CheckCircle2, Circle, Clock3, ShieldAlert, X } from 'lucide-react'
import { useToggleSystemReminder } from '../../store/appStore'
import { useEventkitStore } from '../../store/eventkitStore'
import { useUiStore } from '../../store/uiStore'

const accessLabel = {
  granted: 'Granted',
  denied: 'Denied',
  restricted: 'Restricted',
  not_determined: 'Not Asked',
  error: 'Unavailable',
} as const

export function ReminderDrawer() {
  const isOpen = useUiStore((state) => state.isReminderDrawerOpen)
  const closeReminderDrawer = useUiStore((state) => state.closeReminderDrawer)
  const selectedReminderId = useUiStore((state) => state.selectedReminderId)
  const reminders = useEventkitStore((state) => state.systemReminders)
  const integrationStatus = useEventkitStore((state) => state.integrationStatus)
  const toggleSystemReminderDone = useToggleSystemReminder()

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          className="glass-panel fixed bottom-4 right-[620px] top-20 z-40 w-[360px] rounded-3xl border border-white bg-white/90 p-6 shadow-xl"
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 28 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700">
              <Bell className="h-4 w-4 text-indigo-500" />
              <h3 className="font-bold">Apple Reminders</h3>
            </div>
            <button onClick={closeReminderDrawer} className="rounded-full border border-slate-200 bg-slate-100 p-1.5 text-slate-500">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-3">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Calendar</div>
              <div className="text-sm font-semibold text-slate-700">{accessLabel[integrationStatus.calendar]}</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-3">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Reminders</div>
              <div className="text-sm font-semibold text-slate-700">{accessLabel[integrationStatus.reminders]}</div>
            </div>
          </div>

          {integrationStatus.reminders !== 'granted' && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-700">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>提醒事项权限未就绪。首次打开会触发系统授权；若已拒绝，需要到系统设置里重新开启。</p>
            </div>
          )}

          <div className="space-y-3">
            {reminders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-4 text-sm text-slate-500">
                当前 7 天内没有可展示的系统提醒。
              </div>
            ) : (
              reminders.map((reminder) => {
                const isSelected = selectedReminderId === reminder.id
                const dueLabel = reminder.dueAt
                  ? reminder.dueAt.toLocaleString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })
                  : 'No due date'

                return (
                  <div
                    key={reminder.id}
                    className={`rounded-2xl border p-4 transition-colors ${
                      isSelected ? 'border-indigo-200 bg-indigo-50/70' : 'border-slate-200/80 bg-white/75'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                          {reminder.listTitle || 'Apple Reminders'}
                        </div>
                        <div className={`text-sm font-semibold ${reminder.done ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                          {reminder.title}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock3 className="h-3.5 w-3.5" />
                          {dueLabel}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void toggleSystemReminderDone(reminder.id, !reminder.done)}
                        className={`inline-flex h-9 items-center gap-1 rounded-full px-3 text-xs font-bold ${
                          reminder.done
                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        {reminder.done ? <Circle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        {reminder.done ? 'Reopen' : 'Complete'}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
