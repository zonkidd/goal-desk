# TaskDrawer 系统 Spec

**文档版本**: v1.0  
**创建日期**: 2026-06-14  
**状态**: 已实现 ✅

---

## 一、概述

### 1.1 系统定位

TaskDrawer 是任务详情编辑的核心 UI 组件，以右侧抽屉形式滑入，提供任务全生命周期管理：状态转换、时间规划、目标关联、内容编辑、活动日志查看。

**设计原则**：
- **单一职责**：只负责单个任务的编辑和展示，不管理任务列表
- **富交互**：支持内联编辑、日期选择器、Markdown 预览/编辑切换
- **状态机驱动**：按钮组根据当前状态动态生成合法转换
- **实时同步**：onChange 更新 draft，onBlur 持久化到 store

---

## 二、组件结构

### 2.1 文件路径

- **主组件**: `src/components/drawer/TaskDrawer.tsx` (~713 行)
- **依赖组件**:
  - `StatusMachineButtons.tsx` - 状态转换按钮组
  - `ActivityLogTimeline.tsx` - 活动日志时间线
  - `MarkdownContent.tsx` - Markdown 渲染器
  - `AreaSelectWithCreate.tsx` - 领域选择器（用于内联创建目标）

### 2.2 核心 Hook

```typescript
const editingSession = useTodoEditingSession({
  task,
  goals,
  activeArea,
  allAreas,
  createArea,
  updateTaskFields,
  updateTaskContent,
  updateTaskStatus,
  createGoal,
})
```

**职责**：
- 管理编辑态 draft（标题、时间、目标、内容）
- 提供 actions 方法集（setTitle、saveFields、linkGoal 等）
- 计算 capabilities（canChangeStatus、statusActions）
- 封装 Tauri/浏览器持久化逻辑

---

## 三、布局与交互

### 3.1 抽屉布局

```
┌──────────────────────────────────────────────────┐
│ Header (状态机按钮组 + 关闭按钮)                 │
├──────────────────────────────────────────────────┤
│ [条件显示] 状态转换 Note 输入框                 │
├──────────────────────────────────────────────────┤
│ Scrollable Body:                                │
│                                                  │
│  ┌─ 任务标题输入框 ─────────────────────┐       │
│  │                                       │       │
│  └───────────────────────────────────────┘       │
│                                                  │
│  ⏰ 计划开始  📅 截止时间  📁 关联目标          │
│  ☑ 在时间轴显示                                 │
│                                                  │
│  ─────────────────────────────────────────────  │
│                                                  │
│  Notes (Markdown)  [预览|编辑|分屏]            │
│  ┌──────────────────────────────────────┐       │
│  │                                      │       │
│  │  (Markdown 编辑器或预览区)           │       │
│  │                                      │       │
│  └──────────────────────────────────────┘       │
│                                                  │
│  ACTIVITY & UPDATES                             │
│  ○───○───○  (活动日志时间线)                   │
│                                                  │
│  [Me] ┌─────────────────────────┐               │
│       │ 添加进度记录...   [📤]  │               │
│       └─────────────────────────┘               │
└──────────────────────────────────────────────────┘
```

**尺寸**：
- 宽度: 600px
- 定位: `fixed bottom-4 right-4 top-4`
- 圆角: `rounded-3xl`
- 背景: `bg-white/95` + `backdrop-blur`

### 3.2 状态转换流程

```typescript
// 1. 用户点击状态按钮（如 "Pause"）
onAction={setPendingStatus}  // 设置 pendingStatus = 'PAUSED'

// 2. 条件渲染输入框
{pendingStatus && (
  <input placeholder="记录一下暂停原因" />
)}

// 3. 用户输入 + 回车/确认
editingSession.actions.submitStatus(pendingStatus, statusNote)
  ↓
updateTaskStatus(taskId, 'PAUSED', '等待服务器资源')
  ↓
Tauri command 或浏览器 store action
  ↓
派生状态重算（Inbox 分组、Today 持续推进）

// 4. UI 更新
setPendingStatus(null)  // 隐藏输入框
setStatusNote('')       // 清空输入
```

