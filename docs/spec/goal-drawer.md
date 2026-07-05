# GoalDrawer 系统 Spec

**文档版本**: v1.0  
**创建日期**: 2026-06-14  
**状态**: 已实现 ✅

---

## 一、概述

### 1.1 系统定位

GoalDrawer 是目标详情编辑的核心 UI 组件，以右侧抽屉形式滑入，提供目标全生命周期管理：状态转换、领域分类、进度展示、关联任务管理。

**设计原则**：
- **目标为中心**：展示目标信息和关联任务列表
- **内联创建任务**：快速为目标添加待办，无需跳转
- **自动计算进度**：基于关联任务完成情况实时更新
- **领域关联**：通过 AreaSelectWithCreate 管理目标分类

---

## 二、组件结构

### 2.1 文件路径

- **主组件**: `src/components/drawer/GoalDrawer.tsx` (~180 行)
- **依赖组件**:
  - `GlassCard.tsx` - 玻璃拟态卡片容器
  - `AreaSelectWithCreate.tsx` - 领域选择器

### 2.2 核心状态

```typescript
const goal = useSelectedGoal()
const isOpen = useAppStore(state => state.isGoalDrawerOpen)
const closeGoalDrawer = useAppStore(state => state.closeGoalDrawer)
const updateGoalFields = useAppStore(state => state.updateGoalFields)
const updateGoalStatus = useAppStore(state => state.updateGoalStatus)
const createTaskForGoal = useAppStore(state => state.createTaskForGoal)
const allAreas = useAppStore(state => state.allAreas)
const createArea = useAppStore(state => state.createArea)
const tasks = useAppStore(state => state.tasks)

// 本地编辑态
const [title, setTitle] = useState('')
const [area, setArea] = useState('')
const [description, setDescription] = useState('')
const [taskTitle, setTaskTitle] = useState('')
```

**状态同步**：
```typescript
useEffect(() => {
  if (!goal) return
  setTitle(goal.title)
  setArea(goal.area)
  setDescription(goal.description)
}, [goal])
```

---

## 三、布局与交互

### 3.1 抽屉布局

```
┌──────────────────────────────────────────────────┐
│ Header (状态按钮组 + 任务数 + 关闭按钮)          │
├──────────────────────────────────────────────────┤
│ Scrollable Body:                                │
│                                                  │
│  ┌─ 目标标题输入框 ─────────────────────┐       │
│  │                                       │       │
│  └───────────────────────────────────────┘       │
│                                                  │
│  领域分类: [AreaSelectWithCreate]              │
│  进度: 65%                                      │
│  描述: [textarea]                               │
│                                                  │
│  ╔═══════════════════════════════════════╗      │
│  ║ 快速添加任务                          ║      │
│  ║ [输入框...] [+ 新建]                 ║      │
│  ╚═══════════════════════════════════════╝      │
│                                                  │
│  关联任务                                       │
│  ┌───────────────────────────────────┐          │
│  │ TODO                              │          │
│  │ 完成项目原型设计                  │          │
│  └───────────────────────────────────┘          │
│  ┌───────────────────────────────────┐          │
│  │ IN_PROGRESS                       │          │
│  │ 编写技术文档                      │          │
│  └───────────────────────────────────┘          │
└──────────────────────────────────────────────────┘
```

**尺寸**：
- 宽度: 560px
- 定位: `fixed bottom-4 right-4 top-4`
- 圆角: `rounded-3xl`
- 背景: `bg-white/95` + `backdrop-blur`

### 3.2 状态按钮组

```typescript
const statusActions = [
  { status: 'ACTIVE', label: '开启', icon: Play },
  { status: 'PAUSED', label: '暂停', icon: Pause },
  { status: 'COMPLETED', label: '完成', icon: CheckCircle2 },
  { status: 'ARCHIVED', label: '归档', icon: Archive },
]

<div className="flex flex-wrap gap-2.5">
  {statusActions.map(item => {
    const Icon = item.icon
    const isActive = goal.status === item.status
    return (
      <button
        onClick={() => void updateGoalStatus(goal.id, item.status)}
        className={isActive 
          ? 'bg-slate-900 text-white shadow-lg scale-105'
          : 'border border-slate-200 bg-white text-slate-500'
        }
      >
        <Icon />
        {item.label}
      </button>
    )
  })}
</div>
```

