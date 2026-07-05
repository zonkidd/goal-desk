import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useTaskGoalBridge } from './useStoreComposition'
import { useTaskStore } from '../store/taskStore'
import { useGoalStore } from '../store/goalStore'
import { useAreaStore } from '../store/areaStore'
import type { Task } from '../types/task'
import type { GoalCard } from '../types/app'

describe('useTaskGoalBridge', () => {
  beforeEach(() => {
    useTaskStore.setState({ tasks: [] })
    useGoalStore.setState({ baseGoals: [] })
    vi.clearAllMocks()
  })

  it('refreshes goals when a goal-linked task is removed', () => {
    const refreshGoals = vi.fn()
    useGoalStore.setState({ refreshGoals })

    const linkedTask: Task = {
      id: 'task-1',
      title: 'Linked Task',
      content: '',
      status: 'TODO',
      showInTimeline: false,
      linkedGoalId: 'goal-1',
      linkedGoalLabel: 'Goal 1',
      activityLogs: [],
    }

    useTaskStore.setState({ tasks: [linkedTask] })
    renderHook(() => useTaskGoalBridge())
    refreshGoals.mockClear()

    act(() => {
      useTaskStore.setState({ tasks: [] })
    })

    expect(refreshGoals).toHaveBeenCalledOnce()
  })
})

describe('useGoalAreaBridge', () => {
  beforeEach(() => {
    useGoalStore.setState({ baseGoals: [] })
    useAreaStore.setState({ allAreas: [] })
    vi.clearAllMocks()
  })

  it('reloads areas when a goal is removed', async () => {
    const loadAreas = vi.fn().mockResolvedValue(undefined)
    useAreaStore.setState({ loadAreas })

    const goal: GoalCard = {
      id: 'goal-1',
      title: 'Goal 1',
      area: 'Work',
      description: '',
      status: 'ACTIVE',
      progress: 0,
      nextTodo: '',
      taskCount: 0,
    }

    useGoalStore.setState({ baseGoals: [goal] })
    const { useGoalAreaBridge } = await import('./useStoreComposition')
    renderHook(() => useGoalAreaBridge())
    loadAreas.mockClear()

    act(() => {
      useGoalStore.setState({ baseGoals: [] })
    })

    expect(loadAreas).toHaveBeenCalledOnce()
  })
})
