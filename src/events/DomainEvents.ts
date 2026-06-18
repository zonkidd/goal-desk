import type { Task } from '../types/task'
import type { GoalCard } from '../types/app'

/**
 * 领域事件类型定义
 * 记录系统中发生的业务事实
 */
export type DomainEvent =
  | { type: 'task.created'; payload: Task }
  | { type: 'task.updated'; payload: Task }
  | { type: 'task.deleted'; payload: { taskId: string } }
  | { type: 'goal.created'; payload: GoalCard }
  | { type: 'goal.updated'; payload: GoalCard }
  | { type: 'goal.deleted'; payload: { goalId: string } }
  | { type: 'area.changed'; payload: { area: string } }
