# 状态管理系统 Spec

**文档版本**: v1.0  
**创建日期**: 2026-06-14  
**状态**: 已实现 ✅

---

## 一、概述

### 1.1 系统定位

状态管理系统基于 Zustand 构建，管理应用的全局状态、派生状态计算、数据持久化和跨组件通信。

**设计原则**：
- **单一数据源**：所有应用状态集中在 appStore
- **派生状态分离**：基础状态（tasks/goals）和派生状态（inbox/timeline）分开管理
- **智能缓存**：派生状态按需计算，避免重复运算
- **平台适配**：Tauri 环境调用原生 API，浏览器使用内存 mock

---

## 二、架构设计

### 2.1 技术栈

| 层级 | 技术 | 职责 |
|------|-----|------|
| **状态库** | Zustand 4.x | 全局状态容器 |
| **派生计算** | DerivedStateManager | 智能缓存派生状态 |
| **持久化** | Tauri Commands / localStorage | 数据存储 |
| **适配层** | workspaceMutations | 平台差异封装 |

### 2.2 状态分层

```
┌─────────────────────────────────────────┐
│         React Components                │
│  (useAppStore, useSelectedTask)         │
└───────────────┬─────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│          AppStore (Zustand)             │
│  ┌─────────────────────────────────┐   │
│  │ 基础状态 (Base State)            │   │
│  │  - tasks, baseGoals              │   │
│  │  - baseTimeline, systemReminders │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ 派生状态 (Derived State)         │   │
│  │  - goals, timeline, inbox        │   │
│  │  - todayAttentionGroups          │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ UI 状态 (UI State)              │   │
│  │  - currentView, activeArea       │   │
│  │  - isTaskDrawerOpen              │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ Actions                          │   │
│  │  - addTask, updateTaskStatus     │   │
│  │  - createGoal, openTaskDrawer    │   │
│  └─────────────────────────────────┘   │
└───────────────┬─────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│   DerivedStateManager (智能缓存)        │
└───────────────┬─────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│  workspaceMutations (平台适配)          │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │ Tauri Mode   │  │ Browser Mode    │ │
│  │ (invoke)     │  │ (mock data)     │ │
│  └──────────────┘  └─────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 三、状态结构

### 3.1 AppStoreState 接口

```typescript
interface AppStoreState {
  // 基础数据
  tasks: Task[]
  baseGoals: GoalCard[]
  baseTimeline: TimelineItem[]
  systemReminders: ReminderItem[]
  allAreas: AreaWithStats[]
  integrationStatus: IntegrationStatus
  
  // 派生数据
  goals: GoalCard[]                          // 带自动计算状态的目标
  timeline: TimelineItem[]                   // 按领域筛选的时间轴
  inbox: InboxTaskGroups                     // Inbox 分组
  todayFocusTasks: Task[]                    // 今日焦点任务
  todayAttentionGroups: TodayAttentionGroups // 今日注意力分组
  todayRelevantGoals: TodayRelevantGoal[]    // 今日相关目标
  
  // UI 状态
  currentView: ViewKey                       // 'inbox' | 'today' | 'goals' | 'board' | 'areas'
  activeArea: AreaFilter                     // 'ALL' | area.title
  showCompletedTodos: boolean
  isLoading: boolean
  statusMessage: string
  
  // 抽屉状态
  selectedTaskId?: string
  selectedGoalId?: string
  selectedReminderId?: string
  isTaskDrawerOpen: boolean
  isGoalDrawerOpen: boolean
  isReminderDrawerOpen: boolean
  isQuickCaptureOpen: boolean
  
  // Actions (方法见下文)
}
```

### 3.2 基础状态 vs 派生状态

**基础状态**（直接从后端/API 加载）：
- `tasks` - 所有任务
- `baseGoals` - 原始目标数据
- `baseTimeline` - 合并后的时间轴原始数据
- `systemReminders` - 系统提醒原始数据

**派生状态**（通过计算得到）：
- `goals` - 带 `status`, `progress`, `taskCount` 的目标
- `timeline` - 按 `activeArea` 筛选的时间轴
- `inbox` - 按状态分组的任务（active/paused/completed）
- `todayAttentionGroups` - 今日任务分组（overdue/dueToday/ongoing）
- `todayRelevantGoals` - 今日有任务推进的目标

**分离理由**：
- ✅ 基础状态不可变，确保数据源一致
- ✅ 派生状态按需计算，避免冗余存储
- ✅ 派生逻辑集中管理（DerivedStateManager）

---

## 四、派生状态计算

### 4.1 applyDerivedState 函数

```typescript
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
```

**ChangeType 枚举**：
```typescript
type ChangeType = 
  | 'full-refresh'      // 全量重算（初始化）
  | 'tasks'             // 只任务变化
  | 'goals'             // 只目标变化
  | 'area-filter'       // 只领域筛选变化
  | 'show-completed'    // 只显示完成任务开关变化
