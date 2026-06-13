# Inbox View 功能 PRD

**文档版本**: v1.0  
**创建日期**: 2026-06-14  
**状态**: 已实现 ✅

---

## 一、功能概述

### 1.1 产品定位

Inbox View（收件箱视图）是 Goal Desk 的任务入口和分流中心，展示所有**未归类、进行中或被暂停的待办事项**，按状态分组展示，提供快速添加和状态管理能力。

**设计理念**：
- **收集箱原则**：GTD 方法论的第一步，快速收集所有待办
- **状态可视化**：通过视觉分组清晰区分活跃/暂停/完成任务
- **低摩擦整理**：点击任务卡片即可打开 Drawer 深度编辑

### 1.2 核心价值

| 用户需求 | Inbox 解决方案 |
|---------|---------------|
| 新任务不知道放哪里 | 统一收集到 Inbox，后续再分类 |
| 任务状态混乱 | 按 TODO/PAUSED/DONE 分组展示 |
| 完成任务后界面混乱 | 完成任务可折叠，默认隐藏 |
| 快速添加任务 | 顶部内联输入框，Enter 提交 |

---

## 二、功能规格

### 2.1 视图布局

#### 页面结构

```
┌─────────────────────────────────────────────────────────┐
│  收件箱                                                  │
│  所有未归类、进行中、或被暂停的待办事项。                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [快速输入框] 输入待办事项，按 Enter 快速添加...         │
│                                                         │
│  RECENTLY ADDED & TODO                                  │
│  ┌─────────────────────────────────────────────┐       │
│  │ ☐ 完成项目原型设计                           │       │
│  │   📝 有内容  📅 06-15 15:00                  │       │
│  ├─────────────────────────────────────────────┤       │
│  │ ☐ 研究竞品分析报告                           │       │
│  │   📝 有内容  No date                         │       │
│  └─────────────────────────────────────────────┘       │
│                                                         │
│  ⏸ PAUSED (已暂停)                                      │
│  ┌─────────────────────────────────────────────┐       │
│  │ ⏸ 搭建测试环境                               │       │
│  │   暂停原因: 等待服务器资源                    │       │
│  └─────────────────────────────────────────────┘       │
│                                                         │
│  ✅ COMPLETED (已完成)  [12] ▼                          │
│  ┌─────────────────────────────────────────────┐       │
│  │ ✅ 完成周报                                   │       │
│  │   完成记录: 已提交给领导                      │       │
│  └─────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

### 2.2 任务分组

#### 分组逻辑

**Recently Added & Todo**（活跃任务）:
```typescript
// src/store/appStore.ts - deriveTodoInbox
const activeTasks = tasks.filter((task) => 
  task.status === 'TODO' || task.status === 'IN_PROGRESS'
)
```

**Paused**（已暂停）:
```typescript
const pausedTasks = tasks.filter((task) => 
  task.status === 'PAUSED'
)
```

**Completed**（已完成）:
```typescript
const completedTasks = tasks.filter((task) => 
  task.status === 'DONE'
)
```

#### 分组特性

| 分组 | 视觉标识 | 排序规则 | 默认展开 |
|------|---------|---------|---------|
| Recently Added & Todo | ☐ 空心复选框 | 按创建时间倒序 | ✅ 展开 |
| Paused | ⏸ 琥珀色图标 + 左侧边框 | 按暂停时间倒序 | ✅ 展开 |
| Completed | ✅ 绿色图标 + 左侧边框 | 按完成时间倒序 | ❌ 折叠（显示数量） |

### 2.3 快速输入框

#### 布局规格

```tsx
<QuickInboxInput>
  <PlusCircle icon />  {/* 左侧图标 */}
  <input
    placeholder="输入待办事项，按 Enter 快速添加..."
    onEnter={submit}
  />
</QuickInboxInput>
```

**样式规格**:
- 高度: `h-14`（56px）
- 圆角: `rounded-2xl`
- 左侧图标: `PlusCircle`，灰色默认，聚焦时变为 Indigo
- 焦点状态: `focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20`

#### 交互行为

| 用户操作 | 行为 |
|---------|-----|
| 输入文本 + Enter | 创建任务，清空输入框 |
| 输入为空 + Enter | 无操作 |
| 聚焦输入框 | 左侧图标变为 Indigo 色 |
| 失焦 | 左侧图标恢复灰色 |

### 2.4 任务卡片

#### 活跃任务卡片（TODO/IN_PROGRESS）

```tsx
<TaskCard status="active">
  <Checkbox />  {/* ☐ 空心圆角方框 */}
  <Content>
    <Title>{task.title}</Title>
    <Badges>
      {task.content && (
        <ContentBadge>
          <AlignLeft icon />
          {getTaskContentBadgeLabel(task.content)}
        </ContentBadge>
      )}
      {task.dueDate && (
        <DueDateBadge>
          <Calendar icon />
          {formatDueDate(task.dueDate)}
        </DueDateBadge>
      )}
    </Badges>
  </Content>