**Prompt 文案**：
| pendingStatus | promptText |
|--------------|-----------|
| `PAUSED` | "记录一下暂停原因" |
| `DONE` | "记录一下完成总结" |
| `IN_PROGRESS` (from TODO) | "记录一下开始说明" |
| `IN_PROGRESS` (from PAUSED) | "记录一下恢复说明" |

---

## 四、字段编辑

### 4.1 标题编辑

```typescript
<input
  value={draft.title}
  onChange={(e) => editingSession.actions.setTitle(e.target.value)}
  onBlur={() => void editingSession.actions.saveFields()}
  className="text-2xl font-black"
/>
```

**行为**：
- onChange 实时更新 draft
- onBlur 触发持久化（调用 `updateTaskFields`）
- 空标题不提交（`useTodoEditingSession` 内部校验）

### 4.2 时间选择器

**字段**：
- `plannedStartAt` - 计划开始时间
- `dueDate` - 截止时间

**交互**：
```typescript
// 1. 点击字段打开 Popover
<InlineTimeField
  value={draft.plannedStartAtDraft}
  isActive={draft.activeEditor === 'plannedStartAt'}
  onToggle={() => editingSession.actions.setActiveEditor('plannedStartAt')}
/>

// 2. Popover 内容
{draft.activeEditor === 'plannedStartAt' && (
  <DateTimePickerPopover
    value={draft.plannedStartAtDraft}
    defaultTime="09:00"
    onChange={(value) => editingSession.actions.setPlannedStartAtDraft(value)}
    onClose={() => editingSession.actions.setActiveEditor('none')}
  />
)}
```

**DateTimePickerPopover 组件**：
- DayPicker (react-day-picker) + 时间输入框
- 快捷按钮：今天、明天
- 快捷时间：09:00, 10:30, 12:30, 14:00, 15:30, 18:00, 20:00, 22:00
- 清除按钮：清空时间字段
- 完成按钮：应用选择并关闭 Popover

**datetime-local 格式**：
```typescript
// ISO 8601 without timezone: "2026-06-14T09:00"
function toDatetimeLocalValue(day: Date, time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date(day)
  date.setHours(hours, minutes, 0, 0)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 16)
}
```

### 4.3 关联目标选择器

**字段**：
- `linkedGoalId` - 关联目标 ID
- `linkedGoalLabel` - 关联目标标题（派生字段）

**交互**：
```typescript
<InlineGoalField
  draft={draft}
  goals={goals}
  editingSession={editingSession}
/>

{draft.activeEditor === 'linkedGoal' && (
  <GoalPickerPopover
    draft={draft}
    goals={goals}
    editingSession={editingSession}
    onClose={() => editingSession.actions.setActiveEditor('none')}
  />
)}
```

**GoalPickerPopover 功能**：
- 列表显示所有目标（按钮样式）
- "不关联" 选项（unlinkGoal）
- 内联创建目标：
  - 输入新目标标题
  - AreaSelectWithCreate 选择/创建领域
  - 创建后自动关联到当前任务

### 4.4 时间轴显示开关

```typescript
<label className={`checkbox-pill ${draft.showInTimelineDraft ? 'active' : ''}`}>
  <input
    type="checkbox"
    checked={draft.showInTimelineDraft}
    onChange={(e) => editingSession.actions.setShowInTimelineDraft(e.target.checked)}
    className="sr-only"
  />
  <span className="dot" />
  <span>在时间轴显示</span>
</label>
```

**视觉**：
- 激活: `bg-indigo-600 text-white shadow-lg`
- 未激活: `bg-slate-100 text-slate-500`
- 圆点: `bg-indigo-200` / `bg-slate-300`

---

## 五、Markdown 编辑器

### 5.1 三种模式

| 模式 | draft.markdownMode | 显示内容 |
|------|-------------------|---------|
| 预览 | `'preview'` | MarkdownContent 组件渲染 |
| 编辑 | `'edit'` | textarea 编辑器 |
| 分屏 | `'split'` | 左侧 textarea + 右侧 MarkdownContent |

