/**
 * appStore - 统一入口
 *
 * 组件直接使用具体 store（useTaskStore, useGoalStore 等），
 * 或通过 useWorkspaceDerived hook 获取派生数据。
 */

export { useUiStore } from './uiStore'
export { useTaskStore } from './taskStore'
export { useGoalStore } from './goalStore'
export { useEventkitStore } from './eventkitStore'
export { useAreaStore } from './areaStore'

export {
  useAppHydration,
  useReceiveExternalTask,
  useReloadWorkspaceAfterAreaChange,
} from '../hooks/useStoreComposition'

export type { HydratePayload } from './appStore.types'

import { useUiStore } from './uiStore'
import { useTaskStore } from './taskStore'
import { useGoalStore } from './goalStore'

export function useSelectedTask() {
  const selectedTaskId = useUiStore((state) => state.activeDrawer?.type === 'task' ? state.activeDrawer.id : undefined)
  return useTaskStore((state) => state.tasks.find((task) => task.id === selectedTaskId))
}

export function useSelectedGoal() {
  const selectedGoalId = useUiStore((state) => state.activeDrawer?.type === 'goal' ? state.activeDrawer.id : undefined)
  return useGoalStore((state) => state.baseGoals.find((goal) => goal.id === selectedGoalId))
}
