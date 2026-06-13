# 今日焦点 - 时间展示设计方案

## 背景理解

### 当前时间属性语义
- **plannedStartAt（开始时间）**：任务计划开始的时间，用于过滤"今日焦点"的准入门槛
- **dueDate（截止时间）**：任务的截止日期

### 当前过滤逻辑（`deriveTodayAttentionGroups`）
```typescript
// 今日持续推进的筛选条件：
const startDay = startOfDay(task.plannedStartAt || task.createdAt)
const endDay = task.dueDate ? startOfDay(task.dueDate) : undefined
return startDay.getTime() <= today.getTime() 
    && (!endDay || today.getTime() <= endDay.getTime())
```

**核心语义**：
- 开始时间 ≤ 今天 ≤ 截止时间（或无截止时间）
- 只有 IN_PROGRESS 状态的任务才会进入

---

## 问题诊断

### 当前「今日持续推进」模块只展示了截止时间：

```tsx
<div className="text-right text-xs font-bold text-slate-400">
  <div>持续推进</div>
  <div>{task.dueDate ? task.dueDate.toLocaleDateString('zh-CN') : '未设截止日期'}</div>
</div>
```

**问题**：
1. ❌ 用户看不到"已经推进了多久"
2. ❌ 无法判断任务的紧急程度（刚开始 vs 快到期）
3. ❌ "持续推进"暗示了一个时间跨度，但只展示终点

---

## 设计方案

### 方案 A：相对时间 + 紧急度视觉提示（推荐）

#### 视觉原型

```
┌─────────────────────────────────────────────────────────────┐
│ 今日持续推进                                         3      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  完成项目原型设计                            已推进 3天 📅  │
│  Q2 产品迭代                               还剩 2天 🔥     │
│                                                               │
│  研究竞品分析报告                            已推进 1天 ⏰  │
│  行业研究                                  还剩 6天 ✅     │
│                                                               │
│  搭建测试环境                                已推进 5天 📅  │
│  技术架构                                   无截止日期 ∞   │
│                                                               │
└─────────────────────────────────────────────────────────────┘

图例：
🔥 = 还剩 ≤2天（红色）
⏰ = 还剩 3-7天（橙色）
✅ = 还剩 >7天（绿色）
∞  = 无截止日期（灰色）
📅 = 默认状态
```

#### 代码实现

```typescript
// 辅助函数
function getTaskTimeInfo(task: Task, now = new Date()) {
  const today = startOfDay(now)
  const startDate = task.plannedStartAt || task.createdAt || now
  const startDay = startOfDay(startDate)
  
  // 计算已推进天数
  const daysElapsed = Math.floor((today.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24))
  
  // 计算剩余天数
  let daysRemaining: number | null = null
  let urgency: 'critical' | 'warning' | 'normal' | 'none' = 'none'
  
  if (task.dueDate) {
    const dueDay = startOfDay(task.dueDate)
    daysRemaining = Math.floor((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysRemaining <= 2) urgency = 'critical'
    else if (daysRemaining <= 7) urgency = 'warning'
    else urgency = 'normal'
  }
  
  return { daysElapsed, daysRemaining, urgency }
}

// UI 组件
const urgencyColors = {
  critical: 'text-red-600',
  warning: 'text-orange-600',
  normal: 'text-green-600',
  none: 'text-slate-400'
}

const urgencyIcons = {
  critical: '🔥',
  warning: '⏰',
  normal: '✅',
  none: '∞'
}

// 在卡片中使用
{ongoingTasks.map((task) => {
  const { daysElapsed, daysRemaining, urgency } = getTaskTimeInfo(task)
  
  return (
    <button key={task.id} /* ... */>
      <div>
        <div className="text-sm font-bold text-slate-900">{task.title}</div>
        <div className="mt-1 text-xs font-semibold text-slate-500">
          {task.linkedGoalLabel || '独立待办'}
        </div>
      </div>
      
      <div className="text-right text-xs font-bold">
        <div className="text-slate-500">已推进 {daysElapsed}天</div>
        <div className={urgencyColors[urgency]}>
          {daysRemaining !== null 
            ? `还剩 ${daysRemaining}天 ${urgencyIcons[urgency]}`
            : `无截止日期 ${urgencyIcons[urgency]}`
          }
        </div>
      </div>
    </button>
  )
})}
```

---

### 方案 B：进度条 + 相对时间

#### 视觉原型

```
┌─────────────────────────────────────────────────────────────┐
│ 完成项目原型设计                                            │
│ Q2 产品迭代                                                 │
│                                                               │
│ [━━━━━━●━━]  60%                      已推进3天 · 还剩2天 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 研究竞品分析报告                                            │
│ 行业研究                                                    │
│                                                               │
│ [━●━━━━━━━]  14%                      已推进1天 · 还剩6天 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 搭建测试环境                                                │
│ 技术架构                                                    │
│                                                               │
│ [━━━━━●━━━━━━━━━━━]  持续中               已推进5天      │
└─────────────────────────────────────────────────────────────┘
```

