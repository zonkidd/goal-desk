/**
 * Commands Hooks - 提供 Commands 实例给 React 组件
 */

import { useMemo } from 'react'
import { TaskCommands } from '../commands/TaskCommands'
import { GoalCommands } from '../commands/GoalCommands'
import { eventBus } from '../app/signals'
import { createWorkspaceMutationAdapter } from '../lib/workspaceMutations'

/**
 * 使用 Task Commands
 */
export function useTaskCommands() {
  return useMemo(() => {
    const adapter = createWorkspaceMutationAdapter()
    return new TaskCommands(adapter, eventBus)
  }, [])
}

/**
 * 使用 Goal Commands
 */
export function useGoalCommands() {
  return useMemo(() => {
    const adapter = createWorkspaceMutationAdapter()
    return new GoalCommands(adapter, eventBus)
  }, [])
}
