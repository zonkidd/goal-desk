import { AnimatePresence, motion } from 'framer-motion'
import { CheckSquare, X, Tag, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { useEventkitStore } from '../../store/eventkitStore'
import { useUiStore } from '../../store/uiStore'
import { getEventKitAdapter } from '../../lib/workspaceMutations'

const drawerTransition = { type: 'spring', stiffness: 240, damping: 28 } as const

export function SystemReminderDrawer() {
  const systemReminders = useEventkitStore((state) => state.systemReminders)
  const isOpen = useUiStore((state) => state.activeDrawer?.type === 'reminder')
  const reminderId = useUiStore((state) => state.activeDrawer?.type === 'reminder' ? state.activeDrawer.id : undefined)
  const onClose = useUiStore((state) => state.closeDrawer)

  const reminder = systemReminders.find((r) => r.id === reminderId)

  const [editedTitle, setEditedTitle] = useState(reminder?.title || '')
  const [editedDueAt, setEditedDueAt] = useState(reminder?.dueAt)
  const [isDone, setIsDone] = useState(reminder?.done || false)

  if (!reminder) return null

  const formatForInput = (date: Date) => {
    const offset = date.getTimezoneOffset()
    return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16)
  }

  const handleSave = async () => {
    // TODO: 调用 desktopApi 保存更新到系统提醒
    console.log('保存系统提醒:', {
      id: reminderId,
      title: editedTitle,
      dueAt: editedDueAt,
      done: isDone,
    })
  }

  const hasChanges =
    editedTitle !== reminder.title ||
    editedDueAt?.getTime() !== reminder.dueAt?.getTime() ||
    isDone !== reminder.done

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close drawer backdrop"
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="glass-panel fixed bottom-4 right-4 top-4 z-50 flex w-[600px] flex-col rounded-3xl border border-white bg-white/95 shadow-2xl outline-none"
            initial={{ x: '120%' }}
            animate={{ x: 0 }}
            exit={{ x: '120%' }}
            transition={drawerTransition}
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
                  <p className="text-xs text-slate-500">可编辑 - 与系统提醒同步</p>
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
            <div className="flex-1 overflow-y-auto">
              <div className="p-8">
                {/* 完成状态 */}
                <label className="glass-card mb-6 flex cursor-pointer items-center gap-3 rounded-xl border border-orange-100 bg-orange-50/50 p-4 transition-colors hover:bg-orange-50">
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={(e) => setIsDone(e.target.checked)}
                    className="h-4 w-4 rounded border-orange-300 text-orange-600 focus:ring-2 focus:ring-orange-500/20"
                  />
                  <span className="text-sm font-semibold text-slate-700">标记为已完成</span>
                </label>

                {/* 标题编辑 */}
                <div className="mb-6">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                    标题
                  </label>
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="glass-card w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20"
                    placeholder="提醒标题"
                  />
                </div>

                {/* 截止时间编辑 */}
                <div className="mb-6">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400">
                    截止时间
                  </label>
                  <input
                    type="datetime-local"
                    value={editedDueAt ? formatForInput(editedDueAt) : ''}
                    onChange={(e) => setEditedDueAt(e.target.value ? new Date(e.target.value) : undefined)}
                    className="glass-card w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20"
                  />
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
                      此提醒来自系统提醒事项。修改后将同步到系统提醒事项 App。
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Area */}
              <div className="border-t border-slate-100 bg-slate-50/80 p-8">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!hasChanges}
                    className={`flex-1 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg transition-colors ${
                      hasChanges
                        ? 'bg-orange-600 shadow-orange-500/30 hover:bg-orange-700'
                        : 'bg-slate-300 cursor-not-allowed'
                    }`}
                  >
                    保存
                  </button>
                  <button
                    type="button"
                     onClick={async () => {
                       if (!reminderId) return
                       try {
                         await getEventKitAdapter().openSystemReminder(reminderId)
                       } catch (error) {
                         console.error('Failed to open system reminder:', error)
                       }
                     }}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 hover:border-slate-400"
                  >
                    <ExternalLink className="h-4 w-4" />
                    在提醒事项 App 中打开
                  </button>
                </div>
                <p className="mt-3 text-center text-xs text-slate-500">
                  将跳转到系统提醒事项应用查看完整详情
                </p>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
