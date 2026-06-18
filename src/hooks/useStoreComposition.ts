/**
 * 组合 hooks - 协调多个 stores 之间的交互
 *
 * 重构说明：
 * 1. 使用 WorkspaceEngine 替代 DerivedStateManager
 * 2. 引擎从各 store 读取原子状态，计算后返回快照
 * 3. 消除了跨 store 派生状态的订阅耦合
 */

import { useEffect } from 'react'
import { useUiStore } from '../store/uiStore'
import { useTaskStore } from '../store/taskStore'
import { useGoalStore } from '../store/goalStore'
import { useEventkitStore } from '../store/eventkitStore'
import { WorkspaceEngine, type ChangeType, type AtomicState } from '../lib/WorkspaceEngine'
import { isTauriRuntime, loadDesktopSnapshot } from '../lib/desktopApi'
import type { Task } from '../types/task'

// 全局引擎实例（单例）
let engineInstance: WorkspaceEngine | null = null

/**
 * 获取或创建引擎实例
 */
function getOrCreateEngine(): WorkspaceEngine {
  const atomicState = collectAtomicState()

  if (!engineInstance) {
    engineInstance = new WorkspaceEngine(atomicState)
  } else {
    // 更新原子状态
    engineInstance.updateAtomicState(atomicState)
  }

  return engineInstance
}

/**
 * 从各 store 收集原子状态（带缓存优化）
 */
let cachedAtomicState: AtomicState | null = null
let lastStoreStates: {
  tasks: any
  baseGoals: any
  baseTimeline: any
  activeArea: string | null
  showCompletedTodos: boolean
} | null = null

function collectAtomicState(): AtomicState {
  const taskStore = useTaskStore.getState()
  const goalStore = useGoalStore.getState()
  const eventkitStore = useEventkitStore.getState()
  const uiStore = useUiStore.getState()

  // 检查是否有任何状态变化
  const currentStates = {
    tasks: taskStore.tasks,
    baseGoals: goalStore.baseGoals,
    baseTimeline: eventkitStore.baseTimeline,
    activeArea: uiStore.activeArea,
    showCompletedTodos: uiStore.showCompletedTodos,
  }

  // 如果状态未变化，返回缓存的原子状态
  if (lastStoreStates &&
      lastStoreStates.tasks === currentStates.tasks &&
      lastStoreStates.baseGoals === currentStates.baseGoals &&
      lastStoreStates.baseTimeline === currentStates.baseTimeline &&
      lastStoreStates.activeArea === currentStates.activeArea &&
      lastStoreStates.showCompletedTodos === currentStates.showCompletedTodos &&
      cachedAtomicState) {
    return cachedAtomicState
  }

  // 更新缓存
  lastStoreStates = currentStates
  cachedAtomicState = {
    baseTimeline: eventkitStore.baseTimeline,
    baseGoals: goalStore.baseGoals,
    tasks: taskStore.tasks,
    activeArea: uiStore.activeArea,
    showCompletedTodos: uiStore.showCompletedTodos,
  }

  return cachedAtomicState
}

/**
 * 触发派生状态重新计算
 */
function recomputeDerivedState(changeType: ChangeType) {
  const engine = getOrCreateEngine()
  const snapshot = engine.computeSnapshot(changeType)

  // 更新派生状态到各个 store（向后兼容）
  const taskStore = useTaskStore.getState()
  const goalStore = useGoalStore.getState()

  taskStore.updateTodayFocusTasks(snapshot.today.focusTasks)
  taskStore.updateTodayAttentionGroups(snapshot.today.attentionGroups)
  taskStore.updateInbox(snapshot.inbox)
  goalStore.updateTodayRelevantGoals(snapshot.today.relevantGoals)
}

/**
 * 初始化 stores 之间的消息桥接
 * 在 App 启动时调用一次
 */
export function useStoreMessageBridge() {
  useEffect(() => {
    const setStatusMessage = useUiStore.getState().setStatusMessage

    // 桥接 taskStore 的 setStatusMessage
    useTaskStore.setState({ setStatusMessage })

    // 桥接 goalStore 的 setStatusMessage
    useGoalStore.setState({ setStatusMessage })

    // 桥接 eventkitStore 的 setStatusMessage
    useEventkitStore.setState({ setStatusMessage })
  }, [])
}

/**
 * 订阅 store 变化，自动重新计算派生状态
 */
