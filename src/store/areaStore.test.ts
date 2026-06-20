import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAreaStore } from './areaStore'

vi.mock('../lib/workspaceMutations', () => ({
  createWorkspaceMutationAdapter: vi.fn(),
}))

vi.mock('../lib/runtime', () => ({
  isTauriRuntime: vi.fn(() => false),
  getCurrentWindowLabel: vi.fn(() => 'main'),
}))

vi.mock('./uiStore', () => ({
  useUiStore: {
    setState: vi.fn(),
  },
}))

describe('areaStore', () => {
  beforeEach(() => {
    useAreaStore.setState({ allAreas: [], statusMessage: '' })
  })

  it('should have empty initial state', () => {
    const state = useAreaStore.getState()
    expect(state.allAreas).toEqual([])
    expect(state.statusMessage).toBe('')
  })

  it('should load areas from adapter', async () => {
    const mockAreas = [
      { id: '1', title: 'Work', goalCount: 2, activeGoalCount: 1, isSystem: false },
      { id: '2', title: 'Personal', goalCount: 0, activeGoalCount: 0, isSystem: false },
    ]
    const { createWorkspaceMutationAdapter } = await import('../lib/workspaceMutations')
    ;(createWorkspaceMutationAdapter as any).mockReturnValue({
      listAreas: vi.fn().mockResolvedValue({ areas: mockAreas, statusMessage: 'ok' }),
    })

    await useAreaStore.getState().loadAreas()

    const state = useAreaStore.getState()
    expect(state.allAreas).toEqual(mockAreas)
    expect(state.statusMessage).toBe('ok')
  })

  it('should create area and add to list', async () => {
    const newArea = { id: '3', title: 'New', goalCount: 0, activeGoalCount: 0, isSystem: false }
    const { createWorkspaceMutationAdapter } = await import('../lib/workspaceMutations')
    ;(createWorkspaceMutationAdapter as any).mockReturnValue({
      createArea: vi.fn().mockResolvedValue({ area: newArea, statusMessage: 'created' }),
    })

    await useAreaStore.getState().createArea('New')

    const state = useAreaStore.getState()
    expect(state.allAreas).toContainEqual(newArea)
    expect(state.statusMessage).toBe('created')
  })

  it('should rename area in list', async () => {
    useAreaStore.setState({ allAreas: [{ id: '1', title: 'Old', goalCount: 0, activeGoalCount: 0, isSystem: false }] })
    const { createWorkspaceMutationAdapter } = await import('../lib/workspaceMutations')
    ;(createWorkspaceMutationAdapter as any).mockReturnValue({
      renameArea: vi.fn().mockResolvedValue({ area: { id: '1', title: 'Renamed' }, statusMessage: 'renamed' }),
    })

    await useAreaStore.getState().renameArea('1', 'Renamed')

    const state = useAreaStore.getState()
    expect(state.allAreas[0].title).toBe('Renamed')
  })

  it('should delete area from list', async () => {
    useAreaStore.setState({ allAreas: [{ id: '1', title: 'To Delete', goalCount: 0, activeGoalCount: 0, isSystem: false }] })
    const { createWorkspaceMutationAdapter } = await import('../lib/workspaceMutations')
    ;(createWorkspaceMutationAdapter as any).mockReturnValue({
      deleteArea: vi.fn().mockResolvedValue({ success: true, message: '', statusMessage: 'deleted' }),
    })

    await useAreaStore.getState().deleteArea('1')

    const state = useAreaStore.getState()
    expect(state.allAreas).toHaveLength(0)
  })

  it('should handle loadAreas error', async () => {
    const { createWorkspaceMutationAdapter } = await import('../lib/workspaceMutations')
    ;(createWorkspaceMutationAdapter as any).mockReturnValue({
      listAreas: vi.fn().mockRejectedValue(new Error('network')),
    })

    await useAreaStore.getState().loadAreas()

    const state = useAreaStore.getState()
    expect(state.statusMessage).toContain('Unable to load areas')
  })
})
