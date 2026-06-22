import { useEffect, useMemo, useState } from 'react'
import type { AreaWithStats, GoalCard } from '../types/app'
import type { Task, TaskStatus } from '../types/task'
import { getTaskStatusActions } from './taskPresentation'

export interface TodoEditingDraft {
  title: string
  content: string
  plannedStartAtDraft: string
  dueDateDraft: string
  linkedGoalIdDraft: string
  linkedGoalLabel?: string
  showInTimelineDraft: boolean
  markdownMode: 'edit' | 'preview' | 'split'
  activeEditor: 'none' | 'plannedStartAt' | 'dueDate' | 'linkedGoal'
  isCreatingGoalInline: boolean
  newGoalTitle: string
  newGoalArea: string
  allAreas: AreaWithStats[]
}

export interface TodoEditingSession {
  draft: TodoEditingDraft
  capabilities: {
    canChangeStatus: boolean
    statusActions: TaskStatus[]
  }
  actions: {
    setTitle(value: string, sourceDraft?: TodoEditingDraft): TodoEditingDraft
    setContent(value: string, sourceDraft?: TodoEditingDraft): TodoEditingDraft
    setPlannedStartAtDraft(value: string, sourceDraft?: TodoEditingDraft): TodoEditingDraft
    setDueDateDraft(value: string, sourceDraft?: TodoEditingDraft): TodoEditingDraft
    setLinkedGoalIdDraft(value: string, sourceDraft?: TodoEditingDraft): TodoEditingDraft
    setShowInTimelineDraft(value: boolean, sourceDraft?: TodoEditingDraft): TodoEditingDraft
    setMarkdownMode(value: TodoEditingDraft['markdownMode'], sourceDraft?: TodoEditingDraft): TodoEditingDraft
    setActiveEditor(value: TodoEditingDraft['activeEditor'], sourceDraft?: TodoEditingDraft): TodoEditingDraft
    startInlineGoalCreation(sourceDraft?: TodoEditingDraft): TodoEditingDraft
    cancelInlineGoalCreation(sourceDraft?: TodoEditingDraft): TodoEditingDraft
    setNewGoalTitle(value: string, sourceDraft?: TodoEditingDraft): TodoEditingDraft
    setNewGoalArea(value: string, sourceDraft?: TodoEditingDraft): TodoEditingDraft
    saveFields(nextDraft?: TodoEditingDraft): Promise<void>
    linkGoal(goalId: string): Promise<TodoEditingDraft>
    unlinkGoal(): Promise<TodoEditingDraft>
    createAndLinkGoal(nextDraft?: TodoEditingDraft): Promise<{ goalId?: string; draft: TodoEditingDraft }>
    submitStatus(next: TaskStatus, note?: string): Promise<void>
    saveContentIfChanged(nextDraft?: TodoEditingDraft): Promise<void>
  }
}

export interface ManagedTodoEditingSession {
  draft: TodoEditingDraft
  capabilities: TodoEditingSession['capabilities']
  actions: {
    setTitle(value: string): void
    setContent(value: string): void
    setPlannedStartAtDraft(value: string, baseDraft?: TodoEditingDraft): void
    setDueDateDraft(value: string, baseDraft?: TodoEditingDraft): void
    setLinkedGoalIdDraft(value: string): void
    setShowInTimelineDraft(value: boolean): void
    setMarkdownMode(value: TodoEditingDraft['markdownMode']): void
    setActiveEditor(value: TodoEditingDraft['activeEditor']): void
    startInlineGoalCreation(): void
    cancelInlineGoalCreation(): void
    setNewGoalTitle(value: string): void
    setNewGoalArea(value: string): void
    saveFields(): Promise<void>
    linkGoal(goalId: string): Promise<void>
    unlinkGoal(): Promise<void>
    createAndLinkGoal(): Promise<string | undefined>
    submitStatus(next: TaskStatus, note?: string): Promise<void>
    saveContentIfChanged(): Promise<void>
  }
  reset(): void
}

