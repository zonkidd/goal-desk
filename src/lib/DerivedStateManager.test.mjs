import { DerivedStateManager } from './DerivedStateManager.ts'

/**
 * 简单的测试运行器
 */
function describe(name, fn) {
  console.log(`\n${name}`)
  fn()
}

function it(name, fn) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
  } catch (error) {
    console.error(`  ✗ ${name}`)
    console.error(`    ${error.message}`)
    throw error
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`)
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`)
      }
    },
    toHaveLength(expected) {
      if (!actual || actual.length !== expected) {
        throw new Error(`Expected length ${expected}, got ${actual?.length}`)
      }
    },
  }
}

// 测试数据
const mockTimeline = [
  {
    id: 'reminder-1',
    title: 'Team Meeting',
    timeLabel: '09:00',
    source: 'reminder',
    readonly: true,
    done: false,
  },
]

const mockGoals = [
  {
    id: 'goal-1',
    title: 'Learn TypeScript',
    area: 'Learning',
    description: 'Master TypeScript fundamentals',
    status: 'ACTIVE',
    progress: 0,
    nextTodo: '',
    taskCount: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'goal-2',
    title: 'Build Portfolio',
    area: 'Career',
    description: 'Create personal website',
    status: 'ACTIVE',
    progress: 0,
    nextTodo: '',
    taskCount: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
]

const mockTasks = [
  {
    id: 'task-1',
    title: 'Read TypeScript handbook',
    content: '',
    status: 'IN_PROGRESS',
    linkedGoalId: 'goal-1',
    linkedGoalLabel: 'Learn TypeScript',
    plannedStartAt: new Date('2024-01-10T09:00:00'),
    dueDate: new Date('2024-01-15T18:00:00'),
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
    activityLogs: [
      {
        action: 'STARTED',
        timestamp: new Date('2024-01-10T09:00:00'),
      },
    ],
  },
  {
    id: 'task-2',
    title: 'Practice TypeScript exercises',
    content: '',
    status: 'TODO',
    linkedGoalId: 'goal-1',
    linkedGoalLabel: 'Learn TypeScript',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
    activityLogs: [
      {
        action: 'CREATED',
        timestamp: new Date('2024-01-10T10:00:00'),
      },
    ],
  },
  {
    id: 'task-3',
    title: 'Design portfolio layout',
    content: '',
    status: 'TODO',
    linkedGoalId: 'goal-2',
    linkedGoalLabel: 'Build Portfolio',
    createdAt: new Date('2024-01-11'),
    updatedAt: new Date('2024-01-11'),
    activityLogs: [
      {
        action: 'CREATED',
        timestamp: new Date('2024-01-11T14:00:00'),
      },
    ],
  },
]

const now = new Date('2024-01-12T10:00:00')

describe('DerivedStateManager', () => {
  it('缓存 goal progress 计算', () => {
    const manager = new DerivedStateManager(
      mockTimeline,
      mockGoals,
      mockTasks,
      'ALL',
      false,
      now,
    )

    // 首次计算
    const state1 = manager.compute('full-refresh')
    expect(state1.goals).toHaveLength(2)

    // 第二次计算（timeline 变化，goals/tasks 未变）
    const state2 = manager.compute('timeline')

    // 验证 goals 使用了缓存（引用相同）
    expect(state2.goals).toBe(state1.goals)
  })

  it('tasks 变化时重算 goals 进度', () => {
    const manager = new DerivedStateManager(
      mockTimeline,
      mockGoals,
      mockTasks,
      'ALL',
      false,
      now,
    )

    // 首次计算
    const state1 = manager.compute('full-refresh')
    const goal1Before = state1.goals.find((g) => g.id === 'goal-1')
    expect(goal1Before.progress).toBe(0) // 0/2 任务完成

    // 模拟 task 完成
    const updatedTasks = mockTasks.map((task) =>
      task.id === 'task-1' ? { ...task, status: 'DONE' } : task,
    )

    const managerAfterTaskChange = new DerivedStateManager(
      mockTimeline,
      mockGoals,
      updatedTasks,
      'ALL',
      false,
      now,
    )

    // tasks 变化触发重算
    const state2 = managerAfterTaskChange.compute('tasks')
    const goal1After = state2.goals.find((g) => g.id === 'goal-1')
    expect(goal1After.progress).toBe(50) // 1/2 任务完成
  })

  it('area-filter 变化时只重算过滤结果', () => {
    const manager = new DerivedStateManager(
      mockTimeline,
      mockGoals,
      mockTasks,
      'ALL',
      false,
      now,
    )

    // 首次计算（ALL area）
    const state1 = manager.compute('full-refresh')
    expect(state1.goals).toHaveLength(2)

    // 切换到特定 area
    const managerWithAreaFilter = new DerivedStateManager(
      mockTimeline,
      mockGoals,
      mockTasks,
      'Learning',
      false,
      now,
    )

    const state2 = managerWithAreaFilter.compute('area-filter')
    expect(state2.goals).toHaveLength(1)
    expect(state2.goals[0].title).toBe('Learn TypeScript')
  })

  it('show-completed 变化时只重算 inbox', () => {
    const tasksWithCompleted = [
      ...mockTasks,
      {
        id: 'task-4',
        title: 'Completed task',
        content: '',
        status: 'DONE',
        linkedGoalId: 'goal-1',
        createdAt: new Date('2024-01-09'),
        updatedAt: new Date('2024-01-10'),
        activityLogs: [
          {
            action: 'COMPLETED',
            timestamp: new Date('2024-01-10T12:00:00'),
          },
        ],
      },
    ]

    const manager1 = new DerivedStateManager(
      mockTimeline,
      mockGoals,
      tasksWithCompleted,
      'ALL',
      false,
      now,
    )

    const state1 = manager1.compute('full-refresh')
    expect(state1.inbox.completed.visibleTasks).toHaveLength(0)

    const manager2 = new DerivedStateManager(
      mockTimeline,
      mockGoals,
      tasksWithCompleted,
      'ALL',
      true, // 显示已完成
      now,
    )

    const state2 = manager2.compute('show-completed')
    expect(state2.inbox.completed.visibleTasks).toHaveLength(1)
  })

  it('timeline 变化时不影响 goals 缓存', () => {
    const manager = new DerivedStateManager(
      mockTimeline,
      mockGoals,
      mockTasks,
      'ALL',
      false,
      now,
    )

    // 首次计算
    const state1 = manager.compute('full-refresh')
    const goalsRef1 = state1.goals

    // timeline 变化（使用同一个 manager 实例）
    const sameManagerState = manager.compute('timeline')
    expect(sameManagerState.goals).toBe(goalsRef1)
  })

  it('验证派生状态的正确性', () => {
    const manager = new DerivedStateManager(
      mockTimeline,
      mockGoals,
      mockTasks,
      'ALL',
      false,
      now,
    )

    const state = manager.compute('full-refresh')

    // 验证 goals 派生字段
    const goal1 = state.goals.find((g) => g.id === 'goal-1')
    expect(goal1.taskCount).toBe(2)
    expect(goal1.progress).toBe(0)

    // 验证 inbox 分组
    expect(state.inbox.activeTasks).toHaveLength(3) // TODO + IN_PROGRESS
    expect(state.inbox.pausedTasks).toHaveLength(0)
    expect(state.inbox.completed.totalCount).toBe(0)

    // 验证 todayFocusTasks（task-1 在进行中且在今天的时间范围内）
    expect(state.todayFocusTasks).toHaveLength(1)
    expect(state.todayFocusTasks[0].id).toBe('task-1')
  })
})

console.log('\n✓ All tests passed!')
