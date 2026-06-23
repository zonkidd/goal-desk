import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTaskStore } from './taskStore'
import { useUiStore } from './uiStore'
import { useGoalStore } from './goalStore'

vi.mock('../lib/runtime', () => ({
  isTauriRuntime: vi.fn(() => false),
}))

const backingStore: Record<string, string> = {}

describe('taskStore independence from uiStore', () => {
  beforeEach(() => {
    Object.keys(backingStore).forEach(k => delete backingStore[k])
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => backingStore[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { backingStore[key] = value }),
      removeItem: vi.fn((key: string) => { delete backingStore[key] }),
      clear: vi.fn(() => { Object.keys(backingStore).forEach(k => delete backingStore[k]) }),
    })
    useTaskStore.setState({ tasks: [] })
    useUiStore.setState({
      activeDrawer: null,
      currentView: 'inbox',
    })
    useGoalStore.setState({ baseGoals: [] })
    vi.clearAllMocks()
  })

  it('addTask should not directly open task drawer', async () => {
    await useTaskStore.getState().addTask('Test task')

    const uiState = useUiStore.getState()
    expect(uiState.activeDrawer).toBeNull()
  })

  it('addTask should not directly switch view', async () => {
    useUiStore.setState({ currentView: 'goals' })

    await useTaskStore.getState().addTask('Test task')

    const uiState = useUiStore.getState()
    expect(uiState.currentView).toBe('goals')
  })

  it('createTaskForGoal should not directly open task drawer', async () => {
    const mockGoal = { id: 'goal-1', title: 'Test', area: 'Work', description: '', status: 'ACTIVE' as const, progress: 0, nextTodo: '', taskCount: 0, createdAt: new Date(), updatedAt: new Date() }

    await useTaskStore.getState().createTaskForGoal(mockGoal, 'Task for goal')

    const uiState = useUiStore.getState()
    expect(uiState.activeDrawer).toBeNull()
  })

  it('createTaskForGoal should not directly close goal drawer', async () => {
    useUiStore.setState({ activeDrawer: { type: 'goal', id: 'goal-1' } })

    const mockGoal = { id: 'goal-1', title: 'Test', area: 'Work', description: '', status: 'ACTIVE' as const, progress: 0, nextTodo: '', taskCount: 0, createdAt: new Date(), updatedAt: new Date() }
    await useTaskStore.getState().createTaskForGoal(mockGoal, 'Task for goal')

    const uiState = useUiStore.getState()
    expect(uiState.activeDrawer).toEqual({ type: 'goal', id: 'goal-1' })
  })
})

describe('taskStore independence from goalStore', () => {
  beforeEach(() => {
    Object.keys(backingStore).forEach(k => delete backingStore[k])
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => backingStore[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { backingStore[key] = value }),
      removeItem: vi.fn((key: string) => { delete backingStore[key] }),
      clear: vi.fn(() => { Object.keys(backingStore).forEach(k => delete backingStore[k]) }),
    })
    useTaskStore.setState({ tasks: [] })
    useGoalStore.setState({ baseGoals: [] })
    vi.clearAllMocks()
  })

  it('updateTaskStatus should not directly call goalStore.refreshGoals', async () => {
    const refreshGoalsSpy = vi.spyOn(useGoalStore.getState(), 'refreshGoals')

    // create a task first so updateTaskStatus has something to update
    await useTaskStore.getState().addTask('Test task')
    const tasks = useTaskStore.getState().tasks
    expect(tasks.length).toBe(1)

    await useTaskStore.getState().updateTaskStatus(tasks[0].id, 'IN_PROGRESS')

    expect(refreshGoalsSpy).not.toHaveBeenCalled()
    refreshGoalsSpy.mockRestore()
  })
})
