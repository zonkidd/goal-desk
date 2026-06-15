import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import type { AreaWithStats, GoalCard, IntegrationStatus, ReminderItem, TimelineItem } from '../types/app'
import type { Task, TaskActivityAction, TaskStatus } from '../types/task'
import { buildTimeline } from './TimelineService'
import { TaskCodec, GoalCodec, type RustTask, type RustGoalCard } from './codecs'

export function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function getCurrentWindowLabel() {
  return isTauriRuntime() ? getCurrentWindow().label : 'browser'
}

export async function hideCurrentWindow() {
  if (!isTauriRuntime()) return
  await getCurrentWindow().hide()
}

function formatTimeLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function parseDateFields<T extends Record<string, any>>(
  obj: T,
  dateFields: (keyof T)[]
): T {
  const result = { ...obj }
  for (const field of dateFields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = new Date(result[field] as string) as any
    }
  }
  return result
}


interface RustTimelineItem {
  id: string
  title: string
  startsAt: string
  source: TimelineItem['source']
  readOnly: boolean
  completed: boolean
  sourceLabel?: string
}

interface RustCalendarEvent {
  id: string
  title: string
  startsAt: string
  endsAt: string
  calendarTitle?: string
}

interface RustReminder {
  id: string
  title: string
  dueAt?: string
  done: boolean
  listTitle?: string
}

interface RustSystemSnapshot {
  integrationStatus: IntegrationStatus
  calendarEvents: RustCalendarEvent[]
  reminders: RustReminder[]
}

export async function loadDesktopSnapshot() {
  const [timeline, goals, tasks, systemSnapshot] = await Promise.all([
    invoke<RustTimelineItem[]>('today_snapshot'),
    invoke<RustGoalCard[]>('goal_snapshot'),
    invoke<RustTask[]>('desk_task_list'),
    invoke<RustSystemSnapshot>('eventkit_snapshot').catch(() => undefined),
  ])

  // Convert timeline items
  const localTimeline: TimelineItem[] = timeline.map((item) => ({
    id: item.id,
    title: item.title,
    timeLabel: formatTimeLabel(item.startsAt),
    source: item.source,
    readonly: item.readOnly,
    done: item.completed,
    sourceLabel: item.sourceLabel,
  }))

  // Convert goals
  const normalizedGoals: GoalCard[] = goals.map((item) => GoalCodec.fromRust(item))

  // Convert tasks with date parsing
  const normalizedTasks: Task[] = tasks.map((item) => TaskCodec.fromRust(item))

  // Convert system reminders
  const systemReminders: ReminderItem[] = systemSnapshot?.reminders.map((item) => ({
    id: item.id,
    title: item.title,
    dueAt: item.dueAt ? new Date(item.dueAt) : undefined,
    done: item.done,
    listTitle: item.listTitle,
  })) || []

  return {
    timeline: buildTimeline(localTimeline, normalizedTasks, systemSnapshot),
    goals: normalizedGoals,
    tasks: normalizedTasks,
    systemReminders,
    integrationStatus: systemSnapshot?.integrationStatus || {
      calendar: 'error' as const,
      reminders: 'error' as const,
    },
  }
}

export async function captureTask(input: string) {
  const task = await invoke<RustTask>('capture_task', { input })
  return TaskCodec.fromRust(task)
}

export async function createTaskForGoal(goalId: string, title: string) {
  const task = await invoke<RustTask>('create_task_for_goal', { goalId, title })
  return TaskCodec.fromRust(task)
}

export async function createGoal(input: {
  title: string
  area?: string
  description: string
  status: GoalCard['status']
}) {
  const goal = await invoke<RustGoalCard>('create_goal', {
    title: input.title,
    area: input.area?.trim() || '未分类',
    description: input.description,
    status: input.status,
  })
  return GoalCodec.fromRust(goal)
}

export async function updateGoalFields(
  goalId: string,
  input: {
    title: string
    area?: string
    description: string
  },
) {
  const goal = await invoke<RustGoalCard>('update_goal_fields', {
    goalId,
    title: input.title,
    area: input.area?.trim() || '未分类',
    description: input.description,
  })
  return GoalCodec.fromRust(goal)
}

