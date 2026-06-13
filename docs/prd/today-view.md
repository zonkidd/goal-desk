# Today View 功能 PRD

**文档版本**: v1.0  
**创建日期**: 2026-06-14  
**状态**: 已实现 ✅

---

## 一、功能概述

### 1.1 产品定位

Today View（今日焦点）是 Goal Desk 的核心视图，帮助用户**在时间流中推进顶层目标**。它聚焦于"今天要做什么"这个最重要的问题，通过三个模块呈现：今日持续推进任务、今日目标看点、今日时间轴。

**设计理念**：
- **时间驱动**：以时间为主线组织任务和目标
- **持续推进**：强调任务的时间跨度而非单点截止
- **目标可见**：从任务看到目标进展，避免迷失在琐事中
- **统一视图**：整合 Desk Task、Apple Reminders、Calendar Events

### 1.2 核心价值

| 用户痛点 | Today View 解决方案 |
|---------|-------------------|
| 任务太多不知道今天做什么 | 筛选今日持续推进任务，聚焦当下 |
| 感觉忙碌但目标没进展 | 今日目标看点展示目标进度 |
| 不清楚任务推进了多久 | 显示"已推进 X 天"和"还剩 Y 天" |
| 日历、提醒、任务分散 | 时间轴统一展示所有时间事项 |

---

## 二、功能规格

### 2.1 视图布局

#### 页面结构

```
┌─────────────────────────────────────────────────────────────┐
│  今日焦点                                                     │
│  在时间流中推进你的顶层目标。                                  │
├──────────────────────────┬──────────────────────────────────┤
│                          │                                  │
│  今日持续推进  [3]        │   今日时间轴  🕐                 │
│                          │                                  │
│  ┌─────────────────────┐ │   09:00 ○ 团队周会              │
│  │ 完成项目原型设计     │ │   14:00 ● 产品讨论会议 (提醒)   │
│  │ 已推进 3天 还剩2天🔥 │ │   16:00 ○ 需求评审准备          │
│  └─────────────────────┘ │                                  │
│                          │                                  │
│  今日目标看点  [2]        │                                  │
│                          │                                  │
│  ┌─────────────────────┐ │                                  │
│  │ Q2 产品迭代         │ │                                  │
│  │ 65% ▓▓▓▓▓▓░░░░      │ │                                  │
│  │ Next: 完成原型设计   │ │                                  │
│  └─────────────────────┘ │                                  │
└──────────────────────────┴──────────────────────────────────┘
```

### 2.2 今日持续推进模块

#### 筛选逻辑

```typescript
// 筛选条件：开始时间 ≤ 今天 ≤ 截止时间，且状态为 IN_PROGRESS
const today = startOfDay(new Date())

const ongoingTasks = tasks.filter((task) => {
  if (task.status !== 'IN_PROGRESS') return false
  
  const startDay = startOfDay(task.plannedStartAt || task.createdAt)
  const endDay = task.dueDate ? startOfDay(task.dueDate) : undefined
  
  return startDay.getTime() <= today.getTime() 
      && (!endDay || today.getTime() <= endDay.getTime())
})
```

**设计意图**：
- ✅ 只显示"正在推进中"的任务（排除 TODO 和 PAUSED）
- ✅ 任务时间跨度包含今天（不是"今天截止"，而是"今天仍在推进"）
- ✅ 强调持续性而非紧急性

#### 时间展示策略

**时间信息结构**：
```typescript
interface TaskTimeInfo {
  startDate: Date           // 开始日期
  todayDate: Date          // 今天日期
  endDate: Date | null     // 截止日期
  daysElapsed: number      // 已推进天数
  daysRemaining: number | null  // 剩余天数
  totalDays: number | null // 总天数（有截止时）
  progressPercent: number | null  // 时间进度百分比
  urgency: 'critical' | 'warning' | 'normal' | 'none'
}
```