#### 代码实现

```typescript
function calculateProgress(task: Task, now = new Date()): number | null {
  if (!task.dueDate) return null
  
  const startDate = task.plannedStartAt || task.createdAt || now
  const startTime = startOfDay(startDate).getTime()
  const endTime = startOfDay(task.dueDate).getTime()
  const currentTime = startOfDay(now).getTime()
  
  if (endTime <= startTime) return 100
  
  return Math.min(100, Math.max(0, 
    Math.round(((currentTime - startTime) / (endTime - startTime)) * 100)
  ))
}

// UI 中使用
<button key={task.id} /* ... */>
  <div className="flex-1">
    <div className="text-sm font-bold text-slate-900">{task.title}</div>
    <div className="mt-1 text-xs font-semibold text-slate-500">
      {task.linkedGoalLabel || '独立待办'}
    </div>
    
    {/* 进度条 */}
    {(() => {
      const progress = calculateProgress(task)
      const { daysElapsed, daysRemaining } = getTaskTimeInfo(task)
      
      return (
        <div className="mt-2">
          {progress !== null ? (
            <>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div 
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] font-bold">
                <span className="text-indigo-600">{progress}%</span>
                <span className="text-slate-500">
                  已推进{daysElapsed}天 · 还剩{daysRemaining}天
                </span>
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-500">
              已推进 {daysElapsed}天 · 持续中
            </div>
          )}
        </div>
      )
    })()}
  </div>
</button>
```

---

### 方案 C：极简 - 只显示关键信息

#### 视觉原型

```
┌─────────────────────────────────────────────────────────────┐
│ 完成项目原型设计                                   还剩2天🔥│
│ Q2 产品迭代                                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 研究竞品分析报告                                   还剩6天 │
│ 行业研究                                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 搭建测试环境                                       第5天 ∞ │
│ 技术架构                                                    │
└─────────────────────────────────────────────────────────────┘
```

**优点**：
- 最简洁，视觉干扰最小
- 突出最关键信息：还剩多久
- 对于无截止任务，显示"第N天"保持一致性

---

## 推荐方案：方案 A

### 选择理由：

1. **信息完整性**：展示已推进 + 剩余时间，符合"持续推进"的语义
2. **视觉反馈**：通过颜色编码快速识别紧急度
3. **实现成本低**：不需要进度条动画，纯文本展示
4. **占用空间小**：两行文字，不影响现有布局

### 增强建议：

#### 1. 添加悬停提示（Tooltip）
```typescript
<div className="group relative">
  <div>还剩 2天 🔥</div>
  
  {/* Tooltip */}
  <div className="absolute right-0 top-full mt-1 hidden group-hover:block">
    <div className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
      <div>开始: 6月10日</div>
      <div>截止: 6月15日</div>
      <div>今天: 6月13日 (第3天/共5天)</div>
    </div>
  </div>
</div>
```

#### 2. 排序优化
```typescript
// 当前按开始时间排序，建议改为按紧急度排序
const ongoing = activeTasks
  .filter(/* ... */)
  .sort((a, b) => {
    const aInfo = getTaskTimeInfo(a)
    const bInfo = getTaskTimeInfo(b)
    
    // 有截止时间的优先，按剩余天数升序
    if (aInfo.daysRemaining !== null && bInfo.daysRemaining !== null) {
      return aInfo.daysRemaining - bInfo.daysRemaining
    }
    if (aInfo.daysRemaining !== null) return -1
    if (bInfo.daysRemaining !== null) return 1
    
    // 都无截止时间，按已推进天数降序（越久的越需要关注）
    return bInfo.daysElapsed - aInfo.daysElapsed
  })
```

---

## 实现清单

- [ ] 在 `taskPresentation.ts` 中添加 `getTaskTimeInfo()` 辅助函数
- [ ] 修改 `TodayView.tsx` 中的卡片右侧时间展示
- [ ] 在 `workspaceDerivation.ts` 中调整 `ongoing` 任务排序逻辑
- [ ] （可选）添加悬停提示展示完整时间线
- [ ] 更新 E2E 测试快照

---

## 边界情况处理

| 场景 | 展示逻辑 |
|------|---------|
| 今天是开始日 | "已推进 0天" |
| 今天是截止日 | "还剩 0天 🔥" |
| 无开始时间 | 使用 `createdAt` 作为起点 |
| 无截止时间 | "无截止日期 ∞" |
| 截止时间早于开始时间（异常数据） | 显示 "时间设置异常" |
| plannedStartAt 在未来 | 不应该出现在持续推进中（被过滤逻辑排除） |

---

## 与时间线的协同

**时间线（右侧面板）**：
- 展示 `plannedStartAt`，按时间点排序
- 语义：今天计划在什么时间**启动**这个任务

**持续推进（左侧主区域）**：
- 展示已推进天数 + 剩余天数
- 语义：这个任务正在**持续进行中**，提醒进度和紧迫性

**两者互补**：
- 时间线 → 关注"启动时机"
- 持续推进 → 关注"进度和剩余时间"
