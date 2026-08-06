/**
 * 序列化层：统一处理 Rust ↔ TypeScript 类型转换
 *
 * 职责：
 * - 集中所有类型转换逻辑
 * - 提供单一测试点
 * - 消除 desktopApi.ts 中的重复代码
 */

import type { Task } from '../types/task'
import type { GoalCard } from '../types/app'

// Rust 类型定义
export interface RustTask {
  id: string
  title: string
  content: string
  status: Task['status']
  plannedStartAt: string | null
  dueAt: string | null
  showInTimeline: boolean
  linkedGoalId: string | null
  linkedGoalLabel: string | null
  bearNoteId: string | null
  systemReminderId: string | null
  activityLogs: Array<{
    action: string
    note: string | null
    timestamp: string
  }>
  deletedAt?: string | null
}

export interface RustGoalCard {
  id: string
  title: string
  area: string
  description: string
  status: GoalCard['status']
  progress: number
  nextTodo: string | null
  taskCount: number
}

/**
 * Task 编解码器
 */
export class TaskCodec {
  /**
   * Rust Task → TypeScript Task
   */
  static fromRust(rust: RustTask): Task {
    return {
      id: rust.id,
      title: rust.title,
      content: rust.content,
      status: rust.status,
      plannedStartAt: rust.plannedStartAt ? new Date(rust.plannedStartAt) : undefined,
      dueDate: rust.dueAt ? new Date(rust.dueAt) : undefined,
      showInTimeline: rust.showInTimeline,
      linkedGoalId: rust.linkedGoalId ?? undefined,
      linkedGoalLabel: rust.linkedGoalLabel ?? undefined,
      bearNoteId: rust.bearNoteId ?? undefined,
      systemReminderId: rust.systemReminderId ?? undefined,
      deletedAt: rust.deletedAt ? new Date(rust.deletedAt) : undefined,
      activityLogs: rust.activityLogs.map(log => ({
        action: log.action as Task['activityLogs'][0]['action'],
        note: log.note ?? undefined,
        timestamp: new Date(log.timestamp),
      })),
    }
  }

  /**
   * 批量转换
   */
  static fromRustArray(rustArray: RustTask[]): Task[] {
    return rustArray.map(rust => TaskCodec.fromRust(rust))
  }
}

/**
 * GoalCard 编解码器
 */
export class GoalCodec {
  /**
   * Rust GoalCard → TypeScript GoalCard
   */
  static fromRust(rust: RustGoalCard): GoalCard {
    return {
      id: rust.id,
      title: rust.title,
      area: rust.area,
      description: rust.description,
      status: rust.status,
      progress: rust.progress,
      nextTodo: rust.nextTodo || '',
      taskCount: rust.taskCount,
    }
  }

  /**
   * 批量转换
   */
  static fromRustArray(rustArray: RustGoalCard[]): GoalCard[] {
    return rustArray.map(rust => GoalCodec.fromRust(rust))
  }
}

export interface RustDailyReviewBlock {
  id: string
  content: string
}

export interface RustDailyReviewItem {
  id: string
  date: string
  blocks: RustDailyReviewBlock[]
  createdAt: string
  updatedAt: string
}

export class DailyReviewCodec {
  static fromRust(rust: RustDailyReviewItem): import('../types/dailyReview').DailyReviewItem {
    return {
      id: rust.id,
      date: rust.date,
      blocks: rust.blocks.map(b => ({ id: b.id, content: b.content })),
      createdAt: new Date(rust.createdAt),
      updatedAt: new Date(rust.updatedAt),
    }
  }

  static fromRustArray(rustArray: RustDailyReviewItem[]): import('../types/dailyReview').DailyReviewItem[] {
    return rustArray.map(rust => DailyReviewCodec.fromRust(rust))
  }
}
