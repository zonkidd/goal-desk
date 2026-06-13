# 派生状态管理系统 Spec

**文档版本**: v1.0  
**创建日期**: 2026-06-14  
**状态**: 已实现 ✅

---

## 一、概述

### 1.1 系统定位

派生状态管理系统（DerivedStateManager）是状态计算的智能缓存层，根据变化类型选择性重算派生状态，避免全量计算浪费。

**设计原则**：
- **按需计算**：根据 ChangeType 只重算受影响的部分
- **记忆化缓存**：未失效的缓存直接复用
- **单一职责**：只负责计算逻辑，不涉及持久化
- **不可变数据**：输入输出都是不可变对象，确保纯函数特性

---

## 二、架构设计

### 2.1 系统位置

```
┌─────────────────────────────────────┐
│          AppStore (Zustand)         │
│  ┌─────────────────────────────┐   │
│  │  基础状态 (Base State)       │   │
│  │  - tasks                     │   │
│  │  - baseGoals                 │   │
│  │  - baseTimeline              │   │
│  └─────────────────────────────┘   │
│              ↓                      │
│  ┌─────────────────────────────┐   │
│  │ DerivedStateManager          │   │ ← 本系统
│  │  compute(changeType)         │   │
│  └─────────────────────────────┘   │
│              ↓                      │
│  ┌─────────────────────────────┐   │
│  │  派生状态 (Derived State)    │   │
│  │  - goals (带进度)            │   │
│  │  - timeline (按领域筛选)     │   │
│  │  - inbox (分组)              │   │
│  │  - todayAttentionGroups      │   │
│  │  - todayRelevantGoals        │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 2.2 ChangeType 枚举

```typescript
export type ChangeType =
  | 'goals'           // 目标数据变化
  | 'tasks'           // 任务数据变化
  | 'timeline'        // 时间轴数据变化
  | 'area-filter'     // 领域筛选器变化
  | 'show-completed'  // 显示已完成任务开关变化
  | 'full-refresh'    // 完整刷新（初始化）
```

**用途**：
- 通知 DerivedStateManager 哪些基础数据变化了
- 决定哪些缓存失效，哪些可以复用

---

## 三、核心接口

### 3.1 DerivedState 接口

```typescript
export interface DerivedState {
  goals: GoalCard[]                          // 带进度/nextTodo 的目标列表
  timeline: TimelineItem[]                   // 按领域筛选的时间轴
  todayFocusTasks: Task[]                    // 今日焦点任务
  todayAttentionGroups: TodayAttentionGroups // 今日注意力分组
  todayRelevantGoals: TodayRelevantGoal[]    // 今日相关目标
  inbox: InboxTaskGroups                     // Inbox 分组
}
```

### 3.2 DerivedStateManager 类

```typescript
export class DerivedStateManager {
  private cache: {
    derivedGoals?: GoalCard[]
    filteredGoals?: GoalCard[]
    filteredTasks?: Task[]
    todayFocusTasks?: Task[]
    timeline?: TimelineItem[]
    todayAttentionGroups?: TodayAttentionGroups
    todayRelevantGoals?: TodayRelevantGoal[]
    inbox?: InboxTaskGroups
  } = {}

  constructor(
    baseTimeline: TimelineItem[],
    baseGoals: GoalCard[],
    tasks: Task[],
    activeArea: AreaFilter,
    showCompletedTodos: boolean,
    now?: Date,
  )