```

**调用时机**：
- `hydrateApp` - full-refresh
- `addTask` / `updateTaskStatus` - tasks
- `createGoal` / `updateGoalStatus` - goals
- `setActiveArea` - area-filter
- `setShowCompletedTodos` - show-completed

### 4.2 replaceTaskState / replaceGoalState

```typescript
function replaceTaskState(state: AppStoreState, nextTask: Task) {
  const nextTasks = state.tasks.map(task => 
    task.id === nextTask.id ? nextTask : task
  )
  return {
    tasks: nextTasks,
    ...applyDerivedState({ ...state, tasks: nextTasks }, 'tasks'),
  }
}

function replaceGoalState(state: AppStoreState, nextGoal: GoalCard) {
  const nextGoals = replaceGoal(state.baseGoals, nextGoal)
  return {
    baseGoals: nextGoals,
    ...applyDerivedState({ ...state, baseGoals: nextGoals }, 'goals'),
  }
}
```

**职责**：
- 更新基础状态（tasks/baseGoals）
- 触发派生状态重算
- 返回新的完整 state 对象

---

## 五、核心 Actions

### 5.1 数据加载

```typescript
hydrateApp: (payload: HydratePayload) => void
```

**职责**：初始化应用数据（启动时调用）

**实现**：
```typescript
hydrateApp: (payload) =>
  set((state) => {
    const derived = applyDerivedState(
      {
        baseTimeline: payload.timeline,
        baseGoals: payload.goals,
        tasks: payload.tasks,
        activeArea: state.activeArea,
        showCompletedTodos: state.showCompletedTodos,
      },
      'full-refresh',
    )
    return {
      tasks: payload.tasks,
      baseGoals: payload.goals,
      baseTimeline: payload.timeline,
      systemReminders: payload.systemReminders,
      integrationStatus: payload.integrationStatus,
      ...derived,
      statusMessage: payload.statusMessage,
    }
  })
```

### 5.2 任务操作

#### addTask

```typescript
addTask: async (title: string) => Promise<void>
```

**流程**：
```
1. 调用 adapter.createTask(title)
   ↓
2. 返回 { task: nextTask, statusMessage }
   ↓
3. set(state => ({
     tasks: replaceTask(state.tasks, nextTask),
     ...applyDerivedState(..., 'tasks'),
     selectedTaskId: nextTask.id,
     isTaskDrawerOpen: true,
   }))
```

#### updateTaskStatus

```typescript
updateTaskStatus: async (taskId: string, status: TaskStatus, note?: string) => Promise<void>
```

**Tauri 模式**：
```typescript
const { task: updatedTask } = await adapter.updateTaskStatus(taskId, status, note)
set(state => ({
  ...replaceTaskState(state, updatedTask),
  statusMessage: statusMessage,
}))
```

**浏览器模式**：
```typescript
set(state => {
  const action = logActionForTransition(fromStatus, status)
  return {
    tasks: state.tasks.map(task =>
      task.id === taskId
        ? {
            ...task,
            status,
            activityLogs: [
              { action, note: note?.trim(), timestamp: new Date() },
              ...task.activityLogs,
            ],
          }
        : task
    ),
    ...applyDerivedState(..., 'tasks'),
  }
})
```

### 5.3 目标操作

#### createGoal

```typescript
createGoal: async (
  input: { title: string; area?: string; description?: string },
  options?: { openGoalWorkspace?: boolean },
) => Promise<string | undefined>
```

**返回值**：新目标的 ID

**副作用**：
- 打开 GoalDrawer（如果 `openGoalWorkspace: true`）
- 切换到 Goals 视图
- 刷新领域列表（`loadAreas()`）

#### updateGoalStatus

```typescript
updateGoalStatus: async (goalId: string, status: GoalStatus) => Promise<void>
```

**校验**：
```typescript
if (status === 'READY_TO_COMPLETE') {
  set({ statusMessage: 'READY_TO_COMPLETE is auto-computed and cannot be set manually' })
  return
}
```

### 5.4 抽屉管理

```typescript
openTaskDrawer: (taskId: string) => void
closeTaskDrawer: () => void
openGoalDrawer: (goalId: string) => void
closeGoalDrawer: () => void
openReminderDrawer: (reminderId?: string) => void
closeReminderDrawer: () => void
```

**状态更新**：
```typescript
openTaskDrawer: (taskId) => set({ 
  selectedTaskId: taskId, 
  isTaskDrawerOpen: true 
})