**视觉效果**：
- 激活: 黑底白字 + 阴影 + 放大 105%
- 未激活: 白底灰字 + 边框
- Hover: 边框加深 + 背景变浅 + 放大 102%

**注意**：
- `READY_TO_COMPLETE` 是自动计算状态，不在按钮组中
- 点击 `READY_TO_COMPLETE` 会触发错误提示

---

## 四、字段编辑

### 4.1 标题编辑

```typescript
<input
  value={title}
  onChange={(e) => setTitle(e.target.value)}
  onBlur={() => void updateGoalFields(goal.id, { title, area, description })}
  className="text-2xl font-black"
  placeholder="目标标题"
/>
```

**行为**：
- onChange 更新本地 state
- onBlur 触发持久化（调用 `updateGoalFields`）
- 空标题由后端校验（返回错误）

### 4.2 领域选择

```typescript
<AreaSelectWithCreate
  value={area}
  areas={allAreas}
  onChange={(value) => {
    setArea(value)
    void updateGoalFields(goal.id, { title, area: value, description })
  }}
  onCreateArea={async (title) => {
    await createArea(title)
  }}
  placeholder="选择或创建领域"
  className="h-11 rounded-2xl border border-slate-200"
/>
```

**特性**：
- onChange 立即保存（不等 blur）
- 支持内联创建新领域
- 创建后自动刷新领域列表（`loadAreas()`）

### 4.3 进度显示

```typescript
<div className="flex items-center justify-between">
  <span>进度</span>
  <span>{goal.progress}%</span>
</div>
```

**计算逻辑**（在 `workspaceDerivation.ts` 中）：
```typescript
const linkedTasks = tasks.filter(task => task.linkedGoalId === goal.id)
const completedCount = linkedTasks.filter(task => task.status === 'DONE').length
const progress = linkedTasks.length === 0 
  ? 0 
  : Math.round((completedCount / linkedTasks.length) * 100)
```

**只读**：进度自动计算，用户不可编辑

### 4.4 描述编辑

```typescript
<textarea
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  onBlur={() => void updateGoalFields(goal.id, { title, area, description })}
  rows={4}
  className="rounded-2xl border border-slate-200"
/>
```

**行为**：
- 支持多行文本
- onBlur 保存（与标题、领域一起提交）

---

## 五、快速添加任务

### 5.1 UI 布局

```typescript
<GlassCard className="rounded-3xl p-5">
  <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
    快速添加任务
  </div>
  <div className="flex gap-3">
    <input
      value={taskTitle}
      onChange={(e) => setTaskTitle(e.target.value)}
      placeholder="把这个目标拆出一个待办..."
      className="h-11 flex-1 rounded-2xl"
    />
    <button
      onClick={() => {
        void createTaskForGoal(goal.id, taskTitle)
        setTaskTitle('')
      }}
      className="flex items-center gap-2 rounded-2xl bg-slate-900"
    >
      <Plus />
      新建
    </button>
  </div>
</GlassCard>
```

### 5.2 创建逻辑

```typescript
// src/store/appStore.ts
createTaskForGoal: async (goalId, title) => {
  const goal = get().baseGoals.find(g => g.id === goalId)
  if (!goal) return
  
  const { task: nextTask } = await adapter.createTaskForGoal(goal, title)
  if (!nextTask) return
  
  set(state => ({
    tasks: replaceTask(state.tasks, nextTask),
    ...applyDerivedState({ ...state, tasks: nextTasks }, 'tasks'),
    selectedTaskId: nextTask.id,
    isTaskDrawerOpen: true,  // 自动打开 TaskDrawer
    isGoalDrawerOpen: false, // 关闭 GoalDrawer
  }))
}
```

**行为**：
- 创建任务后自动关联到当前目标
- 清空输入框
- 关闭 GoalDrawer，打开 TaskDrawer（切换焦点到新任务）

---

## 六、关联任务列表

### 6.1 任务筛选

```typescript
const linkedTasks = useMemo(
  () => tasks.filter(task => task.linkedGoalId === goal?.id),
  [goal?.id, tasks]
)
```

### 6.2 任务卡片

```typescript
{linkedTasks.map(task => (
  <GlassCard key={task.id} className="rounded-2xl p-4">
    <div className="text-[10px] font-black uppercase text-slate-400">
      {task.status}
    </div>
    <div className="text-sm font-bold text-slate-800">
      {task.title}
    </div>
  </GlassCard>
))}
```