  compute(changeType: ChangeType): DerivedState
}
```

---

## 四、缓存失效策略

### 4.1 invalidateCacheByChangeType 函数

```typescript
private invalidateCacheByChangeType(changeType: ChangeType): void {
  switch (changeType) {
    case 'full-refresh':
      // 全部失效
      this.cache = {}
      break

    case 'goals':
      // 目标变化影响：derivedGoals, filteredGoals, todayRelevantGoals
      delete this.cache.derivedGoals
      delete this.cache.filteredGoals
      delete this.cache.todayRelevantGoals
      break

    case 'tasks':
      // 任务变化影响：所有任务相关派生状态
      delete this.cache.derivedGoals        // 目标进度依赖任务
      delete this.cache.filteredTasks
      delete this.cache.todayFocusTasks
      delete this.cache.todayAttentionGroups
      delete this.cache.todayRelevantGoals
      delete this.cache.inbox
      break

    case 'timeline':
      // 时间轴变化只影响 timeline
      delete this.cache.timeline
      break

    case 'area-filter':
      // 领域筛选变化影响：所有筛选相关状态
      delete this.cache.filteredGoals
      delete this.cache.filteredTasks
      delete this.cache.timeline
      delete this.cache.todayFocusTasks
      delete this.cache.todayAttentionGroups
      delete this.cache.todayRelevantGoals
      delete this.cache.inbox
      break

    case 'show-completed':
      // 只影响 inbox 分组
      delete this.cache.inbox
      break
  }
}
```

### 4.2 缓存失效矩阵

| ChangeType | 失效的缓存 |
|------------|----------|
| `full-refresh` | 全部 |
| `goals` | derivedGoals, filteredGoals, todayRelevantGoals |
| `tasks` | derivedGoals, filteredTasks, todayFocusTasks, todayAttentionGroups, todayRelevantGoals, inbox |
| `timeline` | timeline |
| `area-filter` | filteredGoals, filteredTasks, timeline, todayFocusTasks, todayAttentionGroups, todayRelevantGoals, inbox |
| `show-completed` | inbox |

**设计考量**：
- `tasks` 变化影响最广（目标进度、Today 分组、Inbox 都依赖任务）
- `timeline` 变化影响最窄（只有时间轴本身）
- `area-filter` 不影响 derivedGoals（目标进度计算不受领域筛选影响）

---

## 五、派生计算函数

### 5.1 computeDerivedGoals（目标进度计算）

```typescript
private computeDerivedGoals(): GoalCard[] {
  if (this.cache.derivedGoals) return this.cache.derivedGoals

  // 调用 workspaceDerivation.ts 的 deriveGoalRecords
  this.cache.derivedGoals = deriveGoalRecords(this.baseGoals, this.tasks)
  return this.cache.derivedGoals
}
```

**职责**：
- 计算每个目标的 `progress`（完成百分比）
- 计算每个目标的 `status`（是否 READY_TO_COMPLETE）
- 计算每个目标的 `nextTodo`（下一个待办任务）
- 计算每个目标的 `taskCount`（关联任务数）

**输入**：
- `baseGoals` - 原始目标数据（无派生字段）
- `tasks` - 所有任务

**输出**：
- `GoalCard[]` - 带派生字段的目标列表

### 5.2 computeFilteredGoals（领域筛选）

```typescript
private computeFilteredGoals(derivedGoals: GoalCard[]): GoalCard[] {
  if (this.cache.filteredGoals) return this.cache.filteredGoals

  this.cache.filteredGoals = filterGoalsByArea(derivedGoals, this.activeArea)
  return this.cache.filteredGoals
}
```

**职责**：
- 根据 `activeArea` 筛选目标
- `activeArea = 'ALL'` 返回全部目标
- `activeArea = '工作'` 只返回领域为"工作"的目标

### 5.3 computeFilteredTasks（领域筛选任务）

```typescript
private computeFilteredTasks(derivedGoals: GoalCard[]): Task[] {
  if (this.cache.filteredTasks) return this.cache.filteredTasks

  this.cache.filteredTasks = filterTasksByArea(this.tasks, derivedGoals, this.activeArea)
  return this.cache.filteredTasks
}
```

**职责**：
- 根据 `activeArea` 筛选任务
- 任务关联的目标在筛选范围内 → 任务也在筛选范围内
- 无关联目标的任务属于"未分类"

### 5.4 computeTodayFocusTasks（今日焦点任务）

```typescript
private computeTodayFocusTasks(derivedGoals: GoalCard[]): Task[] {
  if (this.cache.todayFocusTasks) return this.cache.todayFocusTasks

  this.cache.todayFocusTasks = getTodayFocusTasks(
    this.tasks,
    derivedGoals,
    this.activeArea,
    this.now,
  )
  return this.cache.todayFocusTasks
}
```

**职责**：
- 筛选满足 `startDay ≤ today ≤ dueDay` 的任务
- 按领域筛选
- 排除已完成任务

### 5.5 computeTimeline（时间轴）

```typescript
private computeTimeline(filteredTasks: Task[]): TimelineItem[] {
  if (this.cache.timeline) return this.cache.timeline

  this.cache.timeline = filterTimelineByArea(
    this.baseTimeline,
    filteredTasks,
    this.activeArea,
  )
  return this.cache.timeline
}
```

**职责**：
- 合并 Desk Task + Calendar Events + Reminders
- 按领域筛选
- 按时间排序

### 5.6 computeTodayAttentionGroups（今日注意力分组）

```typescript
private computeTodayAttentionGroups(filteredTasks: Task[]): TodayAttentionGroups {
  if (this.cache.todayAttentionGroups) return this.cache.todayAttentionGroups

  this.cache.todayAttentionGroups = deriveTodayAttentionGroups(
    filteredTasks,
    this.now,
  )
  return this.cache.todayAttentionGroups
}
```

**职责**：
- 分组：overdue（逾期）、dueToday（今日到期）、ongoing（持续推进）
- 每组显示任务标题、剩余天数、已推进天数

### 5.7 computeTodayRelevantGoals（今日相关目标）

```typescript
private computeTodayRelevantGoals(
  derivedGoals: GoalCard[],
  todayAttentionGroups: TodayAttentionGroups,
): TodayRelevantGoal[] {
  if (this.cache.todayRelevantGoals) return this.cache.todayRelevantGoals

  this.cache.todayRelevantGoals = deriveTodayRelevantGoals(
    derivedGoals,
    todayAttentionGroups,
  )
  return this.cache.todayRelevantGoals
}
```

**职责**：
- 找出今日有任务推进的目标
- 显示目标进度、Next Todo

### 5.8 computeInbox（Inbox 分组）

```typescript
private computeInbox(filteredTasks: Task[]): InboxTaskGroups {
  if (this.cache.inbox) return this.cache.inbox

  this.cache.inbox = getInboxTaskGroups(filteredTasks, this.showCompletedTodos)
  return this.cache.inbox
}
```

**职责**：
- 分组：active（进行中）、paused（暂停）、completed（已完成）
- `showCompletedTodos = false` 时隐藏已完成任务

---

## 六、使用场景

### 6.1 AppStore 中使用

```typescript
// src/store/appStore.ts
import { DerivedStateManager } from '../lib/DerivedStateManager'