closeTaskDrawer: () => set({ 
  isTaskDrawerOpen: false 
})
```

**互斥逻辑**：
- 同时只能打开一个抽屉
- 打开新抽屉会自动关闭旧抽屉

---

## 六、平台适配

### 6.1 workspaceMutationAdapter

```typescript
// src/lib/workspaceMutations.ts
export function createWorkspaceMutationAdapter() {
  if (isTauriRuntime()) {
    return {
      createTask: async (title) => {
        const task = await invoke<DeskTask>('create_desk_task', { title })
        return { 
          task: normalizeTask(task), 
          statusMessage: 'Task created' 
        }
      },
      updateTaskStatus: async (taskId, status, note) => {
        const task = await invoke<DeskTask>('update_task_status', { 
          taskId, 
          status, 
          note 
        })
        return { 
          task: normalizeTask(task), 
          statusMessage: 'Status updated' 
        }
      },
      // ... 其他方法
    }
  }
  
  // 浏览器 mock
  return {
    createTask: async (title) => {
      const task = createMockTask(title)
      return { 
        task, 
        statusMessage: BROWSER_PREVIEW_STATUS 
      }
    },
    // ...
  }
}
```

### 6.2 Tauri vs 浏览器差异

| 操作 | Tauri 模式 | 浏览器模式 |
|------|-----------|-----------|
| 数据来源 | SQLite (Rust) | mock data (内存) |
| 持久化 | Tauri command | 不持久化 |
| 状态更新 | 后端返回新状态 | 前端计算新状态 |
| EventKit | 真实系统集成 | 返回空数据 |
| Quick Capture | 原生窗口 | Modal 组件 |

---

## 七、Hooks

### 7.1 useAppStore

```typescript
// 全量订阅（组件用到所有 state）
const state = useAppStore()

// 选择性订阅（性能优化）
const tasks = useAppStore(state => state.tasks)
const addTask = useAppStore(state => state.addTask)
```

**Zustand 自动优化**：
- 只订阅用到的字段
- 字段变化时才重渲染组件

### 7.2 useSelectedTask

```typescript
export function useSelectedTask() {
  const selectedTaskId = useAppStore(state => state.selectedTaskId)
  return useAppStore(state => 
    state.tasks.find(task => task.id === selectedTaskId)
  )
}
```

**用途**：TaskDrawer 获取当前任务

**注意**：
- 返回 `Task | undefined`
- TaskDrawer 需要检查 `task &&` 避免空指针

### 7.3 useSelectedGoal

```typescript
export function useSelectedGoal() {
  const selectedGoalId = useAppStore(state => state.selectedGoalId)
  return useAppStore(state => 
    state.baseGoals.find(goal => goal.id === selectedGoalId)
  )
}
```

**与 useSelectedTask 对称**

---

## 八、设计决策（ADR）

### ADR-001: Zustand 而非 Redux

**决策**: 使用 Zustand 作为状态管理库

**理由**：
- ✅ API 简洁（无 reducer/action/dispatch 样板代码）
- ✅ TypeScript 支持良好（类型推导完整）
- ✅ 性能优秀（选择性订阅，避免不必要重渲染）
- ✅ 体积小（~1KB gzipped）

**代价**：
- ❌ 生态不如 Redux 成熟（中间件少）
- 接受：Goal Desk 不需要复杂中间件

### ADR-002: 派生状态分离管理

**决策**: 基础状态和派生状态分开存储和计算

**理由**：
- ✅ 数据源清晰（tasks/baseGoals 是唯一真相）
- ✅ 派生逻辑集中（DerivedStateManager）
- ✅ 按需计算，避免冗余

**代价**：
- ❌ 增加复杂度（需要手动触发派生计算）
- 接受：applyDerivedState 封装良好

### ADR-003: 异步 Actions

**决策**: Actions 返回 `Promise<void>`，支持异步操作

**理由**：
- ✅ 支持 Tauri command（异步 IPC）
- ✅ 支持网络请求（未来扩展）
- ✅ 错误处理在 action 内部

**代价**：
- ❌ 调用时需要 `await` 或 `void`
- 接受：现代前端标准实践

### ADR-004: 单个 Store 而非多个 Store

**决策**: 所有状态放在一个 appStore 中

**理由**：
- ✅ 简化跨模块通信（不需要 store 间同步）
- ✅ 派生状态计算更容易（所有数据在同一个 state）
- ✅ 调试友好（单一数据源）

**代价**：
- ❌ Store 文件变大（~730 行）
- 接受：按逻辑分段，可读性良好

---

## 九、性能优化

### 9.1 选择性订阅

```typescript
// ❌ 错误：全量订阅
function TaskCard({ taskId }) {
  const state = useAppStore()  // 任何 state 变化都重渲染
  const task = state.tasks.find(t => t.id === taskId)
  // ...
}

