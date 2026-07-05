import { describe, it, expect, vi } from 'vitest'
import { executeMutation } from './mutationHelper'
import type { MutationAdapter } from '../lib/mutationAdapter'

function createMockAdapter(overrides: Partial<MutationAdapter> = {}): MutationAdapter {
  return {
    createTask: vi.fn().mockResolvedValue({ task: { id: 't1', title: 'Test' } }),
    createTaskForGoal: vi.fn().mockResolvedValue({}),
    addTaskNote: vi.fn().mockResolvedValue({}),
    updateTaskStatus: vi.fn().mockResolvedValue({}),
    updateTaskContent: vi.fn().mockResolvedValue({}),
    updateTaskFields: vi.fn().mockResolvedValue({}),
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

    it('calls onError callback on failure', async () => {
      const adapter = createMockAdapter()
      const fn = vi.fn().mockRejectedValue(new Error('fail'))
      const onError = vi.fn()
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await executeMutation(fn, adapter, { onError })

      expect(result).toBeNull()
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      errorSpy.mockRestore()
    })

    it('awaits async onSuccess callback', async () => {
      const adapter = createMockAdapter()
      const fn = vi.fn().mockResolvedValue({ task: { id: 't1' } })
      const callOrder: string[] = []
      const onSuccess = vi.fn().mockImplementation(async () => {
        callOrder.push('onSuccess-start')
        await new Promise(resolve => setTimeout(resolve, 10))
        callOrder.push('onSuccess-end')
      })

      await executeMutation(fn, adapter, { onSuccess })

      expect(callOrder).toEqual(['onSuccess-start', 'onSuccess-end'])
    })
  })
})
