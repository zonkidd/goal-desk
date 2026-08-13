import { AnimatePresence, motion } from 'framer-motion'
import { CheckSquare, X, Tag, ExternalLink, Clock3, ShieldAlert } from 'lucide-react'
import { useEventkitStore } from '../../store/eventkitStore'
import { useUiStore } from '../../store/uiStore'
import { getEventKitAdapter } from '../../lib/workspaceMutations'
import { getSystemReminderCapabilities } from '../../lib/reminderCapabilityPolicy'
import { DrawerSection, DrawerStack, drawerBackdropClassName, drawerBackdropMotion, drawerPaperVariants } from './drawerMotion'

const accessLabel = {
  granted: 'Granted',
  denied: 'Denied',
  restricted: 'Restricted',
  not_determined: 'Not Asked',
  error: 'Unavailable',
} as const

export function SystemReminderDrawer() {
  const systemReminders = useEventkitStore((state) => state.systemReminders)
  const eventkitPermissions = useEventkitStore((state) => state.eventkitPermissions)
  const isOpen = useUiStore((state) => state.activeDrawer?.type === 'reminder')
  const reminderId = useUiStore((state) => state.activeDrawer?.type === 'reminder' ? state.activeDrawer.id : undefined)
  const onClose = useUiStore((state) => state.closeDrawer)

  const reminder = systemReminders.find((r) => r.id === reminderId)
  const capabilities = getSystemReminderCapabilities({
    calendar: eventkitPermissions.calendar,
    reminders: eventkitPermissions.reminders,
  })

  if (!reminder) return null

  const dueLabel = reminder.dueAt
    ? reminder.dueAt.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : 'No due date'

  const handleOpenReminder = async () => {
    if (!reminderId || !capabilities.canOpenExternal) return
    try {
      await getEventKitAdapter().openSystemReminder(reminderId)
    } catch (error) {
      console.error('Failed to open system reminder:', error)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close drawer backdrop"
            className={drawerBackdropClassName}
            {...drawerBackdropMotion}
            onClick={onClose}
          />
          <motion.aside
            className="glass-panel fixed bottom-4 right-4 top-4 z-50 flex w-[600px] origin-center flex-col rounded-3xl border border-white bg-white/95 shadow-2xl outline-none"
            variants={drawerPaperVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            <header className="flex shrink-0 items-center justify-between rounded-t-3xl border-b border-slate-100 bg-slate-50/50 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100">
                  <CheckSquare className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-orange-600">
                    SYSTEM REMINDER
                  </p>
                  <p className="text-xs text-slate-500">只读 - 在系统提醒事项中编辑</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:border-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {/* Content */}
            <DrawerStack className="flex-1 overflow-y-auto">
              <DrawerSection className="p-8">
                <div className="mb-6 rounded-2xl border border-orange-100 bg-orange-50/60 p-5">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-orange-600">
                    Reminder
                  </div>
                  <h2 className={`text-xl font-bold ${reminder.done ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                    {reminder.title}
                  </h2>
                  <p className="mt-3 text-sm font-medium text-orange-800">
                    {capabilities.readOnlyReason}
                  </p>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Calendar
                    </p>
                    <p className="text-sm font-semibold text-slate-700">
                      {accessLabel[eventkitPermissions.calendar]}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Reminders
                    </p>
                    <p className="text-sm font-semibold text-slate-700">
                      {accessLabel[eventkitPermissions.reminders]}
                    </p>
                  </div>
                </div>

                {eventkitPermissions.reminders !== 'granted' && (
                  <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-700">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>提醒事项权限未就绪。首次打开会触发系统授权；若已拒绝，需要到系统设置里重新开启。</p>
                  </div>
                )}

                <div className="glass-card mb-6 flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                  <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                  <div className="flex-1">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      状态
                    </p>
                    <p className="text-sm font-semibold text-slate-700">
                      {reminder.done ? '已完成' : '未完成'}
                    </p>
                  </div>
                </div>

                <div className="glass-card mb-6 flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                  <div className="flex-1">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      截止时间
                    </p>
                    <p className="text-sm font-semibold text-slate-700">
                      {dueLabel}
                    </p>
                  </div>
                </div>

                {/* 提醒列表（只读） */}
                <div className="glass-card flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                  <Tag className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                  <div className="flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                      提醒列表
                    </p>
                    <p className="text-sm font-semibold text-slate-700">
                      {reminder.listTitle || '默认列表'}
                    </p>
                  </div>
                </div>

                {/* Info Box */}
                <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-4">
                  <div className="flex items-start gap-2">
                    <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                    <p className="text-xs text-orange-800">
                      此提醒来自系统提醒事项。请在系统提醒事项 App 中编辑标题、时间和清单。
                    </p>
                  </div>
                </div>
              </DrawerSection>

              <DrawerSection className="border-t border-slate-100 bg-slate-50/80 p-8">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleOpenReminder}
                    disabled={!capabilities.canOpenExternal}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 hover:border-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                  >
                    <ExternalLink className="h-4 w-4" />
                    在提醒事项 App 中打开
                  </button>
                </div>
                <p className="mt-3 text-center text-xs text-slate-500">
                  {capabilities.unavailableReason || '将跳转到系统提醒事项应用查看完整详情'}
                </p>
              </DrawerSection>
            </DrawerStack>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
