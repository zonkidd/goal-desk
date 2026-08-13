import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TauriAdapter } from './tauriAdapter'
import { updateTaskFields } from './tauriCommands'
import type { GoalCard } from '../types/app'
import type { Task } from '../types/task'

// Mock tauriCommands
vi.mock('./tauriCommands', () => ({
  captureTask: vi.fn().mockResolvedValue({
    id: 'task-1',
    title: 'Test Task',
    content: '',
    status: 'TODO',
    showInTimeline: false,
    activityLogs: [],
  }),
  createTaskForGoal: vi.fn().mockResolvedValue({
    id: 'task-2',
    title: 'Goal Task',
    content: '',
    status: 'TODO',
    linkedGoalId: 'goal-1',
    showInTimeline: false,
    activityLogs: [],
  }),
  createGoal: vi.fn().mockResolvedValue({
    id: 'goal-1',
    title: 'Test Goal',
    area: 'Work',
    description: '',
    status: 'ACTIVE',
    progress: 0,
    nextTodo: '',
    taskCount: 0,
  }),
  updateGoalFields: vi.fn().mockResolvedValue({
    id: 'goal-1',
    title: 'Updated Goal',
    area: 'Work',
    description: '',
    status: 'ACTIVE',
    progress: 0,
    nextTodo: '',
    taskCount: 0,
  }),
  updateGoalStatus: vi.fn().mockResolvedValue({
    id: 'goal-1',
    title: 'Test Goal',
    area: 'Work',
    description: '',
    status: 'COMPLETED',
    progress: 100,
    nextTodo: '',
    taskCount: 0,
  }),
  addTaskNote: vi.fn().mockResolvedValue({
    id: 'task-1',
    title: 'Test Task',
    content: '',
    status: 'TODO',
    showInTimeline: false,
    activityLogs: [{ action: 'NOTE_ADDED', note: 'Test note', timestamp: new Date() }],
  }),
  updateTaskStatus: vi.fn().mockResolvedValue({
    id: 'task-1',
    title: 'Test Task',
    content: '',
    status: 'DONE',
    showInTimeline: false,
    activityLogs: [],
  }),
  updateTaskContent: vi.fn().mockResolvedValue({
    id: 'task-1',
    title: 'Test Task',
    content: 'Updated content',
    status: 'TODO',
    showInTimeline: false,
    activityLogs: [],
  }),
  updateTaskChecklists: vi.fn().mockResolvedValue({
    id: 'task-1',
    title: 'Test Task',
    content: '',
    status: 'TODO',
    showInTimeline: false,
    activityLogs: [],
    checklists: [{ id: 'c1', title: 'Step', completed: false, sortOrder: 0 }],
  }),
  updateTaskFields: vi.fn().mockResolvedValue({
    id: 'task-1',
    title: 'Updated Task',
    content: '',
    status: 'TODO',
    plannedStartAt: new Date('2026-06-22T10:00:00'),
    dueAt: new Date('2026-06-23T18:00:00'),
    showInTimeline: false,
    activityLogs: [],
  }),
  listAreas: vi.fn().mockResolvedValue([
    { id: 'area-1', title: 'Work', goalCount: 2, activeGoalCount: 1, isSystem: false },
    { id: 'area-2', title: 'Personal', goalCount: 0, activeGoalCount: 0, isSystem: false },
  ]),
  createArea: vi.fn().mockResolvedValue({ id: 'area-2', title: 'Personal' }),
  renameArea: vi.fn().mockResolvedValue({ id: 'area-1', title: 'Renamed' }),
  deleteArea: vi.fn().mockResolvedValue({ success: true, message: 'Deleted' }),
  loadGoalList: vi.fn().mockResolvedValue([]),
  loadTaskList: vi.fn().mockResolvedValue([]),
}))