interface CreateTodoEditingSessionInput {
  task: Task
  goals: GoalCard[]
  allAreas: AreaWithStats[]
  createArea: (title: string) => Promise<void>
  activeArea: string
  defaultGoalArea?: string
  draft?: Partial<TodoEditingDraft>
  updateTaskFields: (
    taskId: string,
    input: {
      title: string
      plannedStartAt?: Date
      dueDate?: Date
      linkedGoalId?: string
      linkedGoalLabel?: string
      showInTimeline?: boolean
    },
  ) => Promise<void>
  updateTaskContent: (taskId: string, content: string) => Promise<void>
  updateTaskStatus: (taskId: string, next: TaskStatus, note?: string) => Promise<void>
  createGoal: (
    input: { title: string; area?: string; description?: string },
    options?: { openGoalWorkspace?: boolean },
  ) => Promise<{ goal?: import('../types/app').GoalCard; openGoalWorkspace: boolean }>
}

export function createTodoEditingSession(input: CreateTodoEditingSessionInput): TodoEditingSession {
  const { task, goals, allAreas, createArea, activeArea, defaultGoalArea = '独立开发' } = input
  const baseDraft = buildDraft(task, goals, allAreas, activeArea, defaultGoalArea, input.draft)
  const statusActions = getTaskStatusActions(task.status)

  const updateDraft = (patch: Partial<TodoEditingDraft>, sourceDraft = baseDraft): TodoEditingDraft => {
    const nextDraft = { ...sourceDraft, ...patch }
    return {
      ...nextDraft,
      linkedGoalLabel: resolveLinkedGoalLabel(goals, nextDraft.linkedGoalIdDraft),
    }
  }

  return {
    draft: baseDraft,
    capabilities: {
      canChangeStatus: statusActions.length > 0,
      statusActions,
    },
    actions: {
      setTitle: (value, sourceDraft) => updateDraft({ title: value }, sourceDraft),
      setContent: (value, sourceDraft) => updateDraft({ content: value }, sourceDraft),
      setPlannedStartAtDraft: (value, sourceDraft) => updateDraft({ plannedStartAtDraft: value }, sourceDraft),
      setDueDateDraft: (value, sourceDraft) => updateDraft({ dueDateDraft: value }, sourceDraft),
      setLinkedGoalIdDraft: (value, sourceDraft) => updateDraft({ linkedGoalIdDraft: value }, sourceDraft),
      setShowInTimelineDraft: (value, sourceDraft) => updateDraft({ showInTimelineDraft: value }, sourceDraft),
      setMarkdownMode: (value, sourceDraft) => updateDraft({ markdownMode: value }, sourceDraft),
      setActiveEditor: (value, sourceDraft) => updateDraft({ activeEditor: value }, sourceDraft),
      startInlineGoalCreation: (sourceDraft) => updateDraft({ isCreatingGoalInline: true }, sourceDraft),
      cancelInlineGoalCreation: (sourceDraft) => updateDraft({ isCreatingGoalInline: false, newGoalTitle: '' }, sourceDraft),
      setNewGoalTitle: (value, sourceDraft) => updateDraft({ newGoalTitle: value }, sourceDraft),
      setNewGoalArea: (value, sourceDraft) => updateDraft({ newGoalArea: value }, sourceDraft),
      saveFields: async (nextDraft = baseDraft) => {
        await input.updateTaskFields(task.id, {
          title: nextDraft.title.trim(),
          plannedStartAt: parseDateDraft(nextDraft.plannedStartAtDraft),
          dueDate: parseDateDraft(nextDraft.dueDateDraft),
          linkedGoalId: nextDraft.linkedGoalIdDraft || undefined,
          linkedGoalLabel: resolveLinkedGoalLabel(goals, nextDraft.linkedGoalIdDraft),
          showInTimeline: nextDraft.showInTimelineDraft,
        })
      },
      linkGoal: async (goalId) => {
        const nextDraft = updateDraft({
          linkedGoalIdDraft: goalId,
          activeEditor: 'none',
        })
        await input.updateTaskFields(task.id, {
          title: nextDraft.title.trim(),
          plannedStartAt: parseDateDraft(nextDraft.plannedStartAtDraft),
          dueDate: parseDateDraft(nextDraft.dueDateDraft),
          linkedGoalId: goalId || undefined,
          linkedGoalLabel: resolveLinkedGoalLabel(goals, goalId),
          showInTimeline: nextDraft.showInTimelineDraft,
        })
        return nextDraft
      },
      unlinkGoal: async () => {
        const nextDraft = updateDraft({
          linkedGoalIdDraft: '',
          activeEditor: 'none',
        })
        await input.updateTaskFields(task.id, {
          title: nextDraft.title.trim(),
          plannedStartAt: parseDateDraft(nextDraft.plannedStartAtDraft),
          dueDate: parseDateDraft(nextDraft.dueDateDraft),
          linkedGoalId: undefined,
          linkedGoalLabel: undefined,
          showInTimeline: nextDraft.showInTimelineDraft,
        })
        return nextDraft
      },
      createAndLinkGoal: async (nextDraft = baseDraft) => {
        const result = await input.createGoal(
          { title: nextDraft.newGoalTitle, area: nextDraft.newGoalArea },
          { openGoalWorkspace: false },
        )

        if (!result?.goal) {
          return { goalId: undefined, draft: nextDraft }
        }

        const goalId = result.goal.id

        const linkedDraft = updateDraft(
          {
            linkedGoalIdDraft: goalId,
            newGoalTitle: '',
            isCreatingGoalInline: false,
            activeEditor: 'none',
          },
          nextDraft,
        )

        await input.updateTaskFields(task.id, {
          title: linkedDraft.title.trim(),
          plannedStartAt: parseDateDraft(linkedDraft.plannedStartAtDraft),
          dueDate: parseDateDraft(linkedDraft.dueDateDraft),
          linkedGoalId: goalId,
          linkedGoalLabel: resolveLinkedGoalLabel(goals, goalId),
          showInTimeline: linkedDraft.showInTimelineDraft,
        })

        return { goalId, draft: linkedDraft }
      },
      submitStatus: async (next, note) => {
        await input.updateTaskStatus(task.id, next, note)
      },
      saveContentIfChanged: async (nextDraft = baseDraft) => {
        if (nextDraft.content === task.content) return
        await input.updateTaskContent(task.id, nextDraft.content)
      },
    },
  }
}

