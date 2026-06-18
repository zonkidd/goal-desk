import { DerivationEngine, signal, type Signal } from './index'
import { getTodayFocusTasks, getInboxTaskGroups, deriveTodayAttentionGroups } from '../lib/workspaceDerivation'
import type { Task } from '../types/task'
import type { GoalCard, AreaFilter } from '../types/app'

/**
 * Reactive Derivations - 注册所有派生状态到响应式引擎
 *
 * 这些派生状态会自动追踪依赖并按需重算
 */

/**
 * 创建响应式派生状态
 * @param tasksSignal 任务 Signal
 * @param goalsSignal 目标 Signal
 * @param areaSignal 领域筛选 Signal
 * @param showCompletedSignal 是否显示已完成任务 Signal
 */
export function createReactivDerivations(
  engine: DerivationEngine,
  tasksSignal: Signal<Task[]>,
  goalsSignal: Signal<GoalCard[]>,
  areaSignal: Signal<AreaFilter>,
  showCompletedSignal: Signal<boolean>
) {
  // 注册 todayFocusTasks 派生
  const todayFocusTasks$ = engine.register('todayFocusTasks', () => {
    return getTodayFocusTasks(
      tasksSignal.value,
      goalsSignal.value,
      areaSignal.value,
      new Date()
    )
  })

  // 注册 inbox 派生
  const inbox$ = engine.register('inbox', () => {
    return getInboxTaskGroups(
      tasksSignal.value,
      showCompletedSignal.value
    )
  })

  // 注册 todayAttentionGroups 派生
  const todayAttentionGroups$ = engine.register('todayAttentionGroups', () => {
    return deriveTodayAttentionGroups(
      tasksSignal.value,
      new Date()
    )
  })

  return {
    todayFocusTasks$,
    inbox$,
    todayAttentionGroups$,
  }
}