**视觉**：
- 状态标签: 灰色大写小号字
- 任务标题: 黑色粗体
- 背景: 玻璃拟态效果（`bg-white/60 backdrop-blur`）

### 6.3 空状态

```typescript
{linkedTasks.length === 0 && (
  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center">
    <p className="text-sm font-medium text-slate-400">
      还没有关联任务
    </p>
  </div>
)}
```

---

## 七、目标状态机

### 7.1 状态定义

```typescript
// src/types/app.ts
export type GoalStatus = 
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'ARCHIVED'
  | 'READY_TO_COMPLETE'  // 自动计算状态
```

### 7.2 状态语义

| 状态 | 中文 | 语义 | 触发条件 |
|------|------|------|---------|
| `ACTIVE` | 开启 | 目标正在推进 | 用户手动设置 |
| `PAUSED` | 暂停 | 目标暂时搁置 | 用户手动设置 |
| `COMPLETED` | 完成 | 目标已达成 | 用户手动设置 |
| `ARCHIVED` | 归档 | 目标不再活跃 | 用户手动设置 |
| `READY_TO_COMPLETE` | 待收束 | 所有任务完成，目标可标记完成 | 自动计算 |

### 7.3 自动计算 READY_TO_COMPLETE

Goal 的派生状态、进度、任务数量和 nextTodo 由 Rust `GoalSummary` 统一计算。前端 `WorkspaceEngine.computeSnapshot()` 保留这些后端字段，只负责把 Goal 按 Area 过滤并组合进工作区快照。

**设计意图**：
- 提示用户"目标已就绪，可以标记完成了"
- 不自动设置为 COMPLETED（需要用户确认）

### 7.4 状态转换限制

```typescript
updateGoalStatus: async (goalId, status) => {
  if (status === 'READY_TO_COMPLETE') {
    set({ statusMessage: 'READY_TO_COMPLETE is auto-computed and cannot be set manually' })
    return
  }
  
  // ... 正常更新逻辑
}
```

**拦截非法操作**：
- 用户无法手动设置 `READY_TO_COMPLETE`
- 系统自动计算该状态

---

## 八、动画与过渡

### 8.1 抽屉动画

```typescript
<motion.aside
  initial={{ x: '120%' }}
  animate={{ x: 0 }}
  exit={{ x: '120%' }}
  transition={{ type: 'spring', stiffness: 240, damping: 28 }}
>
```

**与 TaskDrawer 一致**：
- 从右侧滑入
- 弹簧动画（stiffness 240, damping 28）

### 8.2 状态按钮 Hover

```typescript
className={`transition-all duration-200 ${
  isActive 
    ? 'scale-105' 
    : 'hover:scale-102 hover:border-slate-400'
}`}
```

**微交互**：
- 激活按钮: 放大 105%
- 未激活 hover: 放大 102% + 边框加深
- 图标旋转: `transition-transform duration-200`

---

## 九、设计决策（ADR）

### ADR-001: onChange 立即保存领域

**决策**: 领域选择 onChange 时立即保存，不等 onBlur

**理由**:
- ✅ 领域变更是显式操作（下拉选择）
- ✅ 避免用户忘记 blur 导致未保存
- ✅ 立即反馈（更新 Goal 卡片的 area 标签）

**代价**:
- ❌ 每次选择触发一次 IPC/网络请求
- 接受: 领域变更不频繁，性能影响可忽略

### ADR-002: 快速添加任务后切换抽屉

**决策**: 创建任务后关闭 GoalDrawer，打开 TaskDrawer

**理由**:
- ✅ 用户通常希望立即编辑新任务（设置时间、内容）
- ✅ 自动切换焦点，减少手动操作
- ✅ 保持"任务为最小可操作单位"的设计理念

**代价**:
- ❌ 用户无法快速批量创建任务
- 缓解: 在 Inbox 或 Goals View 可以批量创建

### ADR-003: 进度自动计算不可编辑

**决策**: 目标进度基于关联任务完成情况自动计算

**理由**:
- ✅ 避免手动进度与实际任务完成情况不一致
- ✅ 强化"任务牵引目标"的关系
- ✅ 减少用户维护负担

