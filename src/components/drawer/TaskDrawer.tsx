import { AnimatePresence, motion } from 'framer-motion'
import { AlignLeft, BookOpen, Calendar, CheckCircle, Clock, ExternalLink, Folder, KeyRound, Link2, RefreshCw, Send, Trash2, Unlink, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { getRuntimeAdapter } from '../../lib/runtimeAdapter'
import { openTaskInBear } from '../../lib/tauriCommands'
import { getEventKitAdapter } from '../../lib/workspaceMutations'
import { useTodoEditingSession } from '../../lib/todoEditing'
import { formatDateTimeLabel } from '../../lib/dateUtils'
import { ActivityLogTimeline } from './ActivityLogTimeline'
import { DrawerSection, DrawerStack, drawerBackdropClassName, drawerBackdropMotion, drawerPaperVariants } from './drawerMotion'
import { MarkdownContent } from './MarkdownContent'
import { StatusMachineButtons } from './StatusMachineButtons'
import { DateTimePickerPopover } from './DateTimePickerPopover'
import { GoalPickerPopover } from './GoalPickerPopover'
import { useSelectedTask } from '../../store/appStore'
import { useDerivedGoals } from '../../hooks/useWorkspaceDerived'
import { useEventkitStore } from '../../store/eventkitStore'
import { useGoalStore } from '../../store/goalStore'
import { useTaskStore } from '../../store/taskStore'
import { useAreaStore } from '../../store/areaStore'
import { useBearNoteStore } from '../../store/bearNoteStore'
import { useUiStore } from '../../store/uiStore'
import { useBearNoteEvents } from '../../hooks/useBearNoteEvents'
import type { Task, TaskChecklistItem, TaskStatus } from '../../types/task'
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
  const unlinkTaskFromReminder = useTaskStore((s) => s.unlinkTaskFromReminder)
  const softDeleteTask = useTaskStore((s) => s.softDeleteTask)
  const createGoal = useGoalStore((s) => s.createGoal)
  const goals = useDerivedGoals()
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
    unlinkTaskFromReminder, softDeleteTask,
    createGoal, goals, allAreas, createArea, systemReminders,
  }
}

