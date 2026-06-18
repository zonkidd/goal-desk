import { create } from 'zustand'
import type { EventBus } from '../events/EventBus'
import type { Task } from '../types/task'
import type { DomainEvent } from '../events/DomainEvents'

/**
 * TaskStore (Refactored) - 纯数据容器
 *
 * 职责：
 * - 存储 tasks 基础数据
 * - 订阅 EventBus 自动更新
 * - 无派生状态
 * - 无跨 store 依赖
 */
export interface TaskStoreState {
  // 基础数据
  tasks: Task[]

  // 内部方法（由 EventBus 调用）
  _replaceTask: (task: Task) => void
  _removeTask: (taskId: string) => void
}

function replaceTaskInArray(tasks: Task[], nextTask: Task): Task[] {
  const index = tasks.findIndex((task) => task.id === nextTask.id)
  if (index === -1) {
    return [nextTask, ...tasks]
  }
  return tasks.map((task) => (task.id === nextTask.id ? nextTask : task))
}

/**
 * 创建 TaskStore 实例
 * @param eventBus Event Bus 实例用于订阅事件
 */
export function createTaskStore(eventBus: EventBus) {
  const useTaskStore = create<TaskStoreState>((set) => {
    // 订阅 Event Bus
    eventBus.subscribe((event: DomainEvent) => {
      if (event.type === 'task.created' || event.type === 'task.updated') {
        set((state) => ({
          tasks: replaceTaskInArray(state.tasks, event.payload),
        }))
      } else if (event.type === 'task.deleted') {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== event.payload.taskId),
        }))
      }
    })

    return {
      tasks: [],

      _replaceTask: (task: Task) => {
        set((state) => ({
          tasks: replaceTaskInArray(state.tasks, task),
        }))
      },

      _removeTask: (taskId: string) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== taskId),
        }))
      },
    }
  })

  return useTaskStore
}
