/**
 * Desktop API - 前端与 Tauri 后端的统一接口层
 *
 * 本文件作为 re-export 层，保持向后兼容。
 * 实际功能已拆分到：
 * - runtime.ts - Runtime 检测、窗口管理
 * - tauriCommands.ts - Tauri invoke 封装
 * - eventkitIntegration.ts - EventKit 集成、Timeline 构建
 */

import type { GoalCard, IntegrationStatus, ReminderItem, TimelineItem } from '../types/app'
import type { Task } from '../types/task'
import * as tauriCommands from './tauriCommands'
import * as eventkitIntegration from './eventkitIntegration'

// ============================================================================
// Re-exports from runtime.ts
// ============================================================================

export { isTauriRuntime, getCurrentWindowLabel, hideCurrentWindow } from './runtime'

// ============================================================================
// Re-exports from tauriCommands.ts
// ============================================================================

export {
  // Task Commands
  captureTask,
  createTaskForGoal,
  updateTaskContent,
  updateTaskFields,
  updateTaskStatus,
  addTaskNote,
  loadTaskList,
  // Goal Commands
  createGoal,
  updateGoalFields,
  updateGoalStatus,
  loadGoalList,
  // Area Commands
  listAreas,
  createArea,
  renameArea,
  deleteArea,
  // Window & Integration Commands
  openTaskInBear,
  showQuickCaptureWindow,
  openUrl,
  // EventKit Commands
  createSystemReminder,
} from './tauriCommands'

// ============================================================================
// Re-exports from eventkitIntegration.ts
// ============================================================================

export {
  // Types
  type AuthorizationStatus,
  type CalendarEvent,
  type Reminder,
  // Authorization
  requestCalendarAccess,
  requestRemindersAccess,
  // System Integration
  openCalendarEvent,
  openSystemReminder,
  setSystemReminderCompleted,
  // Data Fetching
  fetchCalendarEvents,
  fetchReminders,
  loadCalendarRange,
  loadEventKitSnapshot,
} from './eventkitIntegration'

// ============================================================================
// Composite Operations
// ============================================================================

/**
 * 加载完整的桌面快照
 * 包括 Tasks、Goals、EventKit 数据，并构建 Timeline
 */
export async function loadDesktopSnapshot(): Promise<{
  timeline: TimelineItem[]
  goals: GoalCard[]
  tasks: Task[]
  systemReminders: ReminderItem[]
  integrationStatus: IntegrationStatus
}> {
  // 并行加载 tasks 和 goals
  const [tasks, goals] = await Promise.all([
    tauriCommands.loadTaskList(),
    tauriCommands.loadGoalList(),
  ])

  // 使用 tasks 构建 EventKit snapshot
  const eventkitData = await eventkitIntegration.loadEventKitSnapshot(tasks)

  return {
    timeline: eventkitData.timeline,
    goals,
    tasks,
    systemReminders: eventkitData.systemReminders,
    integrationStatus: eventkitData.integrationStatus,
  }
}