**紧急度分级**：
| 紧急度 | 剩余天数 | 颜色 | 图标 |
|-------|---------|------|-----|
| `critical` | ≤ 2 天 | 红色 `text-red-600` | 🔥 |
| `warning` | 3-7 天 | 琥珀 `text-amber-600` | ⏰ |
| `normal` | > 7 天 | 绿色 `text-green-600` | ✅ |
| `none` | 无截止 | 灰色 `text-slate-400` | ∞ |

#### 卡片展示

```tsx
<TaskCard>
  <Title>{task.title}</Title>
  <LinkedGoal>{task.linkedGoalLabel || '独立待办'}</LinkedGoal>
  <TimeInfo>
    <Elapsed>已推进 {timeInfo.daysElapsed}天</Elapsed>
    <Remaining className={urgencyColor}>
      {timeInfo.daysRemaining !== null 
        ? `还剩 ${timeInfo.daysRemaining}天 ${urgencyIcon}`
        : `无截止日期 ∞`
      }
    </Remaining>
  </TimeInfo>
  
  {/* Hover Tooltip: 完整时间线 */}
  <Tooltip>
    <TimelineRow>开始: {timeInfo.startDate}</TimelineRow>
    <TimelineRow highlight>今天: {timeInfo.todayDate} (第{timeInfo.daysElapsed}天)</TimelineRow>
    <TimelineRow>截止: {timeInfo.endDate || '未设置'}</TimelineRow>
    {timeInfo.totalDays && (
      <Summary>总计：{timeInfo.totalDays}天 · 完成 {timeInfo.progressPercent}%</Summary>
    )}
  </Tooltip>
</TaskCard>
```

### 2.3 今日目标看点模块

#### 筛选逻辑

```typescript
// 目标必须满足：至少有一个关联任务在"今日持续推进"中
const todayRelevantGoals = goals.filter((goal) => {
  const relatedTasks = tasks.filter(task => task.linkedGoalId === goal.id)
  const ongoingCount = relatedTasks.filter(task => 
    ongoingTasks.some(ongoing => ongoing.id === task.id)
  ).length
  
  return ongoingCount > 0
})
```

**设计意图**：
- ✅ 只显示"今天有任务在推进"的目标
- ✅ 避免显示所有目标导致信息过载
- ✅ 强调"任务牵引目标"的关系

#### 卡片展示

```tsx
<GoalCard>
  <Header>
    <AreaBadge>{goal.area}</AreaBadge>
    <Progress>{goal.progress}%</Progress>
  </Header>
  
  <Title>{goal.title}</Title>
  <TaskCount>{goal.todayTaskCount} 个持续推进待办覆盖今天</TaskCount>
  
  <ProgressBar>
    <Fill style={{ width: `${goal.progress}%` }} />
  </ProgressBar>
  
  <NextTodo>
    <Label>Next</Label>
    <Text>{goal.nextTodo}</Text>
  </NextTodo>
</GoalCard>
```

**视觉特性**：
- 圆角: `rounded-2xl`
- 背景: `border border-indigo-100 bg-indigo-50/30`（淡紫色）
- 进度条: `bg-indigo-500`
- Next Todo: 白色背景高亮显示

### 2.4 今日时间轴模块

#### 数据来源

```typescript
interface TimelineItem {
  id: string
  title: string
  timeLabel: string  // "09:00", "14:30"
  source: 'todo' | 'reminder' | 'calendar'
  readonly: boolean
  done: boolean
  sourceLabel?: string  // "Calendar Event", "Apple Reminders", "Desk Task"
}

// 三种数据源合并
const timeline = [
  ...calendarEvents,    // macOS Calendar (只读)
  ...systemReminders,   // Apple Reminders (只读)
  ...deskTasks          // Desk Task (可编辑)
].sort((a, b) => a.time - b.time)
```

#### 视觉区分

| 数据源 | 圆点颜色 | 边框样式 | 交互 |
|-------|---------|---------|-----|
| Calendar Event | 绿色 `bg-emerald-400` | 无 | 不可点击 |
| Apple Reminders | 靛蓝 `bg-indigo-500` + `ring-4 ring-indigo-100` | 左侧紫色边框 | 点击打开 ReminderDrawer |
| Desk Task | 琥珀 `bg-amber-400` | 无 | 点击打开 TaskDrawer |

