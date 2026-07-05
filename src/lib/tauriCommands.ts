import { invoke } from '@tauri-apps/api/core'
import type { AreaWithStats, GoalCard } from '../types/app'
import type { Task, TaskStatus } from '../types/task'
import { TaskCodec, GoalCodec, type RustTask, type RustGoalCard } from './codecs'
import { UNCATEGORIZED_AREA_TITLE } from './constants'
import { coerceTodoFieldPatchInput, toTauriTaskFieldArgs } from './todoFieldPatch'

// ============================================================================
// Task Commands
// ============================================================================

export async function captureTask(input: string): Promise<Task> {
  const task = await invoke<RustTask>('capture_task', { input })
  return TaskCodec.fromRust(task)
}

export async function createTaskForGoal(goalId: string, title: string): Promise<Task> {
  const task = await invoke<RustTask>('create_task_for_goal', { goalId, title })
  return TaskCodec.fromRust(task)
}

export async function updateTaskContent(taskId: string, content: string): Promise<Task> {
  const task = await invoke<RustTask>('update_task_content', { taskId, content })
  return TaskCodec.fromRust(task)
}

export async function updateTaskFields(
  taskId: string,
  input: {
    title: string
    plannedStartAt?: Date | null
    dueAt?: Date | null
    linkedGoalId?: string
    linkedGoalLabel?: string
    showInTimeline?: boolean
    systemReminderId?: string | null
  },
): Promise<Task> {
  const task = await invoke<RustTask>('update_task_fields', toTauriTaskFieldArgs(taskId, coerceTodoFieldPatchInput({
    ...input,
    dueDate: input.dueAt,
  })))
  return TaskCodec.fromRust(task)
}

export async function updateTaskStatus(taskId: string, status: TaskStatus, note?: string): Promise<Task> {
  const task = await invoke<RustTask>('update_task_status', { taskId, status, note })
  return TaskCodec.fromRust(task)
}

export async function addTaskNote(taskId: string, note: string): Promise<Task> {
  const task = await invoke<RustTask>('add_task_note', { taskId, note })
  return TaskCodec.fromRust(task)
}

export async function loadTaskList(): Promise<Task[]> {
  const tasks = await invoke<RustTask[]>('desk_task_list')
  return tasks.map((item) => TaskCodec.fromRust(item))
}

// ============================================================================
// Goal Commands
// ============================================================================

export async function createGoal(input: {
  title: string
  area?: string
  description: string
  status: GoalCard['status']
}): Promise<GoalCard> {
  const goal = await invoke<RustGoalCard>('create_goal', {
    title: input.title,
    area: input.area?.trim() || UNCATEGORIZED_AREA_TITLE,
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
): Promise<GoalCard> {
  const goal = await invoke<RustGoalCard>('update_goal_fields', {
    goalId,
    title: input.title,
    area: input.area?.trim() || UNCATEGORIZED_AREA_TITLE,
    description: input.description,
  })
  return GoalCodec.fromRust(goal)
}

export async function updateGoalStatus(goalId: string, status: GoalCard['status']): Promise<GoalCard> {
  const goal = await invoke<RustGoalCard>('update_goal_status', { goalId, status })
  return GoalCodec.fromRust(goal)
}

export async function loadGoalList(): Promise<GoalCard[]> {
  const goals = await invoke<RustGoalCard[]>('goal_snapshot')
  return goals.map((item) => GoalCodec.fromRust(item))
}

// ============================================================================
// Area Commands
// ============================================================================

export async function listAreas(): Promise<AreaWithStats[]> {
  return invoke<AreaWithStats[]>('list_areas')
}

export async function createArea(title: string): Promise<{ id: string; title: string }> {
  return invoke<{ id: string; title: string }>('create_area', { title })
}

export async function renameArea(areaId: string, newTitle: string): Promise<{ id: string; title: string }> {
  return invoke<{ id: string; title: string }>('rename_area', { areaId, newTitle })
}

export async function deleteArea(
  areaId: string,
  force: boolean = false,
): Promise<{
  success: boolean
  message: string
  affectedGoalCount: number
  reassignedToAreaId?: string
}> {
  return invoke('delete_area', { areaId, force })
}

// ============================================================================
// Window & Integration Commands
// ============================================================================

export async function openTaskInBear(taskId: string): Promise<void> {
  return invoke('open_task_in_bear', { taskId })
}

export async function showQuickCaptureWindow(): Promise<void> {
  return invoke('show_quick_capture_window')
}

export async function openUrl(url: string): Promise<void> {
  return invoke('open_url', { url })
}

// ============================================================================
// Soft Delete & Restore Commands
// ============================================================================

export async function softDeleteTask(taskId: string): Promise<void> {
  return invoke('soft_delete_task', { taskId })
}

export async function restoreTask(taskId: string): Promise<Task> {
  const task = await invoke<RustTask>('restore_task', { taskId })
  return TaskCodec.fromRust(task)
}

export async function listDeletedTasks(): Promise<Task[]> {
  const tasks = await invoke<RustTask[]>('list_deleted_tasks')
  return tasks.map((item) => TaskCodec.fromRust(item))
}

export async function softDeleteGoal(goalId: string): Promise<void> {
  return invoke('soft_delete_goal', { goalId })
}

export async function restoreGoal(goalId: string): Promise<GoalCard> {
  const goal = await invoke<RustGoalCard>('restore_goal', { goalId })
  return GoalCodec.fromRust(goal)
}

export async function listDeletedGoals(): Promise<GoalCard[]> {
  const goals = await invoke<RustGoalCard[]>('list_deleted_goals')
  return goals.map((item) => GoalCodec.fromRust(item))
}
