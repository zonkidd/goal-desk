import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import type { GoalCard, IntegrationStatus, ReminderItem, TimelineItem } from '../types/app'
import type { Task, TaskActivityAction, TaskStatus } from '../types/task'

interface TimelineCommandItem {
  id: string
  title: string
  starts_at: string
  source: TimelineItem['source']
  read_only: boolean
  completed: boolean
  source_label?: string | null
}

interface GoalCommandItem {
  id: string
  title: string
  area: string
  description: string
  status: GoalCard['status']
  progress: number
  task_count: number
  next_todo: string
}

interface TaskCommandLog {
  action: TaskActivityAction
  note?: string | null
  timestamp: string
}

export interface TaskCommandItem {
  id: string
  title: string
  content: string
  status: TaskStatus
  due_at?: string | null
  is_ongoing?: boolean | null
  linked_goal_id?: string | null
  linked_goal_label?: string | null
  bear_note_id?: string | null
  system_reminder_id?: string | null
  activity_logs: TaskCommandLog[]
}

interface EventKitCommandCalendarEvent {
  id: string
  title: string
  starts_at: string
  ends_at: string
  calendar_title?: string | null
}

interface EventKitCommandReminder {
  id: string
  title: string
  due_at?: string | null
  done: boolean
  list_title?: string | null
}

interface EventKitCommandSnapshot {
  integration_status: IntegrationStatus
  calendar_events: EventKitCommandCalendarEvent[]
  reminders: EventKitCommandReminder[]
}

export function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function getCurrentWindowLabel() {
  return isTauriRuntime() ? getCurrentWindow().label : 'browser'
}

function formatTimeLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function normalizeTimeline(items: TimelineCommandItem[]): TimelineItem[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    timeLabel: formatTimeLabel(item.starts_at),
    source: item.source,
    readonly: item.read_only,
    done: item.completed,
    sourceLabel: item.source_label || undefined,
  }))
}

function normalizeGoals(items: GoalCommandItem[]): GoalCard[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    area: item.area,
    description: item.description,
    status: item.status,
    progress: item.progress,
    nextTodo: item.next_todo,
    taskCount: item.task_count,
    createdAt: new Date(),
    updatedAt: new Date(),
  }))
}

function normalizeGoal(item: GoalCommandItem): GoalCard {
  return normalizeGoals([item])[0]
}

export function normalizeTask(item: TaskCommandItem): Task {
  return {
    id: item.id,
    title: item.title,
    content: item.content,
    status: item.status,
    dueDate: item.due_at ? new Date(item.due_at) : undefined,
    isOngoing: item.is_ongoing || false,
    linkedGoalId: item.linked_goal_id || undefined,
    linkedGoalLabel: item.linked_goal_label || undefined,
    bearNoteId: item.bear_note_id || undefined,
    systemReminderId: item.system_reminder_id || undefined,
    activityLogs: item.activity_logs.map((log) => ({
      action: log.action,
      note: log.note || undefined,
      timestamp: new Date(log.timestamp),
    })),
  }
}

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function sameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate()
}

function timeLabelSortValue(timeLabel: string) {
  const [hours, minutes] = timeLabel.split(':').map((value) => Number.parseInt(value, 10))
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return Number.MAX_SAFE_INTEGER
  return hours * 60 + minutes
}

function normalizeReminder(item: EventKitCommandReminder): ReminderItem {
  return {
    id: item.id,
    title: item.title,
    dueAt: item.due_at ? new Date(item.due_at) : undefined,
    done: item.done,
    listTitle: item.list_title || undefined,
  }
}

function normalizeIntegrationStatus(snapshot?: EventKitCommandSnapshot): IntegrationStatus {
  return (
    snapshot?.integration_status || {
      calendar: 'error',
      reminders: 'error',
    }
  )
}