</TaskCard>
```

**样式规格**:
- 卡片: `glass-card rounded-xl p-4`
- 复选框: `h-5 w-5 rounded-[6px] border-2 border-slate-300 bg-white`
- 标题: `text-sm font-bold text-slate-800`
- 徽章: `text-xs text-slate-500`
- 内容徽章: `text-indigo-600`（带 AlignLeft 图标）
- 截止时间徽章: `border border-emerald-100 bg-emerald-50 text-emerald-600`
- Hover 效果: `whileHover={{ y: -2 }}`（Framer Motion）

#### 暂停任务卡片（PAUSED）

```tsx
<TaskCard status="paused">
  <Checkbox>
    <Pause icon />  {/* ⏸ 琥珀色填充 */}
  </Checkbox>
  <Content>
    <Title>{task.title}</Title>
    <PauseReason>
      暂停原因: {task.activityLogs.find(log => log.action === 'PAUSED')?.note}
    </PauseReason>
  </Content>
  <LeftBorder color="amber" />  {/* border-l-4 border-l-amber-400 */}
</TaskCard>
```

**样式差异**:
- 复选框: 琥珀色背景 + Pause 图标
- 左侧边框: `border-l-4 border-l-amber-400`
- 暂停原因标签: `rounded border border-amber-100 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600`
- 整体透明度: `opacity-80`

#### 完成任务卡片（DONE）

```tsx
<TaskCard status="done">
  <Checkbox>
    <CheckCircle2 icon />  {/* ✅ 绿色填充 */}
  </Checkbox>
  <Content>
    <Title>{task.title}</Title>
    <CompletionNote>
      完成记录: {task.activityLogs.find(log => log.action === 'COMPLETED')?.note}
    </CompletionNote>
  </Content>
  <LeftBorder color="emerald" />  {/* border-l-4 border-l-emerald-400 */}
</TaskCard>
```

**样式差异**:
- 复选框: 绿色背景 + CheckCircle2 图标
- 左侧边框: `border-l-4 border-l-emerald-400`
- 完成记录标签: `rounded border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600`
- 整体透明度: `opacity-80`

### 2.5 完成任务折叠

#### 折叠按钮

```tsx
<CollapseButton
  onClick={() => setShowCompleted(!showCompleted)}
>
  <CheckCircle2 icon />
  COMPLETED (已完成)
  <CountBadge>{completedTasks.length}</CountBadge>
  {showCompleted ? <ChevronDown /> : <ChevronRight />}
</CollapseButton>
```

**样式规格**:
- 按钮: `text-emerald-600 font-bold uppercase tracking-widest text-[11px]`
- 数量徽章: `text-emerald-500`
- 展开/收起图标: `ChevronDown` / `ChevronRight`

#### 展开/收起行为

| 状态 | 展示内容 | 图标 |
|------|---------|-----|
| 折叠（默认） | 只显示"COMPLETED (已完成) [数量]" | ChevronRight → |
| 展开 | 显示所有完成任务卡片 | ChevronDown ▼ |

**实现逻辑**:
```typescript
// src/store/appStore.ts
interface AppStore {
  showCompletedTodos: boolean
  setShowCompletedTodos: (show: boolean) => void
}

// 派生状态
const inbox = useMemo(() => {
  const completed = tasks.filter(task => task.status === 'DONE')
  return {
    activeTasks: [...],
    pausedTasks: [...],
    completed: {
      totalCount: completed.length,
      visibleTasks: showCompletedTodos ? completed : []
    }
  }
}, [tasks, showCompletedTodos])
```

---

## 三、交互流程

### 3.1 快速添加任务

```
1. 用户在顶部输入框输入"完成报告"
   ↓
2. 按 Enter 键
   ↓
3. 调用 appStore.addTask("完成报告")
   ↓
4. 解析自然语言（如果包含时间表达式）
   ↓
5. 创建任务 { title: "完成报告", status: "TODO", ... }
   ↓
6. Tauri 模式：调用 Rust command 写入 SQLite
   浏览器模式：写入 localStorage
   ↓
7. 更新派生状态 deriveTodoInbox()
   ↓
8. 任务卡片出现在 "Recently Added & Todo" 分组顶部
   ↓
9. 输入框清空，等待下一次输入
```

### 3.2 查看任务详情

```
1. 用户点击任务卡片
   ↓
