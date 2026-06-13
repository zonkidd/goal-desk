# 重构方案：移除 `isOngoing`，新增 `showInTimeline`

## 问题分析

### 当前冗余设计

1. **`isOngoing` 属性的语义混乱**：
   - 原意：标记"持续推进"的任务
   - 实际：与时间区间（`plannedStartAt` ~ `dueDate`）语义重复
   - 问题：用户需要同时维护 `isOngoing`、`plannedStartAt`、`dueDate` 三个字段，容易不一致

2. **当前 `isOngoing` 的使用场景**：
   ```typescript
   // src/lib/workspaceDerivation.ts:176
   if (task.isOngoing) {
     const createdAt = startOfDay(task.createdAt || now)
     const dueDay = task.dueDate ? startOfDay(task.dueDate) : undefined
     return createdAt.getTime() <= today.getTime() && (!dueDay || today.getTime() <= dueDay.getTime())
   }
   ```
   **分析**：这个逻辑完全可以通过 `plannedStartAt` 和 `dueDate` 自动推导，不需要额外的 `isOngoing` 标志。

---

## 新设计方案

### 核心改动

#### 1. **移除 `isOngoing`，新增 `showInTimeline`**

```typescript
// src/types/task.ts
export interface Task {
  id: string
  title: string
  content: string
  status: TaskStatus
  plannedStartAt?: Date
  dueDate?: Date
  showInTimeline?: boolean  // 新增：是否在今日时间轴显示
  linkedGoalId?: string
  linkedGoalLabel?: string
  bearNoteId?: string
  systemReminderId?: string
  createdAt?: Date
  updatedAt?: Date
  activityLogs: TaskActivityLog[]
}
```

#### 2. **重新定义两个概念**

##### A. 今日持续推进
```typescript
// 语义：今天在任务时间区间内 && 状态为进行中
function deriveTodayAttentionGroups(tasks: Task[], now = new Date()) {
  const ongoing = activeTasks.filter((task) => {
    // 必须是 IN_PROGRESS 状态
    if (task.status !== 'IN_PROGRESS') return false
    
    // 必须有开始时间
    const startBoundary = task.plannedStartAt || task.createdAt
    if (!startBoundary) return false
    
    // 时间区间判断：start <= today <= end
    const startDay = startOfDay(startBoundary)
    const endDay = task.dueDate ? startOfDay(task.dueDate) : undefined
    const today = startOfDay(now)
    
    return startDay.getTime() <= today.getTime() 
        && (!endDay || today.getTime() <= endDay.getTime())
  })
}
```

**优点**：
- ✅ 语义清晰：通过状态 + 时间区间自动判断
- ✅ 不需要额外标志位
- ✅ 数据一致性强：时间变化后自动进出"持续推进"

##### B. 今日时间轴
```typescript
// 语义：用户显式标记在时间轴展示 && 状态为进行中 && 今天在时间区间内
function deriveTodayTimeline(baseTimeline, tasks, now) {
  const today = startOfDay(now)
  const taskItems = tasks
    .filter((task) => {
      // 必须显式标记在时间轴显示
      if (!task.showInTimeline) return false
      
      // 必须是进行中状态
      if (task.status !== 'IN_PROGRESS') return false
      
      // 必须有开始时间
      if (!task.plannedStartAt) return false
      
      // 时间区间判断：start <= today <= end
      const startDay = startOfDay(task.plannedStartAt)
      const endDay = task.dueDate ? startOfDay(task.dueDate) : undefined
      
      return startDay.getTime() <= today.getTime() 
          && (!endDay || today.getTime() <= endDay.getTime())
    })
    .map((task) => ({
      id: task.id,
      title: task.title,
      timeLabel: formatTimeLabel(task.plannedStartAt),
      source: 'todo' as const,
      readonly: false,
      done: false,  // 因为已经过滤了 IN_PROGRESS
      sourceLabel: task.linkedGoalLabel || 'Desk Task',
    }))
}
```

**优点**：
- ✅ 用户可控：显式勾选"在时间轴显示"
- ✅ 动态更新：状态变化或超过结束时间自动移出时间轴
- ✅ 避免混乱：不是所有"持续推进"都会出现在时间轴，用户可以选择

