/**
 * 新架构统一入口
 *
 * 提供向后兼容的接口，同时导出新架构组件
 */

// ===== 新架构组件 =====
export { EventBus } from '../events/EventBus'
export type { DomainEvent } from '../events/DomainEvents'

export { DerivationEngine, signal, computed, effect, batch, useSignal } from '../reactive'
export type { Signal, ReadonlySignal } from '../reactive'

export { TaskCommands } from '../commands/TaskCommands'
export { GoalCommands } from '../commands/GoalCommands'

export { createTaskStore } from './taskStore.refactored'
export { createGoalStore } from './goalStore.refactored'

export { createReactivDerivations } from '../reactive/derivations'

export { EditingSession } from '../editing/EditingSession'
export { TaskEditingSession } from '../editing/TaskEditingSession'

// ===== 向后兼容层（可选） =====
// 旧组件可以继续使用原 appStore.old.ts
// 新组件应该使用上面导出的新架构组件