describe('TauriAdapter', () => {
  let adapter: TauriAdapter

  beforeEach(() => {
    adapter = new TauriAdapter()
    vi.clearAllMocks()
  })

  describe('createTask', () => {
    it('creates task with valid title', async () => {
      const result = await adapter.createTask('New Task')
      expect(result.task).toBeDefined()
      expect(result.task?.title).toBe('Test Task')
      expect(result.statusMessage).toBe('Saved to local database')
    })
  })

  describe('createTaskForGoal', () => {
    it('creates task linked to goal', async () => {
      const goal: GoalCard = { id: 'goal-1', title: 'Goal', area: 'Work', description: '', status: 'ACTIVE', progress: 0, nextTodo: '', taskCount: 0 }
      const result = await adapter.createTaskForGoal(goal, 'Goal Task')
      expect(result.task).toBeDefined()
      expect(result.task?.linkedGoalId).toBe('goal-1')
    })
  })

  describe('createGoal', () => {
    it('creates goal with valid input', async () => {
      const result = await adapter.createGoal({ title: 'New Goal', area: 'Work', description: '' })
      expect(result.goal).toBeDefined()
      expect(result.goal?.title).toBe('Test Goal')
      expect(result.openGoalWorkspace).toBe(true)
    })
  })

  describe('updateGoalFields', () => {
    it('updates goal fields', async () => {
      const result = await adapter.updateGoalFields('goal-1', { title: 'Updated', area: 'Work', description: '' })
      expect(result.goal).toBeDefined()
      expect(result.goal?.title).toBe('Updated Goal')
    })
  })

  describe('updateGoalStatus', () => {
    it('updates goal status', async () => {
      const result = await adapter.updateGoalStatus('goal-1', 'COMPLETED')
      expect(result.goal).toBeDefined()
      expect(result.goal?.status).toBe('COMPLETED')
    })
  })

  describe('addTaskNote', () => {
    it('adds note to task', async () => {
      const result = await adapter.addTaskNote('task-1', 'Test note')
      expect(result.task).toBeDefined()
      expect(result.task?.activityLogs).toHaveLength(1)
    })
  })

  describe('updateTaskStatus', () => {
    it('updates task status', async () => {
      const result = await adapter.updateTaskStatus('task-1', 'DONE')
      expect(result.task).toBeDefined()
      expect(result.task?.status).toBe('DONE')
    })
  })

  describe('updateTaskContent', () => {
    it('updates task content', async () => {
      const result = await adapter.updateTaskContent('task-1', 'New content')
      expect(result.task).toBeDefined()
      expect(result.task?.content).toBe('Updated content')
    })
  })

  describe('updateTaskFields', () => {
    it('updates task fields with date mapping', async () => {
      const result = await adapter.updateTaskFields('task-1', {
        title: 'Updated Task',
        plannedStartAt: new Date('2026-06-22T10:00:00'),
        dueDate: new Date('2026-06-23T18:00:00'),
      })
      expect(result.task).toBeDefined()
      expect(result.task?.title).toBe('Updated Task')
    })

    it('omits system Reminder link changes so the command seam preserves the existing link', async () => {
      await adapter.updateTaskFields('task-1', {
        title: 'Updated Task',
      })

      expect(updateTaskFields).toHaveBeenCalledWith('task-1', expect.not.objectContaining({
        systemReminderId: expect.anything(),
      }))
    })
  })

  describe('listAreas', () => {
    it('lists areas', async () => {
      const result = await adapter.listAreas()
      expect(result.areas).toBeDefined()
      expect(result.areas).toHaveLength(2)
    })
  })

  describe('createArea', () => {
    it('creates area with valid title', async () => {
      const result = await adapter.createArea('New Area')
      expect(result.area).toBeDefined()
      expect(typeof result.area?.goalCount).toBe('number')
      expect(typeof result.area?.activeGoalCount).toBe('number')
    })
  })

  describe('renameArea', () => {
    it('renames area', async () => {
      const result = await adapter.renameArea('area-1', 'Renamed')
      expect(result.area).toBeDefined()
      expect(result.area?.goalCount).toBe(2)
      expect(result.area?.activeGoalCount).toBe(1)
    })
  })

  describe('deleteArea', () => {
    it('deletes area', async () => {
      const result = await adapter.deleteArea('area-1')
      expect(result.success).toBe(true)
    })
  })

  describe('loadGoals', () => {
    it('loads goals', async () => {
      const goals = await adapter.loadGoals()
      expect(Array.isArray(goals)).toBe(true)
    })
  })
})