---

## 实施计划

### 阶段 1：添加新字段 `showInTimeline`（兼容过渡）

#### 1.1 更新 TypeScript 类型
```typescript
// src/types/task.ts
export interface Task {
  // ... 其他字段
  showInTimeline?: boolean  // 新增
  isOngoing?: boolean       // 暂时保留，后续删除
}
```

#### 1.2 更新 Rust 后端
```rust
// src-tauri/src/domain.rs
pub struct DeskTask {
    // ... 其他字段
    pub show_in_timeline: Option<bool>,  // 新增
    pub is_ongoing: Option<bool>,         // 暂时保留
}

// src-tauri/src/repository.rs
// 添加 show_in_timeline 列（如果不存在）
```

#### 1.3 更新数据映射
```typescript
// src/lib/desktopApi.ts
function normalizeRustTask(item: RustDeskTask): Task {
  return {
    // ...
    showInTimeline: item.show_in_timeline || false,
    isOngoing: item.is_ongoing || false,  // 暂时保留
  }
}
```

#### 1.4 更新 UI（TaskDrawer）
```tsx
// src/components/drawer/TaskDrawer.tsx
<label>
  <input
    type="checkbox"
    checked={draft.showInTimelineDraft}
    onChange={(e) => actions.setShowInTimelineDraft(e.target.checked, draft)}
  />
  在时间轴显示
</label>

// 暂时保留 isOngoing 勾选框，或隐藏
```

---

### 阶段 2：更新派生逻辑

#### 2.1 更新 `deriveTodayAttentionGroups`
```typescript
// src/lib/workspaceDerivation.ts
const ongoing = activeTasks
  .filter((task) => {
    // 严格要求 IN_PROGRESS
    if (task.status !== 'IN_PROGRESS') return false
    if (overdue.includes(task) || dueToday.includes(task)) return false
    
    const startBoundary = task.plannedStartAt || task.createdAt
    if (!startBoundary) return false
    
    const startDay = startOfDay(startBoundary)
    const endDay = task.dueDate ? startOfDay(task.dueDate) : undefined
    return startDay.getTime() <= today.getTime() 
        && (!endDay || today.getTime() <= endDay.getTime())
  })
```

#### 2.2 更新 `deriveTodayTimeline`
```typescript
// src/lib/workspaceDerivation.ts
const taskItems = tasks
  .filter((task) => {
    if (!task.showInTimeline) return false
    if (task.status !== 'IN_PROGRESS') return false
    if (!task.plannedStartAt) return false
    
    const startDay = startOfDay(task.plannedStartAt)
    const endDay = task.dueDate ? startOfDay(task.dueDate) : undefined
    return startDay.getTime() <= today.getTime() 
        && (!endDay || today.getTime() <= endDay.getTime())
  })
  .map(...)
```

#### 2.3 移除 `getTodayFocusTasks` 中的 `isOngoing` 判断
```typescript
// 完全删除这段逻辑，统一使用时间区间判断
export function getTodayFocusTasks(tasks: Task[], now = new Date()) {
  const today = startOfDay(now)
  return tasks.filter((task) => {
    if (task.status === 'DONE' || task.status === 'PAUSED') return false
    
    // 统一逻辑：时间区间覆盖今天
    const startBoundary = task.plannedStartAt || task.createdAt
    if (!startBoundary) return false
    
    const startDay = startOfDay(startBoundary)
    const endDay = task.dueDate ? startOfDay(task.dueDate) : undefined
    
    return startDay.getTime() <= today.getTime() 
        && (!endDay || today.getTime() <= endDay.getTime())
  })
}
```

---

### 阶段 3：数据迁移

#### 3.1 迁移策略
```typescript
// 迁移脚本（在应用启动时执行一次）
function migrateIsOngoingToShowInTimeline(tasks: Task[]): Task[] {
  return tasks.map(task => {
    // 如果 isOngoing 为 true，自动迁移到 showInTimeline
    if (task.isOngoing && task.showInTimeline === undefined) {
      return { ...task, showInTimeline: true }
    }
    return task
  })
}
```

