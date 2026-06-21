import { describe, test, expect, beforeEach } from 'vitest'
import { deriveTodayAttentionGroups, deriveTodayAgenda, filterAgendaByArea, getTodayFocusTasks, convertEventKitToRawItems, groupByDate, filterGoalsByArea, filterTasksByArea } from './workspaceDerivation'
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

describe('workspaceDerivation - 多日任务展开', () => {
  test('跨天任务应在每天生成独立的 timeline item，id 保持纯净，occurrenceDate 标记日期', () => {
    const now = new Date('2026-06-03T10:00:00+08:00')
    const tasks: Task[] = [
      {
        id: 't1',
        title: '跨天任务',
        status: 'IN_PROGRESS',
        plannedStartAt: new Date('2026-06-01T09:00:00+08:00'),
        dueDate: new Date('2026-06-05T18:00:00+08:00'),
        content: '',
        activityLogs: [],
        showInTimeline: true,
      },
    ]

    const agenda = deriveTodayAgenda([], tasks, now)
    const todoItems = agenda.filter((item) => item.source === 'todo')

    expect(todoItems).toHaveLength(5)

    // id 保持纯净 — 不带 --day-N 后缀
    for (const item of todoItems) {
      expect(item.id).toBe('t1')
    }

    // occurrenceDate 标记每天的日期
    const dayMs = 24 * 60 * 60 * 1000
    const startDay = new Date('2026-06-01T00:00:00+08:00')
    for (let i = 0; i < 5; i++) {
      const expected = new Date(startDay.getTime() + i * dayMs)
      const actual = todoItems[i].occurrenceDate as Date
      expect(actual.getFullYear()).toBe(expected.getFullYear())
      expect(actual.getMonth()).toBe(expected.getMonth())
      expect(actual.getDate()).toBe(expected.getDate())
    }

    // startsAt 保留原始开始时间（用于排序）
    for (const item of todoItems) {
      expect((item.startsAt as Date).getTime()).toBe(new Date('2026-06-01T09:00:00+08:00').getTime())
    }
  })

  test('单天任务（dueDate 等于 plannedStartAt）不展开', () => {
    const now = new Date('2026-06-03T10:00:00+08:00')
    const tasks: Task[] = [
      {
        id: 't1',
        title: '单天任务',
        status: 'IN_PROGRESS',
        plannedStartAt: new Date('2026-06-03T09:00:00+08:00'),
        dueDate: new Date('2026-06-03T18:00:00+08:00'),
        content: '',
        activityLogs: [],
        showInTimeline: true,
      },
    ]

    const agenda = deriveTodayAgenda([], tasks, now)
    const todoItems = agenda.filter((item) => item.source === 'todo')

    expect(todoItems).toHaveLength(1)
    expect(todoItems[0].id).toBe('t1')
  })

  test('无 dueDate 的任务不展开', () => {
    const now = new Date('2026-06-03T10:00:00+08:00')
    const tasks: Task[] = [
      {
        id: 't1',
        title: '无截止任务',
        status: 'IN_PROGRESS',
        plannedStartAt: new Date('2026-06-03T09:00:00+08:00'),
        content: '',
        activityLogs: [],
        showInTimeline: true,
      },
    ]

    const agenda = deriveTodayAgenda([], tasks, now)
    const todoItems = agenda.filter((item) => item.source === 'todo')

    expect(todoItems).toHaveLength(1)
    expect(todoItems[0].id).toBe('t1')
  })

  test('showInTimeline=false 的跨天任务，起始日仍显示但中间天不显示', () => {
    const now = new Date('2026-06-03T10:00:00+08:00')
    const tasks: Task[] = [
      {
        id: 't1',
        title: '不显示在时间轴',
        status: 'IN_PROGRESS',
        plannedStartAt: new Date('2026-06-01T09:00:00+08:00'),
        dueDate: new Date('2026-06-05T18:00:00+08:00'),
        content: '',
        activityLogs: [],
        showInTimeline: false,
      },
    ]

    const agenda = deriveTodayAgenda([], tasks, now)
    const todoItems = agenda.filter((item) => item.source === 'todo')

    expect(todoItems).toHaveLength(0)
  })
})

