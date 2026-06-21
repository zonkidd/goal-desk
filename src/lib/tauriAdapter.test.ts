import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TauriAdapter } from './tauriAdapter'
import type { GoalCard, Task } from '../types/app'

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
  ]),
  createArea: vi.fn().mockResolvedValue({ id: 'area-2', title: 'Personal' }),
  renameArea: vi.fn().mockResolvedValue({ id: 'area-1', title: 'Renamed' }),
  deleteArea: vi.fn().mockResolvedValue({ success: true, message: 'Deleted' }),
  createSystemReminder: vi.fn().mockResolvedValue('reminder-1'),
}))

// Mock validation
vi.mock('./validation', () => ({
  validateTaskTitle: vi.fn((title: string) => title.trim() || null),
  validateGoalInput: vi.fn((input: { title: string }) => input.title.trim() ? input : null),
  validateAreaTitle: vi.fn((title: string) => title.trim() || null),
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

    it('returns empty result for empty title', async () => {
      const result = await adapter.createTask('   ')
      expect(result.task).toBeUndefined()
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
      const result = await adapter.createGoal({ title: 'New Goal', area: 'Work' })
      expect(result.goal).toBeDefined()
      expect(result.goal?.title).toBe('Test Goal')
      expect(result.openGoalWorkspace).toBe(true)
    })

    it('returns empty result for invalid input', async () => {
      const result = await adapter.createGoal({ title: '   ' })
      expect(result.goal).toBeUndefined()
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

    it('returns empty result for empty note', async () => {
      const result = await adapter.addTaskNote('task-1', '   ')
      expect(result.task).toBeUndefined()
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

    it('returns empty result for invalid title', async () => {
      const result = await adapter.updateTaskFields('task-1', { title: '   ' })
      expect(result.task).toBeUndefined()
    })
  })

  describe('listAreas', () => {
    it('lists areas', async () => {
      const result = await adapter.listAreas()
      expect(result.areas).toBeDefined()
      expect(result.areas).toHaveLength(1)
    })
  })

  describe('createArea', () => {
    it('creates area with valid title', async () => {
      const result = await adapter.createArea('New Area')
      expect(result.area).toBeDefined()
      expect(result.area?.title).toBe('Personal')
    })

    it('returns empty result for empty title', async () => {
      const result = await adapter.createArea('   ')
      expect(result.area).toBeUndefined()
    })
  })

  describe('renameArea', () => {
    it('renames area', async () => {
      const result = await adapter.renameArea('area-1', 'Renamed')
      expect(result.area).toBeDefined()
      expect(result.area?.title).toBe('Renamed')
    })
  })

  describe('deleteArea', () => {
    it('deletes area', async () => {
      const result = await adapter.deleteArea('area-1')
      expect(result.success).toBe(true)
    })
  })

  describe('createSystemReminder', () => {
    it('creates system reminder', async () => {
      const result = await adapter.createSystemReminder('Reminder', new Date())
      expect(result).toBe('reminder-1')
    })
  })
})