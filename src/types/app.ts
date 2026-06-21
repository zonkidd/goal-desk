export interface TimelineItem {
  id: string
  title: string
  timeLabel: string
  startsAt?: Date // 完整的开始时间，用于日期分组和排序
  occurrenceDate?: Date // 该次出现对应的日期（多日任务展开时使用）
  source: 'todo' | 'reminder' | 'calendar'
  readonly: boolean
  done: boolean
  sourceLabel?: string
  linkedGoalId?: string // 关联的目标 ID（仅任务类型）
}

/**
 * 类型别名：明确 Timeline 的领域含义
 *
 * 架构说明：
 * - RawAgendaItem: 来自 EventKit/Rust 的原始数据，未经过滤
 * - TodayAgenda: 过滤到今天的议程项数组（领域概念）
 * - AgendaViewModel: UI 渲染所需的格式化数据
 * - GroupedAgenda: 按日期分组的议程（用于周视图）
 */

/**
 * 原始议程项 - 来自 EventKit 或 Rust 的未经处理数据
 */
export type RawAgendaItem = TimelineItem

/**
 * 今日议程 - 经过时间过滤的议程项数组
 * 包含今天的事件和未完成的任务
 */
export type TodayAgenda = ReadonlyArray<TimelineItem>

/**
 * 议程视图模型 - 用于 UI 渲染的格式化数据
 * 包含所有必要的显示信息（标题、时间、来源等）
 */
export type AgendaViewModel = TimelineItem

/**
 * 按日期分组的议程 - 用于周视图
 */
export type GroupedAgenda = ReadonlyMap<string, ReadonlyArray<TimelineItem>>

export type GoalStatus = 'ACTIVE' | 'PAUSED' | 'READY_TO_COMPLETE' | 'COMPLETED' | 'ARCHIVED'

export interface GoalCard {
  id: string
  title: string
  area: string
  description: string
  status: GoalStatus
  progress: number
  nextTodo: string
  taskCount: number
}

export interface AreaOption {
  value: string
  label: string
  goalCount: number
}

export interface AreaWithStats {
  id: string
  title: string
  goalCount: number
  activeGoalCount: number
  isSystem: boolean
}

export type ViewKey = 'inbox' | 'today' | 'board' | 'goals' | 'areas' | 'calendar' | 'reminders'
export type AreaFilter = 'ALL' | string

export type AccessStatus = 'granted' | 'denied' | 'restricted' | 'not_determined' | 'error'

export interface ReminderItem {
  id: string
  title: string
  dueAt?: Date
  done: boolean
  listTitle?: string
}

export interface IntegrationStatus {
  calendar: AccessStatus
  reminders: AccessStatus
}
