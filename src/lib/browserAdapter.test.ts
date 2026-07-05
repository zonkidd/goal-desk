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

    it('should reassign goals to uncategorized when deleting area with force', async () => {
      const area: AreaWithStats = {
        id: 'area-1', title: 'Work', goalCount: 2, activeGoalCount: 2, isSystem: false,
      }
      backingStore[BROWSER_STORAGE_AREAS] = JSON.stringify([area])

      const goals: GoalCard[] = [
        { id: 'g1', title: 'Goal 1', area: 'Work', description: '', status: 'ACTIVE', progress: 0, nextTodo: '', taskCount: 0 },
        { id: 'g2', title: 'Goal 2', area: 'Work', description: '', status: 'ACTIVE', progress: 0, nextTodo: '', taskCount: 0 },
        { id: 'g3', title: 'Goal 3', area: 'Personal', description: '', status: 'ACTIVE', progress: 0, nextTodo: '', taskCount: 0 },
      ]
      backingStore[BROWSER_STORAGE_GOALS] = JSON.stringify(goals)

      await adapter.deleteArea('area-1', true)

      const updatedGoals = JSON.parse(backingStore[BROWSER_STORAGE_GOALS] || '[]')
      expect(updatedGoals[0].area).toBe('未分类')
      expect(updatedGoals[1].area).toBe('未分类')
      expect(updatedGoals[2].area).toBe('Personal')
    })

    it('should refuse deleting an area with linked goals when force is false', async () => {
      backingStore[BROWSER_STORAGE_AREAS] = JSON.stringify([
        { id: 'area-1', title: 'Work', goalCount: 1, activeGoalCount: 1, isSystem: false },
      ] satisfies AreaWithStats[])
      backingStore[BROWSER_STORAGE_GOALS] = JSON.stringify([
        { id: 'g1', title: 'Goal 1', area: 'Work', description: '', status: 'ACTIVE', progress: 0, nextTodo: '', taskCount: 0 },
      ] satisfies GoalCard[])

      const result = await adapter.deleteArea('area-1', false)

      expect(result.success).toBe(false)

      const storedAreas = JSON.parse(backingStore[BROWSER_STORAGE_AREAS] || '[]')
      expect(storedAreas).toEqual([
        { id: 'area-1', title: 'Work', goalCount: 1, activeGoalCount: 1, isSystem: false },
      ])

      const storedGoals = JSON.parse(backingStore[BROWSER_STORAGE_GOALS] || '[]')
      expect(storedGoals[0].area).toBe('Work')
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

  describe('soft delete and restore task with goal progress sync', () => {
    it('recalculates goal progress when a linked task is soft deleted', async () => {
      backingStore[BROWSER_STORAGE_GOALS] = JSON.stringify([
        {
          id: 'goal-1',
          title: 'Test Goal',
          area: 'Work',
          description: '',
          status: 'ACTIVE',
          progress: 50,
          nextTodo: 'Task 2',
          taskCount: 2,
        },
      ] satisfies GoalCard[])
      backingStore[BROWSER_STORAGE_TASKS] = JSON.stringify([
        {
          id: 'task-1',
          title: 'Task 1',
          content: '',
          status: 'DONE',
          showInTimeline: false,
          linkedGoalId: 'goal-1',
          activityLogs: [],
        },
        {
          id: 'task-2',
          title: 'Task 2',
          content: '',
          status: 'TODO',
          showInTimeline: false,
          linkedGoalId: 'goal-1',
          activityLogs: [],
        },
      ] satisfies Task[])

      await adapter.softDeleteTask('task-2')

      const goals = JSON.parse(backingStore[BROWSER_STORAGE_GOALS] || '[]')
      expect(goals[0].taskCount).toBe(1)
      expect(goals[0].progress).toBe(100)
      expect(goals[0].nextTodo).toBe('')
    })

    it('recalculates goal progress when a linked task is restored', async () => {
      backingStore[BROWSER_STORAGE_GOALS] = JSON.stringify([
        {
          id: 'goal-1',
          title: 'Test Goal',
          area: 'Work',
          description: '',
          status: 'ACTIVE',
          progress: 100,
          nextTodo: '',
          taskCount: 1,
        },
      ] satisfies GoalCard[])
      backingStore[BROWSER_STORAGE_TASKS] = JSON.stringify([
        {
          id: 'task-1',
          title: 'Task 1',
          content: '',
          status: 'DONE',
          showInTimeline: false,
          linkedGoalId: 'goal-1',
          activityLogs: [],
        },
      ] satisfies Task[])
      backingStore['goal-desk-browser-deleted-tasks'] = JSON.stringify([
        {
          id: 'task-2',
          title: 'Task 2',
          content: '',
          status: 'TODO',
          showInTimeline: false,
          linkedGoalId: 'goal-1',
          activityLogs: [],
          deletedAt: new Date().toISOString(),
        },
      ])

      await adapter.restoreTask('task-2')

      const goals = JSON.parse(backingStore[BROWSER_STORAGE_GOALS] || '[]')
      expect(goals[0].taskCount).toBe(2)
      expect(goals[0].progress).toBe(50)
      expect(goals[0].nextTodo).toBe('Task 2')
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

    it('updates goal nextTodo when a linked incomplete task title changes', async () => {
      backingStore[BROWSER_STORAGE_GOALS] = JSON.stringify([
        {
          id: 'goal-1',
          title: 'Test Goal',
          area: 'Work',
          description: '',
          status: 'ACTIVE',
          progress: 0,
          nextTodo: 'Old Task Title',
          taskCount: 1,
        },
      ] satisfies GoalCard[])

      backingStore[BROWSER_STORAGE_TASKS] = JSON.stringify([
        {
          id: 'task-1',
          title: 'Old Task Title',
          content: '',
          status: 'TODO',
          showInTimeline: false,
          linkedGoalId: 'goal-1',
          linkedGoalLabel: 'Test Goal',
          activityLogs: [],
        },
      ] satisfies Task[])

      await adapter.updateTaskFields('task-1', {
        title: 'Renamed Task Title',
        linkedGoalId: 'goal-1',
      })

      const goals = JSON.parse(backingStore[BROWSER_STORAGE_GOALS] || '[]')
      expect(goals[0].nextTodo).toBe('Renamed Task Title')
    })
  })

  describe('goal area stats sync', () => {
    it('rejects manually setting READY_TO_COMPLETE in browser preview', async () => {
      backingStore[BROWSER_STORAGE_GOALS] = JSON.stringify([
        {
          id: 'goal-1',
          title: 'Test Goal',
          area: 'Work',
          description: '',
          status: 'ACTIVE',
          progress: 100,
          nextTodo: '',
          taskCount: 2,
        },
      ] satisfies GoalCard[])

      const result = await adapter.updateGoalStatus('goal-1', 'READY_TO_COMPLETE')

      expect(result.goal).toBeUndefined()

      const storedGoals = JSON.parse(backingStore[BROWSER_STORAGE_GOALS] || '[]')
      expect(storedGoals[0].status).toBe('ACTIVE')
    })

    it('keeps READY_TO_COMPLETE goals in the activeGoalCount bucket', async () => {
      backingStore[BROWSER_STORAGE_GOALS] = JSON.stringify([
        {
          id: 'goal-1',
          title: 'Test Goal',
          area: 'Work',
          description: '',
          status: 'READY_TO_COMPLETE',
          progress: 100,
          nextTodo: '',
          taskCount: 2,
        },
      ] satisfies GoalCard[])
      backingStore[BROWSER_STORAGE_AREAS] = JSON.stringify([
        { id: 'area-1', title: 'Work', goalCount: 1, activeGoalCount: 1, isSystem: false },
      ] satisfies AreaWithStats[])

      const areasResult = await adapter.listAreas()
      expect(areasResult.areas).toEqual([
        { id: 'area-1', title: 'Work', goalCount: 1, activeGoalCount: 1, isSystem: false },
      ])
    })

    it('updates activeGoalCount when a goal leaves ACTIVE status', async () => {
      backingStore[BROWSER_STORAGE_GOALS] = JSON.stringify([
        {
          id: 'goal-1',
          title: 'Test Goal',
          area: 'Work',
          description: '',
          status: 'ACTIVE',
          progress: 0,
          nextTodo: '',
          taskCount: 0,
        },
      ] satisfies GoalCard[])
      backingStore[BROWSER_STORAGE_AREAS] = JSON.stringify([
        { id: 'area-1', title: 'Work', goalCount: 1, activeGoalCount: 1, isSystem: false },
      ] satisfies AreaWithStats[])

      await adapter.updateGoalStatus('goal-1', 'PAUSED')

      const areasResult = await adapter.listAreas()
      expect(areasResult.areas).toEqual([
        { id: 'area-1', title: 'Work', goalCount: 1, activeGoalCount: 0, isSystem: false },
      ])
    })

    it('renames linked goals when an area is renamed', async () => {
      backingStore[BROWSER_STORAGE_GOALS] = JSON.stringify([
        {
          id: 'goal-1',
          title: 'Test Goal',
          area: 'Work',
          description: '',
          status: 'ACTIVE',
          progress: 0,
          nextTodo: '',
          taskCount: 0,
        },
      ] satisfies GoalCard[])
      backingStore[BROWSER_STORAGE_AREAS] = JSON.stringify([
        { id: 'area-1', title: 'Work', goalCount: 1, activeGoalCount: 1, isSystem: false },
      ] satisfies AreaWithStats[])

      await adapter.renameArea('area-1', 'Deep Work')

      const storedGoals = JSON.parse(backingStore[BROWSER_STORAGE_GOALS] || '[]')
      expect(storedGoals[0].area).toBe('Deep Work')

      const areasResult = await adapter.listAreas()
      expect(areasResult.areas).toEqual([
        { id: 'area-1', title: 'Deep Work', goalCount: 1, activeGoalCount: 1, isSystem: false },
      ])
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

      await adapter.updateTaskStatus('task-1', 'IN_PROGRESS')
      let tasks = JSON.parse(backingStore[BROWSER_STORAGE_TASKS] || '[]')
      expect(tasks[0].activityLogs[0].action).toBe('STARTED')

      await adapter.updateTaskStatus('task-1', 'PAUSED')
      tasks = JSON.parse(backingStore[BROWSER_STORAGE_TASKS] || '[]')
      expect(tasks[0].activityLogs[0].action).toBe('PAUSED')

      await adapter.updateTaskStatus('task-1', 'IN_PROGRESS')
      tasks = JSON.parse(backingStore[BROWSER_STORAGE_TASKS] || '[]')
      expect(tasks[0].activityLogs[0].action).toBe('RESUMED')

      await adapter.updateTaskStatus('task-1', 'DONE')
      tasks = JSON.parse(backingStore[BROWSER_STORAGE_TASKS] || '[]')
      expect(tasks[0].activityLogs[0].action).toBe('COMPLETED')

      await adapter.updateTaskStatus('task-1', 'TODO')
      tasks = JSON.parse(backingStore[BROWSER_STORAGE_TASKS] || '[]')
      expect(tasks[0].status).toBe('DONE')
      expect(tasks[0].activityLogs[0].action).toBe('COMPLETED')
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

    it('should complete paused tasks through the Todo transition contract', async () => {
      const task: Task = {
        id: 'task-1',
        title: 'Test Task',
        content: '',
        status: 'PAUSED',
        showInTimeline: false,
        activityLogs: [],
      }
      backingStore[BROWSER_STORAGE_TASKS] = JSON.stringify([task])

      const result = await adapter.updateTaskStatus('task-1', 'DONE')

      const tasks = JSON.parse(backingStore[BROWSER_STORAGE_TASKS] || '[]')
      expect(result.task?.status).toBe('DONE')
      expect(tasks[0].status).toBe('DONE')
      expect(tasks[0].activityLogs[0].action).toBe('COMPLETED')
    })
  })

  describe('updateTaskFields preserves other fields', () => {
    it('should preserve plannedStartAt and dueDate when not passed', async () => {
      const task: Task = {
        id: 'task-1',
        title: 'Test Task',
        content: '',
        status: 'TODO',
        showInTimeline: true,
        plannedStartAt: new Date('2026-06-15T10:00:00'),
        dueDate: new Date('2026-06-20T18:00:00'),
        linkedGoalId: 'goal-1',
        linkedGoalLabel: 'Test Goal',
        activityLogs: [],
      }
      backingStore[BROWSER_STORAGE_TASKS] = JSON.stringify([task])

      const result = await adapter.updateTaskFields('task-1', {
        title: 'Updated Title',
      })

      expect(result.task).toBeDefined()
      expect(result.task!.title).toBe('Updated Title')
      expect(result.task!.plannedStartAt).toBeInstanceOf(Date)
      expect(result.task!.dueDate).toBeInstanceOf(Date)
      expect(result.task!.linkedGoalId).toBe('goal-1')
      expect(result.task!.linkedGoalLabel).toBe('Test Goal')
      expect(result.task!.showInTimeline).toBe(true)
    })

    it('should clear plannedStartAt and dueDate when passed as null', async () => {
      const adapter = new BrowserAdapter()
      const task = {
        id: 'task-1',
        title: 'Test Task',
        content: '',
        status: 'TODO' as const,
        showInTimeline: true,
        plannedStartAt: new Date('2026-06-15T10:00:00'),
        dueDate: new Date('2026-06-20T18:00:00'),
        activityLogs: [],
      }
      localStorage.setItem('goal-desk-browser-tasks', JSON.stringify([task]))

      const result = await adapter.updateTaskFields('task-1', {
        title: 'Updated Task',
        plannedStartAt: null,
        dueDate: null,
      })

      expect(result.task!.plannedStartAt).toBeUndefined()
      expect(result.task!.dueDate).toBeUndefined()
    })
  })

  describe('date deserialization after mutation', () => {
    it('should return Date objects for activityLogs.timestamp after updateTaskStatus', async () => {
      const task: Task = {
        id: 'task-1',
        title: 'Test Task',
        content: '',
        status: 'TODO',
        showInTimeline: false,
        activityLogs: [
          { action: 'CREATED', timestamp: new Date('2026-06-01T10:00:00') },
        ],
      }
      backingStore[BROWSER_STORAGE_TASKS] = JSON.stringify([task])

      const result = await adapter.updateTaskStatus('task-1', 'DONE')

      expect(result.task).toBeDefined()
      expect(result.task!.activityLogs[0].timestamp).toBeInstanceOf(Date)
      expect(result.task!.activityLogs[1].timestamp).toBeInstanceOf(Date)
    })

    it('should return Date objects for activityLogs.timestamp after createTaskForGoal', async () => {
      const goal: GoalCard = {
        id: 'goal-1', title: 'Test', area: 'Work', description: '',
        status: 'ACTIVE', progress: 0, nextTodo: '', taskCount: 0,
      }
      backingStore[BROWSER_STORAGE_GOALS] = JSON.stringify([goal])

      const result = await adapter.createTaskForGoal(goal, 'New Task')

      expect(result.task).toBeDefined()
      expect(result.task!.activityLogs[0].timestamp).toBeInstanceOf(Date)
    })
  })

  describe('input validation', () => {
    it('rejects empty task title', async () => {
      const result = await adapter.createTask('')
      expect(result.task).toBeUndefined()
    })

    it('rejects whitespace-only task title', async () => {
      const result = await adapter.createTask('   ')
      expect(result.task).toBeUndefined()
    })

    it('trims whitespace from valid task title', async () => {
      const result = await adapter.createTask('  Buy milk  ')
      expect(result.task).toBeDefined()
      expect(result.task!.title).toBe('Buy milk')
    })

    it('rejects empty goal title', async () => {
      const result = await adapter.createGoal({ title: '', area: 'Work', description: '' })
      expect(result.goal).toBeUndefined()
    })

    it('defaults area to uncategorized when empty', async () => {
      const result = await adapter.createGoal({ title: 'Goal', area: '', description: '' })
      expect(result.goal).toBeDefined()
      expect(result.goal!.area).toBe('未分类')
    })

    it('creates a new area entry when creating a goal in a brand new area', async () => {
      const result = await adapter.createGoal({ title: 'Goal', area: 'Deep Work', description: '' })

      expect(result.goal).toBeDefined()
      expect(result.goal!.area).toBe('Deep Work')

      const areasResult = await adapter.listAreas()
      expect(areasResult.areas).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: 'Deep Work',
            goalCount: 1,
            activeGoalCount: 1,
            isSystem: false,
          }),
        ]),
      )
    })

    it('reuses an existing area case-insensitively when creating a goal', async () => {
      backingStore[BROWSER_STORAGE_GOALS] = JSON.stringify([
        {
          id: 'goal-existing',
          title: 'Existing Goal',
          area: 'work',
          description: '',
          status: 'ACTIVE',
          progress: 0,
          nextTodo: '',
          taskCount: 0,
        },
      ] satisfies GoalCard[])
      backingStore[BROWSER_STORAGE_AREAS] = JSON.stringify([
        { id: 'area-1', title: 'work', goalCount: 1, activeGoalCount: 1, isSystem: false },
      ])

      await adapter.createGoal({ title: 'Goal', area: 'Work', description: '' })

      const areasResult = await adapter.listAreas()
      expect(areasResult.areas).toHaveLength(1)
      expect(areasResult.areas![0]).toMatchObject({
        id: 'area-1',
        title: 'work',
        goalCount: 2,
        activeGoalCount: 2,
      })
    })

    it('rejects empty area title for createArea', async () => {
      const result = await adapter.createArea('')
      expect(result.area).toBeUndefined()
    })

    it('trims whitespace from valid area title for createArea', async () => {
      const result = await adapter.createArea('  Personal  ')

      expect(result.area).toBeDefined()
      expect(result.area!.title).toBe('Personal')

      const storedAreas = JSON.parse(backingStore[BROWSER_STORAGE_AREAS] || '[]')
      expect(storedAreas[0].title).toBe('Personal')
    })

    it('rejects duplicate area titles for createArea ignoring case', async () => {
      backingStore[BROWSER_STORAGE_AREAS] = JSON.stringify([
        { id: 'area-1', title: 'Work', goalCount: 0, activeGoalCount: 0, isSystem: false },
      ] satisfies AreaWithStats[])

      const result = await adapter.createArea('  work  ')

      expect(result.area).toBeUndefined()

      const storedAreas = JSON.parse(backingStore[BROWSER_STORAGE_AREAS] || '[]')
      expect(storedAreas).toHaveLength(1)
      expect(storedAreas[0].title).toBe('Work')
    })

    it('rejects empty area title for renameArea', async () => {
      const areas: AreaWithStats[] = [
        { id: 'area-1', title: 'Work', goalCount: 0, activeGoalCount: 0, isSystem: false },
      ]
      backingStore[BROWSER_STORAGE_AREAS] = JSON.stringify(areas)
      const result = await adapter.renameArea('area-1', '  ')
      expect(result.area).toBeUndefined()
    })

    it('rejects duplicate area titles for renameArea ignoring case', async () => {
      backingStore[BROWSER_STORAGE_AREAS] = JSON.stringify([
        { id: 'area-1', title: 'Work', goalCount: 0, activeGoalCount: 0, isSystem: false },
        { id: 'area-2', title: 'Personal', goalCount: 0, activeGoalCount: 0, isSystem: false },
      ] satisfies AreaWithStats[])

      const result = await adapter.renameArea('area-2', '  work ')

      expect(result.area).toBeUndefined()

      const storedAreas = JSON.parse(backingStore[BROWSER_STORAGE_AREAS] || '[]')
      expect(storedAreas).toEqual([
        { id: 'area-1', title: 'Work', goalCount: 0, activeGoalCount: 0, isSystem: false },
        { id: 'area-2', title: 'Personal', goalCount: 0, activeGoalCount: 0, isSystem: false },
      ])
    })
  })
})
