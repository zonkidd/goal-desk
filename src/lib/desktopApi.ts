import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import type { AreaWithStats, GoalCard, IntegrationStatus, ReminderItem, TimelineItem } from '../types/app'
import type { Task, TaskActivityAction, TaskStatus } from '../types/task'

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


interface RustTimelineItem {
  id: string
  title: string
  startsAt: string
  source: TimelineItem['source']
  readOnly: boolean
  completed: boolean
  sourceLabel?: string
}

interface RustGoalCard {
  id: string
  title: string
  area: string
  description: string
  status: GoalCard['status']
  progress: number
  taskCount: number
  nextTodo: string
}

interface RustTask {
  id: string
  title: string
  content: string
  status: TaskStatus
  plannedStartAt?: string
  dueAt?: string
  showInTimeline: boolean
  linkedGoalId?: string
  linkedGoalLabel?: string
  bearNoteId?: string
  systemReminderId?: string
  activityLogs: Array<{
    action: TaskActivityAction
    note?: string
    timestamp: string
  }>
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

function mergeSystemTimeline(localItems: TimelineItem[], snapshot?: RustSystemSnapshot): TimelineItem[] {
  if (!snapshot) return localItems

  const today = startOfToday()
  const systemItems: Array<TimelineItem & { sortAt: number }> = []

  snapshot.calendarEvents.forEach((event) => {
    const startsAt = new Date(event.startsAt)
    if (Number.isNaN(startsAt.getTime()) || !sameDay(startsAt, today)) return

    systemItems.push({
      id: event.id,
      title: event.title,
      timeLabel: formatTimeLabel(event.startsAt),
      source: 'calendar',
      readonly: true,
      done: false,
      sourceLabel: event.calendarTitle,
      sortAt: startsAt.getHours() * 60 + startsAt.getMinutes(),
    })
  })

  snapshot.reminders.forEach((reminder) => {
    if (!reminder.dueAt) return
    const dueAt = new Date(reminder.dueAt)
    if (Number.isNaN(dueAt.getTime()) || !sameDay(dueAt, today)) return

    systemItems.push({
      id: reminder.id,
      title: reminder.title,
      timeLabel: formatTimeLabel(reminder.dueAt),
      source: 'reminder',
      readonly: false,
      done: reminder.done,
      sourceLabel: reminder.listTitle,
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
  const normalizedGoals: GoalCard[] = goals.map((item) => ({
    id: item.id,
    title: item.title,
    area: item.area,
    description: item.description,
    status: item.status,
    progress: item.progress,
    nextTodo: item.nextTodo,
    taskCount: item.taskCount,
    createdAt: new Date(),
    updatedAt: new Date(),
  }))

  // Convert tasks with date parsing
  const normalizedTasks: Task[] = tasks.map((item) => ({
    id: item.id,
    title: item.title,
    content: item.content,
    status: item.status,
    plannedStartAt: item.plannedStartAt ? new Date(item.plannedStartAt) : undefined,
    dueDate: item.dueAt ? new Date(item.dueAt) : undefined,
    showInTimeline: item.showInTimeline,
    linkedGoalId: item.linkedGoalId,
    linkedGoalLabel: item.linkedGoalLabel,
    bearNoteId: item.bearNoteId,
    systemReminderId: item.systemReminderId,
    activityLogs: item.activityLogs.map((log) => ({
      action: log.action,
      note: log.note,
      timestamp: new Date(log.timestamp),
    })),
  }))

  // Convert system reminders
  const systemReminders: ReminderItem[] = systemSnapshot?.reminders.map((item) => ({
    id: item.id,
    title: item.title,
    dueAt: item.dueAt ? new Date(item.dueAt) : undefined,
    done: item.done,
    listTitle: item.listTitle,
  })) || []

  return {
    timeline: mergeSystemTimeline(localTimeline, systemSnapshot),
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
  return {
    id: task.id,
    title: task.title,
    content: task.content,
    status: task.status,
    plannedStartAt: task.plannedStartAt ? new Date(task.plannedStartAt) : undefined,
    dueDate: task.dueAt ? new Date(task.dueAt) : undefined,
    showInTimeline: task.showInTimeline,
    linkedGoalId: task.linkedGoalId,
    linkedGoalLabel: task.linkedGoalLabel,
    bearNoteId: task.bearNoteId,
    systemReminderId: task.systemReminderId,
    activityLogs: task.activityLogs.map((log) => ({
      action: log.action,
      note: log.note,
      timestamp: new Date(log.timestamp),
    })),
  }
}

export async function createTaskForGoal(goalId: string, title: string) {
  const task = await invoke<RustTask>('create_task_for_goal', { goalId, title })
  return {
    id: task.id,
    title: task.title,
    content: task.content,
    status: task.status,
    plannedStartAt: task.plannedStartAt ? new Date(task.plannedStartAt) : undefined,
    dueDate: task.dueAt ? new Date(task.dueAt) : undefined,
    showInTimeline: task.showInTimeline,
    linkedGoalId: task.linkedGoalId,
    linkedGoalLabel: task.linkedGoalLabel,
    bearNoteId: task.bearNoteId,
    systemReminderId: task.systemReminderId,
    activityLogs: task.activityLogs.map((log) => ({
      action: log.action,
      note: log.note,
      timestamp: new Date(log.timestamp),
    })),
  }
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
  return {
    id: goal.id,
    title: goal.title,
    area: goal.area,
    description: goal.description,
    status: goal.status,
    progress: goal.progress,
    nextTodo: goal.nextTodo,
    taskCount: goal.taskCount,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
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
  return {
    id: goal.id,
    title: goal.title,
    area: goal.area,
    description: goal.description,
    status: goal.status,
    progress: goal.progress,
    nextTodo: goal.nextTodo,
    taskCount: goal.taskCount,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

export async function updateGoalStatus(goalId: string, status: GoalCard['status']) {
  const goal = await invoke<RustGoalCard>('update_goal_status', { goalId, status })
  return {
    id: goal.id,
    title: goal.title,
    area: goal.area,
    description: goal.description,
    status: goal.status,
    progress: goal.progress,
    nextTodo: goal.nextTodo,
    taskCount: goal.taskCount,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

export async function updateTaskContent(taskId: string, content: string) {
  const task = await invoke<RustTask>('update_task_content', { taskId, content })
  return {
    id: task.id,
    title: task.title,
    content: task.content,
    status: task.status,
    plannedStartAt: task.plannedStartAt ? new Date(task.plannedStartAt) : undefined,
    dueDate: task.dueAt ? new Date(task.dueAt) : undefined,
    showInTimeline: task.showInTimeline,
    linkedGoalId: task.linkedGoalId,
    linkedGoalLabel: task.linkedGoalLabel,
    bearNoteId: task.bearNoteId,
    systemReminderId: task.systemReminderId,
    activityLogs: task.activityLogs.map((log) => ({
      action: log.action,
      note: log.note,
      timestamp: new Date(log.timestamp),
    })),
  }
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
  return {
    id: task.id,
    title: task.title,
    content: task.content,
    status: task.status,
    plannedStartAt: task.plannedStartAt ? new Date(task.plannedStartAt) : undefined,
    dueDate: task.dueAt ? new Date(task.dueAt) : undefined,
    showInTimeline: task.showInTimeline,
    linkedGoalId: task.linkedGoalId,
    linkedGoalLabel: task.linkedGoalLabel,
    bearNoteId: task.bearNoteId,
    systemReminderId: task.systemReminderId,
    activityLogs: task.activityLogs.map((log) => ({
      action: log.action,
      note: log.note,
      timestamp: new Date(log.timestamp),
    })),
  }
}

export async function updateTaskStatus(taskId: string, status: TaskStatus, note?: string) {
  const task = await invoke<RustTask>('update_task_status', { taskId, status, note })
  return {
    id: task.id,
    title: task.title,
    content: task.content,
    status: task.status,
    plannedStartAt: task.plannedStartAt ? new Date(task.plannedStartAt) : undefined,
    dueDate: task.dueAt ? new Date(task.dueAt) : undefined,
    showInTimeline: task.showInTimeline,
    linkedGoalId: task.linkedGoalId,
    linkedGoalLabel: task.linkedGoalLabel,
    bearNoteId: task.bearNoteId,
    systemReminderId: task.systemReminderId,
    activityLogs: task.activityLogs.map((log) => ({
      action: log.action,
      note: log.note,
      timestamp: new Date(log.timestamp),
    })),
  }
}

export async function addTaskNote(taskId: string, note: string) {
  const task = await invoke<RustTask>('add_task_note', { taskId, note })
  return {
    id: task.id,
    title: task.title,
    content: task.content,
    status: task.status,
    plannedStartAt: task.plannedStartAt ? new Date(task.plannedStartAt) : undefined,
    dueDate: task.dueAt ? new Date(task.dueAt) : undefined,
    showInTimeline: task.showInTimeline,
    linkedGoalId: task.linkedGoalId,
    linkedGoalLabel: task.linkedGoalLabel,
    bearNoteId: task.bearNoteId,
    systemReminderId: task.systemReminderId,
    activityLogs: task.activityLogs.map((log) => ({
      action: log.action,
      note: log.note,
      timestamp: new Date(log.timestamp),
    })),
  }
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