// ✅ 正确：选择性订阅
function TaskCard({ taskId }) {
  const task = useAppStore(state => 
    state.tasks.find(t => t.id === taskId)
  )  // 只有这个 task 变化才重渲染
  // ...
}
```

### 9.2 派生状态缓存

**DerivedStateManager 内部**：
```typescript
// 缓存上次输入
private lastInputs: { tasks, baseGoals, activeArea, ... }
private lastOutputs: { goals, timeline, inbox, ... }

compute(changeType: ChangeType) {
  if (changeType === 'area-filter') {
    // 只重算受影响的部分
    return {
      timeline: this.filterTimeline(),
      goals: this.filterGoals(),
      // 复用 inbox（不受 area-filter 影响）
      inbox: this.lastOutputs.inbox,
    }
  }
  // ...
}
```

### 9.3 批量更新

```typescript
// ❌ 错误：多次 set
updateTaskStatus(taskId, 'PAUSED', note)
openTaskDrawer(taskId)  // 触发两次重渲染

// ✅ 正确：合并更新
set(state => ({
  ...replaceTaskState(state, updatedTask),
  selectedTaskId: taskId,
  isTaskDrawerOpen: true,
}))  // 只触发一次重渲染
```

---

## 十、调试

### 10.1 Zustand DevTools

```typescript
import { devtools } from 'zustand/middleware'

export const useAppStore = create<AppStoreState>()(
  devtools(
    (set, get) => ({
      // ... state
    }),
    { name: 'AppStore' }
  )
)
```

**功能**：
- Redux DevTools Extension 查看状态
- 时间旅行调试
- Action 日志

### 10.2 状态快照

```typescript
// 控制台打印当前 state
console.log(useAppStore.getState())

// 监听所有变化
useAppStore.subscribe(state => {
  console.log('State changed:', state)
})
```

---

## 十一、测试策略

### 11.1 单元测试

```typescript
// src/store/appStore.test.mjs
import { useAppStore } from './appStore'

test('addTask creates task and opens drawer', async () => {
  const store = useAppStore.getState()
  
  await store.addTask('Test task')
  
  const state = useAppStore.getState()
  expect(state.tasks.some(t => t.title === 'Test task')).toBe(true)
  expect(state.isTaskDrawerOpen).toBe(true)
})

test('setActiveArea filters timeline', () => {
  const store = useAppStore.getState()
  
  store.setActiveArea('工作')
  
  const state = useAppStore.getState()
  expect(state.activeArea).toBe('工作')
  // timeline 只包含"工作"领域的事项
})
```

### 11.2 集成测试

```typescript
// tests/e2e/state-sync.test.ts
test('task status change updates all views', async ({ page }) => {
  await page.goto('http://localhost:1420')
  
  // Inbox 中暂停任务
  await page.click('[data-task-id="task-1"]')
  await page.click('button:has-text("Pause")')
  await page.fill('input[placeholder*="暂停原因"]', '等待依赖')
  await page.keyboard.press('Enter')
  
  // 验证 Inbox 更新
  await expect(page.locator('[data-task-id="task-1"]')).toContainText('等待依赖')
  
  // 切换到 Board View
  await page.click('[data-view="board"]')
  
  // 验证 Board 也更新了
  const pausedColumn = page.locator('[data-column="paused"]')
  await expect(pausedColumn.locator('text=task-1')).toBeVisible()
})
```

---

## 十二、相关资源

### 文档
- [派生状态管理 Spec](../../docs/architecture-refactor-summary.md)
- [DerivedStateManager 实现](../../docs/architecture-refactor-summary.md) - 第 1 节

### 代码
- [`src/store/appStore.ts`](../../src/store/appStore.ts)
- [`src/lib/DerivedStateManager.ts`](../../src/lib/DerivedStateManager.ts)
- [`src/lib/workspaceMutations.ts`](../../src/lib/workspaceMutations.ts)

### 测试
- [`src/store/appStore.test.mjs`](../../src/store/appStore.test.mjs)

### 依赖库
- [Zustand](https://zustand-demo.pmnd.rs/) - 状态管理库
- [Immer](https://immerjs.github.io/immer/) - 不可变数据（可选）

---

**文档维护者**: Goal Desk 开发团队  
**最后更新**: 2026-06-14