#### 时间轴布局

```tsx
<Timeline>
  {timeline.map((item) => (
    <TimelineItem key={item.id}>
      <Time className={item.source === 'calendar' ? 'text-slate-500' : 'text-indigo-600'}>
        {item.timeLabel}
      </Time>
      
      <Dot className={getDotColor(item.source)} />
      
      <Card 
        clickable={item.source !== 'calendar'}
        className={getCardStyle(item.source)}
      >
        <Source>{item.sourceLabel}</Source>
        <Title done={item.done}>{item.title}</Title>
      </Card>
    </TimelineItem>
  ))}
</Timeline>
```

**视觉效果**：
- 时间轴线: `timeline-line::before` 伪元素，渐变灰色竖线
- 圆点: 白色边框 + 颜色背景
- Reminder 卡片: 左侧紫色边框 `border-l-4 border-l-indigo-500`
- Hover: Desk Task 和 Reminder 悬停上浮 `-translate-y-0.5`

---

## 三、交互流程

### 3.1 查看任务时间详情

```
1. 用户悬停在"今日持续推进"任务卡片上
   ↓
2. 显示 Tooltip：完整时间线（开始/今天/截止）
   ↓
3. Tooltip 内容：
   - 开始: 2026-06-11
   - 今天: 2026-06-14 (第3天) [绿色高亮]
   - 截止: 2026-06-16 [红色警告]
   - 总计：5天 · 完成 60%
   ↓
4. 用户移开鼠标，Tooltip 消失
```

### 3.2 打开任务详情

```
1. 用户点击"今日持续推进"任务卡片
   ↓
2. 调用 openTaskDrawer(task.id)
   ↓
3. 右侧滑出 TaskDrawer
   ↓
4. 显示任务完整信息和编辑界面
```

### 3.3 打开目标详情

```
1. 用户点击"今日目标看点"目标卡片
   ↓
2. 调用 openGoalDrawer(goal.id)
   ↓
3. 右侧滑出 GoalDrawer
   ↓
4. 显示目标信息、关联任务列表
```

### 3.4 查看时间轴事项

```
1. 用户点击时间轴中的"产品讨论会议"（Reminder）
   ↓
2. 调用 openReminderDrawer(reminder.id)
   ↓
3. 右侧滑出 ReminderDrawer
   ↓
4. 显示提醒详情（只读，来自 Apple Reminders）

--

1. 用户点击时间轴中的"团队周会"（Calendar Event）
   ↓
2. 无操作（日历事件只读，不可点击）
```

---

## 四、技术实现

### 4.1 关键文件

| 文件路径 | 职责 |
|---------|-----|
| `src/components/views/TodayView.tsx` | Today 视图主组件 |
| `src/lib/taskPresentation.ts` | `getTaskTimeInfo()` 时间计算 |
| `src/lib/workspaceDerivation.ts` | `deriveTodayAttentionGroups()` 筛选逻辑 |
| `src/lib/desktopApi.ts` | `loadDesktopSnapshot()` 加载 EventKit 数据 |

### 4.2 时间计算逻辑

```typescript
// src/lib/taskPresentation.ts
export function getTaskTimeInfo(task: Task, now = new Date()): TaskTimeInfo {
  const today = startOfDay(now)
  const startDate = task.plannedStartAt || task.createdAt || now
  const startDay = startOfDay(startDate)
  
  // 计算已推进天数
  const daysElapsed = Math.floor(
    (today.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)
  )
  
  // 计算剩余天数和紧急度
  let daysRemaining: number | null = null
  let urgency: 'critical' | 'warning' | 'normal' | 'none' = 'none'
  
  if (task.dueDate) {
    const dueDay = startOfDay(task.dueDate)
    daysRemaining = Math.floor(
      (dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )
    
    if (daysRemaining <= 2) urgency = 'critical'
    else if (daysRemaining <= 7) urgency = 'warning'
    else urgency = 'normal'
  }
  
  // 计算时间进度百分比
  let progressPercent: number | null = null
  let totalDays: number | null = null
  if (task.dueDate) {
    const dueDay = startOfDay(task.dueDate)
    totalDays = Math.floor(
      (dueDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)
    )
    progressPercent = totalDays > 0 
      ? Math.round((daysElapsed / totalDays) * 100) 
      : 100
  }
  
  return {
    startDate,
    todayDate: today,
    endDate: task.dueDate || null,
    daysElapsed,
    daysRemaining,
    totalDays,
    progressPercent,
    urgency
  }
}
```

