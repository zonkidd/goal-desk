import { AnimatePresence, motion } from 'framer-motion'
import { AlignLeft, Bell, BookOpen, Calendar, CheckCircle, Clock, Folder, Send, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { isTauriRuntime } from '../../lib/runtime'
import { openTaskInBear } from '../../lib/tauriCommands'
import { useTodoEditingSession } from '../../lib/todoEditing'
import { formatDateTimeLabel } from '../../lib/dateUtils'
import { ActivityLogTimeline } from './ActivityLogTimeline'
import { MarkdownContent } from './MarkdownContent'
import { StatusMachineButtons } from './StatusMachineButtons'
import { DateTimePickerPopover } from './DateTimePickerPopover'
import { GoalPickerPopover } from './GoalPickerPopover'
import { useSelectedTask } from '../../store/appStore'
import { selectFilteredGoals } from '../../store/appStore.selectors'
import { useEventkitStore } from '../../store/eventkitStore'
import { useGoalStore } from '../../store/goalStore'
import { useTaskStore } from '../../store/taskStore'
import { useAreaStore } from '../../store/areaStore'
import { useUiStore } from '../../store/uiStore'
import type { TaskStatus } from '../../types/task'
import type { GoalCard } from '../../types/app'

function useTaskDrawerData() {
  const task = useSelectedTask()
  const isOpen = useUiStore((s) => s.activeDrawer?.type === 'task')
  const closeDrawer = useUiStore((s) => s.closeDrawer)
  const activeArea = useUiStore((s) => s.activeArea)
  const updateTaskStatus = useTaskStore((s) => s.updateTaskStatus)
  const updateTaskContent = useTaskStore((s) => s.updateTaskContent)
  const rawUpdateTaskFields = useTaskStore((s) => s.updateTaskFields)
  const addTaskNote = useTaskStore((s) => s.addTaskNote)
  const createAndLinkReminder = useTaskStore((s) => s.createAndLinkReminder)
  const unlinkTaskFromReminder = useTaskStore((s) => s.unlinkTaskFromReminder)
  const createGoal = useGoalStore((s) => s.createGoal)
  const goals = useGoalStore(selectFilteredGoals as (state: any) => GoalCard[])
  const allAreas = useAreaStore((s) => s.allAreas)
  const createArea = useAreaStore((s) => s.createArea)
  const systemReminders = useEventkitStore((s) => s.systemReminders)

  const updateTaskFields = useMemo(
    () => (taskId: string, input: Parameters<typeof rawUpdateTaskFields>[1]) =>
      rawUpdateTaskFields(taskId, input, goals),
    [rawUpdateTaskFields, goals],
  )

  return {
    task, isOpen, closeDrawer, activeArea,
    updateTaskStatus, updateTaskContent, updateTaskFields, addTaskNote,
    createAndLinkReminder, unlinkTaskFromReminder,
    createGoal, goals, allAreas, createArea, systemReminders,
  }
}

const drawerTransition = { type: 'spring', stiffness: 240, damping: 28 } as const

export function TaskDrawer() {
  const {
    task, isOpen, closeDrawer, activeArea,
    updateTaskStatus, updateTaskContent, updateTaskFields, addTaskNote,
    createAndLinkReminder, unlinkTaskFromReminder,
    createGoal, goals, allAreas, createArea, systemReminders,
  } = useTaskDrawerData()
  const [pendingStatus, setPendingStatus] = useState<TaskStatus | null>(null)
  const [statusNote, setStatusNote] = useState('')
  const [logNote, setLogNote] = useState('')

  const promptText = useMemo(() => {
    if (pendingStatus === 'PAUSED') return '记录一下暂停原因'
    if (pendingStatus === 'DONE') return '记录一下完成总结'
    if (task?.status === 'TODO') return '记录一下开始说明'
    return '记录一下恢复说明'
  }, [pendingStatus, task?.status])
  const editingSession = useTodoEditingSession({
    task,
    goals,
    activeArea,
    allAreas,
    createArea,
    updateTaskFields,
    updateTaskContent,
    updateTaskStatus,
    createGoal,
  })

  const draft = editingSession?.draft

  const canChangeStatus = editingSession?.capabilities.canChangeStatus ?? false
  const statusActions = editingSession?.capabilities.statusActions ?? []

  const linkedReminder = task?.systemReminderId
    ? systemReminders.find((r) => r.id === task.systemReminderId)
    : undefined

  const formatReminderDate = (date?: Date) => {
    if (!date) return ''
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  return (
    <AnimatePresence>
      {isOpen && task && draft && editingSession && (
        <>
          <motion.button
            type="button"
            aria-label="Close drawer backdrop"
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
          />
          <motion.aside
            className="glass-panel fixed bottom-4 right-4 top-4 z-50 flex w-[600px] flex-col rounded-3xl border border-white bg-white/95 shadow-2xl outline-none"
            initial={{ x: '120%' }}
            animate={{ x: 0 }}
            exit={{ x: '120%' }}
            transition={drawerTransition}
          >
            <header className="flex shrink-0 items-center justify-between rounded-t-3xl border-b border-slate-100 bg-slate-50/50 p-6">
              <StatusMachineButtons status={task.status} statusActions={statusActions} onAction={setPendingStatus} />
              <button
                onClick={closeDrawer}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:border-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {pendingStatus && canChangeStatus && (
              <div className="border-b border-slate-100 bg-white/80 px-6 py-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">{promptText}</p>
                <div className="flex items-center gap-3">
                  <input
                    autoFocus
                    value={statusNote}
                    onChange={(event) => setStatusNote(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void editingSession.actions.submitStatus(pendingStatus, statusNote)
                        setPendingStatus(null)
                        setStatusNote('')
                      }
                    }}
                    className="h-9 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
                    placeholder="写一句，后续回看会轻松很多... (按回车确认)"
                  />
                  <button
                    onClick={() => {
                      void editingSession.actions.submitStatus(pendingStatus, statusNote)
                      setPendingStatus(null)
                      setStatusNote('')
                    }}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
                  >
                    确认
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              <div className="p-8 pb-4">
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(event) => editingSession.actions.setTitle(event.target.value)}
                    onBlur={() => void editingSession.actions.saveFields()}
                    className="mb-4 w-full border-none bg-transparent p-0 text-2xl font-black text-slate-900 outline-none focus:ring-0"
                  />

                  <div className="space-y-3 text-sm font-medium">
                    <div className="flex flex-wrap gap-4">
                      <div className="relative">
                        <InlineTimeField
                          icon={<Clock className="h-3.5 w-3.5" />}
                          value={draft.plannedStartAtDraft}
                          isActive={draft.activeEditor === 'plannedStartAt'}
                          onToggle={() => editingSession.actions.setActiveEditor('plannedStartAt')}
                          placeholder="计划开始"
                        />
                        {draft.activeEditor === 'plannedStartAt' && (
                          <DateTimePickerPopover
                            value={draft.plannedStartAtDraft}
                            defaultTime="09:00"
                            onChange={(value) => editingSession.actions.setPlannedStartAtDraft(value)}
                            onClose={() => editingSession.actions.setActiveEditor('none')}
                          />
                        )}
                      </div>
                      <div className="relative">
                      <InlineTimeField
                        icon={<Calendar className="h-3.5 w-3.5" />}
                        value={draft.dueDateDraft}
                        isActive={draft.activeEditor === 'dueDate'}
                        onToggle={() => editingSession.actions.setActiveEditor('dueDate')}
                        placeholder="截止时间"
                      />
                      {draft.activeEditor === 'dueDate' && (
                        <DateTimePickerPopover
                          value={draft.dueDateDraft}
                          defaultTime="18:00"
                          onChange={(value) => editingSession.actions.setDueDateDraft(value)}
                          onClose={() => editingSession.actions.setActiveEditor('none')}
                        />
                      )}
                    </div>
                    <div className="relative">
                      <InlineGoalField
                        draft={draft}
                        goals={goals}
                        editingSession={editingSession}
                      />
                      {draft.activeEditor === 'linkedGoal' && (
                        <GoalPickerPopover
                          draft={draft}
                          goals={goals}
                          editingSession={editingSession}
                          createArea={createArea}
                          onClose={() => editingSession.actions.setActiveEditor('none')}
                        />
                      )}
                      </div>
                    </div>
                    <label
                      className={`inline-flex w-fit cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition-all ${
                        draft.showInTimelineDraft
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={draft.showInTimelineDraft}
                        onChange={(event) => editingSession.actions.setShowInTimelineDraft(event.target.checked)}
                        className="sr-only"
                      />
                      <span
                        className={`h-2 w-2 rounded-full transition-colors ${
                          draft.showInTimelineDraft ? 'bg-indigo-200' : 'bg-slate-300'
                        }`}
                      />
                      <span>在时间轴显示</span>
                    </label>
                  </div>
                  {task.bearNoteId && isTauriRuntime() && (
                    <button
                      type="button"
                      onClick={() => void openTaskInBear(task.id)}
                      className="mt-2 flex items-center gap-2 text-xs font-bold text-amber-600 transition-colors hover:text-amber-700"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Open in Bear
                    </button>
                  )}
                </div>

              <div className="mx-8 my-2 h-px bg-slate-100" />

              <div className="px-8 py-4">
                {!task.systemReminderId && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-indigo-600 transition-colors">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      onChange={() => {
                        if (task) {
                          void createAndLinkReminder(task.id, task.title, task.dueDate)
                        }
                      }}
                    />
                    <Bell className="h-4 w-4 text-slate-400" />
                    <span className="font-medium text-slate-700">关联系统提醒获得通知</span>
                  </label>
                )}
                {task.systemReminderId && linkedReminder && (
                  <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div className="text-xs">
                        <span className="font-bold text-green-800">已关联:</span>
                        <span className="text-slate-700"> {linkedReminder.title} · {formatReminderDate(linkedReminder.dueAt)}</span>
                      </div>
                    </div>
                    <button
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700 underline"
                      onClick={() => {
                        if (task) {
                          void unlinkTaskFromReminder(task.id)
                        }
                      }}
                    >
                      解除
                    </button>
                  </div>
                )}
              </div>

              <div className="mx-8 my-2 h-px bg-slate-100" />

              <div className="p-8 pt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                      <AlignLeft className="h-4 w-4" />
                      Notes (Markdown)
                    </h3>
                    <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-0.5">
                      {([
                        ['preview', '预览'],
                        ['edit', '编辑'],
                        ['split', '分屏'],
                      ] as const).map(([mode, label]) => {
                        const isActive = draft.markdownMode === mode
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => editingSession.actions.setMarkdownMode(mode)}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
                              isActive ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  {draft.markdownMode === 'preview' ? (
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm min-h-[280px]">
                      {draft.content.trim() ? (
                        <MarkdownContent content={draft.content} />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <AlignLeft className="mb-3 h-8 w-8 text-slate-300" />
                          <p className="text-sm font-medium text-slate-400">还没有笔记</p>
                          <p className="mt-1 text-xs text-slate-400">点击「编辑」开始记录想法、步骤或参考链接</p>
                          <button
                            type="button"
                            onClick={() => editingSession.actions.setMarkdownMode('edit')}
                            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
                          >
                            开始写笔记
                          </button>
                        </div>
                      )}
                    </div>
                  ) : draft.markdownMode === 'edit' ? (
                    <textarea
                      value={draft.content}
                      onChange={(event) => editingSession.actions.setContent(event.target.value)}
                      onBlur={() => void editingSession.actions.saveContentIfChanged()}
                      autoFocus
                      className="min-h-[280px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
                    />
                  ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                      <textarea
                        value={draft.content}
                        onChange={(event) => editingSession.actions.setContent(event.target.value)}
                        onBlur={() => void editingSession.actions.saveContentIfChanged()}
                        className="min-h-[280px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
                      />
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm min-h-[280px]">
                        <MarkdownContent content={draft.content} />
                      </div>
                    </div>
                  )}
                </div>

              <div className="min-h-[200px] border-t border-slate-100 bg-slate-50/80 p-8">
                <div>
                  <h3 className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                    ACTIVITY & UPDATES
                  </h3>
                  <ActivityLogTimeline logs={task.activityLogs} />

                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <div className="flex gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">Me</div>
                      <div className="relative flex-1">
                        <textarea
                          rows={2}
                          value={logNote}
                          onChange={(event) => setLogNote(event.target.value)}
                          className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          placeholder="添加进度记录..."
                        />
                        <button
                          onClick={() => {
                            if (!logNote.trim()) return
                            void addTaskNote(task.id, logNote)
                            setLogNote('')
                          }}
                          className="absolute bottom-2 right-2 text-slate-300 transition-colors hover:text-indigo-500"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
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

function InlineTimeField({
  icon,
  value,
  isActive,
  onToggle,
  placeholder,
}: {
  icon: React.ReactNode
  value: string
  isActive: boolean
  onToggle: () => void
  placeholder: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-2 transition-colors ${
        isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      <span>{icon}</span>
      <span>{value ? formatDateTimeLabel(value) : placeholder}</span>
    </button>
  )
}

function InlineGoalField({
  draft,
  editingSession,
}: {
  draft: { linkedGoalLabel?: string; activeEditor: string }
  goals: Array<{ id: string; title: string; area: string }>
  editingSession: {
    actions: {
      setActiveEditor: (value: 'none' | 'plannedStartAt' | 'dueDate' | 'linkedGoal') => void
    }
  }
}) {
  return (
    <button
      type="button"
      onClick={() => editingSession.actions.setActiveEditor(draft.activeEditor === 'linkedGoal' ? 'none' : 'linkedGoal')}
      className={`flex items-center gap-2 transition-colors ${
        draft.activeEditor === 'linkedGoal' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      <Folder className="h-4 w-4" />
      <span>{draft.linkedGoalLabel || '关联目标'}</span>
    </button>
  )
}