**模式切换**：
```typescript
<div className="mode-switcher">
  {['preview', 'edit', 'split'].map(mode => (
    <button
      onClick={() => editingSession.actions.setMarkdownMode(mode)}
      className={draft.markdownMode === mode ? 'active' : ''}
    >
      {label}
    </button>
  ))}
</div>
```

### 5.2 空状态

```typescript
{draft.markdownMode === 'preview' && !draft.content.trim() && (
  <EmptyState>
    <AlignLeft />
    <p>还没有笔记</p>
    <button onClick={() => setMarkdownMode('edit')}>
      开始写笔记
    </button>
  </EmptyState>
)}
```

### 5.3 自动保存

```typescript
<textarea
  value={draft.content}
  onChange={(e) => editingSession.actions.setContent(e.target.value)}
  onBlur={() => void editingSession.actions.saveContentIfChanged()}
/>
```

**行为**：
- onChange 更新 draft.content（本地状态）
- onBlur 检查是否变更，调用 `updateTaskContent`
- 分屏模式下左右同步（共享 draft.content）

---

## 六、活动日志系统

### 6.1 ActivityLogTimeline 组件

**显示内容**：
```typescript
<Timeline>
  {task.activityLogs.map(log => (
    <TimelineItem>
      <ActionIcon action={log.action} />
      <ActionLabel>{getActionLabel(log.action)}</ActionLabel>
      <Timestamp>{formatTimestamp(log.timestamp)}</Timestamp>
      {log.note && <Note>{log.note}</Note>}
    </TimelineItem>
  ))}
</Timeline>
```

**视觉设计**：
- 时间线: 垂直灰色虚线连接各节点
- 节点图标: 根据 action 类型显示（▶️ STARTED / ⏸ PAUSED / ✅ COMPLETED）
- 时间戳: 相对时间（"2 小时前"、"昨天 14:30"）
- Note: 用户输入的备注，左侧带竖线装饰

### 6.2 添加进度记录

```typescript
<div className="add-log">
  <div className="avatar">Me</div>
  <textarea
    value={logNote}
    onChange={(e) => setLogNote(e.target.value)}
    placeholder="添加进度记录..."
  />
  <button onClick={() => {
    if (!logNote.trim()) return
    void addTaskNote(task.id, logNote)
    setLogNote('')
  }}>
    <Send />
  </button>
</div>
```

**行为**：
- 输入内容 + 点击发送 → 创建 `NOTE_ADDED` 活动日志
- 不改变任务状态，只记录备注
- 提交后清空输入框

---

## 七、Bear 集成

### 7.1 条件显示

```typescript
{task.bearNoteId && isTauriRuntime() && (
  <button onClick={() => void openTaskInBear(task.id)}>
    <BookOpen />
    Open in Bear
  </button>
)}
```

**触发条件**：
- `task.bearNoteId` 存在（任务已关联 Bear 笔记）
- `isTauriRuntime()` 为 true（桌面应用环境）

### 7.2 URL Scheme