### 4.3 今日目标看点派生

```typescript
// src/lib/workspaceDerivation.ts
export function deriveTodayRelevantGoals(
  goals: GoalCard[],
  tasks: Task[],
  todayAttentionGroups: { ongoing: Task[] }
): GoalCard[] {
  return goals
    .map((goal) => {
      const relatedTasks = tasks.filter(t => t.linkedGoalId === goal.id)
      const todayTaskCount = relatedTasks.filter(task =>
        todayAttentionGroups.ongoing.some(ongoing => ongoing.id === task.id)
      ).length
      
      return {
        ...goal,
        todayTaskCount
      }
    })
    .filter(goal => goal.todayTaskCount > 0)
    .sort((a, b) => b.todayTaskCount - a.todayTaskCount)
}
```

---

## 五、设计决策（ADR）

### ADR-001: 筛选 IN_PROGRESS 而非 TODO

**决策**: 今日持续推进只显示状态为 `IN_PROGRESS` 的任务

**理由**:
- ✅ 强调"正在推进"的概念（已开始但未完成）
- ✅ TODO 任务太多会导致列表过载
- ✅ 用户可以在 Inbox 查看所有 TODO 任务

**代价**:
- ❌ 用户需要手动 Start 任务才能出现在 Today View
- 缓解：Quick Capture 创建的任务自动进入 Inbox，引导用户 Start

### ADR-002: 时间跨度筛选而非截止日期

**决策**: 筛选条件是 `startDay ≤ today ≤ dueDay`，而非"今天截止"

**理由**:
- ✅ 强调任务的持续性（spanning over time）
- ✅ 避免"今天截止的任务"心智模型（过于紧急导向）
- ✅ 用户可以提前看到未来几天仍在推进的任务

**示例**:
- 任务 A: 6月10日开始，6月20日截止
- 今天是 6月14日 → 任务 A 出现在 Today View
- 今天是 6月21日 → 任务 A 不出现（已超出时间跨度）

### ADR-003: 合并三种时间事项

**决策**: 时间轴整合 Calendar Events、Apple Reminders、Desk Tasks

**理由**:
- ✅ 用户不需要在多个应用间切换查看日程
- ✅ 统一视图降低认知负担
- ✅ EventKit 提供原生 macOS 集成

**代价**:
- ❌ Calendar/Reminders 数据只读，无法在 Goal Desk 中编辑
- 接受：用户可以在系统日历/提醒中编辑，Goal Desk 定期同步

### ADR-004: 今日目标看点由任务牵引

**决策**: 只显示"有今日持续推进任务"的目标

**理由**:
- ✅ 避免显示所有目标导致信息过载
- ✅ 强调"任务 → 目标"的因果关系
- ✅ 目标进度由任务完成情况驱动

**代价**:
- ❌ 没有任务的目标不会出现
- 接受：用户可以在 Goals View 查看所有目标

---

## 六、视觉设计规范

### 6.1 布局规格

```css
/* 左右两栏布局 */
grid-cols: [1fr_400px]
gap: 32px (gap-8)

/* 左侧列 */
flex-col gap: 24px (gap-6)

/* 今日持续推进 */
padding: 24px (p-6)
border-radius: 24px (rounded-3xl)
background: glass-panel (rgba(255,255,255,0.6) + blur(24px))

/* 今日目标看点 */
padding: 24px (p-6)
border: 1px solid rgba(99,102,241,0.1)
background: rgba(99,102,241,0.05) (indigo-50/30)

/* 右侧时间轴 */
width: 400px
padding: 32px (p-8)
```