2. 触发 openTaskDrawer(task.id)
   ↓
3. 右侧滑出 TaskDrawer
   ↓
4. 显示任务完整信息：标题、内容、时间、状态机按钮、活动日志
   ↓
5. 用户在 Drawer 中编辑或更改状态
   ↓
6. 实时更新 Inbox 列表
```

### 3.3 展开/收起完成任务

```
1. 用户点击 "COMPLETED (已完成) [12] ▼"
   ↓
2. 调用 setShowCompletedTodos(!showCompleted)
   ↓
3. showCompleted 从 true 变为 false（或反之）
   ↓
4. 派生状态重新计算：
   - showCompleted=true: 展示所有完成任务
   - showCompleted=false: 只显示按钮和数量
   ↓
5. UI 动画过渡（Framer Motion）
```

---

## 四、技术实现

### 4.1 关键文件

| 文件路径 | 职责 |
|---------|-----|
| `src/components/views/InboxView.tsx` | Inbox 视图主组件 |
| `src/store/appStore.ts` | `inbox` 派生状态、`addTask` action |
| `src/lib/workspaceDerivation.ts` | `deriveTodoInbox` 分组逻辑 |
| `src/lib/taskPresentation.ts` | `getTaskContentBadgeLabel` 徽章文本 |

### 4.2 派生状态计算

```typescript
// src/lib/workspaceDerivation.ts
export function deriveTodoInbox(tasks: Task[]): InboxGroups {
  const activeTasks = tasks.filter((task) => 
    task.status === 'TODO' || task.status === 'IN_PROGRESS'
  ).sort((a, b) => 
    (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
  )

  const pausedTasks = tasks.filter((task) => 
    task.status === 'PAUSED'
  ).sort((a, b) => {
    const aPausedLog = a.activityLogs.findLast(log => log.action === 'PAUSED')
    const bPausedLog = b.activityLogs.findLast(log => log.action === 'PAUSED')
    return (bPausedLog?.timestamp.getTime() || 0) - (aPausedLog?.timestamp.getTime() || 0)
  })

  const completedTasks = tasks.filter((task) => 
    task.status === 'DONE'
  ).sort((a, b) => {
    const aCompletedLog = a.activityLogs.findLast(log => log.action === 'COMPLETED')
    const bCompletedLog = b.activityLogs.findLast(log => log.action === 'COMPLETED')
    return (bCompletedLog?.timestamp.getTime() || 0) - (aCompletedLog?.timestamp.getTime() || 0)
  })

  return {
    activeTasks,
    pausedTasks,
    completed: {
      totalCount: completedTasks.length,
      visibleTasks: showCompleted ? completedTasks : []
    }
  }
}
```

### 4.3 内容徽章逻辑

```typescript
// src/lib/taskPresentation.ts
export function getTaskContentBadgeLabel(content: string): string {
  const trimmed = content.trim()
  if (!trimmed) return '无内容'
  
  const lines = trimmed.split('\n').length
  const chars = trimmed.length
  
  if (lines === 1 && chars < 20) {
    return trimmed  // 短内容直接显示
  }
  
  if (lines > 1) {
    return `${lines} 行内容`
  }
  
  return `${chars} 字`
}
```

---

## 五、设计决策（ADR）

### ADR-001: 完成任务默认折叠

**决策**: 完成任务默认折叠，只显示数量

**理由**:
- ✅ 减少视觉噪音，专注未完成任务
- ✅ 长列表性能优化（不渲染已完成卡片）
- ✅ 符合 GTD "两分钟规则"后的清理心智模型

**代价**:
- ❌ 查看完成任务需要额外点击
- 缓解：保留完成任务数量提示

### ADR-002: 暂停任务显示暂停原因

**决策**: 暂停任务卡片直接显示暂停原因（而非需要打开 Drawer）

**理由**:
- ✅ 快速回忆上下文（"为什么暂停？"）
- ✅ 避免频繁打开 Drawer 查看
- ✅ 暂停原因通常简短，适合卡片展示

**代价**:
- ❌ 暂停原因过长时布局可能溢出
- 缓解：暂停原因输入时建议简短描述

### ADR-003: 活跃任务不区分 TODO 和 IN_PROGRESS

**决策**: Inbox 中 TODO 和 IN_PROGRESS 合并为一个分组

**理由**:
- ✅ Inbox 是"收集"而非"执行"视图，状态细分不重要
- ✅ 减少视觉分组，降低认知负担
- ✅ 用户可以在 Board View 看详细状态

**未来考虑**:
- 🔄 如果用户反馈需要区分，可以添加状态筛选器

### ADR-004: 快速输入框置顶

**决策**: 快速输入框固定在页面顶部，而非底部

**理由**:
- ✅ 符合视觉流（从上到下：输入 → 查看）
- ✅ 避免与浮动 Drawer 冲突
- ✅ 新任务出现在列表顶部，输入框-结果距离最短

---

## 六、视觉设计规范

### 6.1 颜色系统

| 元素 | 颜色 | 用途 |
|------|------|-----|
| 活跃任务复选框 | `border-slate-300 bg-white` | 未开始/进行中 |
| 暂停任务背景 | `bg-amber-50 border-amber-400` | 暂停状态 |
| 暂停任务图标 | `text-amber-500` | ⏸ Pause 图标 |
| 完成任务背景 | `bg-emerald-50 border-emerald-400` | 完成状态 |
| 完成任务图标 | `text-emerald-500` | ✅ CheckCircle2 图标 |
| 内容徽章 | `text-indigo-600` | 有内容标识 |
| 截止时间徽章 | `border-emerald-100 bg-emerald-50 text-emerald-600` | 时间信息 |

### 6.2 间距与圆角

| 元素 | 规格 |
|------|-----|
| 卡片间距 | `space-y-2`（8px） |
| 分组间距 | `space-y-8`（32px） |
| 卡片圆角 | `rounded-xl`（12px） |
| 输入框圆角 | `rounded-2xl`（16px） |
| 复选框圆角 | `rounded-[6px]`（6px） |

### 6.3 动画效果

```typescript
// Framer Motion 配置
<motion.button
  whileHover={{ y: -2 }}        // 悬停上浮 2px
  onClick={openTaskDrawer}
  className="glass-card hover:border-indigo-300"  // 悬停边框变色
/>
```

---

## 七、测试用例

### 7.1 功能测试

| 测试场景 | 操作 | 预期结果 |
|---------|-----|---------|
| 快速添加任务 | 输入"写代码" + Enter | 任务出现在活跃分组顶部 |
| 添加带时间的任务 | 输入"明天开会" + Enter | 任务带有 dueDate，显示截止时间徽章 |
| 空输入提交 | 输入框为空 + Enter | 无操作，不创建任务 |
| 点击活跃任务 | 点击 TODO 任务卡片 | TaskDrawer 滑出，显示任务详情 |
| 点击暂停任务 | 点击 PAUSED 任务卡片 | TaskDrawer 滑出，显示暂停原因 |
| 展开完成任务 | 点击 "COMPLETED [12] ▼" | 显示所有完成任务卡片 |
| 折叠完成任务 | 再次点击按钮 | 隐藏完成任务，只显示数量 |

### 7.2 边界测试

| 测试场景 | 初始状态 | 预期行为 |
|---------|---------|---------|
| 无任务 | tasks = [] | 显示空状态提示（可选） |
| 只有完成任务 | 所有任务 status='DONE' | 活跃/暂停分组为空 |
| 暂停原因为空 | pauseNote = undefined | 显示"等待恢复"默认文本 |
| 完成记录为空 | completionNote = undefined | 显示"已完成"默认文本 |
| 超长任务标题 | title 长度 > 100 字符 | 卡片高度自适应，标题不截断 |

---

## 八、未来优化

### 8.1 短期优化（1-2 周）

- [ ] **批量操作**: 多选任务，批量标记为完成/暂停
- [ ] **筛选器**: 按有无截止时间、有无内容筛选
- [ ] **拖拽排序**: 拖拽任务卡片调整优先级

### 8.2 中期迭代（1-2 月）

- [ ] **智能分组**: 自动识别"今日"、"本周"、"过期"任务
- [ ] **搜索功能**: 在 Inbox 内搜索任务标题/内容
- [ ] **归档功能**: 一键归档所有完成任务（移出 Inbox）

### 8.3 长期愿景（3-6 月）

- [ ] **AI 排序**: 基于优先级和截止时间智能排序
- [ ] **定期清理**: 自动归档 7 天前完成的任务
- [ ] **统计面板**: 显示今日完成数量、本周趋势

---

## 九、相关资源

### 文档
- [设计理念与架构思想](../design/design-philosophy.md)
- [Task 状态机系统 Spec](./task-state-machine.md)（待创建）
- [TaskDrawer 系统 Spec](./task-drawer.md)（待创建）

### 代码
- [`src/components/views/InboxView.tsx`](../../src/components/views/InboxView.tsx)
- [`src/lib/workspaceDerivation.ts`](../../src/lib/workspaceDerivation.ts)
- [`src/lib/taskPresentation.ts`](../../src/lib/taskPresentation.ts)

---

**文档维护者**: Goal Desk 开发团队  
**最后更新**: 2026-06-14
