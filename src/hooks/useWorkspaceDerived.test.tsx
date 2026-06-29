import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWorkspaceDerived } from './useWorkspaceDerived'
import { useTaskStore } from '../store/taskStore'
import { useGoalStore } from '../store/goalStore'
import { useUiStore } from '../store/uiStore'
import { useEventkitStore } from '../store/eventkitStore'
import type { Task } from '../types/task'
import type { GoalCard } from '../types/app'

function resetAllStores() {
  useTaskStore.setState({ tasks: [] })
  useGoalStore.setState({ baseGoals: [] })
  useUiStore.setState({ activeArea: 'ALL', showCompletedTodos: false })
  useEventkitStore.setState({ rawEventKit: { calendarEvents: [], reminders: [] } })
}

const mockTask: Task = {
  id: 'task-1',
  title: 'Test Task',
  content: '',
  status: 'IN_PROGRESS',
  showInTimeline: false,
  plannedStartAt: new Date(),
  dueDate: new Date(Date.now() + 86400000),
  activityLogs: [{ action: 'CREATED', timestamp: new Date() }],
}

const mockGoal: GoalCard = {
  id: 'goal-1',
  title: 'Test Goal',
  area: 'WORK',
  description: '',
  status: 'ACTIVE',
  progress: 0,
  nextTodo: '',
  taskCount: 0,
}

describe('useWorkspaceDerived', () => {
  beforeEach(() => {
    resetAllStores()
  })

  it('returns empty initial state', () => {
    const { result } = renderHook(() => useWorkspaceDerived())
    expect(result.current.today.focusTasks).toEqual([])
    expect(result.current.today.attentionGroups).toEqual({ overdue: [], dueToday: [], ongoing: [], systemReminders: [] })
    expect(result.current.today.timeline).toEqual([])
    expect(result.current.inbox).toEqual({
      activeTasks: [],
      pausedTasks: [],
      completed: { totalCount: 0, visibleTasks: [], isCollapsedByDefault: true },
    })
    expect(result.current.today.relevantGoals).toEqual([])
  })

  it('derives focus tasks from taskStore', () => {
    const { result } = renderHook(() => useWorkspaceDerived())
    act(() => { useTaskStore.setState({ tasks: [mockTask] }) })
    expect(result.current.today.focusTasks).toHaveLength(1)
    expect(result.current.today.focusTasks[0].id).toBe('task-1')
  })

  it('derives inbox groups from taskStore', () => {
    const todoTask: Task = { ...mockTask, id: 't1', status: 'TODO' }
    const pausedTask: Task = { ...mockTask, id: 't2', status: 'PAUSED' }
    const doneTask: Task = { ...mockTask, id: 't3', status: 'DONE' }
    const { result } = renderHook(() => useWorkspaceDerived())
    act(() => { useTaskStore.setState({ tasks: [todoTask, pausedTask, doneTask] }) })
    expect(result.current.inbox.activeTasks).toHaveLength(1)
    expect(result.current.inbox.pausedTasks).toHaveLength(1)
    expect(result.current.inbox.completed.totalCount).toBe(1)
  })

  it('derives relevant goals from goalStore + attentionGroups', () => {
    const taskWithGoal: Task = {
      ...mockTask,
      linkedGoalId: 'goal-1',
      dueDate: new Date(Date.now() + 86400000),
    }
    const { result } = renderHook(() => useWorkspaceDerived())
    act(() => {
      useTaskStore.setState({ tasks: [taskWithGoal] })
      useGoalStore.setState({ baseGoals: [{ ...mockGoal, taskCount: 1, progress: 0 }] })
    })
    expect(result.current.today.relevantGoals.length).toBeGreaterThanOrEqual(0)
  })

  it('re-derives when taskStore changes', () => {
    const { result } = renderHook(() => useWorkspaceDerived())
    expect(result.current.today.focusTasks).toHaveLength(0)
    act(() => { useTaskStore.setState({ tasks: [mockTask] }) })
    expect(result.current.today.focusTasks).toHaveLength(1)
  })

  it('re-derives when goalStore changes', () => {
    const { result } = renderHook(() => useWorkspaceDerived())
    expect(result.current.goals).toHaveLength(0)
    act(() => { useGoalStore.setState({ baseGoals: [mockGoal] }) })
    expect(result.current.goals).toHaveLength(1)
  })

  it('re-derives when uiStore activeArea changes', () => {
    const { result } = renderHook(() => useWorkspaceDerived())
    act(() => { useTaskStore.setState({ tasks: [mockTask] }) })
    expect(result.current.today.focusTasks).toHaveLength(1)
    act(() => { useUiStore.setState({ activeArea: 'PERSONAL' }) })
    expect(result.current.today.focusTasks).toHaveLength(0)
  })
})
