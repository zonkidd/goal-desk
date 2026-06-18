/**
 * appStore 类型定义
 *
 * 从原 appStore.ts 提取的接口定义，
 * 用于向后兼容适配层
 */

import type { AreaFilter, AreaWithStats, GoalCard, GoalStatus, IntegrationStatus, ReminderItem, RawAgendaItem, ViewKey } from '../types/app'
import type { Task, TaskStatus } from '../types/task'
import type { InboxTaskGroups, TodayAttentionGroups, TodayRelevantGoal } from '../lib/workspaceDerivation'
import type { AuthorizationStatus } from '../lib/desktopApi'

export interface HydratePayload {
  tasks: Task[]
  timeline: RawAgendaItem[]
  goals: GoalCard[]
  systemReminders: ReminderItem[]
  integrationStatus: IntegrationStatus
  statusMessage: string
}

export interface AppStoreState {
  currentView: ViewKey
  activeArea: AreaFilter
  allAreas: AreaWithStats[]
  tasks: Task[]
  todayFocusTasks: Task[]
  todayAttentionGroups: TodayAttentionGroups
  todayRelevantGoals: TodayRelevantGoal[]
  inbox: InboxTaskGroups
  showCompletedTodos: boolean
  baseTimeline: RawAgendaItem[]
  baseGoals: GoalCard[]
  systemReminders: ReminderItem[]
  integrationStatus: IntegrationStatus
  eventkitPermissions: {
    calendar: AuthorizationStatus
    reminders: AuthorizationStatus
  }
  eventkitData: {
    calendarEventCount: number
    reminderCount: number
  }
  selectedTaskId?: string
  selectedGoalId?: string
  selectedReminderId?: string
  statusMessage: string
  isLoading: boolean
  isTaskDrawerOpen: boolean
  isGoalDrawerOpen: boolean
  isReminderDrawerOpen: boolean
  isCalendarEventDrawerOpen: boolean
  selectedCalendarEventId?: string
  isQuickCaptureOpen: boolean
  setView: (view: ViewKey) => void
  setActiveArea: (area: AreaFilter) => void
  hydrateApp: (payload: HydratePayload) => void
  setLoading: (value: boolean) => void
  setStatusMessage: (value: string) => void
  receiveExternalTask: (task: Task) => void
  openTaskDrawer: (taskId: string) => void
  closeTaskDrawer: () => void
  openGoalDrawer: (goalId: string) => void
  closeGoalDrawer: () => void
  openReminderDrawer: (reminderId?: string) => void
  closeReminderDrawer: () => void
  openCalendarEventDrawer: (eventId: string) => void
  closeCalendarEventDrawer: () => void
  openQuickCapture: () => void
  closeQuickCapture: () => void
  setShowCompletedTodos: (value: boolean) => void
  addTask: (title: string) => Promise<void>
  createGoal: (
    input: { title: string; area?: string; description?: string },
    options?: { openGoalWorkspace?: boolean },
  ) => Promise<string | undefined>
  updateGoalFields: (goalId: string, input: { title: string; area: string; description: string }) => Promise<void>
  updateGoalStatus: (goalId: string, status: GoalStatus) => Promise<void>
  createTaskForGoal: (goalId: string, title: string) => Promise<void>
  addTaskNote: (taskId: string, note: string) => Promise<void>
  updateTaskStatus: (taskId: string, status: TaskStatus, note?: string) => Promise<void>
  updateTaskContent: (taskId: string, content: string) => Promise<void>
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
  toggleSystemReminderDone: (reminderId: string, done: boolean) => Promise<void>
  loadAreas: () => Promise<void>
  createArea: (title: string) => Promise<void>
  renameArea: (areaId: string, newTitle: string) => Promise<void>
  deleteArea: (areaId: string, force?: boolean) => Promise<void>
  requestCalendarAccess: () => Promise<void>
  requestRemindersAccess: () => Promise<void>
  refreshEventkitData: () => Promise<void>
  linkTaskToReminder: (taskId: string, reminderId: string) => Promise<void>
  unlinkTaskFromReminder: (taskId: string) => Promise<void>
  createAndLinkReminder: (taskId: string, title: string, dueAt?: Date) => Promise<string>
}