```typescript
// src/lib/desktopApi.ts
export async function openTaskInBear(taskId: string) {
  const task = await invoke('get_task', { taskId })
  if (!task.bearNoteId) return
  
  const url = `bear://x-callback-url/open-note?id=${task.bearNoteId}`
  await invoke('open_url', { url })
}
```

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

**参数**：
- stiffness: 240 (弹簧刚度)
- damping: 28 (阻尼)
- 视觉效果: 从右侧滑入，关闭时滑出

### 8.2 Popover 动画

```typescript
<motion.div
  initial={{ opacity: 0, y: -8, scale: 0.98 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  exit={{ opacity: 0, y: -8, scale: 0.98 }}
  transition={{ type: 'spring', stiffness: 360, damping: 28 }}
>
```

**视觉效果**：
- 淡入 + 向下位移 + 放大
- 更快的弹簧（stiffness 360）

### 8.3 Backdrop

```typescript
<motion.button
  className="backdrop"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  onClick={closeTaskDrawer}
/>
```

**视觉**：
- `bg-slate-900/20 backdrop-blur-sm`
- 点击关闭抽屉

---

## 九、useTodoEditingSession Hook

### 9.1 Draft 状态

```typescript
interface Draft {
  title: string
  plannedStartAtDraft: string  // datetime-local format
  dueDateDraft: string
  linkedGoalIdDraft: string
  linkedGoalLabel?: string
  showInTimelineDraft: boolean
  content: string
  markdownMode: 'preview' | 'edit' | 'split'
  activeEditor: 'none' | 'plannedStartAt' | 'dueDate' | 'linkedGoal'
  
  // 内联创建目标
  isCreatingGoalInline: boolean
  newGoalTitle: string
  newGoalArea: string
  allAreas: AreaWithStats[]
}
```

### 9.2 Actions

```typescript
interface Actions {
  setTitle: (value: string) => void
  setPlannedStartAtDraft: (value: string) => void
  setDueDateDraft: (value: string) => void
  setShowInTimelineDraft: (value: boolean) => void
  setContent: (value: string) => void
  setMarkdownMode: (mode: 'preview' | 'edit' | 'split') => void
  setActiveEditor: (editor: 'none' | 'plannedStartAt' | 'dueDate' | 'linkedGoal') => void
  
  saveFields: () => Promise<void>
  saveContentIfChanged: () => Promise<void>
  submitStatus: (status: TaskStatus, note?: string) => Promise<void>
  
  linkGoal: (goalId: string) => Promise<void>
  unlinkGoal: () => Promise<void>
  
  startInlineGoalCreation: () => void
  cancelInlineGoalCreation: () => void
  setNewGoalTitle: (value: string) => void
  setNewGoalArea: (value: string) => void
  createAndLinkGoal: () => Promise<string | undefined>
}
```

### 9.3 Capabilities

```typescript
interface Capabilities {
  canChangeStatus: boolean
  statusActions: Array<{
    toStatus: TaskStatus
    label: string
    icon: LucideIcon
  }>
}
```

**计算逻辑**：
```typescript
const validTransitions = getValidTransitions(task.status)
const statusActions = validTransitions.map(toStatus => ({
  toStatus,
  label: getTransitionLabel(toStatus, task.status),
  icon: getTransitionIcon(toStatus, task.status)
}))
```

---

## 十、设计决策（ADR）

### ADR-001: onBlur 保存而非 onChange

**决策**: 字段编辑采用 onBlur 触发保存

**理由**:
- ✅ 减少网络请求和 Tauri IPC 调用
- ✅ 用户输入过程中不中断（无卡顿）
- ✅ 避免中间态频繁写入数据库

**代价**:
- ❌ 用户快速关闭抽屉可能丢失未 blur 的改动
- 缓解: useEffect cleanup 在卸载时尝试保存

### ADR-002: datetime-local 格式而非 Date 对象

**决策**: 时间字段使用 `datetime-local` 字符串格式

**理由**:
- ✅ HTML input[type=datetime-local] 原生支持
- ✅ 避免时区转换混乱（前端显示本地时间）
- ✅ 格式固定易于解析（YYYY-MM-DDTHH:mm）

**代价**:
- ❌ 需要手动转换 Date ↔ datetime-local
- 接受: 封装 `toDatetimeLocalValue` 和 `parseDatetimeLocal` 工具函数

### ADR-003: Markdown 分屏模式

**决策**: 支持预览/编辑/分屏三种模式

**理由**:
- ✅ 预览模式适合查看格式化后的笔记
- ✅ 编辑模式全屏输入，无干扰
- ✅ 分屏模式实时预览，辅助复杂格式

**代价**:
- ❌ 增加 UI 复杂度
- 接受: 用户可选，默认预览模式

### ADR-004: 内联创建目标

**决策**: 目标选择器支持"新建并关联"

**理由**:
- ✅ 减少跳转（不需要先去 Goals View 创建）
- ✅ 流畅的任务 → 目标关联体验
- ✅ 自动填入 activeArea（当前领域）

**代价**:
- ❌ Popover 内容变长
- 接受: 折叠式展示，按需显示输入框

---

## 十一、前后端一致性

### 11.1 字段映射

| TypeScript | Rust (snake_case) | 数据库列名 |
|-----------|------------------|----------|
| `title` | `title` | `title` |
| `plannedStartAt` | `planned_start_at` | `planned_start_at` |
| `dueDate` | `due_date` | `due_date` |
| `linkedGoalId` | `linked_goal_id` | `linked_goal_id` |
| `showInTimeline` | `show_in_timeline` | `show_in_timeline` |
| `content` | `content` | `content` |
| `activityLogs` | `activity_logs` | `activity_logs` (JSON) |

### 11.2 Tauri Command

```rust
// src-tauri/src/lib.rs
#[tauri::command]
async fn update_task_fields(
    task_id: String,
    title: String,
    planned_start_at: Option<String>,
    due_date: Option<String>,
    linked_goal_id: Option<String>,
    show_in_timeline: bool,
) -> Result<DeskTask, String> {
    // ...
}
```

**调用**：
```typescript
await invoke('update_task_fields', {
  taskId: task.id,
  title: draft.title,
  plannedStartAt: draft.plannedStartAtDraft || null,
  dueDate: draft.dueDateDraft || null,
  linkedGoalId: draft.linkedGoalIdDraft || null,
  showInTimeline: draft.showInTimelineDraft,
})
```

---

## 十二、测试策略

### 12.1 单元测试

**测试对象**: `useTodoEditingSession` hook

```typescript
// src/lib/todoEditing.test.mjs
test('draft title changes on setTitle', () => {
  const { draft, actions } = renderHook(() => useTodoEditingSession({...}))
  actions.setTitle('New title')
  expect(draft.title).toBe('New title')
})

test('saveFields calls updateTaskFields with draft values', async () => {
  const mockUpdate = vi.fn()
  const { actions } = renderHook(() => useTodoEditingSession({
    updateTaskFields: mockUpdate,
    ...
  }))
  
  actions.setTitle('Updated')
  await actions.saveFields()
  
  expect(mockUpdate).toHaveBeenCalledWith(task.id, {
    title: 'Updated',
    ...
  })
})
```

### 12.2 E2E 测试

**测试场景**：
```typescript
// tests/e2e/task-drawer.test.ts
test('open task drawer and edit title', async ({ page }) => {
  await page.goto('http://localhost:1420')
  await page.click('[data-task-id="task-1"]')
  
  const drawer = page.locator('[data-testid="task-drawer"]')
  await expect(drawer).toBeVisible()
  
  const titleInput = drawer.locator('input[type="text"]').first()
  await titleInput.fill('Updated task title')
  await titleInput.blur()
  
  await page.waitForTimeout(500) // 等待保存
  await expect(drawer.locator('text=Updated task title')).toBeVisible()
})

test('change task status to PAUSED with note', async ({ page }) => {
  await page.goto('http://localhost:1420')
  await page.click('[data-task-id="task-2"]')
  
  await page.click('button:has-text("Pause")')
  await page.fill('input[placeholder*="暂停原因"]', '等待外部依赖')
  await page.keyboard.press('Enter')
  
  await expect(page.locator('text=等待外部依赖')).toBeVisible()
})
```

---

## 十三、相关资源

### 文档
- [Task 状态机 Spec](./task-state-machine.md)
- [活动日志时间线 Spec](./activity-log-timeline.md)（待创建）
- [todoEditing Hook Spec](./todo-editing.md)（待创建）

### 代码
- [`src/components/drawer/TaskDrawer.tsx`](../../src/components/drawer/TaskDrawer.tsx)
- [`src/lib/todoEditing.ts`](../../src/lib/todoEditing.ts)
- [`src/components/drawer/StatusMachineButtons.tsx`](../../src/components/drawer/StatusMachineButtons.tsx)

### 测试
- [`src/lib/todoEditing.test.mjs`](../../src/lib/todoEditing.test.mjs)

---

**文档维护者**: Goal Desk 开发团队  
**最后更新**: 2026-06-14
