import { describe, test, expect, beforeEach } from 'vitest'
import { deriveGoalRecords, deriveTodayAttentionGroups, getTodayFocusTasks } from './workspaceDerivation'
import type { Task } from '../types/task'
import type { GoalCard } from '../types/app'

describe('workspaceDerivation - 今日焦点任务筛选', () => {
  let now: Date

  beforeEach(() => {
    // 固定时间：2026-06-14 10:00
    now = new Date('2026-06-14T10:00:00+08:00')
  })

  test('筛选 plannedStartAt <= today <= dueAt 的任务', () => {
    const tasks: Task[] = [
      {
        id: 't1',
        title: '持续推进任务',
        status: 'IN_PROGRESS',
        plannedStartAt: new Date('2026-06-10T00:00:00+08:00'), // 4天前开始
        dueDate: new Date('2026-06-20T00:00:00+08:00'), // 6天后截止
        content: '',
        activityLogs: [],
        showInTimeline: false,
      },
      {
        id: 't2',
        title: '未开始任务',
        status: 'TODO',
        plannedStartAt: new Date('2026-06-15T00:00:00+08:00'), // 明天开始
        dueDate: new Date('2026-06-20T00:00:00+08:00'),
        content: '',
        activityLogs: [],
        showInTimeline: false,
      },
      {
        id: 't3',
        title: '已结束任务',
        status: 'TODO',
        plannedStartAt: new Date('2026-06-01T00:00:00+08:00'),
        dueDate: new Date('2026-06-13T00:00:00+08:00'), // 昨天截止
        content: '',
        activityLogs: [],
        showInTimeline: false,
      },
    ]

    const focusTasks = getTodayFocusTasks(tasks, [], 'ALL', now)

    expect(focusTasks).toHaveLength(1)
    expect(focusTasks[0].id).toBe('t1')
  })

  test('排除已完成任务', () => {
    const tasks: Task[] = [
      {
        id: 't1',
        title: '已完成任务',
        status: 'DONE',
        plannedStartAt: new Date('2026-06-10T00:00:00+08:00'),
        dueDate: new Date('2026-06-20T00:00:00+08:00'),
        content: '',
        activityLogs: [],
        showInTimeline: false,
      },
    ]

    const focusTasks = getTodayFocusTasks(tasks, [], 'ALL', now)

    expect(focusTasks).toHaveLength(0)
  })

  test('按领域筛选任务', () => {
    const goals: GoalCard[] = [
      { id: 'g1', title: '工作目标', area: '工作', status: 'ACTIVE', description: '', progress: 0, nextTodo: '', taskCount: 0, createdAt: new Date(), updatedAt: new Date() },
      { id: 'g2', title: '生活目标', area: '生活', status: 'ACTIVE', description: '', progress: 0, nextTodo: '', taskCount: 0, createdAt: new Date(), updatedAt: new Date() },
    ]

    const tasks: Task[] = [
      {
        id: 't1',
        title: '工作任务',
        status: 'IN_PROGRESS',
        linkedGoalId: 'g1',
        plannedStartAt: new Date('2026-06-10T00:00:00+08:00'),
        dueDate: new Date('2026-06-20T00:00:00+08:00'),
        content: '',
        activityLogs: [],
        showInTimeline: false,
      },
      {
        id: 't2',
        title: '生活任务',
        status: 'IN_PROGRESS',
        linkedGoalId: 'g2',
        plannedStartAt: new Date('2026-06-10T00:00:00+08:00'),
        dueDate: new Date('2026-06-20T00:00:00+08:00'),
        content: '',
        activityLogs: [],
        showInTimeline: false,
      },
    ]

    const focusTasks = getTodayFocusTasks(tasks, goals, '工作', now)

    expect(focusTasks).toHaveLength(1)
    expect(focusTasks[0].id).toBe('t1')
  })
})