describe('workspaceDerivation - filterAgendaByArea 多日任务', () => {
  test('跨天任务展开后，filterAgendaByArea 通过纯净 id 正确匹配', () => {
    const now = new Date('2026-06-03T10:00:00+08:00')
    const goals: GoalCard[] = [
      { id: 'g1', title: '工作目标', area: '工作', status: 'ACTIVE', description: '', progress: 0, nextTodo: '', taskCount: 0, createdAt: new Date(), updatedAt: new Date() },
    ]
    const tasks: Task[] = [
      {
        id: 't1',
        title: '跨天任务',
        status: 'IN_PROGRESS',
        linkedGoalId: 'g1',
        plannedStartAt: new Date('2026-06-01T09:00:00+08:00'),
        dueDate: new Date('2026-06-05T18:00:00+08:00'),
        content: '',
        activityLogs: [],
        showInTimeline: true,
      },
    ]

    const agenda = deriveTodayAgenda([], tasks, now)
    const visibleTasks = tasks.filter((t) => t.linkedGoalId === 'g1')
    const filtered = filterAgendaByArea(agenda, visibleTasks)

    // 5 天展开，全部匹配领域 g1
    const todoItems = filtered.filter((item) => item.source === 'todo')
    expect(todoItems).toHaveLength(5)
  })

  test('跨天任务不在可见列表中时，filterAgendaByArea 正确过滤', () => {
    const now = new Date('2026-06-03T10:00:00+08:00')
    const tasks: Task[] = [
      {
        id: 't1',
        title: '跨天任务',
        status: 'IN_PROGRESS',
        plannedStartAt: new Date('2026-06-01T09:00:00+08:00'),
        dueDate: new Date('2026-06-05T18:00:00+08:00'),
        content: '',
        activityLogs: [],
        showInTimeline: true,
      },
    ]

    const agenda = deriveTodayAgenda([], tasks, now)
    const filtered = filterAgendaByArea(agenda, []) // 空可见列表

    const todoItems = filtered.filter((item) => item.source === 'todo')
    expect(todoItems).toHaveLength(0)
  })
})

describe('filterByArea - 通用领域过滤', () => {
  test('ALL 返回全部 goals', () => {
    const goals: GoalCard[] = [
      { id: 'g1', title: 'G1', area: 'Work', status: 'ACTIVE', description: '', progress: 0, nextTodo: '', taskCount: 0, createdAt: new Date(), updatedAt: new Date() },
      { id: 'g2', title: 'G2', area: 'Personal', status: 'ACTIVE', description: '', progress: 0, nextTodo: '', taskCount: 0, createdAt: new Date(), updatedAt: new Date() },
    ]
    const result = filterGoalsByArea(goals, 'ALL')
    expect(result).toHaveLength(2)
  })

  test('指定领域只返回匹配的 goals', () => {
    const goals: GoalCard[] = [
      { id: 'g1', title: 'G1', area: 'Work', status: 'ACTIVE', description: '', progress: 0, nextTodo: '', taskCount: 0, createdAt: new Date(), updatedAt: new Date() },
      { id: 'g2', title: 'G2', area: 'Personal', status: 'ACTIVE', description: '', progress: 0, nextTodo: '', taskCount: 0, createdAt: new Date(), updatedAt: new Date() },
    ]
    const result = filterGoalsByArea(goals, 'Work')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('g1')
  })

  test('filterTasksByArea ALL 返回全部 tasks', () => {
    const tasks: Task[] = [
      { id: 't1', title: 'T1', content: '', status: 'TODO', linkedGoalId: 'g1', activityLogs: [], showInTimeline: false },
      { id: 't2', title: 'T2', content: '', status: 'TODO', linkedGoalId: 'g2', activityLogs: [], showInTimeline: false },
    ]
    const goals: GoalCard[] = [
      { id: 'g1', title: 'G1', area: 'Work', status: 'ACTIVE', description: '', progress: 0, nextTodo: '', taskCount: 0, createdAt: new Date(), updatedAt: new Date() },
      { id: 'g2', title: 'G2', area: 'Personal', status: 'ACTIVE', description: '', progress: 0, nextTodo: '', taskCount: 0, createdAt: new Date(), updatedAt: new Date() },
    ]
    const result = filterTasksByArea(tasks, goals, 'ALL')
    expect(result).toHaveLength(2)
  })

  test('filterTasksByArea 按领域过滤 tasks', () => {
    const tasks: Task[] = [
      { id: 't1', title: 'T1', content: '', status: 'TODO', linkedGoalId: 'g1', activityLogs: [], showInTimeline: false },
      { id: 't2', title: 'T2', content: '', status: 'TODO', linkedGoalId: 'g2', activityLogs: [], showInTimeline: false },
      { id: 't3', title: 'T3', content: '', status: 'TODO', activityLogs: [], showInTimeline: false },
    ]
    const goals: GoalCard[] = [
      { id: 'g1', title: 'G1', area: 'Work', status: 'ACTIVE', description: '', progress: 0, nextTodo: '', taskCount: 0, createdAt: new Date(), updatedAt: new Date() },
      { id: 'g2', title: 'G2', area: 'Personal', status: 'ACTIVE', description: '', progress: 0, nextTodo: '', taskCount: 0, createdAt: new Date(), updatedAt: new Date() },
    ]
    const result = filterTasksByArea(tasks, goals, 'Work')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('t1')
  })
})

