import { invoke } from '@tauri-apps/api/core'
import type { AreaWithStats, GoalCard } from '../types/app'
import type { BearIntegrationStatus, BearNotePreview, RustBearNotePreview } from '../types/bear'
import type { Task, TaskChecklistItem, TaskStatus } from '../types/task'
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

export async function updateTaskChecklists(taskId: string, items: TaskChecklistItem[]): Promise<Task> {
  const task = await invoke<RustTask>('update_task_checklists', { taskId, items })
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

export function bearNotePreviewFromRust(rust: RustBearNotePreview): BearNotePreview {
  return {
    taskId: rust.taskId,
    bearNoteId: rust.bearNoteId,
    title: rust.title,
    note: rust.note,
    tags: rust.tags,
    isTrashed: rust.isTrashed,
    modificationDate: rust.modificationDate ? new Date(rust.modificationDate) : undefined,
    creationDate: rust.creationDate ? new Date(rust.creationDate) : undefined,
    fetchedAt: new Date(rust.fetchedAt),
  }
}

export async function getBearIntegrationStatus(): Promise<BearIntegrationStatus> {
  return invoke<BearIntegrationStatus>('get_bear_integration_status')
}

export async function saveBearApiToken(token: string): Promise<BearIntegrationStatus> {
  return invoke<BearIntegrationStatus>('save_bear_api_token', { token })
}

export async function clearBearApiToken(): Promise<BearIntegrationStatus> {
  return invoke<BearIntegrationStatus>('clear_bear_api_token')
}

export async function linkSelectedBearNote(taskId: string): Promise<void> {
  return invoke('link_selected_bear_note', { taskId })
}

export async function refreshBearNotePreview(taskId: string): Promise<void> {
  return invoke('refresh_bear_note_preview', { taskId })
}

export async function getBearNotePreview(taskId: string): Promise<BearNotePreview | undefined> {
  const preview = await invoke<RustBearNotePreview | null>('get_bear_note_preview', { taskId })
  return preview ? bearNotePreviewFromRust(preview) : undefined
}

export async function unlinkBearNote(taskId: string): Promise<Task> {
  const task = await invoke<RustTask>('unlink_bear_note', { taskId })
  return TaskCodec.fromRust(task)
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

// ============================================================================
// Daily Review Commands
// ============================================================================

import type { DailyReviewItem, DailyReviewBlock } from '../types/dailyReview'
import { DailyReviewCodec, type RustDailyReviewItem } from './codecs'

export async function createDailyReviewItem(date: string, blocks: DailyReviewBlock[]): Promise<DailyReviewItem> {
  const item = await invoke<RustDailyReviewItem>('create_daily_review_item', { date, blocks })
  return DailyReviewCodec.fromRust(item)
}

export async function updateDailyReviewItem(id: string, blocks: DailyReviewBlock[]): Promise<DailyReviewItem> {
  const item = await invoke<RustDailyReviewItem>('update_daily_review_item', { id, blocks })
  return DailyReviewCodec.fromRust(item)
}

export async function deleteDailyReviewItem(id: string): Promise<void> {
  return invoke('delete_daily_review_item', { id })
}

export async function getDailyReviewTimeline(limit?: number, beforeDate?: string): Promise<DailyReviewItem[]> {
  const items = await invoke<RustDailyReviewItem[]>('get_daily_review_timeline', { limit, beforeDate })
  return DailyReviewCodec.fromRustArray(items)
}

// ============================================================================
// System Commands
// ============================================================================

export async function exportDatabase(targetPath: string): Promise<void> {
  return invoke('export_database', { targetPath })
}

export async function importDatabase(sourcePath: string): Promise<void> {
  return invoke('import_database', { sourcePath })
}