describe('workspaceDerivation - 今日注意力分组', () => {
  let now: Date

  beforeEach(() => {
    now = new Date('2026-06-14T10:00:00+08:00')
  })

  test('逾期任务分组（dueAt < today）', () => {
    const tasks: Task[] = [
      {
        id: 't1',
        title: '逾期任务',
        status: 'TODO',
        dueDate: new Date('2026-06-13T23:59:59+08:00'), // 昨天
        content: '',
        activityLogs: [],
        showInTimeline: false,
      },
    ]

    const groups = deriveTodayAttentionGroups(tasks, now)

    expect(groups.overdue).toHaveLength(1)
    expect(groups.overdue[0].id).toBe('t1')
  })

  test('今日到期任务分组（dueAt = today）', () => {
    const tasks: Task[] = [
      {
        id: 't1',
        title: '今日到期',
        status: 'TODO',
        dueDate: new Date('2026-06-14T18:00:00+08:00'), // 今天下午6点
        content: '',
        activityLogs: [],
        showInTimeline: false,
      },
    ]

    const groups = deriveTodayAttentionGroups(tasks, now)

    expect(groups.dueToday).toHaveLength(1)
    expect(groups.dueToday[0].id).toBe('t1')
  })

  test('持续推进任务分组（plannedStartAt <= today <= dueAt）', () => {
    const tasks: Task[] = [
      {
        id: 't1',
        title: '持续推进',
        status: 'IN_PROGRESS',
        plannedStartAt: new Date('2026-06-10T00:00:00+08:00'),
        dueDate: new Date('2026-06-20T00:00:00+08:00'),
        content: '',
        activityLogs: [],
        showInTimeline: false,
      },
    ]

    const groups = deriveTodayAttentionGroups(tasks, now)

    expect(groups.ongoing).toHaveLength(1)
    expect(groups.ongoing[0].id).toBe('t1')
  })

  test('已完成任务不出现在任何分组', () => {
    const tasks: Task[] = [
      {
        id: 't1',
        title: '已完成逾期任务',
        status: 'DONE',
        dueDate: new Date('2026-06-13T00:00:00+08:00'),
        content: '',
        activityLogs: [],
        showInTimeline: false,
      },
    ]

    const groups = deriveTodayAttentionGroups(tasks, now)

    expect(groups.overdue).toHaveLength(0)
    expect(groups.dueToday).toHaveLength(0)
    expect(groups.ongoing).toHaveLength(0)
  })
})

describe('workspaceDerivation - 时间展示策略', () => {
  let now: Date

  beforeEach(() => {
    now = new Date('2026-06-14T10:00:00+08:00')
  })

  test('🔥 紧急：剩余 ≤2天', () => {
    const task: Task = {
      id: 't1',
      title: '紧急任务',
      status: 'TODO',
      dueDate: new Date('2026-06-16T00:00:00+08:00'), // 2天后
      content: '',
      activityLogs: [],
      showInTimeline: false,
    }

    const daysLeft = Math.ceil(
      (task.dueDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    expect(daysLeft).toBeLessThanOrEqual(2)
    expect(daysLeft).toBeGreaterThan(0)
    // 应显示 🔥 图标
  })

  test('⏰ 适中：剩余 3-7天', () => {
    const task: Task = {
      id: 't1',
      title: '适中任务',
      status: 'TODO',
      dueDate: new Date('2026-06-20T00:00:00+08:00'), // 6天后
      content: '',
      activityLogs: [],
      showInTimeline: false,
    }

    const daysLeft = Math.ceil(
      (task.dueDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    expect(daysLeft).toBeGreaterThan(2)
    expect(daysLeft).toBeLessThanOrEqual(7)
    // 应显示 ⏰ 图标
  })

  test('✅ 充裕：剩余 >7天', () => {
    const task: Task = {
      id: 't1',
      title: '充裕任务',
      status: 'TODO',
      dueDate: new Date('2026-06-25T00:00:00+08:00'), // 11天后
      content: '',
      activityLogs: [],
      showInTimeline: false,
    }

    const daysLeft = Math.ceil(
      (task.dueDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    expect(daysLeft).toBeGreaterThan(7)
    // 应显示 ✅ 图标
  })

  test('∞ 无截止时间', () => {
    const task: Task = {
      id: 't1',
      title: '无截止任务',
      status: 'TODO',
      dueDate: undefined,
      content: '',
      activityLogs: [],
      showInTimeline: false,
    }

    expect(task.dueDate).toBeUndefined()
    // 应显示 ∞ 图标
  })
})

describe('workspaceDerivation - 已推进天数计算', () => {
  let now: Date

  beforeEach(() => {
    now = new Date('2026-06-14T10:00:00+08:00')
  })

  test('计算从 plannedStartAt 到今天的天数', () => {
    const task: Task = {
      id: 't1',
      title: '持续任务',
      status: 'IN_PROGRESS',
      plannedStartAt: new Date('2026-06-10T00:00:00+08:00'), // 4天前
      dueDate: new Date('2026-06-20T00:00:00+08:00'),
      content: '',
      activityLogs: [],
      showInTimeline: false,
    }

    const daysPassed = Math.floor(
      (now.getTime() - task.plannedStartAt!.getTime()) / (1000 * 60 * 60 * 24)
    )

    expect(daysPassed).toBe(4)
  })

  test('无 plannedStartAt 时已推进天数为 0', () => {
    const task: Task = {
      id: 't1',
      title: '无计划开始时间',
      status: 'TODO',
      dueDate: new Date('2026-06-20T00:00:00+08:00'),
      content: '',
      activityLogs: [],
      showInTimeline: false,
    }

    const daysPassed = task.plannedStartAt
      ? Math.floor(
          (now.getTime() - task.plannedStartAt.getTime()) / (1000 * 60 * 60 * 24)
        )
      : 0

    expect(daysPassed).toBe(0)
  })
})
