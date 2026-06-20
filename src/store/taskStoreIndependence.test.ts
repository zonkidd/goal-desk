import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTaskStore } from './taskStore'
import { useUiStore } from './uiStore'

vi.mock('../lib/runtime', () => ({
  isTauriRuntime: vi.fn(() => false),
}))

describe('taskStore independence from uiStore', () => {
  beforeEach(() => {
    useTaskStore.setState({
      tasks: [],
    })
    useUiStore.setState({
      isTaskDrawerOpen: false,
      selectedTaskId: undefined,
      currentView: 'inbox',
    })
    vi.clearAllMocks()
  })

  it('addTask should not directly open task drawer', async () => {
    await useTaskStore.getState().addTask('Test task')

    const uiState = useUiStore.getState()
    expect(uiState.isTaskDrawerOpen).toBe(false)
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
    expect(uiState.isTaskDrawerOpen).toBe(false)
  })

  it('createTaskForGoal should not directly close goal drawer', async () => {
    useUiStore.setState({ isGoalDrawerOpen: true, selectedGoalId: 'goal-1' })

    const mockGoal = { id: 'goal-1', title: 'Test', area: 'Work', description: '', status: 'ACTIVE' as const, progress: 0, nextTodo: '', taskCount: 0, createdAt: new Date(), updatedAt: new Date() }
    await useTaskStore.getState().createTaskForGoal(mockGoal, 'Task for goal')

    const uiState = useUiStore.getState()
    expect(uiState.isGoalDrawerOpen).toBe(true)
  })
})