### 6.2 颜色系统

| 元素 | 颜色 | Tailwind Class |
|------|------|---------------|
| 已推进天数 | 灰色 | `text-slate-500` |
| 紧急（≤2天） | 红色 | `text-red-600` |
| 警告（3-7天） | 琥珀 | `text-amber-600` |
| 正常（>7天） | 绿色 | `text-green-600` |
| 无截止 | 灰色 | `text-slate-400` |
| 目标进度条 | 靛蓝 | `bg-indigo-500` |
| Calendar 圆点 | 绿色 | `bg-emerald-400` |
| Reminder 圆点 | 靛蓝 | `bg-indigo-500` |
| Desk Task 圆点 | 琥珀 | `bg-amber-400` |

---

## 七、测试用例

### 7.1 今日持续推进筛选测试

| 测试场景 | 任务状态 | 开始时间 | 截止时间 | 今天 | 是否显示 |
|---------|---------|---------|---------|------|---------|
| 正在推进 | IN_PROGRESS | 6月10日 | 6月20日 | 6月14日 | ✅ 显示 |
| 尚未开始 | TODO | 6月10日 | 6月20日 | 6月14日 | ❌ 不显示 |
| 已暂停 | PAUSED | 6月10日 | 6月20日 | 6月14日 | ❌ 不显示 |
| 已完成 | DONE | 6月10日 | 6月20日 | 6月14日 | ❌ 不显示 |
| 未到开始时间 | IN_PROGRESS | 6月15日 | 6月20日 | 6月14日 | ❌ 不显示 |
| 已过截止时间 | IN_PROGRESS | 6月10日 | 6月13日 | 6月14日 | ❌ 不显示 |
| 无截止时间 | IN_PROGRESS | 6月10日 | 无 | 6月14日 | ✅ 显示 |

### 7.2 紧急度分级测试

| 测试场景 | 截止时间 | 今天 | 剩余天数 | 紧急度 | 图标 |
|---------|---------|------|---------|-------|-----|
| 明天截止 | 6月15日 | 6月14日 | 1天 | critical | 🔥 |
| 后天截止 | 6月16日 | 6月14日 | 2天 | critical | 🔥 |
| 5天后截止 | 6月19日 | 6月14日 | 5天 | warning | ⏰ |
| 10天后截止 | 6月24日 | 6月14日 | 10天 | normal | ✅ |
| 无截止 | 无 | 6月14日 | null | none | ∞ |

---

## 八、未来优化

### 8.1 短期优化（1-2 周）

- [ ] **今日总结**: 显示今天完成的任务数量和完成率
- [ ] **每日目标设置**: 允许用户设置"今天要完成 3 个任务"
- [ ] **时间块规划**: 支持拖拽任务到时间轴安排执行时间

### 8.2 中期迭代（1-2 月）

- [ ] **专注模式**: 隐藏非今日任务，只显示当前时间段的事项
- [ ] **时间预估**: 任务添加预估时长，时间轴显示时间块
- [ ] **番茄钟集成**: 点击任务开始番茄钟计时

### 8.3 长期愿景（3-6 月）

- [ ] **AI 推荐**: 基于历史数据推荐今天应该推进的任务
- [ ] **能量管理**: 标记任务的能量消耗（高/中/低），智能安排顺序
- [ ] **回顾功能**: 查看过去某一天的今日焦点快照

---

## 九、相关资源

### 文档
- [今日焦点时间展示设计](../design/today-workbench-time-display.md)
- [设计理念与架构思想](../design/design-philosophy.md)
- [Task 状态机系统 Spec](../spec/task-state-machine.md)

### 代码
- [`src/components/views/TodayView.tsx`](../../src/components/views/TodayView.tsx)
- [`src/lib/taskPresentation.ts`](../../src/lib/taskPresentation.ts)
- [`src/lib/workspaceDerivation.ts`](../../src/lib/workspaceDerivation.ts)

---

**文档维护者**: Goal Desk 开发团队  
**最后更新**: 2026-06-14