function applyDerivedState(
  state: Pick<AppStoreState, 'baseTimeline' | 'baseGoals' | 'tasks' | 'activeArea' | 'showCompletedTodos'>,
  changeType: ChangeType,
) {
  const manager = new DerivedStateManager(
    state.baseTimeline,
    state.baseGoals,
    state.tasks,
    state.activeArea,
    state.showCompletedTodos,
  )
  return manager.compute(changeType)
}

// 使用示例
export const useAppStore = create<AppStoreState>((set, get) => ({
  // ...
  
  addTask: async (title: string) => {
    const { task } = await adapter.createTask(title)
    set((state) => ({
      tasks: [...state.tasks, task],
      ...applyDerivedState({ ...state, tasks: [...state.tasks, task] }, 'tasks'),
    }))
  },

  setActiveArea: (area: AreaFilter) =>
    set((state) => ({
      activeArea: area,
      ...applyDerivedState({ ...state, activeArea: area }, 'area-filter'),
    })),
}))
```

### 6.2 调用时机表

| Action | ChangeType | 说明 |
|--------|-----------|------|
| `hydrateApp` | `full-refresh` | 应用启动时全量加载 |
| `addTask` / `updateTaskStatus` | `tasks` | 任务变化 |
| `createGoal` / `updateGoalStatus` | `goals` | 目标变化 |
| `setActiveArea` | `area-filter` | 领域筛选变化 |
| `setShowCompletedTodos` | `show-completed` | 显示完成任务开关变化 |
| `refreshEventKit` | `timeline` | 时间轴刷新 |

---

## 七、设计决策（ADR）

### ADR-001: 类而非函数

**决策**: 使用 `DerivedStateManager` 类封装缓存和计算逻辑

**理由**：
- ✅ 缓存状态封装在实例中，避免全局变量
- ✅ 构造函数接收输入参数，compute() 执行计算，职责清晰
- ✅ 易于测试（创建实例，调用方法，断言输出）

**代价**：
- ❌ 每次计算需要创建新实例（有微小性能开销）
- 接受：对象创建成本 < 100μs，相比派生计算（数 ms）可忽略

### ADR-002: ChangeType 枚举而非自动检测

**决策**: 调用方显式传递 `changeType`，而非自动检测变化

**理由**：
- ✅ 调用方最清楚哪些数据变化了
- ✅ 避免深度比较（对象相等性检测）的性能开销
- ✅ 强制调用方思考变化类型，减少误用

**代价**：
- ❌ 调用方需要手动指定 `changeType`
- 接受：AppStore 中封装了 `applyDerivedState`，业务代码无感知

### ADR-003: 缓存在实例内而非全局

**决策**: 缓存存储在 `DerivedStateManager` 实例的 `cache` 字段

**理由**：
- ✅ 每次计算是独立的，不会因为全局缓存被其他调用污染
- ✅ 函数式风格（输入 → 输出），易于理解和测试
- ✅ 避免内存泄漏（实例销毁后缓存自动释放）

**代价**：
- ❌ 无法跨调用复用缓存
- 接受：AppStore 的 Zustand state 本身就是缓存，DerivedStateManager 只是计算层

### ADR-004: 派生函数在 workspaceDerivation.ts

**决策**: DerivedStateManager 不包含实际计算逻辑，只负责缓存和调度

**理由**：
- ✅ 单一职责（DerivedStateManager 负责缓存，workspaceDerivation 负责计算）
- ✅ 派生函数可以独立测试和复用
- ✅ DerivedStateManager 的逻辑简洁（只有调度和缓存）

**代价**：
- ❌ 增加一层抽象（两个文件）
- 接受：清晰的职责划分值得这个代价

---

## 八、性能优化

### 8.1 缓存命中率

**理想情况**：
- `area-filter` 变化：derivedGoals 命中缓存（无需重算目标进度）
- `show-completed` 变化：只有 inbox 失效，其他 7 个缓存命中

**最坏情况**：
- `tasks` 变化：所有缓存失效（除 timeline）
- 实际测试：计算耗时 < 10ms（100 个任务 + 20 个目标）

### 8.2 避免不必要的对象创建

```typescript
// ❌ 错误：每次都创建新对象
set((state) => ({
  ...state,
  ...applyDerivedState(state, 'tasks'),
}))

