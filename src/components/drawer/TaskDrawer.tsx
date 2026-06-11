import { AnimatePresence, motion } from 'framer-motion'
import { AlignLeft, Bell, BookOpen, Calendar, Folder, Plus, Send, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { isTauriRuntime, openTaskInBear } from '../../lib/desktopApi'
import { ActivityLogTimeline } from './ActivityLogTimeline'
import { MarkdownContent } from './MarkdownContent'
import { StatusMachineButtons } from './StatusMachineButtons'
import { useAppStore, useSelectedTask } from '../../store/appStore'
import type { TaskStatus } from '../../types/task'

const drawerTransition = { type: 'spring', stiffness: 240, damping: 28 } as const

export function TaskDrawer() {
  const task = useSelectedTask()
  const isOpen = useAppStore((state) => state.isTaskDrawerOpen)
  const closeTaskDrawer = useAppStore((state) => state.closeTaskDrawer)
  const updateTaskStatus = useAppStore((state) => state.updateTaskStatus)
  const updateTaskContent = useAppStore((state) => state.updateTaskContent)
  const updateTaskFields = useAppStore((state) => state.updateTaskFields)
  const addTaskNote = useAppStore((state) => state.addTaskNote)
  const createGoal = useAppStore((state) => state.createGoal)
  const activeArea = useAppStore((state) => state.activeArea)
  const goals = useAppStore((state) => state.goals)
  const [pendingStatus, setPendingStatus] = useState<TaskStatus | null>(null)
  const [statusNote, setStatusNote] = useState('')
  const [logNote, setLogNote] = useState('')
  const [contentDraft, setContentDraft] = useState('')
  const [titleDraft, setTitleDraft] = useState('')
  const [dueDateDraft, setDueDateDraft] = useState('')
  const [linkedGoalIdDraft, setLinkedGoalIdDraft] = useState('')
  const [isOngoingDraft, setIsOngoingDraft] = useState(false)
  const [isCreatingGoalInline, setIsCreatingGoalInline] = useState(false)
  const [newGoalTitle, setNewGoalTitle] = useState('')
  const [newGoalArea, setNewGoalArea] = useState('独立开发')

  useEffect(() => {
    if (task) {
      setContentDraft(task.content)
      setTitleDraft(task.title)
      setDueDateDraft(task.dueDate ? toDatetimeLocal(task.dueDate) : '')
      setLinkedGoalIdDraft(task.linkedGoalId || '')
      setIsOngoingDraft(Boolean(task.isOngoing))
      setNewGoalArea(activeArea === 'ALL' ? task.linkedGoalLabel || '独立开发' : activeArea)
      setIsCreatingGoalInline(false)
      setNewGoalTitle('')
    }
  }, [activeArea, task])

  const promptText = useMemo(() => {
    if (pendingStatus === 'PAUSED') return '记录一下暂停原因'
    if (pendingStatus === 'DONE') return '记录一下完成总结'
    return '记录一下恢复说明'
  }, [pendingStatus])

  function saveTaskFields(next?: { title?: string; dueDate?: string; linkedGoalId?: string; isOngoing?: boolean }) {
    if (!task) return

    const nextTitle = (next?.title ?? titleDraft).trim()
    const nextGoalId = next?.linkedGoalId ?? linkedGoalIdDraft
    const linkedGoal = goals.find((goal) => goal.id === nextGoalId)
    const nextDueDateValue = next?.dueDate ?? dueDateDraft
    const nextIsOngoing = next?.isOngoing ?? isOngoingDraft

    void updateTaskFields(task.id, {
      title: nextTitle,
      dueDate: nextDueDateValue ? new Date(nextDueDateValue) : undefined,
      linkedGoalId: linkedGoal?.id,
      linkedGoalLabel: linkedGoal?.title,
      isOngoing: nextIsOngoing,
    })
  }

  return (
    <AnimatePresence>
      {isOpen && task && (
        <>
          <motion.button
            type="button"
            aria-label="Close drawer backdrop"
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeTaskDrawer}
          />
          <motion.aside
            className="glass-panel fixed bottom-4 right-4 top-4 z-50 flex w-[600px] flex-col rounded-3xl border border-white bg-white/95 shadow-2xl outline-none"
            initial={{ x: '120%' }}
            animate={{ x: 0 }}
            exit={{ x: '120%' }}
            transition={drawerTransition}
          >
            <header className="flex shrink-0 items-center justify-between rounded-t-3xl border-b border-slate-100 bg-slate-50/50 p-6">
              <StatusMachineButtons status={task.status} onAction={setPendingStatus} />
              <button
                onClick={closeTaskDrawer}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {pendingStatus && (
              <div className="border-b border-slate-100 bg-white/80 px-6 py-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">{promptText}</p>
                <div className="flex items-center gap-3">
                  <input
                    autoFocus
                    value={statusNote}
                    onChange={(event) => setStatusNote(event.target.value)}
                    className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
                    placeholder="写一句，后续回看会轻松很多..."
                  />
                  <button
                    onClick={() => {
                      void updateTaskStatus(task.id, pendingStatus, statusNote)
                      setPendingStatus(null)
                      setStatusNote('')
                    }}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
                  >
                    确认
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              <div className="px-8 pb-4 pt-8">
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  onBlur={() => saveTaskFields()}
                  className="mb-4 w-full border-none bg-transparent p-0 text-2xl font-black text-slate-900 outline-none focus:ring-0"
                />

                <div className="flex flex-wrap gap-4 text-sm font-medium">
                  <label className="flex items-center gap-2 text-slate-500">
                    <Calendar className="h-4 w-4" />
                    <input
                      type="datetime-local"
                      value={dueDateDraft}
                      onChange={(event) => setDueDateDraft(event.target.value)}
                      onBlur={() => saveTaskFields()}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-500"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-slate-500">
                    <Folder className="h-4 w-4" />
                    <select
                      value={linkedGoalIdDraft}
                      onChange={(event) => {
                        const nextGoalId = event.target.value
                        setLinkedGoalIdDraft(nextGoalId)
                        saveTaskFields({ linkedGoalId: nextGoalId })
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-500"
                    >
                      <option value="">Unlinked task</option>
                      {goals.map((goal) => (
                        <option key={goal.id} value={goal.id}>
                          {goal.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
                    <input
                      type="checkbox"
                      checked={isOngoingDraft}
                      onChange={(event) => {
                        const nextValue = event.target.checked
                        setIsOngoingDraft(nextValue)
                        saveTaskFields({ isOngoing: nextValue })
                      }}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    持续推进
                  </label>
                  <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${task.systemReminderId ? 'border border-indigo-100 bg-indigo-50 text-indigo-700' : 'border border-slate-200 bg-white text-slate-500'}`}>
                    <Bell className="h-3.5 w-3.5" />
                    {task.systemReminderId ? 'Synced to Apple Reminders' : 'Local task only'}
                  </div>
                  {task.bearNoteId && isTauriRuntime() && (
                    <button
                      type="button"
                      onClick={() => void openTaskInBear(task.id)}
                      className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:border-amber-300 hover:text-amber-700"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Open in Bear
                    </button>
                  )}
                </div>
                <div className="mt-4">
                  {isCreatingGoalInline ? (
                    <div className="grid grid-cols-[1fr_160px_auto] gap-2">
                      <input
                        autoFocus
                        value={newGoalTitle}
                        onChange={(event) => setNewGoalTitle(event.target.value)}
                        placeholder="新目标标题"
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
                      />
                      <input
                        value={newGoalArea}
                        onChange={(event) => setNewGoalArea(event.target.value)}
                        placeholder="领域"
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          void createGoal({ title: newGoalTitle, area: newGoalArea }).then((goalId) => {
                            if (!goalId) return
                            setLinkedGoalIdDraft(goalId)
                            saveTaskFields({ linkedGoalId: goalId })
                            setNewGoalTitle('')
                            setIsCreatingGoalInline(false)
                          })
                        }}
                        className="rounded-xl bg-slate-900 px-4 text-sm font-bold text-white"
                      >
                        保存
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsCreatingGoalInline(true)}
                      className="flex items-center gap-2 text-xs font-bold text-indigo-600"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      快速创建目标并关联
                    </button>
                  )}
                </div>
              </div>

              <div className="mx-8 my-2 h-px bg-slate-100" />

              <div className="p-8 pt-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                    <AlignLeft className="h-4 w-4" />
                    Notes (Markdown)
                  </h3>
                </div>
                <MarkdownContent content={task.content} />
                <textarea
                  value={contentDraft}
                  onChange={(event) => setContentDraft(event.target.value)}
                  onBlur={() => {
                    if (contentDraft !== task.content) {
                      void updateTaskContent(task.id, contentDraft)
                    }
                  }}
                  className="mt-4 min-h-[140px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
                />
              </div>

              <div className="min-h-[200px] border-t border-slate-100 bg-slate-50/80 p-8">
                <h3 className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">Activity & Updates</h3>
                <ActivityLogTimeline logs={task.activityLogs} />

                <div className="mt-6 flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">Me</div>
                  <div className="relative flex-1">
                    <textarea
                      rows={1}
                      value={logNote}
                      onChange={(event) => setLogNote(event.target.value)}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="添加进度记录或暂停原因..."
                    />
                    <button
                      onClick={() => {
                        if (!logNote.trim()) return
                        void addTaskNote(task.id, logNote)
                        setLogNote('')
                      }}
                      className="absolute bottom-2 right-2 text-slate-300 transition-colors hover:text-indigo-500"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function toDatetimeLocal(date: Date) {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}