export function useTodoEditingSession(
  input: Omit<CreateTodoEditingSessionInput, 'draft' | 'task'> & { task?: Task },
): ManagedTodoEditingSession | undefined {
  const { task, goals, allAreas, createArea, activeArea, defaultGoalArea, updateTaskFields, updateTaskContent, updateTaskStatus, createGoal } = input
  const sessionSeed = useMemo(
    () =>
      task
        ? createTodoEditingSession({
          task,
          goals,
          allAreas,
          createArea,
          activeArea,
          defaultGoalArea,
          updateTaskFields,
          updateTaskContent,
          updateTaskStatus,
          createGoal,
        })
        : undefined,
    [activeArea, allAreas, createArea, createGoal, defaultGoalArea, goals, task, updateTaskContent, updateTaskFields, updateTaskStatus],
  )
  const [draft, setDraft] = useState<TodoEditingDraft | undefined>(sessionSeed?.draft)

  useEffect(() => {
    setDraft(sessionSeed?.draft)
  }, [sessionSeed?.draft])

  const session = useMemo(() => {
    if (!task || !draft) return undefined

    const baseSession = createTodoEditingSession({
      task,
      goals,
      allAreas,
      createArea,
      activeArea,
      defaultGoalArea,
      updateTaskFields,
      updateTaskContent,
      updateTaskStatus,
      createGoal,
      draft,
    })

    return {
      draft: baseSession.draft,
      capabilities: baseSession.capabilities,
      actions: {
        setTitle(value: string) {
          const nextDraft = baseSession.actions.setTitle(value, baseSession.draft)
          setDraft(nextDraft)
        },
        setContent(value: string) {
          const nextDraft = baseSession.actions.setContent(value, baseSession.draft)
          setDraft(nextDraft)
        },
        setPlannedStartAtDraft(value: string, baseDraft?: TodoEditingDraft) {
          const nextDraft = baseSession.actions.setPlannedStartAtDraft(value, baseDraft ?? baseSession.draft)
          setDraft(nextDraft)
          void baseSession.actions.saveFields(nextDraft)
        },
        setDueDateDraft(value: string, baseDraft?: TodoEditingDraft) {
          const nextDraft = baseSession.actions.setDueDateDraft(value, baseDraft ?? baseSession.draft)
          setDraft(nextDraft)
          void baseSession.actions.saveFields(nextDraft)
        },
        setLinkedGoalIdDraft(value: string) {
          const nextDraft = baseSession.actions.setLinkedGoalIdDraft(value, baseSession.draft)
          setDraft(nextDraft)
        },
        setShowInTimelineDraft(value: boolean) {
          const nextDraft = baseSession.actions.setShowInTimelineDraft(value, baseSession.draft)
          setDraft(nextDraft)
          void baseSession.actions.saveFields(nextDraft)
        },
        setMarkdownMode(value: TodoEditingDraft['markdownMode']) {
          setDraft(baseSession.actions.setMarkdownMode(value, baseSession.draft))
        },
        setActiveEditor(value: TodoEditingDraft['activeEditor']) {
          setDraft(baseSession.actions.setActiveEditor(value, baseSession.draft))
        },
        startInlineGoalCreation() {
          setDraft(baseSession.actions.startInlineGoalCreation(baseSession.draft))
        },
        cancelInlineGoalCreation() {
          setDraft(baseSession.actions.cancelInlineGoalCreation(baseSession.draft))
        },
        setNewGoalTitle(value: string) {
          setDraft(baseSession.actions.setNewGoalTitle(value, baseSession.draft))
        },
        setNewGoalArea(value: string) {
          setDraft(baseSession.actions.setNewGoalArea(value, baseSession.draft))
        },
        saveFields() {
          return baseSession.actions.saveFields(baseSession.draft)
        },
        async linkGoal(goalId: string) {
          const nextDraft = await baseSession.actions.linkGoal(goalId)
          setDraft(nextDraft)
        },
        async unlinkGoal() {
          const nextDraft = await baseSession.actions.unlinkGoal()
          setDraft(nextDraft)
        },
        async createAndLinkGoal() {
          const result = await baseSession.actions.createAndLinkGoal(baseSession.draft)
          setDraft(result.draft)
          return result.goalId
        },
        submitStatus(next: TaskStatus, note?: string) {
          return baseSession.actions.submitStatus(next, note)
        },
        saveContentIfChanged() {
          return baseSession.actions.saveContentIfChanged(baseSession.draft)
        },
      },
      reset() {
        setDraft(sessionSeed?.draft)
      },
    } satisfies ManagedTodoEditingSession
  }, [activeArea, allAreas, createArea, createGoal, defaultGoalArea, draft, goals, sessionSeed?.draft, task, updateTaskContent, updateTaskFields, updateTaskStatus])

  return session
}