describe('convertEventKitToRawItems', () => {
  const now = new Date('2026-06-16T12:00:00+08:00')

  test('converts calendar events to RawAgendaItem', () => {
    const result = convertEventKitToRawItems(
      [{ id: 'ev1', title: 'Meeting', startsAt: '2026-06-16T14:00:00', endsAt: '2026-06-16T15:00:00', calendarTitle: 'Work' }],
      [],
      [],
      now,
    )
    expect(result).toHaveLength(1)
    expect(result[0].source).toBe('calendar')
    expect(result[0].title).toBe('Meeting')
    expect(result[0].readonly).toBe(true)
  })

  test('converts reminders to RawAgendaItem', () => {
    const result = convertEventKitToRawItems(
      [],
      [{ id: 'rm1', title: 'Call mom', dueAt: '2026-06-16T18:00:00', done: false }],
      [],
      now,
    )
    expect(result).toHaveLength(1)
    expect(result[0].source).toBe('reminder')
    expect(result[0].title).toBe('Call mom')
  })

  test('deduplicates reminders linked to tasks', () => {
    const tasks = [{ id: 't1', systemReminderId: 'rm1' } as any]
    const result = convertEventKitToRawItems(
      [],
      [{ id: 'rm1', title: 'Linked reminder', dueAt: '2026-06-16T18:00:00', done: false }],
      tasks,
      now,
    )
    expect(result).toHaveLength(0)
  })

  test('filters out events from other days', () => {
    const result = convertEventKitToRawItems(
      [{ id: 'ev1', title: 'Tomorrow', startsAt: '2026-06-17T14:00:00', endsAt: '2026-06-17T15:00:00' }],
      [],
      [],
      now,
    )
    expect(result).toHaveLength(0)
  })
})

describe('groupByDate', () => {
  test('groups items by date', () => {
    const items = [
      { id: '1', startsAt: new Date('2026-06-16T10:00:00'), timeLabel: '10:00' },
      { id: '2', startsAt: new Date('2026-06-16T14:00:00'), timeLabel: '14:00' },
      { id: '3', startsAt: new Date('2026-06-17T10:00:00'), timeLabel: '10:00' },
    ] as any[]
    const grouped = groupByDate(items)
    expect(grouped.size).toBe(2)
    expect(grouped.get('2026-06-16')).toHaveLength(2)
    expect(grouped.get('2026-06-17')).toHaveLength(1)
  })

  test('returns empty map for empty input', () => {
    const grouped = groupByDate([])
    expect(grouped.size).toBe(0)
  })
})
