import type { Task } from '../types/task'

interface TodoFieldPatchBaseInput {
  title: string
  plannedStartAt?: Date | null
  dueDate?: Date | null
  showInTimeline?: boolean
  systemReminderId?: string | null
}

type TodoGoalLinkPatchInput =
  | { linkedGoalId: string; linkedGoalLabel?: string }
  | { linkedGoalId?: undefined; linkedGoalLabel?: never }

export type TodoFieldPatchInput = TodoFieldPatchBaseInput & TodoGoalLinkPatchInput

type TodoFieldPatchLooseInput = TodoFieldPatchBaseInput & {
  linkedGoalId?: string
  linkedGoalLabel?: string
}

interface NullablePatch<T> {
  value: T | null
}

export interface TauriTaskFieldArgs {
  [key: string]: unknown
  taskId: string
  title: string
  plannedStartAt?: NullablePatch<string>
  dueAt?: NullablePatch<string>
  showInTimeline: boolean | null
  linkedGoalId?: NullablePatch<string>
  linkedGoalLabel?: NullablePatch<string>
  systemReminderId?: NullablePatch<string>
}

function normalizedTitle(input: TodoFieldPatchInput): string {
  return input.title.trim()
}

function datePatch(value: Date | null): NullablePatch<string> {
  return { value: value?.toISOString() ?? null }
}

export function coerceTodoFieldPatchInput(input: TodoFieldPatchLooseInput): TodoFieldPatchInput {
  const { linkedGoalId, linkedGoalLabel, ...baseInput } = input
  if (linkedGoalId === undefined) {
    return baseInput
  }
  return { ...baseInput, linkedGoalId, linkedGoalLabel }
}

export function applyTodoFieldPatch(task: Task, input: TodoFieldPatchInput): Task {
  const hasGoalPatch = input.linkedGoalId !== undefined

  return {
    ...task,
    title: normalizedTitle(input),
    plannedStartAt: input.plannedStartAt === undefined ? task.plannedStartAt : input.plannedStartAt ?? undefined,
    dueDate: input.dueDate === undefined ? task.dueDate : input.dueDate ?? undefined,
    linkedGoalId: !hasGoalPatch ? task.linkedGoalId : input.linkedGoalId === '' ? undefined : input.linkedGoalId,
    linkedGoalLabel: !hasGoalPatch ? task.linkedGoalLabel : input.linkedGoalId === '' ? undefined : input.linkedGoalLabel,
    showInTimeline: input.showInTimeline ?? task.showInTimeline,
    systemReminderId: input.systemReminderId === undefined
      ? task.systemReminderId
      : input.systemReminderId ?? undefined,
  }
}

export function toTauriTaskFieldArgs(taskId: string, input: TodoFieldPatchInput): TauriTaskFieldArgs {
  const args: TauriTaskFieldArgs = {
    taskId,
    title: normalizedTitle(input),
    showInTimeline: input.showInTimeline ?? null,
  }

  if (input.plannedStartAt !== undefined) {
    args.plannedStartAt = datePatch(input.plannedStartAt)
  }
  if (input.dueDate !== undefined) {
    args.dueAt = datePatch(input.dueDate)
  }
  if (input.systemReminderId !== undefined) {
    args.systemReminderId = { value: input.systemReminderId }
  }
  if (input.linkedGoalId !== undefined) {
    args.linkedGoalId = { value: input.linkedGoalId || null }
    args.linkedGoalLabel = { value: input.linkedGoalId === '' ? null : (input.linkedGoalLabel ?? null) }
  }

  return args
}
