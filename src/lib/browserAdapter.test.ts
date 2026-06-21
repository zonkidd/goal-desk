import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BrowserAdapter } from './browserAdapter'
import type { AreaWithStats, GoalCard } from '../types/app'
import type { Task } from '../types/task'

const BROWSER_STORAGE_TASKS = 'goal-desk-browser-tasks'
const BROWSER_STORAGE_GOALS = 'goal-desk-browser-goals'
const BROWSER_STORAGE_AREAS = 'goal-desk-browser-areas'

const backingStore: Record<string, string> = {}

function createMockStorage() {
  return {
    getItem: vi.fn((key: string) => backingStore[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { backingStore[key] = value }),
    removeItem: vi.fn((key: string) => { delete backingStore[key] }),
    clear: vi.fn(() => { Object.keys(backingStore).forEach(k => delete backingStore[k]) }),
    get length() { return Object.keys(backingStore).length },
    key: vi.fn((i: number) => Object.keys(backingStore)[i] ?? null),
  }
}

describe('BrowserAdapter', () => {
  let adapter: BrowserAdapter

  beforeEach(() => {
    Object.keys(backingStore).forEach(k => delete backingStore[k])
    vi.stubGlobal('localStorage', createMockStorage())
    adapter = new BrowserAdapter()
  })

  describe('deleteArea', () => {
    it('should successfully delete an area from localStorage', async () => {
      const area: AreaWithStats = {
        id: 'area-1',
        title: 'Work',
        goalCount: 0,
        activeGoalCount: 0,
        isSystem: false,
      }
      backingStore[BROWSER_STORAGE_AREAS] = JSON.stringify([area])

      const result = await adapter.deleteArea('area-1')

      expect(result.success).toBe(true)
      const remaining = JSON.parse(backingStore[BROWSER_STORAGE_AREAS] || '[]')
      expect(remaining).toHaveLength(0)
    })

    it('should not affect other areas when deleting one', async () => {
      const areas: AreaWithStats[] = [
        { id: 'area-1', title: 'Work', goalCount: 1, activeGoalCount: 1, isSystem: false },
        { id: 'area-2', title: 'Personal', goalCount: 2, activeGoalCount: 1, isSystem: false },
      ]
      backingStore[BROWSER_STORAGE_AREAS] = JSON.stringify(areas)

      const result = await adapter.deleteArea('area-1')

      expect(result.success).toBe(true)
      const remaining = JSON.parse(backingStore[BROWSER_STORAGE_AREAS] || '[]')
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe('area-2')
    })

    it('should return success:false for nonexistent area', async () => {
      backingStore[BROWSER_STORAGE_AREAS] = JSON.stringify([])

      const result = await adapter.deleteArea('nonexistent')

      expect(result.success).toBe(false)
    })
  })

  describe('createTask with goal taskCount sync', () => {
    it('should increment goal taskCount when creating a task linked to a goal', async () => {
      const goal: GoalCard = {
        id: 'goal-1',
        title: 'Test Goal',
        area: 'Work',
        description: '',
        status: 'ACTIVE',
        progress: 0,
        nextTodo: '',
        taskCount: 0,
      }
      backingStore[BROWSER_STORAGE_GOALS] = JSON.stringify([goal])

      await adapter.createTaskForGoal(goal, 'New Task')

      const goals = JSON.parse(backingStore[BROWSER_STORAGE_GOALS] || '[]')
      expect(goals[0].taskCount).toBe(1)
    })

    it('should update goal progress when creating multiple tasks', async () => {
      const goal: GoalCard = {
        id: 'goal-1',
        title: 'Test Goal',
        area: 'Work',
        description: '',
        status: 'ACTIVE',
        progress: 0,
        nextTodo: '',
        taskCount: 0,
      }
      backingStore[BROWSER_STORAGE_GOALS] = JSON.stringify([goal])

      await adapter.createTaskForGoal(goal, 'Task 1')
      await adapter.createTaskForGoal(goal, 'Task 2')

      const goals = JSON.parse(backingStore[BROWSER_STORAGE_GOALS] || '[]')
      expect(goals[0].taskCount).toBe(2)
    })
  })

  describe('updateTaskStatus with goal progress sync', () => {
    it('should update goal progress when a linked task is completed', async () => {
      const goal: GoalCard = {
        id: 'goal-1',
        title: 'Test Goal',
        area: 'Work',
        description: '',
        status: 'ACTIVE',
        progress: 0,
        nextTodo: '',
        taskCount: 2,
      }
      backingStore[BROWSER_STORAGE_GOALS] = JSON.stringify([goal])

      const task1: Task = {
        id: 'task-1',
        title: 'Task 1',
        content: '',
        status: 'TODO',
        showInTimeline: false,
        linkedGoalId: 'goal-1',
        activityLogs: [],
      }
      const task2: Task = {
        id: 'task-2',
        title: 'Task 2',
        content: '',
        status: 'TODO',
        showInTimeline: false,
        linkedGoalId: 'goal-1',
        activityLogs: [],
      }
      backingStore[BROWSER_STORAGE_TASKS] = JSON.stringify([task1, task2])

      await adapter.updateTaskStatus('task-1', 'DONE')

      const goals = JSON.parse(backingStore[BROWSER_STORAGE_GOALS] || '[]')
      expect(goals[0].progress).toBe(50)
    })
  })

  describe('updateTaskFields with goal progress sync', () => {
    it('should recalculate goal taskCount when linking a task via updateTaskFields', async () => {
      const goal: GoalCard = {
        id: 'goal-1',
        title: 'Test Goal',
        area: 'Work',
        description: '',
        status: 'ACTIVE',
        progress: 0,
        nextTodo: '',
        taskCount: 0,
      }
      backingStore[BROWSER_STORAGE_GOALS] = JSON.stringify([goal])

      const task: Task = {
        id: 'task-1',
        title: 'Unlinked Task',
        content: '',
        status: 'TODO',
        showInTimeline: false,
        activityLogs: [],
      }
      backingStore[BROWSER_STORAGE_TASKS] = JSON.stringify([task])

      await adapter.updateTaskFields('task-1', {
        title: 'Unlinked Task',
        linkedGoalId: 'goal-1',
      })

      const goals = JSON.parse(backingStore[BROWSER_STORAGE_GOALS] || '[]')
      expect(goals[0].taskCount).toBe(1)
    })
  })

  describe('updateTaskStatus with activity log', () => {
    it('should always create activity log even without note', async () => {
      const task: Task = {
        id: 'task-1',
        title: 'Test Task',
        content: '',
        status: 'TODO',
        showInTimeline: false,
        activityLogs: [],
      }
      backingStore[BROWSER_STORAGE_TASKS] = JSON.stringify([task])

      await adapter.updateTaskStatus('task-1', 'IN_PROGRESS')

      const tasks = JSON.parse(backingStore[BROWSER_STORAGE_TASKS] || '[]')
      expect(tasks[0].activityLogs).toHaveLength(1)
      expect(tasks[0].activityLogs[0].action).toBe('STARTED')
      expect(tasks[0].activityLogs[0].note).toBeUndefined()
    })

    it('should create activity log with correct action for each status transition', async () => {
      const task: Task = {
        id: 'task-1',
        title: 'Test Task',
        content: '',
        status: 'TODO',
        showInTimeline: false,
        activityLogs: [],
      }
      backingStore[BROWSER_STORAGE_TASKS] = JSON.stringify([task])

      await adapter.updateTaskStatus('task-1', 'DONE')
      let tasks = JSON.parse(backingStore[BROWSER_STORAGE_TASKS] || '[]')
      expect(tasks[0].activityLogs[0].action).toBe('COMPLETED')

      await adapter.updateTaskStatus('task-1', 'TODO')
      tasks = JSON.parse(backingStore[BROWSER_STORAGE_TASKS] || '[]')
      expect(tasks[0].activityLogs[0].action).toBe('NOTE_ADDED')

      await adapter.updateTaskStatus('task-1', 'IN_PROGRESS')
      tasks = JSON.parse(backingStore[BROWSER_STORAGE_TASKS] || '[]')
      expect(tasks[0].activityLogs[0].action).toBe('STARTED')

      await adapter.updateTaskStatus('task-1', 'PAUSED')
      tasks = JSON.parse(backingStore[BROWSER_STORAGE_TASKS] || '[]')
      expect(tasks[0].activityLogs[0].action).toBe('PAUSED')

      await adapter.updateTaskStatus('task-1', 'IN_PROGRESS')
      tasks = JSON.parse(backingStore[BROWSER_STORAGE_TASKS] || '[]')
      expect(tasks[0].activityLogs[0].action).toBe('RESUMED')
    })

    it('should include note in activity log when provided', async () => {
      const task: Task = {
        id: 'task-1',
        title: 'Test Task',
        content: '',
        status: 'TODO',
        showInTimeline: false,
        activityLogs: [],
      }
      backingStore[BROWSER_STORAGE_TASKS] = JSON.stringify([task])

      await adapter.updateTaskStatus('task-1', 'DONE', 'Completed quickly')

      const tasks = JSON.parse(backingStore[BROWSER_STORAGE_TASKS] || '[]')
      expect(tasks[0].activityLogs[0].action).toBe('COMPLETED')
      expect(tasks[0].activityLogs[0].note).toBe('Completed quickly')
    })
  })
})