function buildDraft(
  task: Task,
  goals: GoalCard[],
  allAreas: AreaWithStats[],
  activeArea: string,
  defaultGoalArea: string,
  draft?: Partial<TodoEditingDraft>,
): TodoEditingDraft {
  const baseDraft: TodoEditingDraft = {
    title: task.title,
    content: task.content,
    plannedStartAtDraft: task.plannedStartAt ? toDatetimeLocal(task.plannedStartAt) : '',
    dueDateDraft: task.dueDate ? toDatetimeLocal(task.dueDate) : '',
    linkedGoalIdDraft: task.linkedGoalId || '',
    linkedGoalLabel: resolveLinkedGoalLabel(goals, task.linkedGoalId),
    showInTimelineDraft: Boolean(task.showInTimeline),
    markdownMode: 'preview',
    activeEditor: 'none',
    isCreatingGoalInline: false,
    newGoalTitle: '',
    newGoalArea: activeArea === 'ALL' ? defaultGoalArea : activeArea,
    allAreas,
  }

  if (!draft) return baseDraft

  const merged = {
    ...baseDraft,
    ...draft,
  }

  return {
    ...merged,
    linkedGoalLabel: resolveLinkedGoalLabel(goals, merged.linkedGoalIdDraft),
  }
}

function resolveLinkedGoalLabel(goals: GoalCard[], linkedGoalId?: string) {
  if (!linkedGoalId) return undefined
  return goals.find((goal) => goal.id === linkedGoalId)?.title
}

function parseDateDraft(value: string) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function toDatetimeLocal(date: Date) {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}
