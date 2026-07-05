import type { AreaWithStats, GoalCard, GoalStatus } from '../types/app'
import type { Task, TaskStatus } from '../types/task'

export interface TaskResult {
  task?: Task
  statusMessage?: string
}

export interface GoalResult {
  goal?: GoalCard
  statusMessage?: string
  openGoalWorkspace?: boolean
}

export interface AreaResult {
  area?: AreaWithStats
  statusMessage?: string
}

export interface DeleteAreaResult {
  success: boolean
  message: string
  statusMessage?: string
}

export interface TaskMutation {
  createTask(title: string): Promise<TaskResult>
  createTaskForGoal(goal: GoalCard, title: string): Promise<TaskResult>
  addTaskNote(taskId: string, note: string): Promise<TaskResult>
  updateTaskStatus(taskId: string, status: TaskStatus, note?: string): Promise<TaskResult>
  updateTaskContent(taskId: string, content: string): Promise<TaskResult>
  updateTaskFields(
    taskId: string,
    input: {
      title: string
      plannedStartAt?: Date | null
      dueDate?: Date | null
      linkedGoalId?: string
      linkedGoalLabel?: string
      showInTimeline?: boolean
      systemReminderId?: string | null
    },
  ): Promise<TaskResult>
  softDeleteTask(taskId: string): Promise<void>
  restoreTask(taskId: string): Promise<TaskResult>
  listDeletedTasks(): Promise<Task[]>
}

export interface GoalMutation {
  createGoal(
    input: { title: string; area?: string; description?: string },
    options?: { openGoalWorkspace?: boolean },
  ): Promise<GoalResult & { openGoalWorkspace: boolean }>
  updateGoalFields(goalId: string, input: { title: string; area: string; description: string }): Promise<GoalResult>
  updateGoalStatus(goalId: string, status: GoalStatus): Promise<GoalResult>
  softDeleteGoal(goalId: string): Promise<void>
  restoreGoal(goalId: string): Promise<GoalResult>
  listDeletedGoals(): Promise<GoalCard[]>
}

export interface AreaMutation {
  listAreas(): Promise<{ areas?: AreaWithStats[]; statusMessage?: string }>
  createArea(title: string): Promise<AreaResult>
  renameArea(areaId: string, newTitle: string): Promise<AreaResult>
  deleteArea(areaId: string, force?: boolean): Promise<DeleteAreaResult>
}

export interface QueryAdapter {
  loadGoals(): Promise<GoalCard[]>
}

export type MutationAdapter = TaskMutation & GoalMutation & AreaMutation & QueryAdapter