// ✅ 正确：只传必要字段
set((state) => ({
  tasks: nextTasks,
  ...applyDerivedState({ ...state, tasks: nextTasks }, 'tasks'),
}))
```

### 8.3 批量更新

```typescript
// ❌ 错误：多次 set 触发多次派生计算
set({ tasks: nextTasks })
set({ activeArea: 'ALL' })  // 两次派生计算

// ✅ 正确：合并更新
set((state) => ({
  tasks: nextTasks,
  activeArea: 'ALL',
  ...applyDerivedState({ ...state, tasks: nextTasks, activeArea: 'ALL' }, 'full-refresh'),
}))
```

---

## 九、测试策略

### 9.1 单元测试

```typescript
// DerivedStateManager.test.ts
import { DerivedStateManager } from './DerivedStateManager'

test('full-refresh computes all derived state', () => {
  const manager = new DerivedStateManager(
    mockTimeline,
    mockGoals,
    mockTasks,
    'ALL',
    true,
  )

  const result = manager.compute('full-refresh')

  expect(result.goals).toHaveLength(3)
  expect(result.timeline).toHaveLength(10)
  expect(result.inbox.active).toHaveLength(5)
})

test('area-filter only recomputes filtered data', () => {
  const manager = new DerivedStateManager(
    mockTimeline,
    mockGoals,
    mockTasks,
    'ALL',
    true,
  )

  // 第一次计算
  manager.compute('full-refresh')

  // 第二次计算（area-filter）
  const result = manager.compute('area-filter')

  // derivedGoals 应该被缓存命中
  // filteredGoals 应该重新计算
})

test('tasks change invalidates dependent cache', () => {
  const manager = new DerivedStateManager(
    mockTimeline,
    mockGoals,
    [task1, task2],
    'ALL',
    true,
  )

  const result1 = manager.compute('full-refresh')
  const progressBefore = result1.goals[0].progress

  // 完成一个任务
  const updatedTasks = [{ ...task1, status: 'DONE' }, task2]
  const manager2 = new DerivedStateManager(
    mockTimeline,
    mockGoals,
    updatedTasks,
    'ALL',
    true,
  )

  const result2 = manager2.compute('tasks')
  const progressAfter = result2.goals[0].progress

  expect(progressAfter).toBeGreaterThan(progressBefore)
})
```

### 9.2 集成测试

```typescript
// appStore.test.mjs
test('addTask updates derived state', async () => {
  const store = useAppStore.getState()

  const beforeInboxCount = store.inbox.active.length

  await store.addTask('New task')

  const afterInboxCount = store.inbox.active.length

  expect(afterInboxCount).toBe(beforeInboxCount + 1)
})

test('setActiveArea filters goals and tasks', () => {
  const store = useAppStore.getState()

  store.setActiveArea('工作')

  const filteredGoals = store.goals
  expect(filteredGoals.every(g => g.area === '工作')).toBe(true)
})
```

---

## 十、相关资源

### 文档
- [状态管理系统 Spec](./state-management.md)
- [架构重构总结](../architecture-refactor-summary.md) - 第 1 节

### 代码
- [`src/lib/DerivedStateManager.ts`](../../src/lib/DerivedStateManager.ts)
- [`src/lib/workspaceDerivation.ts`](../../src/lib/workspaceDerivation.ts)
- [`src/store/appStore.ts`](../../src/store/appStore.ts)

---

**文档维护者**: Goal Desk 开发团队  
**最后更新**: 2026-06-14