function mergeSystemTimeline(localItems: TimelineItem[], snapshot?: EventKitCommandSnapshot): TimelineItem[] {
  if (!snapshot) return localItems

  const today = startOfToday()
  const systemItems: Array<TimelineItem & { sortAt: number }> = []

  snapshot.calendar_events.forEach((event) => {
    const startsAt = new Date(event.starts_at)
    if (Number.isNaN(startsAt.getTime()) || !sameDay(startsAt, today)) return

    systemItems.push({
      id: event.id,
      title: event.title,
      timeLabel: formatTimeLabel(event.starts_at),
      source: 'calendar',
      readonly: true,
      done: false,
      sourceLabel: event.calendar_title || undefined,
      sortAt: startsAt.getHours() * 60 + startsAt.getMinutes(),
    })
  })

  snapshot.reminders.forEach((reminder) => {
    if (!reminder.due_at) return
    const dueAt = new Date(reminder.due_at)
    if (Number.isNaN(dueAt.getTime()) || !sameDay(dueAt, today)) return

    systemItems.push({
      id: reminder.id,
      title: reminder.title,
      timeLabel: formatTimeLabel(reminder.due_at),
      source: 'reminder',
      readonly: false,
      done: reminder.done,
      sourceLabel: reminder.list_title || undefined,
      sortAt: dueAt.getHours() * 60 + dueAt.getMinutes(),
    })
  })

  const merged = [
    ...localItems.map((item) => ({
      ...item,
      sortAt: timeLabelSortValue(item.timeLabel),
    })),
    ...systemItems,
  ]

  merged.sort((left, right) => left.sortAt - right.sortAt)

  return merged.map(({ sortAt: _sortAt, ...item }) => item)
}

export async function loadDesktopSnapshot() {
  const [timeline, goals, tasks, systemSnapshot] = await Promise.all([
    invoke<TimelineCommandItem[]>('today_snapshot'),
    invoke<GoalCommandItem[]>('goal_snapshot'),
    invoke<TaskCommandItem[]>('desk_task_list'),
    invoke<EventKitCommandSnapshot>('eventkit_snapshot').catch(() => undefined),
  ])

  return {
    timeline: mergeSystemTimeline(normalizeTimeline(timeline), systemSnapshot),
    goals: normalizeGoals(goals),
    tasks: tasks.map(normalizeTask),
    systemReminders: systemSnapshot?.reminders.map(normalizeReminder) || [],
    integrationStatus: normalizeIntegrationStatus(systemSnapshot),
  }
}

export async function captureTask(input: string) {
  return normalizeTask(await invoke<TaskCommandItem>('capture_task', { input }))
}

export async function createGoal(input: {
  title: string
  area?: string
  description: string
  status: GoalCard['status']
}) {
  return normalizeGoal(
    await invoke<GoalCommandItem>('create_goal', {
      title: input.title,
      area: input.area ?? null,
      description: input.description,
      status: input.status,
    }),
  )
}

export async function updateGoalFields(
  goalId: string,
  input: {
    title: string
    area?: string
    description: string
  },
) {
  return normalizeGoal(
    await invoke<GoalCommandItem>('update_goal_fields', {
      goalId,
      title: input.title,
      area: input.area ?? null,
      description: input.description,
    }),
  )
}

export async function updateGoalStatus(goalId: string, status: GoalCard['status']) {
  return normalizeGoal(await invoke<GoalCommandItem>('update_goal_status', { goalId, status }))
}

export async function updateTaskContent(taskId: string, content: string) {
  return normalizeTask(await invoke<TaskCommandItem>('update_task_content', { taskId, content }))
}

export async function updateTaskFields(
  taskId: string,
    input: {
      title: string
      dueAt?: Date
      linkedGoalId?: string
      linkedGoalLabel?: string
      isOngoing?: boolean
    },
) {
  return normalizeTask(
    await invoke<TaskCommandItem>('update_task_fields', {
      taskId,
      title: input.title,
      dueAt: input.dueAt?.toISOString() ?? null,
      isOngoing: input.isOngoing ?? false,
      linkedGoalId: input.linkedGoalId ?? null,
      linkedGoalLabel: input.linkedGoalLabel ?? null,
    }),
  )
}

export async function updateTaskStatus(taskId: string, status: TaskStatus, note?: string) {
  return normalizeTask(await invoke<TaskCommandItem>('update_task_status', { taskId, status, note }))
}

export async function addTaskNote(taskId: string, note: string) {
  return normalizeTask(await invoke<TaskCommandItem>('add_task_note', { taskId, note }))
}

export async function openTaskInBear(taskId: string) {
  return invoke('open_task_in_bear', { taskId })
}

export async function showQuickCaptureWindow() {
  return invoke('show_quick_capture_window')
}

export async function setSystemReminderCompleted(reminderId: string, done: boolean) {
  return normalizeReminder(await invoke<EventKitCommandReminder>('set_system_reminder_completed', { reminderId, done }))
}
