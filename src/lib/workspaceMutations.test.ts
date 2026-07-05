import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getWorkspaceMutationAdapter, setWorkspaceMutationAdapter, resetWorkspaceMutationAdapter } from './workspaceMutations'

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

async function expectCreateTaskValidation(adapter: ReturnType<typeof getWorkspaceMutationAdapter>) {
  const blankResult = await adapter.createTask('   ')
  const validResult = await adapter.createTask('Buy milk')

  expect(blankResult.task).toBeUndefined()
  expect(validResult.task?.title).toBe('Buy milk')
}

describe('workspaceMutations', () => {
  beforeEach(() => {
    resetWorkspaceMutationAdapter()
    Object.keys(backingStore).forEach(k => delete backingStore[k])
    vi.stubGlobal('localStorage', createMockStorage())
  })

  it('returns the same adapter instance on repeated calls (singleton)', () => {
    const a = getWorkspaceMutationAdapter()
    const b = getWorkspaceMutationAdapter()
    expect(a).toBe(b)
  })

  it('applies validation through the registry mutation interface', async () => {
    const adapter = getWorkspaceMutationAdapter()

    await expectCreateTaskValidation(adapter)
  })

  it('allows injecting a mock adapter', () => {
    const mock = { createTask: vi.fn() } as any
    setWorkspaceMutationAdapter(mock)
    expect(getWorkspaceMutationAdapter()).toBe(mock)
  })

  it('resets to an auto-detected adapter that keeps the registry validation seam', async () => {
    const mock = { createTask: vi.fn() } as any
    setWorkspaceMutationAdapter(mock)
    resetWorkspaceMutationAdapter()
    const adapter = getWorkspaceMutationAdapter()

    await expectCreateTaskValidation(adapter)
  })
})
