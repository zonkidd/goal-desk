import { describe, it, expect } from 'vitest'
import { WorkspaceEngine } from './WorkspaceEngine'
import type { Task } from '../types/task'
import type { GoalCard } from '../types/app'

describe('WorkspaceEngine', () => {
  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    id: 'task-1',
    title: 'Test Task',
    content: '',
    status: 'TODO',
    createdAt: new Date('2026-06-15'),
    updatedAt: new Date('2026-06-15'),
    activityLogs: [],
    ...overrides,
  })

  const createMockGoal = (overrides: Partial<GoalCard> = {}): GoalCard => ({
    id: 'goal-1',
    title: 'Test Goal',
    area: 'Work',
    description: '',
    status: 'ACTIVE',
    progress: 0,
    nextTodo: 'Keep going',
    taskCount: 0,
    createdAt: new Date('2026-06-15'),
    updatedAt: new Date('2026-06-15'),
    ...overrides,
  })

  it('应该计算完整工作区快照', () => {
    const engine = new WorkspaceEngine({
      baseTimeline: [],
      baseGoals: [createMockGoal()],
      tasks: [createMockTask()],
      activeArea: 'ALL',
      showCompletedTodos: false,
    })

    const snapshot = engine.computeSnapshot()

    expect(snapshot).toHaveProperty('goals')
    expect(snapshot).toHaveProperty('today')
    expect(snapshot).toHaveProperty('inbox')
    expect(snapshot).toHaveProperty('meta')
    expect(snapshot.meta.taskCount).toBe(1)
    expect(snapshot.meta.goalCount).toBe(1)
  })

  it('应该根据 Area 过滤 Goals', () => {
    const engine = new WorkspaceEngine({
      baseTimeline: [],
      baseGoals: [
        createMockGoal({ id: 'g1', area: 'Work' }),
        createMockGoal({ id: 'g2', area: 'Personal' }),
      ],
      tasks: [],
      activeArea: 'Work',
      showCompletedTodos: false,
    })

    const snapshot = engine.computeSnapshot()

    expect(snapshot.goals).toHaveLength(1)
    expect(snapshot.goals[0].area).toBe('Work')
  })

  it('应该计算 Today 焦点任务', () => {
    const today = new Date('2026-06-17')
    const engine = new WorkspaceEngine({
      baseTimeline: [],
      baseGoals: [],
      tasks: [
        createMockTask({
          id: 't1',
          status: 'IN_PROGRESS',
          plannedStartAt: new Date('2026-06-17T09:00'),
        }),
        createMockTask({
          id: 't2',
          status: 'TODO', // 不应包含
        }),
      ],
      activeArea: 'ALL',
      showCompletedTodos: false,
      now: today,
    })

    const snapshot = engine.computeSnapshot()

    expect(snapshot.today.focusTasks).toHaveLength(1)
    expect(snapshot.today.focusTasks[0].id).toBe('t1')
  })

  it('应该计算今日注意力分组（overdue/dueToday/ongoing）', () => {
    const today = new Date('2026-06-17')
    const engine = new WorkspaceEngine({
      baseTimeline: [],
      baseGoals: [],
      tasks: [
        createMockTask({
          id: 'overdue',
          status: 'TODO',
          dueDate: new Date('2026-06-16'), // 昨天
        }),
        createMockTask({
          id: 'dueToday',
          status: 'TODO',
          dueDate: new Date('2026-06-17'), // 今天
        }),
        createMockTask({
          id: 'ongoing',
          status: 'IN_PROGRESS',
          plannedStartAt: new Date('2026-06-17T09:00'),
        }),
      ],
      activeArea: 'ALL',
      showCompletedTodos: false,
      now: today,
    })

    const snapshot = engine.computeSnapshot()
    const groups = snapshot.today.attentionGroups

    expect(groups.overdue).toHaveLength(1)
    expect(groups.overdue[0].id).toBe('overdue')
    expect(groups.dueToday).toHaveLength(1)
    expect(groups.dueToday[0].id).toBe('dueToday')
    expect(groups.ongoing).toHaveLength(1)
    expect(groups.ongoing[0].id).toBe('ongoing')
  })

  it('应该计算 Inbox 分组（active/paused/completed）', () => {
    const engine = new WorkspaceEngine({
      baseTimeline: [],
      baseGoals: [],
      tasks: [
        createMockTask({ id: 't1', status: 'TODO' }),
        createMockTask({ id: 't2', status: 'IN_PROGRESS' }),
        createMockTask({ id: 't3', status: 'PAUSED' }),
        createMockTask({ id: 't4', status: 'DONE' }),
      ],
      activeArea: 'ALL',
      showCompletedTodos: false,
    })

    const snapshot = engine.computeSnapshot()
    const inbox = snapshot.inbox

    expect(inbox.activeTasks).toHaveLength(2) // TODO + IN_PROGRESS
    expect(inbox.pausedTasks).toHaveLength(1)
    expect(inbox.completed.totalCount).toBe(1)
    expect(inbox.completed.visibleTasks).toHaveLength(0) // showCompleted = false
  })

  it('显示已完成任务时应该包含在 visible 中', () => {
    const engine = new WorkspaceEngine({
      baseTimeline: [],
      baseGoals: [],
      tasks: [createMockTask({ status: 'DONE' })],
      activeArea: 'ALL',
      showCompletedTodos: true, // ← 开启
    })

    const snapshot = engine.computeSnapshot()

    expect(snapshot.inbox.completed.visibleTasks).toHaveLength(1)
  })

  it('应该缓存派生结果（changeType = area-filter 不重算 goals）', () => {
    const engine = new WorkspaceEngine({
      baseTimeline: [],
      baseGoals: [createMockGoal()],
      tasks: [createMockTask()],
      activeArea: 'ALL',
      showCompletedTodos: false,
    })

    // 第一次计算
    const snapshot1 = engine.computeSnapshot('full-refresh')
    const goals1 = snapshot1.goals

    // 切换 area filter
    engine.updateAtomicState({ activeArea: 'Work' })
    const snapshot2 = engine.computeSnapshot('area-filter')

    // goals 应该被重新过滤，但 derivedGoals 应该来自缓存
    expect(snapshot2.goals).not.toBe(goals1) // 引用不同（过滤结果）
  })

  it('应该支持增量更新（updateAtomicState）', () => {
    const engine = new WorkspaceEngine({
      baseTimeline: [],
      baseGoals: [],
      tasks: [createMockTask({ status: 'TODO' })],
      activeArea: 'ALL',
      showCompletedTodos: false,
    })

    const snapshot1 = engine.computeSnapshot()
    expect(snapshot1.inbox.activeTasks).toHaveLength(1)

    // 增量更新：添加新任务
    engine.updateAtomicState({
      tasks: [
        createMockTask({ id: 't1', status: 'TODO' }),
        createMockTask({ id: 't2', status: 'TODO' }),
      ],
    })

    const snapshot2 = engine.computeSnapshot('tasks')
    expect(snapshot2.inbox.activeTasks).toHaveLength(2)
  })

  it('应该计算 Goal 的进度（基于关联 Tasks）', () => {
    const engine = new WorkspaceEngine({
      baseTimeline: [],
      baseGoals: [createMockGoal({ id: 'g1' })],
      tasks: [
        createMockTask({ id: 't1', linkedGoalId: 'g1', status: 'DONE' }),
        createMockTask({ id: 't2', linkedGoalId: 'g1', status: 'TODO' }),
        createMockTask({ id: 't3', linkedGoalId: 'g1', status: 'TODO' }),
      ],
      activeArea: 'ALL',
      showCompletedTodos: false,
    })

    const snapshot = engine.computeSnapshot()

    expect(snapshot.goals[0].progress).toBe(33) // 1/3 ≈ 33%
    expect(snapshot.goals[0].taskCount).toBe(3)
  })

  it('computeTodaySnapshot 应该只返回 Today 视图数据', () => {
    const engine = new WorkspaceEngine({
      baseTimeline: [],
      baseGoals: [],
      tasks: [createMockTask({ status: 'IN_PROGRESS' })],
      activeArea: 'ALL',
      showCompletedTodos: false,
    })

    const todaySnapshot = engine.computeTodaySnapshot()

    expect(todaySnapshot).toHaveProperty('timeline')
    expect(todaySnapshot).toHaveProperty('focusTasks')
    expect(todaySnapshot).toHaveProperty('attentionGroups')
    expect(todaySnapshot).toHaveProperty('relevantGoals')
    expect(todaySnapshot).not.toHaveProperty('inbox') // 不包含 Inbox
  })

  it('computeInboxSnapshot 应该只返回 Inbox 数据', () => {
    const engine = new WorkspaceEngine({
      baseTimeline: [],
      baseGoals: [],
      tasks: [createMockTask({ status: 'TODO' })],
      activeArea: 'ALL',
      showCompletedTodos: false,
    })

    const inboxSnapshot = engine.computeInboxSnapshot()

    expect(inboxSnapshot).toHaveProperty('activeTasks')
    expect(inboxSnapshot).toHaveProperty('pausedTasks')
    expect(inboxSnapshot).toHaveProperty('completed')
  })
})