**代价**:
- ❌ 无法表达"目标部分完成但任务未全部完成"的状态
- 接受: 用户可以通过描述字段记录进展

### ADR-004: READY_TO_COMPLETE 自动计算

**决策**: 所有任务完成时自动标记为 `READY_TO_COMPLETE`

**理由**:
- ✅ 提示用户"可以收束目标了"
- ✅ 区分"任务完成"和"目标达成"（需要用户确认）
- ✅ 避免自动完成导致误操作

**代价**:
- ❌ 增加状态机复杂度
- 接受: 该状态只读，不影响用户操作

---

## 十、前后端一致性

### 10.1 字段映射

| TypeScript | Rust (snake_case) | 数据库列名 |
|-----------|------------------|----------|
| `title` | `title` | `title` |
| `area` | `area` | `area` |
| `description` | `description` | `description` |
| `status` | `status` | `status` |
| `progress` | - | - (派生字段) |
| `taskCount` | - | - (派生字段) |

### 10.2 Tauri Command

```rust
// src-tauri/src/lib.rs
#[tauri::command]
async fn update_goal_fields(
    goal_id: String,
    title: String,
    area: String,
    description: String,
) -> Result<Goal, String> {
    // ...
}

#[tauri::command]
async fn update_goal_status(
    goal_id: String,
    status: GoalStatus,
) -> Result<Goal, String> {
    // ...
}
```

**调用**：
```typescript
await invoke('update_goal_fields', {
  goalId: goal.id,
  title,
  area,
  description,
})

await invoke('update_goal_status', {
  goalId: goal.id,
  status: 'COMPLETED',
})
```

---

## 十一、测试策略

### 11.1 单元测试

```typescript
// src/store/appStore.test.mjs
test('createTaskForGoal links task to goal and switches to TaskDrawer', async () => {
  const store = useAppStore.getState()
  
  await store.createTaskForGoal('goal-1', 'Write unit tests')
  
  const state = useAppStore.getState()
  const newTask = state.tasks.find(t => t.title === 'Write unit tests')
  
  expect(newTask?.linkedGoalId).toBe('goal-1')
  expect(state.isGoalDrawerOpen).toBe(false)
  expect(state.isTaskDrawerOpen).toBe(true)
  expect(state.selectedTaskId).toBe(newTask?.id)
})
```

### 11.2 E2E 测试

```typescript
// tests/e2e/goal-drawer.test.ts
test('open goal drawer and change status', async ({ page }) => {
  await page.goto('http://localhost:1420')
  await page.click('[data-testid="view-goals"]')
  await page.click('[data-goal-id="goal-1"]')
  
  const drawer = page.locator('[data-testid="goal-drawer"]')
  await expect(drawer).toBeVisible()
  
  await page.click('button:has-text("暂停")')
  await page.waitForTimeout(500)
  
  // 验证状态按钮激活
  const pauseButton = page.locator('button:has-text("暂停")')
  await expect(pauseButton).toHaveClass(/bg-slate-900/)
})

test('quick add task for goal', async ({ page }) => {
  await page.goto('http://localhost:1420')
  await page.click('[data-goal-id="goal-2"]')
  
  const drawer = page.locator('[data-testid="goal-drawer"]')
  await drawer.locator('input[placeholder*="拆出一个待办"]').fill('Complete prototype')
  await drawer.locator('button:has-text("新建")').click()
  
  // 验证切换到 TaskDrawer
  const taskDrawer = page.locator('[data-testid="task-drawer"]')
  await expect(taskDrawer).toBeVisible()
  await expect(taskDrawer.locator('text=Complete prototype')).toBeVisible()
})
```

---

## 十二、相关资源

### 文档
- [Goal 状态机 Spec](./goal-state-machine.md)（待创建）
- [Goals View PRD](../prd/goals-view.md)
- [派生状态管理 Spec](../../docs/architecture-refactor-summary.md)

### 代码
- [`src/components/drawer/GoalDrawer.tsx`](../../src/components/drawer/GoalDrawer.tsx)
- [`src/lib/workspaceDerivation.ts`](../../src/lib/workspaceDerivation.ts)
- [`src/store/appStore.ts`](../../src/store/appStore.ts)

### 测试
- [`src/store/appStore.test.mjs`](../../src/store/appStore.test.mjs)

---

**文档维护者**: Goal Desk 开发团队  
**最后更新**: 2026-06-14
