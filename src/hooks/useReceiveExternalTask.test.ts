import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTaskStore } from '../store/taskStore'
import { useUiStore } from '../store/uiStore'
import type { Task } from '../types/task'

function createMockTask(id: string, title: string): Task {
  return {
    id,
    title,
    content: '',
    status: 'TODO',
    showInTimeline: false,
    activityLogs: [{ action: 'CREATED', timestamp: new Date() }],
  }
}

describe('receiveExternalTask deduplication', () => {
  beforeEach(() => {
    useTaskStore.setState({ tasks: [] })
    useUiStore.setState({ statusMessage: '' })
  })

  it('should not duplicate task when receiveExternalTask is called for existing task', () => {
    const existingTask = createMockTask('task-1', 'Existing Task')
    useTaskStore.setState({ tasks: [existingTask] })

    const replaceTask = vi.spyOn(useTaskStore.getState(), 'replaceTask')
    const setStatusMessage = vi.spyOn(useUiStore.getState(), 'setStatusMessage')

    const receiveExternalTask = (task: Task) => {
      const currentTasks = useTaskStore.getState().tasks
      const alreadyExists = currentTasks.some(t => t.id === task.id)
      if (!alreadyExists) {
        useTaskStore.getState().replaceTask(task)
        useUiStore.getState().setStatusMessage('Quick capture synced')
      }
    }

    receiveExternalTask(existingTask)

    expect(replaceTask).not.toHaveBeenCalled()
    expect(setStatusMessage).not.toHaveBeenCalled()
  })

  it('should add new task when receiveExternalTask is called for non-existing task', () => {
    const newTask = createMockTask('task-2', 'New Task')

    const replaceTask = vi.spyOn(useTaskStore.getState(), 'replaceTask')
    const setStatusMessage = vi.spyOn(useUiStore.getState(), 'setStatusMessage')

    const receiveExternalTask = (task: Task) => {
      const currentTasks = useTaskStore.getState().tasks
      const alreadyExists = currentTasks.some(t => t.id === task.id)
      if (!alreadyExists) {
        useTaskStore.getState().replaceTask(task)
        useUiStore.getState().setStatusMessage('Quick capture synced')
      }
    }

    receiveExternalTask(newTask)

    expect(replaceTask).toHaveBeenCalledWith(newTask)
    expect(setStatusMessage).toHaveBeenCalledWith('Quick capture synced')
  })
})