#### 3.2 SQLite 迁移
```sql
-- 添加新列
ALTER TABLE desk_tasks ADD COLUMN show_in_timeline INTEGER DEFAULT 0;

-- 迁移数据：is_ongoing = 1 的任务自动设置 show_in_timeline = 1
UPDATE desk_tasks SET show_in_timeline = 1 WHERE is_ongoing = 1;
```

---

### 阶段 4：移除 `isOngoing`

#### 4.1 删除所有 `isOngoing` 引用
- [ ] `src/types/task.ts` - 删除字段定义
- [ ] `src/lib/workspaceDerivation.ts` - 删除逻辑
- [ ] `src/components/drawer/TaskDrawer.tsx` - 删除 UI
- [ ] `src/lib/todoEditing.ts` - 删除编辑状态
- [ ] `src/lib/desktopApi.ts` - 删除映射
- [ ] `src/store/appStore.ts` - 删除状态
- [ ] `src-tauri/src/domain.rs` - 删除字段
- [ ] `src-tauri/src/repository.rs` - 删除列（保留旧数据不影响）

---

## 方案对比

| 项目 | 旧方案（isOngoing） | 新方案（showInTimeline） |
|------|-------------------|----------------------|
| **语义清晰度** | ❌ 与时间区间重复 | ✅ 职责单一：控制时间轴显示 |
| **数据一致性** | ❌ 需要手动维护多个字段 | ✅ 自动从时间区间推导 |
| **用户控制** | ❌ 不清楚"持续推进"如何定义 | ✅ 明确：勾选后在时间轴显示 |
| **持续推进判断** | ❌ 依赖 isOngoing 标志 | ✅ 自动：IN_PROGRESS + 时间区间 |
| **时间轴判断** | ❌ 只能通过 plannedStartAt 判断 | ✅ 用户显式控制 + 时间区间 |

---

## 用户体验变化

### 旧流程
1. 创建任务，填写标题
2. 设置截止时间
3. **手动勾选"持续推进"**（容易忘记）
4. 任务不会出现在时间轴（除非 plannedStartAt 是今天）

### 新流程
1. 创建任务，填写标题
2. 设置开始时间和截止时间
3. 点击"开始"按钮，状态变为 IN_PROGRESS
4. **自动进入"今日持续推进"**（如果今天在时间区间内）
5. 如需在时间轴显示，勾选"在时间轴显示"

---

## 实施风险

### 风险 1：数据不一致
**场景**：旧数据中 `isOngoing=true` 但没有设置时间区间
**缓解**：迁移脚本自动设置默认值，或提示用户补充

### 风险 2：用户习惯变化
**场景**：用户习惯了手动勾选"持续推进"
**缓解**：
- UI 提示：状态变为 IN_PROGRESS 后，自动提示"已进入今日持续推进"
- 保留过渡期，两个字段共存1-2个版本

### 风险 3：时间轴显示逻辑变化
**场景**：原来只显示今天启动的任务，现在可以显示持续中的任务
**缓解**：
- 默认 `showInTimeline=false`，用户需显式勾选
- UI 说明："勾选后，任务会在时间轴显示，直到超过结束时间或完成"

---

## 推荐实施顺序

### 第一阶段（本次实施）
1. ✅ 添加 `showInTimeline` 字段（保留 `isOngoing`）
2. ✅ 更新 `deriveTodayAttentionGroups` 为严格的 IN_PROGRESS 判断
3. ✅ 更新 `deriveTodayTimeline` 使用 `showInTimeline`
4. ✅ 更新 UI，添加"在时间轴显示"勾选框
5. ✅ 更新 Rust 后端和数据库

### 第二阶段（下次实施）
1. 数据迁移脚本
2. 删除 `isOngoing` 所有引用
3. 更新文档和用户引导

---

## 总结

这个重构方案的核心理念是：

1. **自动推导 > 手动标记**：持续推进通过状态和时间自动判断，不需要额外标志位
2. **职责分离**：`showInTimeline` 只负责控制时间轴显示，不承担语义判断
3. **数据一致性**：单一数据源（时间区间），避免多字段不一致

你觉得这个方案如何？我可以先实施第一阶段吗？
