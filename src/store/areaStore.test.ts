import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAreaStore } from './areaStore'

vi.mock('../lib/workspaceMutations', () => ({
  getWorkspaceMutationAdapter: vi.fn(),
}))

vi.mock('../lib/runtime', () => ({
  isTauriRuntime: vi.fn(() => false),
  getCurrentWindowLabel: vi.fn(() => 'main'),
}))

describe('areaStore', () => {
  beforeEach(() => {
    useAreaStore.setState({ allAreas: [] })
  })

  it('should have empty initial state', () => {
    const state = useAreaStore.getState()
    expect(state.allAreas).toEqual([])
  })

  it('should load areas from adapter', async () => {
    const mockAreas = [
      { id: '1', title: 'Work', goalCount: 2, activeGoalCount: 1, isSystem: false },
      { id: '2', title: 'Personal', goalCount: 0, activeGoalCount: 0, isSystem: false },
    ]
    const { getWorkspaceMutationAdapter } = await import('../lib/workspaceMutations')
    ;(getWorkspaceMutationAdapter as any).mockReturnValue({
      listAreas: vi.fn().mockResolvedValue({ areas: mockAreas }),
    })

    await useAreaStore.getState().loadAreas()

    const state = useAreaStore.getState()
    expect(state.allAreas).toEqual(mockAreas)
  })

  it('should create area and add to list', async () => {
    const newArea = { id: '3', title: 'New', goalCount: 0, activeGoalCount: 0, isSystem: false }
    const { getWorkspaceMutationAdapter } = await import('../lib/workspaceMutations')
    ;(getWorkspaceMutationAdapter as any).mockReturnValue({
      createArea: vi.fn().mockResolvedValue({ area: newArea }),
    })

    await useAreaStore.getState().createArea('New')

    const state = useAreaStore.getState()
    expect(state.allAreas).toContainEqual(newArea)
  })

  it('should rename area in list', async () => {
    useAreaStore.setState({ allAreas: [{ id: '1', title: 'Old', goalCount: 0, activeGoalCount: 0, isSystem: false }] })
    const { getWorkspaceMutationAdapter } = await import('../lib/workspaceMutations')
    ;(getWorkspaceMutationAdapter as any).mockReturnValue({
      renameArea: vi.fn().mockResolvedValue({ area: { id: '1', title: 'Renamed' } }),
    })

    await useAreaStore.getState().renameArea('1', 'Renamed')

    const state = useAreaStore.getState()
    expect(state.allAreas[0].title).toBe('Renamed')
  })

  it('stores the complete Area returned by renameArea', async () => {
    const existingArea = { id: '1', title: 'Old', goalCount: 1, activeGoalCount: 1, isSystem: false }
    const renamedArea = { id: '1', title: 'Renamed', goalCount: 3, activeGoalCount: 2, isSystem: true }
    useAreaStore.setState({ allAreas: [existingArea] })
    const { getWorkspaceMutationAdapter } = await import('../lib/workspaceMutations')
    ;(getWorkspaceMutationAdapter as any).mockReturnValue({
      renameArea: vi.fn().mockResolvedValue({ area: renamedArea }),
    })

    await useAreaStore.getState().renameArea('1', 'Renamed')

    expect(useAreaStore.getState().allAreas).toEqual([renamedArea])
  })

  it('should delete area from list', async () => {
    useAreaStore.setState({ allAreas: [{ id: '1', title: 'To Delete', goalCount: 0, activeGoalCount: 0, isSystem: false }] })
    const { getWorkspaceMutationAdapter } = await import('../lib/workspaceMutations')
    ;(getWorkspaceMutationAdapter as any).mockReturnValue({
      deleteArea: vi.fn().mockResolvedValue({ success: true, message: '' }),
    })

    await useAreaStore.getState().deleteArea('1')

    const state = useAreaStore.getState()
    expect(state.allAreas).toHaveLength(0)
  })

  it('should handle loadAreas error gracefully', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { getWorkspaceMutationAdapter } = await import('../lib/workspaceMutations')
    ;(getWorkspaceMutationAdapter as any).mockReturnValue({
      listAreas: vi.fn().mockRejectedValue(new Error('network')),
    })

    await useAreaStore.getState().loadAreas()

    const state = useAreaStore.getState()
    expect(state.allAreas).toEqual([])
    errorSpy.mockRestore()
  })
})