export function useDerivedStateSync() {
  useEffect(() => {
    // 监听 tasks 变化
    const unsubTasks = useTaskStore.subscribe((state, prevState) => {
      if (state.tasks !== prevState.tasks) {
        recomputeDerivedState('tasks')
      }
    })

    // 监听 goals 变化
    const unsubGoals = useGoalStore.subscribe((state, prevState) => {
      if (state.baseGoals !== prevState.baseGoals) {
        recomputeDerivedState('goals')
      }
    })

    // 监听 activeArea 变化
    const unsubArea = useUiStore.subscribe((state, prevState) => {
      if (state.activeArea !== prevState.activeArea) {
        recomputeDerivedState('area-filter')
      }
    })

    // 监听 showCompletedTodos 变化
    const unsubCompleted = useUiStore.subscribe((state, prevState) => {
      if (state.showCompletedTodos !== prevState.showCompletedTodos) {
        recomputeDerivedState('show-completed')
      }
    })

    // 监听 baseTimeline 变化
    const unsubTimeline = useEventkitStore.subscribe((state, prevState) => {
      if (state.baseTimeline !== prevState.baseTimeline) {
        recomputeDerivedState('timeline')
      }
    })

    return () => {
      unsubTasks()
      unsubGoals()
      unsubArea()
      unsubCompleted()
      unsubTimeline()
    }
  }, [])
}

/**
 * Today 视图数据模型
 */
export function useTodayViewModel() {
  const tasks = useTaskStore((s) => s.todayFocusTasks)
  const attentionGroups = useTaskStore((s) => s.todayAttentionGroups)
  const goals = useGoalStore((s) => s.todayRelevantGoals)
  const timeline = useEventkitStore((s) => s.baseTimeline)

  return { tasks, attentionGroups, goals, timeline }
}

/**
 * Inbox 视图数据模型
 */
export function useInboxViewModel() {
  const inbox = useTaskStore((s) => s.inbox)
  const showCompletedTodos = useUiStore((s) => s.showCompletedTodos)

  return { inbox, showCompletedTodos }
}

/**
 * 应用水合（hydrate）- 从后端加载数据
 */
export function useAppHydration() {
  const hydrateGoals = useGoalStore((s) => s.hydrateGoals)
  const hydrateTasks = useTaskStore((s) => s.hydrateTasks)
  const hydrateEventkitData = useEventkitStore((s) => s.hydrateEventkitData)
  const setStatusMessage = useUiStore((s) => s.setStatusMessage)

  return (payload: {
    tasks: Task[]
    timeline: any[]
    goals: any[]
    systemReminders: any[]
    integrationStatus: any
    statusMessage: string
  }) => {
    // 先更新基础数据
    hydrateTasks(payload.tasks)
    hydrateGoals(payload.goals)
    hydrateEventkitData({
      timeline: payload.timeline,
      systemReminders: payload.systemReminders,
      integrationStatus: payload.integrationStatus,
    })
    setStatusMessage(payload.statusMessage)

    // 触发派生状态计算
    recomputeDerivedState('full-refresh')
  }
}

/**
 * 接收外部任务（来自快速捕获）
 */
export function useReceiveExternalTask() {
  const replaceTask = useTaskStore((s) => s.replaceTask)
  const setStatusMessage = useUiStore((s) => s.setStatusMessage)

  return (task: Task) => {
    replaceTask(task)
    recomputeDerivedState('tasks')
    setStatusMessage('Quick capture synced')
  }
}

/**
 * 切换系统提醒完成状态（跨 eventkit + task stores）
 */
export function useToggleSystemReminder() {
  const toggleReminder = useEventkitStore((s) => s.toggleSystemReminderDone)
  const syncTasks = useTaskStore((s) => s.syncTasksForSystemReminder)

  return async (reminderId: string, done: boolean) => {
    const updatedReminder = await toggleReminder(reminderId, done)
    if (updatedReminder && isTauriRuntime()) {
      syncTasks(reminderId, updatedReminder.done)
      recomputeDerivedState('tasks')
    }
  }
}

/**
 * 重新加载领域后刷新工作区
 */
export function useReloadWorkspaceAfterAreaChange() {
  const hydrateApp = useAppHydration()
  const setStatusMessage = useUiStore((s) => s.setStatusMessage)

  return async (statusMessage?: string) => {
    if (isTauriRuntime()) {
      const snapshot = await loadDesktopSnapshot()
      await hydrateApp({
        goals: snapshot.goals,
        timeline: snapshot.timeline,
        tasks: snapshot.tasks,
        systemReminders: snapshot.systemReminders,
        integrationStatus: snapshot.integrationStatus,
        statusMessage: statusMessage || '',
      })
    }
  }
}

/**
 * 直接获取完整工作区快照（新 API）
 * 供未来重构的视图组件使用
 */
export function useWorkspaceSnapshot() {
  const engine = getOrCreateEngine()
  return engine.computeSnapshot('full-refresh')
}
