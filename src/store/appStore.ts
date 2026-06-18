/**
 * appStore - 新架构统一入口
 *
 * 提供与旧 appStore 相同的接口，但底层使用新的多 store 架构
 */

export { useUiStore } from './uiStore'
export { useTaskStore } from './taskStore'
export { useGoalStore } from './goalStore'
export { useEventkitStore } from './eventkitStore'

// 便捷组合 hooks
export {
  useStoreMessageBridge,
  useDerivedStateSync,
  useAppHydration,
  useReceiveExternalTask,
  useToggleSystemReminder,
  useReloadWorkspaceAfterAreaChange,
  useTodayViewModel,
  useInboxViewModel,
} from '../hooks/useStoreComposition'

// 便捷选择器 - 重新实现以使用新 stores
export { selectFilteredTimeline, selectDerivedGoals, selectFilteredGoals } from './appStore.selectors'

// 类型定义
export type { AppStoreState, HydratePayload } from './appStore.types'

// 向后兼容的 useAppStore - 组合所有 stores
import { useMemo } from 'react'
import { useUiStore } from './uiStore'
import { useTaskStore } from './taskStore'
import { useGoalStore } from './goalStore'
import { useEventkitStore } from './eventkitStore'

export function useAppStore<T>(selector: (state: any) => T): T {
  // 只订阅 selector 实际使用的 store 切片
  // 使用细粒度选择器避免不必要的重渲染
  const uiState = useUiStore()
  const taskState = useTaskStore()
  const goalState = useGoalStore()
  const eventkitState = useEventkitStore()

  // 使用 useMemo 缓存组合状态，只在依赖变化时重新创建
  const composedState = useMemo(() => ({
    // UI state
    ...uiState,
    // Task state
    tasks: taskState.tasks,
    todayFocusTasks: taskState.todayFocusTasks,
    todayAttentionGroups: taskState.todayAttentionGroups,
    inbox: taskState.inbox,
    // Goal state
    baseGoals: goalState.baseGoals,
    todayRelevantGoals: goalState.todayRelevantGoals,
    // EventKit state
    baseTimeline: eventkitState.baseTimeline,
    systemReminders: eventkitState.systemReminders,
    integrationStatus: eventkitState.integrationStatus,
    eventkitPermissions: eventkitState.eventkitPermissions,
    eventkitData: eventkitState.eventkitData,
    // Task actions
    addTask: taskState.addTask,
    createTaskForGoal: taskState.createTaskForGoal,
    addTaskNote: taskState.addTaskNote,
    updateTaskStatus: taskState.updateTaskStatus,
    updateTaskContent: taskState.updateTaskContent,
    updateTaskFields: taskState.updateTaskFields,
    linkTaskToReminder: taskState.linkTaskToReminder,
    unlinkTaskFromReminder: taskState.unlinkTaskFromReminder,
    createAndLinkReminder: taskState.createAndLinkReminder,
    // Goal actions
    createGoal: goalState.createGoal,
    updateGoalFields: goalState.updateGoalFields,
    updateGoalStatus: goalState.updateGoalStatus,
    // EventKit actions
    toggleSystemReminderDone: eventkitState.toggleSystemReminderDone,
    requestCalendarAccess: eventkitState.requestCalendarAccess,
    requestRemindersAccess: eventkitState.requestRemindersAccess,
    refreshEventkitData: eventkitState.refreshEventkitData,
  }), [uiState, taskState, goalState, eventkitState])

  return useMemo(() => selector(composedState), [composedState, selector])
}

// 便捷选择器
export function useSelectedTask() {
  const selectedTaskId = useUiStore((state) => state.selectedTaskId)
  return useTaskStore((state) => state.tasks.find((task) => task.id === selectedTaskId))
}

export function useSelectedGoal() {
  const selectedGoalId = useUiStore((state) => state.selectedGoalId)
  return useGoalStore((state) => state.baseGoals.find((goal) => goal.id === selectedGoalId))
}
