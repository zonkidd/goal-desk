import { describe, test, expect, beforeEach } from 'vitest'
import { DerivedStateManager } from './DerivedStateManager'
import type { Task } from '../types/task'
import type { GoalCard, TimelineItem, AreaFilter } from '../types/app'

describe('DerivedStateManager - 缓存失效策略', () => {
  let mockTasks: Task[]
  let mockGoals: GoalCard[]
  let mockTimeline: TimelineItem[]

  beforeEach(() => {
    mockTasks = [
      {
        id: 'task-1',
        title: '完成文档',
        status: 'TODO',
        linkedGoalId: 'goal-1',
        content: '',
        activityLogs: [],
        showInTimeline: false,
      },
      {
        id: 'task-2',
        title: '写代码',
        status: 'IN_PROGRESS',
        linkedGoalId: 'goal-1',
        content: '',
        activityLogs: [],
        showInTimeline: false,
      },
    ]

    mockGoals = [
      {
        id: 'goal-1',
        title: '完成项目',
        area: '工作',
        status: 'ACTIVE',
        description: '',
        progress: 0,
        nextTodo: '',
        taskCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    mockTimeline = []
  })

  test('tasks 变化应失效 derivedGoals 缓存', () => {
    const manager = new DerivedStateManager(
      mockTimeline,
      mockGoals,
      mockTasks,
      'ALL' as AreaFilter,
      true
    )

    // 第一次计算
    const result1 = manager.compute('full-refresh')
    const goalProgressBefore = result1.goals[0].progress

    // 完成一个任务
    const updatedTasks = [
      { ...mockTasks[0], status: 'DONE' as const },
      mockTasks[1],
    ]

    const manager2 = new DerivedStateManager(
      mockTimeline,
      mockGoals,
      updatedTasks,
      'ALL' as AreaFilter,
      true
    )

    // 第二次计算（只传 tasks 变化）
    const result2 = manager2.compute('tasks')
    const goalProgressAfter = result2.goals[0].progress

    // 目标进度应该增加（1/2 → 50%）
    expect(goalProgressAfter).toBeGreaterThan(goalProgressBefore)
    expect(goalProgressAfter).toBe(50)
  })

  test('area-filter 变化不应失效 derivedGoals 缓存', () => {
    const manager = new DerivedStateManager(
      mockTimeline,
      mockGoals,
      mockTasks,
      'ALL' as AreaFilter,
      true
    )

    // 第一次完整计算
    const result1 = manager.compute('full-refresh')

    // 改变领域筛选
    const manager2 = new DerivedStateManager(
      mockTimeline,
      mockGoals,
      mockTasks,
      '工作' as AreaFilter,
      true
    )

    const result2 = manager2.compute('area-filter')

    // derivedGoals 应该完全相同（缓存命中）
    expect(result2.goals).toEqual(result1.goals)
  })

  test('show-completed 变化只应失效 inbox 缓存', () => {
    const manager = new DerivedStateManager(
      mockTimeline,
      mockGoals,
      mockTasks,
      'ALL' as AreaFilter,
      false
    )

    const result1 = manager.compute('full-refresh')

    const manager2 = new DerivedStateManager(
      mockTimeline,
      mockGoals,
      mockTasks,
      'ALL' as AreaFilter,
      true // 显示已完成任务
    )

    const result2 = manager2.compute('show-completed')

    // 其他派生状态应该保持一致
    expect(result2.goals).toEqual(result1.goals)
    expect(result2.timeline).toEqual(result1.timeline)
    expect(result2.todayFocusTasks).toEqual(result1.todayFocusTasks)
  })

  test('timeline 变化只应失效 timeline 缓存', () => {
    const updatedTimeline: TimelineItem[] = [
      {
        id: 'cal-1',
        title: '会议',
        timeLabel: '14:00',
        source: 'calendar',
        readonly: true,
        done: false,
      },
    ]

    const manager = new DerivedStateManager(
      mockTimeline,
      mockGoals,
      mockTasks,
      'ALL' as AreaFilter,
      true
    )

    const result1 = manager.compute('full-refresh')

    const manager2 = new DerivedStateManager(
      updatedTimeline,
      mockGoals,
      mockTasks,
      'ALL' as AreaFilter,
      true
    )

    const result2 = manager2.compute('timeline')

    // timeline 应该更新
    expect(result2.timeline).not.toEqual(result1.timeline)

    // 其他派生状态应该保持一致
    expect(result2.goals).toEqual(result1.goals)
    expect(result2.inbox).toEqual(result1.inbox)
  })
})

describe('DerivedStateManager - 目标进度计算', () => {
  test('无任务的目标进度应为 0', () => {
    const goals: GoalCard[] = [
      { id: 'goal-1', title: '目标', area: '工作', status: 'ACTIVE', description: '', progress: 0, nextTodo: '', taskCount: 0, createdAt: new Date(), updatedAt: new Date() },
    ]

    const manager = new DerivedStateManager([], goals, [], 'ALL' as AreaFilter, true)
    const result = manager.compute('full-refresh')

    expect(result.goals[0].progress).toBe(0)
    expect(result.goals[0].taskCount).toBe(0)
  })

  test('部分完成的目标进度计算正确', () => {
    const goals: GoalCard[] = [
      { id: 'goal-1', title: '目标', area: '工作', status: 'ACTIVE', description: '', progress: 0, nextTodo: '', taskCount: 0, createdAt: new Date(), updatedAt: new Date() },
    ]

    const tasks: Task[] = [
      { id: 't1', title: 'Task 1', status: 'DONE', linkedGoalId: 'goal-1', content: '', activityLogs: [], showInTimeline: false },
      { id: 't2', title: 'Task 2', status: 'DONE', linkedGoalId: 'goal-1', content: '', activityLogs: [], showInTimeline: false },
      { id: 't3', title: 'Task 3', status: 'TODO', linkedGoalId: 'goal-1', content: '', activityLogs: [], showInTimeline: false },
      { id: 't4', title: 'Task 4', status: 'IN_PROGRESS', linkedGoalId: 'goal-1', content: '', activityLogs: [], showInTimeline: false },
    ]

    const manager = new DerivedStateManager([], goals, tasks, 'ALL' as AreaFilter, true)
    const result = manager.compute('full-refresh')

    expect(result.goals[0].progress).toBe(50) // 2/4 = 50%
    expect(result.goals[0].taskCount).toBe(4)
  })

  test('全部完成的目标状态应为 READY_TO_COMPLETE', () => {
    const goals: GoalCard[] = [
      { id: 'goal-1', title: '目标', area: '工作', status: 'ACTIVE', description: '', progress: 0, nextTodo: '', taskCount: 0, createdAt: new Date(), updatedAt: new Date() },
    ]

    const tasks: Task[] = [
      { id: 't1', title: 'Task 1', status: 'DONE', linkedGoalId: 'goal-1', content: '', activityLogs: [], showInTimeline: false },
      { id: 't2', title: 'Task 2', status: 'DONE', linkedGoalId: 'goal-1', content: '', activityLogs: [], showInTimeline: false },
    ]

    const manager = new DerivedStateManager([], goals, tasks, 'ALL' as AreaFilter, true)
    const result = manager.compute('full-refresh')

    expect(result.goals[0].progress).toBe(100) // 2/2 = 100%
    expect(result.goals[0].status).toBe('READY_TO_COMPLETE')
  })
})
