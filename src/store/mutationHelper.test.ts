import { describe, it, expect, vi, beforeEach } from 'vitest'
import { executeMutation, executeMutationWithResult } from './mutationHelper'
import type { MutationAdapter } from '../lib/mutationAdapter'

function createMockAdapter(overrides: Partial<MutationAdapter> = {}): MutationAdapter {
  return {
    createTask: vi.fn().mockResolvedValue({ task: { id: 't1', title: 'Test' } }),
    createTaskForGoal: vi.fn().mockResolvedValue({}),
    addTaskNote: vi.fn().mockResolvedValue({}),
    updateTaskStatus: vi.fn().mockResolvedValue({}),
    updateTaskContent: vi.fn().mockResolvedValue({}),
    updateTaskFields: vi.fn().mockResolvedValue({}),
    createSystemReminder: vi.fn().mockResolvedValue(''),
    createGoal: vi.fn().mockResolvedValue({ goal: { id: 'g1', title: 'Test Goal' }, openGoalWorkspace: true }),
    updateGoalFields: vi.fn().mockResolvedValue({}),
    updateGoalStatus: vi.fn().mockResolvedValue({}),
    listAreas: vi.fn().mockResolvedValue({ areas: [] }),
    createArea: vi.fn().mockResolvedValue({}),
    renameArea: vi.fn().mockResolvedValue({}),
    deleteArea: vi.fn().mockResolvedValue({ success: true, message: 'ok' }),
    ...overrides,
  } as MutationAdapter
}

describe('mutationHelper', () => {
  describe('executeMutation', () => {
    it('calls the mutation function and returns result', async () => {
      const adapter = createMockAdapter()
      const fn = vi.fn().mockResolvedValue({ task: { id: 't1' } })

      const result = await executeMutation(fn, adapter)

      expect(fn).toHaveBeenCalledWith(adapter)
      expect(result).toEqual({ task: { id: 't1' } })
    })

    it('calls onSuccess callback with result', async () => {
      const adapter = createMockAdapter()
      const fn = vi.fn().mockResolvedValue({ task: { id: 't1' } })
      const onSuccess = vi.fn()

      await executeMutation(fn, adapter, { onSuccess })

      expect(onSuccess).toHaveBeenCalledWith({ task: { id: 't1' } })
    })

    it('returns null on error without calling onSuccess', async () => {
      const adapter = createMockAdapter()
      const fn = vi.fn().mockRejectedValue(new Error('fail'))
      const onSuccess = vi.fn()
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await executeMutation(fn, adapter, { onSuccess })

      expect(result).toBeNull()
      expect(onSuccess).not.toHaveBeenCalled()
      errorSpy.mockRestore()
    })
  })

  describe('executeMutationWithResult', () => {
    it('extracts entity from result and calls on success', async () => {
      const adapter = createMockAdapter()
      const fn = vi.fn().mockResolvedValue({ task: { id: 't1', title: 'Test' } })
      const onSuccess = vi.fn()

      const result = await executeMutationWithResult(fn, adapter, {
        extractEntity: (r) => r.task,
        onSuccess,
      })

      expect(result).toEqual({ id: 't1', title: 'Test' })
      expect(onSuccess).toHaveBeenCalledWith({ id: 't1', title: 'Test' })
    })

    it('returns null when extractEntity returns undefined', async () => {
      const adapter = createMockAdapter()
      const fn = vi.fn().mockResolvedValue({})

      const result = await executeMutationWithResult(fn, adapter, {
        extractEntity: (r: any) => r.task,
      })

      expect(result).toBeNull()
    })
  })
})