export async function updateGoalStatus(goalId: string, status: GoalCard['status']) {
  const goal = await invoke<RustGoalCard>('update_goal_status', { goalId, status })
  return GoalCodec.fromRust(goal)
}

export async function updateTaskContent(taskId: string, content: string) {
  const task = await invoke<RustTask>('update_task_content', { taskId, content })
  return TaskCodec.fromRust(task)
}

export async function updateTaskFields(
  taskId: string,
    input: {
      title: string
      plannedStartAt?: Date
      dueAt?: Date
      linkedGoalId?: string
      linkedGoalLabel?: string
      showInTimeline?: boolean
    },
) {
  const task = await invoke<RustTask>('update_task_fields', {
    taskId,
    title: input.title,
    plannedStartAt: input.plannedStartAt?.toISOString() ?? null,
    dueAt: input.dueAt?.toISOString() ?? null,
    showInTimeline: input.showInTimeline ?? false,
    linkedGoalId: input.linkedGoalId ?? null,
    linkedGoalLabel: input.linkedGoalLabel ?? null,
  })
  return TaskCodec.fromRust(task)
}

export async function updateTaskStatus(taskId: string, status: TaskStatus, note?: string) {
  const task = await invoke<RustTask>('update_task_status', { taskId, status, note })
  return TaskCodec.fromRust(task)
}

export async function addTaskNote(taskId: string, note: string) {
  const task = await invoke<RustTask>('add_task_note', { taskId, note })
  return TaskCodec.fromRust(task)
}

export async function openTaskInBear(taskId: string) {
  return invoke('open_task_in_bear', { taskId })
}

export async function showQuickCaptureWindow() {
  return invoke('show_quick_capture_window')
}

export async function setSystemReminderCompleted(reminderId: string, done: boolean) {
  const reminder = await invoke<RustReminder>('set_system_reminder_completed', { reminderId, done })
  return {
    id: reminder.id,
    title: reminder.title,
    dueAt: reminder.dueAt ? new Date(reminder.dueAt) : undefined,
    done: reminder.done,
    listTitle: reminder.listTitle,
  }
}

// Area Management APIs

export async function listAreas() {
  const areas = await invoke<AreaWithStats[]>('list_areas')
  return areas
}

export async function createArea(title: string) {
  return invoke<{ id: string; title: string }>('create_area', { title })
}

export async function renameArea(areaId: string, newTitle: string) {
  return invoke<{ id: string; title: string }>('rename_area', { areaId, newTitle })
}

export async function deleteArea(areaId: string, force: boolean = false) {
  const result = await invoke<{
    success: boolean
    message: string
    affectedGoalCount: number
    reassignedToAreaId?: string
  }>('delete_area', { areaId, force })
  return result
}

// EventKit Permission Management APIs

export type AuthorizationStatus = 'granted' | 'denied' | 'not_determined' | 'restricted' | 'error'

export async function requestCalendarAccess(): Promise<AuthorizationStatus> {
  if (!isTauriRuntime()) {
    // Browser preview: mock granted
    return 'granted'
  }
  return invoke<AuthorizationStatus>('request_calendar_access')
}

export async function requestRemindersAccess(): Promise<AuthorizationStatus> {
  if (!isTauriRuntime()) {
    // Browser preview: mock granted
    return 'granted'
  }
  return invoke<AuthorizationStatus>('request_reminders_access')
}

interface CalendarEvent {
  id: string
  title: string
  startsAt: string
  endsAt: string
  calendarTitle?: string
}

interface Reminder {
  id: string
  title: string
  dueAt?: string
  done: boolean
  listTitle?: string
}

export async function fetchCalendarEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
  if (!isTauriRuntime()) {
    // Browser preview: return mock data
    return []
  }
  return invoke<CalendarEvent[]>('fetch_calendar_events', {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  })
}

export async function fetchReminders(): Promise<Reminder[]> {
  if (!isTauriRuntime()) {
    // Browser preview: return mock data
    return []
  }
  return invoke<Reminder[]>('fetch_reminders')
}