export function TaskDrawer() {
  useBearNoteEvents()
  const {
    task, isOpen, closeDrawer, activeArea,
    updateTaskStatus, updateTaskContent, updateTaskFields, addTaskNote,
    unlinkTaskFromReminder, softDeleteTask,
    createGoal, goals, allAreas, createArea, systemReminders,
  } = useTaskDrawerData()
  const [pendingStatus, setPendingStatus] = useState<TaskStatus | null>(null)
  const [statusNote, setStatusNote] = useState('')
  const [logNote, setLogNote] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false)
  const loadBearIntegrationStatus = useBearNoteStore((s) => s.loadIntegrationStatus)
  const loadBearPreview = useBearNoteStore((s) => s.loadPreview)

  useEffect(() => {
    setPendingStatus(null)
    setStatusNote('')
    setLogNote('')
    setDeleteConfirmOpen(false)
    setUnlinkConfirmOpen(false)
  }, [isOpen, task?.id])

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
  const canEditFields = editingSession?.capabilities.canEditFields ?? false
  const statusActions = editingSession?.capabilities.statusActions ?? []

  const linkedReminder = task?.systemReminderId
    ? systemReminders.find((r) => r.id === task.systemReminderId)
    : undefined

  const isTauriMain = getRuntimeAdapter().isTauri() && getRuntimeAdapter().getWindowLabel() === 'main'

  useEffect(() => {
    if (!isTauriMain) return
    void loadBearIntegrationStatus()
  }, [isTauriMain, loadBearIntegrationStatus])

  useEffect(() => {
    if (!isTauriMain || !task?.bearNoteId) return
    void loadBearPreview(task.id)
  }, [isTauriMain, loadBearPreview, task?.bearNoteId, task?.id])

  const handleOpenLinkedReminder = () => {
    if (!task?.systemReminderId) return
    void getEventKitAdapter().openSystemReminder(task.systemReminderId)
  }

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
    <>
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="删除待办"
        message={'确定要删除这个待办事项吗？\n\n删除后可以在回收站中找回。'}
        onConfirm={() => {
          if (task) {
            void softDeleteTask(task.id)
            setDeleteConfirmOpen(false)
            closeDrawer()
          }
        }}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
      <ConfirmDialog
        open={unlinkConfirmOpen}
        title="解除关联"
        message="确定要解除系统提醒关联吗？"
        onConfirm={() => {
          if (task) {
            void unlinkTaskFromReminder(task.id)
            setUnlinkConfirmOpen(false)
          }
        }}
        onCancel={() => setUnlinkConfirmOpen(false)}
      />
      <AnimatePresence>
      {isOpen && task && draft && editingSession && (
        <>
          <motion.button
            type="button"
            aria-label="Close drawer backdrop"
            className={drawerBackdropClassName}
            {...drawerBackdropMotion}
            onClick={closeDrawer}
          />
          <motion.aside
            data-testid="todo-drawer-paper"
            data-surface="opaque-paper"
            className="fixed bottom-4 right-4 top-4 z-50 flex w-[600px] origin-center flex-col rounded-3xl border border-theme-paper-line bg-theme-paper text-theme-primary shadow-[0_18px_48px_rgba(0,0,0,0.16)] outline-none"
            variants={drawerPaperVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <header className="flex shrink-0 items-center justify-between rounded-t-3xl border-b border-theme-paper-line bg-theme-paper-muted p-6">
              <StatusMachineButtons status={task.status} statusActions={statusActions} onAction={setPendingStatus} />
              <div className="flex items-center gap-2">
                {canEditFields && (
                  <button
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-theme-paper-line bg-theme-paper text-theme-secondary transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                    title="删除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={closeDrawer}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-theme-paper-line bg-theme-paper text-theme-secondary transition-colors hover:bg-theme-paper-muted hover:text-theme-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            {pendingStatus && canChangeStatus && (
              <div className="border-b border-theme-paper-line bg-theme-paper-muted px-6 py-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-theme-secondary">{promptText}</p>
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
                    className="h-9 flex-1 rounded-xl border border-theme-paper-line bg-theme-paper px-3 text-sm outline-none transition-all focus:border-theme-accent focus:ring-4 focus:ring-theme-accent/20"
                    placeholder="写一句，后续回看会轻松很多... (按回车确认)"
                  />
                  <button
                    onClick={() => {
                      void editingSession.actions.submitStatus(pendingStatus, statusNote)
                      setPendingStatus(null)
                      setStatusNote('')
                    }}
                    className="rounded-xl bg-theme-accent px-4 py-2 text-sm font-bold text-white hover:opacity-90 transition-colors"
                  >
                    确认
                  </button>
                </div>
              </div>
            )}

            <DrawerStack className="flex-1 overflow-y-auto">
              <DrawerSection className="p-8 pb-4">
                  {canEditFields ? (
                    <input
                      type="text"
                      value={draft.title}
                      onChange={(event) => editingSession.actions.setTitle(event.target.value)}
                      onBlur={() => void editingSession.actions.saveFields()}
                      className="mb-4 w-full border-none bg-transparent p-0 text-2xl font-black text-theme-primary outline-none focus:ring-0"
                    />
                  ) : (
                    <h2 className="mb-4 text-2xl font-black text-theme-primary">{draft.title}</h2>
                  )}

                  <div className="space-y-3 text-sm font-medium">
                    {canEditFields ? (
                      <>
                        <div className="flex flex-wrap gap-4">
                          <div className="relative">
                            <InlineTimeField
                              icon={<Clock className="h-3.5 w-3.5" />}
                              value={draft.plannedStartAtDraft}
                              isActive={draft.activeEditor === 'plannedStartAt'}
                              onToggle={() => editingSession.actions.setActiveEditor('plannedStartAt')}
                              placeholder="计划开始"
                              ariaLabel="编辑计划开始时间"
                              prefix="开始 "
                            />
                            {draft.activeEditor === 'plannedStartAt' && (
                              <DateTimePickerPopover
                                value={draft.plannedStartAtDraft}
                                defaultTime="09:00"
                                onChange={(value) => editingSession.actions.setPlannedStartAtDraft(value)}
                                onClose={() => editingSession.actions.setActiveEditor('none')}
                                title="计划开始"
                                onApply={(value) => {
                                  editingSession.actions.setActiveEditor('none')
                                  editingSession.actions.setPlannedStartAtDraft(value, { ...draft, activeEditor: 'none' })
                                }}
                              />
                            )}
                          </div>
                          <div className="relative">
                            <InlineTimeField
                              icon={<Calendar className="h-3.5 w-3.5" />}
                              value={draft.dueDateDraft}
                              isActive={draft.activeEditor === 'dueDate'}
                              onToggle={() => editingSession.actions.setActiveEditor('dueDate')}
                              placeholder="添加截止"
                              ariaLabel="编辑截止时间"
                              prefix="截止 "
                            />
                            {draft.activeEditor === 'dueDate' && (
                              <DateTimePickerPopover
                                value={draft.dueDateDraft}
                                defaultTime="18:00"
                                onChange={(value) => editingSession.actions.setDueDateDraft(value)}
                                onClose={() => editingSession.actions.setActiveEditor('none')}
                                title="截止时间"
                                onApply={(value) => {
                                  editingSession.actions.setActiveEditor('none')
                                  editingSession.actions.setDueDateDraft(value, { ...draft, activeEditor: 'none' })
                                }}
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
                              ? 'bg-theme-accent text-white shadow-sm'
                              : 'bg-theme-paper-muted text-theme-secondary hover:text-theme-primary'
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
                              draft.showInTimelineDraft ? 'bg-white/80' : 'bg-theme-secondary/40'
                            }`}
                          />
                          <span>在时间轴显示</span>
                        </label>
                      </>
                    ) : (
                      <div className="flex flex-wrap gap-4 text-theme-secondary">
                        {draft.plannedStartAtDraft && (
                          <ReadOnlyFact icon={<Clock className="h-3.5 w-3.5" />} text={`开始 ${formatDateTimeLabel(draft.plannedStartAtDraft)}`} />
                        )}
                        {draft.dueDateDraft && (
                          <ReadOnlyFact icon={<Calendar className="h-3.5 w-3.5" />} text={`截止 ${formatDateTimeLabel(draft.dueDateDraft)}`} />
                        )}
                        {draft.linkedGoalLabel && (
                          <ReadOnlyFact icon={<Folder className="h-4 w-4" />} text={draft.linkedGoalLabel} />
                        )}
                      </div>
                    )}
                  </div>
                </DrawerSection>

              <DrawerSection>
              <TaskChecklistSection task={task} canEditFields={canEditFields} />
              </DrawerSection>

              {task.systemReminderId && (
                <DrawerSection>
                  <SectionRule />
                  <div className="px-8 py-3">
                    <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <div className="text-xs">
                          {linkedReminder ? (
                            <>
                              <span className="font-bold text-green-800">已关联:</span>
                              <span className="text-slate-700"> {linkedReminder.title}{linkedReminder.dueAt ? ` · ${formatReminderDate(linkedReminder.dueAt)}` : ''}</span>
                            </>
                          ) : (
                            <span className="font-bold text-green-800">已关联系统提醒（提醒可能已被外部删除）</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 underline hover:text-green-900"
                          onClick={handleOpenLinkedReminder}
                        >
                          <ExternalLink className="h-3 w-3" />
                          打开
                        </button>
                        {canEditFields && (
                          <button
                            type="button"
                            className="text-xs font-semibold text-theme-secondary underline hover:text-slate-700"
                            onClick={() => setUnlinkConfirmOpen(true)}
                          >
                            解除关联
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </DrawerSection>
              )}

              <BearNoteSection task={task} canEditFields={canEditFields} />

              <DrawerSection>
              <SectionRule />

              <div className="px-8 py-3">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-theme-secondary">
                      <AlignLeft className="h-4 w-4" />
                      Notes (Markdown)
                    </h3>
                    {canEditFields && (
                      <div className="inline-flex rounded-full border border-theme-paper-line bg-theme-paper-muted p-0.5">
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
                                isActive ? 'bg-theme-accent text-white' : 'text-theme-secondary hover:text-theme-primary'
                              }`}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  {!canEditFields || draft.markdownMode === 'preview' ? (
                    draft.content.trim() ? (
                      <div className="rounded-xl border border-theme-paper-line bg-theme-paper-muted px-4 py-3">
                        <MarkdownContent content={draft.content} />
                      </div>
                    ) : canEditFields ? (
                      <button
                        type="button"
                        onClick={() => editingSession.actions.setMarkdownMode('edit')}
                        className="w-full rounded-xl border border-dashed border-theme-paper-line px-4 py-2.5 text-left text-sm text-theme-secondary transition-colors hover:border-theme-accent/40 hover:text-theme-primary"
                      >
                        添加笔记
                      </button>
                    ) : (
                      <p className="px-1 text-sm text-theme-secondary">暂无笔记</p>
                    )
                  ) : draft.markdownMode === 'edit' ? (
                    <textarea
                      value={draft.content}
                      onChange={(event) => editingSession.actions.setContent(event.target.value)}
                      onBlur={() => void editingSession.actions.saveContentIfChanged()}
                      autoFocus
                      rows={Math.max(3, draft.content.split('\n').length)}
                      className="w-full rounded-xl border border-theme-paper-line bg-theme-paper-muted px-4 py-3 text-sm outline-none transition-all focus:border-theme-accent focus:ring-4 focus:ring-theme-accent/20"
                    />
                  ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                      <textarea
                        value={draft.content}
                        onChange={(event) => editingSession.actions.setContent(event.target.value)}
                        onBlur={() => void editingSession.actions.saveContentIfChanged()}
                        rows={Math.max(3, draft.content.split('\n').length)}
                        className="w-full rounded-xl border border-theme-paper-line bg-theme-paper-muted px-4 py-3 text-sm outline-none transition-all focus:border-theme-accent focus:ring-4 focus:ring-theme-accent/20"
                      />
                      <div className="rounded-xl border border-theme-paper-line bg-theme-paper-muted px-4 py-3">
                        <MarkdownContent content={draft.content} />
                      </div>
                    </div>
                  )}
                </div>
              </DrawerSection>

              <DrawerSection className="border-t border-theme-paper-line bg-theme-paper-muted p-8">
                <div>
                  <h3 className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-theme-secondary">
                    ACTIVITY & UPDATES
                  </h3>
                  <ActivityLogTimeline logs={task.activityLogs} />

                  {canEditFields && (
                    <div className="mt-4 border-t border-theme-paper-line pt-4">
                      <div className="flex gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-theme-accent-light text-[10px] font-bold text-theme-accent">Me</div>
                        <div className="relative flex-1">
                          <textarea
                            rows={2}
                            value={logNote}
                            onChange={(event) => setLogNote(event.target.value)}
                            className="w-full resize-none rounded-lg border border-theme-paper-line bg-theme-paper px-3 py-2 text-xs transition-all focus:border-theme-accent focus:ring-2 focus:ring-theme-accent/20"
                            placeholder="添加进度记录..."
                          />
                          <button
                            onClick={() => {
                              if (!logNote.trim()) return
                              void addTaskNote(task.id, logNote)
                              setLogNote('')
                            }}
                            className="absolute bottom-2 right-2 text-theme-secondary transition-colors hover:text-theme-accent"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </DrawerSection>
            </DrawerStack>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
    </>
  )
}

function BearNoteSection({ task, canEditFields }: { task: Task; canEditFields: boolean }) {
  const runtime = getRuntimeAdapter()
  const isTauriMain = runtime.isTauri() && runtime.getWindowLabel() === 'main'
  const tokenConfigured = useBearNoteStore((s) => s.tokenConfigured)
  const preview = useBearNoteStore((s) => s.previewsByTaskId[task.id])
  const isLoading = useBearNoteStore((s) => s.isLoading)
  const errorMessage = useBearNoteStore((s) => s.errorMessage)
  const saveApiToken = useBearNoteStore((s) => s.saveApiToken)
  const linkSelectedNote = useBearNoteStore((s) => s.linkSelectedNote)
  const refreshPreview = useBearNoteStore((s) => s.refreshPreview)
  const unlinkNote = useBearNoteStore((s) => s.unlinkNote)
  const replaceTask = useTaskStore((s) => s.replaceTask)
  const [tokenPanelOpen, setTokenPanelOpen] = useState(false)
  const [tokenDraft, setTokenDraft] = useState('')

  if (!isTauriMain) return null

  const saveToken = async () => {
    if (!tokenDraft.trim()) return
    await saveApiToken(tokenDraft)
    setTokenDraft('')
    setTokenPanelOpen(false)
  }

  const unlink = async () => {
    const updated = await unlinkNote(task.id)
    if (updated) replaceTask(updated)
  }

  return (
    <>
    <SectionRule />
    <section className="px-8 py-3">
      <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-700">
            <BookOpen className="h-4 w-4" />
            Bear 笔记
          </h3>
          {task.bearNoteId && (
            <button
              type="button"
              onClick={() => void openTaskInBear(task.id)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 underline hover:text-amber-900"
            >
              <ExternalLink className="h-3 w-3" />
              Open in Bear
            </button>
          )}
        </div>

        {!tokenConfigured ? (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-slate-600">保存 Bear API Token 后，可关联 Bear 当前选中的笔记。</p>
            <button
              type="button"
              onClick={() => setTokenPanelOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-amber-700"
            >
              <KeyRound className="h-3.5 w-3.5" />
              配置 Bear Token
            </button>
            {tokenPanelOpen && (
              <div role="dialog" aria-label="配置 Bear Token" className="rounded-lg border border-amber-200 bg-white p-3 shadow-sm">
                <label className="block text-xs font-bold text-slate-600">
                  Bear API Token
                  <input
                    aria-label="Bear API Token"
                    value={tokenDraft}
                    onChange={(event) => setTokenDraft(event.target.value)}
                    className="mt-2 h-9 w-full rounded-lg border border-white/10 px-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  />
                </label>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setTokenPanelOpen(false)}
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-theme-secondary hover:bg-slate-50"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveToken()}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    保存 Token
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : task.bearNoteId ? (
          <div className="space-y-3">
            {preview ? (
              <div className="rounded-lg border border-amber-200/40 bg-theme-paper-muted px-3 py-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-black text-theme-primary">Bear · {preview.title}</h4>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {preview.fetchedAt.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto text-sm">
                  <MarkdownContent content={preview.note} />
                </div>
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-slate-600">已关联 Bear 笔记，刷新后可在这里预览内容。</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void refreshPreview(task.id)}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                刷新预览
              </button>
              {canEditFields && (
                <>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => void linkSelectedNote(task.id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    替换为当前 Bear 笔记
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => void unlink()}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white px-3 py-2 text-xs font-bold text-theme-secondary hover:bg-slate-50 disabled:opacity-60"
                  >
                    <Unlink className="h-3.5 w-3.5" />
                    解除 Bear 关联
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void linkSelectedNote(task.id)}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
          >
            <Link2 className="h-3.5 w-3.5" />
            链接当前 Bear 笔记
          </button>
        )}

        {errorMessage && <p className="mt-3 text-xs font-semibold text-red-600">{errorMessage}</p>}
      </div>
    </section>
    </>
  )
}

function SectionRule() {
  return <div data-testid="todo-section-rule" className="mx-8 my-2 h-px bg-theme-paper-line" />
}

function newChecklistItem(title: string, sortOrder: number): TaskChecklistItem {
  const id = crypto.randomUUID()
  return { id, title, completed: false, sortOrder }
}

function persistableChecklists(items: TaskChecklistItem[]) {
  return items
    .map((item) => ({ ...item, title: item.title.trim() }))
    .filter((item) => item.title.length > 0)
    .map((item, index) => ({ ...item, sortOrder: index }))
}

function TaskChecklistSection({ task, canEditFields }: { task: Task; canEditFields: boolean }) {
  const updateTaskChecklists = useTaskStore((state) => state.updateTaskChecklists)
  const [localItems, setLocalItems] = useState<TaskChecklistItem[]>(task.checklists ?? [])
  const [draft, setDraft] = useState('')
  const [focusId, setFocusId] = useState<string | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const localItemsRef = useRef(localItems)
  localItemsRef.current = localItems

  useEffect(() => {
    setLocalItems(task.checklists ?? [])
    setDraft('')
    setFocusId(null)
  }, [task.id])

  useEffect(() => {
    if (!focusId) return
    inputRefs.current[focusId]?.focus()
  }, [focusId, localItems])

  const persist = (next: TaskChecklistItem[]) => {
    localItemsRef.current = next
    setLocalItems(next)
    void updateTaskChecklists(task.id, persistableChecklists(next))
  }

  if (!canEditFields) {
    const items = task.checklists ?? []
    if (items.length === 0) return null
    return (
      <section className="px-8 py-3">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-1 text-sm text-theme-secondary">
              <span className={`h-4 w-4 rounded-full border ${item.completed ? 'border-theme-accent bg-theme-accent' : 'border-theme-paper-line'}`} />
              <span className={item.completed ? 'line-through' : ''}>{item.title}</span>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <section className="px-8 py-3">
      <ul className="space-y-1">
        {localItems.map((item, index) => (
          <li key={item.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              aria-label={`勾选 ${item.title || '步骤'}`}
              checked={item.completed}
              onChange={() => {
                persist(localItems.map((entry) => (
                  entry.id === item.id ? { ...entry, completed: !entry.completed } : entry
                )))
              }}
              className="h-4 w-4 rounded-full border-theme-paper-line text-theme-accent"
            />
            <input
              ref={(node) => {
                inputRefs.current[item.id] = node
              }}
              value={item.title}
              onChange={(event) => {
                const next = localItemsRef.current.map((entry) => (
                  entry.id === item.id ? { ...entry, title: event.target.value } : entry
                ))
                localItemsRef.current = next
                setLocalItems(next)
              }}
              onBlur={() => persist(localItemsRef.current)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  if (!item.title.trim()) return
                  const nextItem = newChecklistItem('', index + 1)
                  const next = [...localItems]
                  next.splice(index + 1, 0, nextItem)
                  persist(next)
                  setFocusId(nextItem.id)
                  return
                }
                if (event.key === 'Backspace' && item.title.length === 0) {
                  event.preventDefault()
                  const next = localItems.filter((entry) => entry.id !== item.id)
                  persist(next)
                  setFocusId(next[index - 1]?.id ?? null)
                }
              }}
              className={`h-8 flex-1 border-none bg-transparent text-sm outline-none ${item.completed ? 'text-theme-secondary line-through' : 'text-theme-primary'}`}
            />
          </li>
        ))}
      </ul>
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          const title = draft.trim()
          if (!title) return
          persist([...localItems, newChecklistItem(title, localItems.length)])
          setDraft('')
        }}
        placeholder="添加步骤"
        className="mt-1 h-8 w-full border-none bg-transparent text-sm text-theme-primary outline-none placeholder:text-theme-secondary"
      />
    </section>
  )
}

function InlineTimeField({
  icon,
  value,
  isActive,
  onToggle,
  placeholder,
  ariaLabel,
  prefix,
}: {
  icon: React.ReactNode
  value: string
  isActive: boolean
  onToggle: () => void
  placeholder: string
  ariaLabel?: string
  prefix?: string
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onToggle}
      className={`flex items-center gap-2 transition-colors ${
        isActive ? 'text-theme-accent' : 'text-theme-secondary hover:text-theme-primary'
      }`}
    >
      <span>{icon}</span>
      <span>{value ? `${prefix || ''}${formatDateTimeLabel(value)}` : placeholder}</span>
    </button>
  )
}

function ReadOnlyFact({
  icon,
  text,
}: {
  icon: React.ReactNode
  text: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span>{icon}</span>
      <span>{text}</span>
    </div>
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
      aria-label="编辑所属目标"
      onClick={() => editingSession.actions.setActiveEditor(draft.activeEditor === 'linkedGoal' ? 'none' : 'linkedGoal')}
      className={`flex items-center gap-2 transition-colors ${
        draft.activeEditor === 'linkedGoal' ? 'text-theme-accent' : 'text-theme-secondary hover:text-theme-primary'
      }`}
    >
      <Folder className="h-4 w-4" />
      <span>{draft.linkedGoalLabel || '关联目标'}</span>
    </button>
  )
}
