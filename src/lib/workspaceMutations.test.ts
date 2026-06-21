import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getWorkspaceMutationAdapter, setWorkspaceMutationAdapter, resetWorkspaceMutationAdapter } from './workspaceMutations'
import { ValidatingMutationAdapter } from './validatingAdapter'

describe('workspaceMutations', () => {
  beforeEach(() => {
    resetWorkspaceMutationAdapter()
  })

  it('returns the same adapter instance on repeated calls (singleton)', () => {
    const a = getWorkspaceMutationAdapter()
    const b = getWorkspaceMutationAdapter()
    expect(a).toBe(b)
  })

  it('allows injecting a mock adapter', () => {
    const mock = { createTask: vi.fn() } as any
    setWorkspaceMutationAdapter(mock)
    expect(getWorkspaceMutationAdapter()).toBe(mock)
  })

  it('resets to auto-detect after resetWorkspaceMutationAdapter', () => {
    const mock = { createTask: vi.fn() } as any
    setWorkspaceMutationAdapter(mock)
    resetWorkspaceMutationAdapter()
    const adapter = getWorkspaceMutationAdapter()
    expect(adapter).toBeInstanceOf(ValidatingMutationAdapter)
  })
})
