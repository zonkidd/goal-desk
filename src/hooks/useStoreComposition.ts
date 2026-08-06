import { useEffect, useRef } from 'react'
import { useUiStore } from '../store/uiStore'
import { useTaskStore } from '../store/taskStore'
import { useGoalStore } from '../store/goalStore'
import { useAreaStore } from '../store/areaStore'
import { useEventkitStore } from '../store/eventkitStore'
import { getRuntimeAdapter } from '../lib/runtimeAdapter'
import { loadDesktopSnapshot } from '../lib/desktopSnapshot'
import type { HydratePayload } from '../store/appStore.types'
import type { Task } from '../types/task'
import type { GoalCard } from '../types/app'

function didGoalRelevantTaskChange(previousTasks: Task[], currentTasks: Task[]): boolean {
  const previousById = new Map(previousTasks.map((task) => [task.id, task]))
  const currentById = new Map(currentTasks.map((task) => [task.id, task]))
  const allTaskIds = new Set([...previousById.keys(), ...currentById.keys()])

  for (const taskId of allTaskIds) {
    const previousTask = previousById.get(taskId)
    const currentTask = currentById.get(taskId)
    const wasLinked = previousTask?.linkedGoalId !== undefined
    const isLinked = currentTask?.linkedGoalId !== undefined

    if (!wasLinked && !isLinked) {
      continue
    }

    if (previousTask === currentTask) {
      continue
    }

    if (!previousTask || !currentTask) {
      return true
    }

    if (previousTask.linkedGoalId !== currentTask.linkedGoalId) {
      return true
    }

    if (previousTask.status !== currentTask.status) {
      return true
    }

    if (previousTask.title !== currentTask.title) {
      return true
    }
  }

  return false
}

function didAreaRelevantGoalChange(previousGoals: GoalCard[], currentGoals: GoalCard[]): boolean {
  const previousById = new Map(previousGoals.map((goal) => [goal.id, goal]))
  const currentById = new Map(currentGoals.map((goal) => [goal.id, goal]))
  const allGoalIds = new Set([...previousById.keys(), ...currentById.keys()])

  for (const goalId of allGoalIds) {
    const previousGoal = previousById.get(goalId)
    const currentGoal = currentById.get(goalId)

    if (!previousGoal || !currentGoal) {
      return true
    }

    if (previousGoal === currentGoal) {
      continue
    }

    if (previousGoal.area !== currentGoal.area) {
      return true
    }

    if (previousGoal.status !== currentGoal.status) {
      return true
    }
  }

  return false
}

export function useAppHydration() {
  const hydrateGoals = useGoalStore((s) => s.hydrateGoals)
  const hydrateTasks = useTaskStore((s) => s.hydrateTasks)
  const hydrateEventkitData = useEventkitStore((s) => s.hydrateEventkitData)
  const setStatusMessage = useUiStore((s) => s.setStatusMessage)

  return (payload: HydratePayload) => {
    hydrateTasks(payload.tasks)
    hydrateGoals(payload.goals)
    hydrateEventkitData({
      rawEventKit: payload.rawEventKit,
      systemReminders: payload.systemReminders,
      integrationStatus: payload.integrationStatus,
    })
    setStatusMessage(payload.statusMessage)
  }
}

export function useReceiveExternalTask() {
  const replaceTask = useTaskStore((s) => s.replaceTask)
  const setStatusMessage = useUiStore((s) => s.setStatusMessage)

  return (task: Task) => {
    const currentTasks = useTaskStore.getState().tasks
    const alreadyExists = currentTasks.some(t => t.id === task.id)
    if (!alreadyExists) {
      replaceTask(task)
      setStatusMessage('Quick capture synced')
    }
  }
}

export function useReloadWorkspaceAfterAreaChange() {
  const hydrateApp = useAppHydration()
  const setStatusMessage = useUiStore((s) => s.setStatusMessage)

  return async (statusMessage?: string) => {
    if (getRuntimeAdapter().isTauri()) {
      const snapshot = await loadDesktopSnapshot()
      await hydrateApp({
        goals: snapshot.goals,
        rawEventKit: snapshot.rawEventKit,
        tasks: snapshot.tasks,
        systemReminders: snapshot.rawEventKit.systemReminders,
        integrationStatus: snapshot.rawEventKit.integrationStatus,
        statusMessage: statusMessage || '',
      })
    }
  }
}

export function useTaskGoalBridge() {
  const refreshGoals = useGoalStore((s) => s.refreshGoals)
  const prevTasksRef = useRef<Task[]>([])

  useEffect(() => {
    const unsubscribe = useTaskStore.subscribe((state) => {
      const prevTasks = prevTasksRef.current
      const currTasks = state.tasks

      if (didGoalRelevantTaskChange(prevTasks, currTasks)) {
        refreshGoals()
      }

      prevTasksRef.current = currTasks
    })

    prevTasksRef.current = useTaskStore.getState().tasks

    return unsubscribe
  }, [refreshGoals])
}

export function useGoalAreaBridge() {
  const loadAreas = useAreaStore((s) => s.loadAreas)
  const previousGoalsRef = useRef<GoalCard[]>([])

  useEffect(() => {
    const unsubscribe = useGoalStore.subscribe((state) => {
      const previousGoals = previousGoalsRef.current
      const currentGoals = state.baseGoals

      if (didAreaRelevantGoalChange(previousGoals, currentGoals)) {
        void loadAreas()
      }

      previousGoalsRef.current = currentGoals
    })

    previousGoalsRef.current = useGoalStore.getState().baseGoals

    return unsubscribe
  }, [loadAreas])
}
