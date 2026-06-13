# 活动日志时间线组件 Spec

**文档版本**: v1.0  
**创建日期**: 2026-06-14  
**状态**: 已实现 ✅

---

## 一、概述

### 1.1 组件定位

ActivityLogTimeline 是任务活动日志的可视化时间线组件，以竖向时间轴形式展示任务生命周期中的所有状态变更和备注记录。

**设计原则**：
- **时间流可视化**：竖向时间线连接各个活动节点
- **图标语义化**：不同 action 对应不同图标和颜色
- **信息层次分明**：action 标签 + 时间戳 + note 内容三层结构
- **轻量高效**：纯展示组件，无交互逻辑

---

## 二、组件结构

### 2.1 文件路径

- **组件文件**: `src/components/drawer/ActivityLogTimeline.tsx` (~49 行)
- **依赖**: `lucide-react` 图标库
- **类型定义**: `src/types/task.ts` - `TaskActivityLog`

### 2.2 Props 定义

```typescript
interface ActivityLogTimelineProps {
  logs: TaskActivityLog[]
}

// TaskActivityLog 类型
interface TaskActivityLog {
  action: TaskActivityAction
  note?: string
  timestamp: Date
}

type TaskActivityAction = 
  | 'CREATED'
  | 'STARTED'
  | 'RESUMED'
  | 'PAUSED'
  | 'COMPLETED'
  | 'NOTE_ADDED'
```

---

## 三、视觉设计

### 3.1 时间线布局

```
┌──────────────────────────────────────┐
│  ○───┬─ [Started] 2h ago            │
│  │   └─ 开始执行任务                 │
│  │                                   │
│  ○───┬─ [Paused] 1h ago             │
│  │   └─ 等待外部依赖                 │
│  │                                   │
│  ○───┬─ [Note] 30m ago              │
│  │   └─ 依赖已就绪，准备恢复         │
│  │                                   │
│  ○───┬─ [Resumed] 10m ago           │
│  ╵   └─ 继续推进                     │
└──────────────────────────────────────┘
```

### 3.2 时间线实现

```tsx
<div className="relative space-y-6 before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
  {logs.map(log => (
    <div className="relative flex items-start gap-4">
      {/* 节点圆点 */}
      <div className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white">
        {iconForAction(log.action)}
      </div>
      
      {/* 内容卡片 */}
      <div className="flex-1 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold">{labelMap[log.action]}</span>
          <span className="text-[10px]">{log.timestamp.toLocaleString('zh-CN')}</span>
        </div>
        <p className="text-xs">{log.note || '状态已更新。'}</p>
      </div>
    </div>
  ))}
</div>
```

**关键 CSS**：
- `before:` 伪元素绘制时间线（渐变灰色竖线）
- `ml-[11px]` 和 `-translate-x-px` 精确定位线条与圆点中心对齐
- `z-10` 确保圆点覆盖时间线
- `space-y-6` 节点间距 24px

---

## 四、图标映射

### 4.1 iconForAction 函数

```typescript
function iconForAction(action: TaskActivityLog['action']) {
  switch (action) {
    case 'PAUSED':
      return <Pause className="h-3 w-3 fill-current" />
    case 'STARTED':
    case 'RESUMED':
      return <Play className="h-3 w-3 fill-current" />
    case 'COMPLETED':
      return <CheckCircle2 className="h-3 w-3" />
    case 'NOTE_ADDED':
      return <NotebookPen className="h-3 w-3" />
    default:
      return <Activity className="h-3 w-3" />
  }
}
```

### 4.2 图标语义表

| Action | 图标 | lucide-react 组件 | 语义 |
|--------|-----|------------------|-----|
| `STARTED` / `RESUMED` | ▶️ | `Play` | 开始执行 |
| `PAUSED` | ⏸ | `Pause` | 暂停 |
| `COMPLETED` | ✅ | `CheckCircle2` | 完成 |
| `NOTE_ADDED` | 📝 | `NotebookPen` | 添加备注 |
| `CREATED` / 其它 | ⚡ | `Activity` | 通用活动 |

**图标尺寸**：
- `h-3 w-3` (12px × 12px)
- `fill-current` 填充图标（Play/Pause 需要）

---

## 五、文案映射

### 5.1 labelMap 对象

```typescript
const labelMap: Record<TaskActivityLog['action'], string> = {
  CREATED: 'Created',
  STARTED: 'Started',
  PAUSED: 'Paused',
  RESUMED: 'Resumed',
  COMPLETED: 'Completed',
  NOTE_ADDED: 'Note',
}
```

**显示位置**：内容卡片左上角

### 5.2 时间戳格式化

```typescript
log.timestamp.toLocaleString('zh-CN')
// 输出: "2026/6/14 14:30:25"
```

**可选优化**（未实现）：
- 相对时间："2 小时前"、"昨天 14:30"
- 今日省略日期："14:30"
- 实现参考：`date-fns` 的 `formatRelative()`

---

## 六、空状态处理

### 6.1 空日志渲染

```typescript
{logs.length === 0 && (
  <div className="py-6 text-center text-sm text-slate-400">
    还没有活动记录
  </div>
)}
```

**注意**：当前实现未处理空状态，直接渲染空数组不显示任何内容。建议添加空状态提示。

### 6.2 默认 note

```typescript
<p>{log.note || '状态已更新。'}</p>
```

**行为**：
- 如果 `log.note` 为空字符串或 undefined，显示"状态已更新。"
- 避免内容区域空白

---

## 七、使用场景

### 7.1 TaskDrawer 中使用

```typescript
// src/components/drawer/TaskDrawer.tsx
<div className="activity-section">
  <h3>ACTIVITY & UPDATES</h3>
  <ActivityLogTimeline logs={task.activityLogs} />
  
  {/* 添加新记录输入框 */}
  <textarea placeholder="添加进度记录..." />
</div>
```

**集成方式**：
- 直接传入 `task.activityLogs` 数组
- 组件负责渲染，父组件负责数据管理

### 7.2 日志数据来源

```typescript
// 状态转换时自动生成
updateTaskStatus(taskId, 'PAUSED', '等待外部依赖')
  ↓
activityLogs: [
  {
    action: 'PAUSED',
    note: '等待外部依赖',
    timestamp: new Date(),
  },
  ...existingLogs,
]
```

**时间顺序**：
- 新日志插入数组头部（最新在上）
- 渲染时按数组顺序显示

---

## 八、设计决策（ADR）

### ADR-001: 竖向时间线而非横向

**决策**: 使用竖向（从上到下）时间线布局

**理由**：
- ✅ 符合时间流向下阅读的直觉
- ✅ 适应抽屉的纵向滚动（横向时间线需要横向滚动）
- ✅ 内容卡片可以自适应宽度，容纳更多文本

**代价**：
- ❌ 占用更多垂直空间
- 接受：抽屉本身就是垂直滚动容器

### ADR-002: 伪元素绘制时间线

**决策**: 使用 `before:` 伪元素绘制竖线，而非真实 DOM 元素

**理由**：
- ✅ 减少 DOM 节点数量
- ✅ 简化 HTML 结构
- ✅ CSS 渐变实现上下淡出效果

**代价**：
- ❌ 定位计算需要精确（`ml-[11px]` 等魔数）
- 接受：封装在组件内部，维护成本可控

### ADR-003: 图标填充当前色

**决策**: Play/Pause 图标使用 `fill-current`，CheckCircle2 不填充

**理由**：
- ✅ Play/Pause 填充后视觉更清晰（三角形/竖线）
- ✅ CheckCircle2 默认有描边，无需填充
- ✅ 保持图标风格一致性

**代价**：
- ❌ 需要记住哪些图标填充
- 接受：图标数量少，封装在函数内

### ADR-004: 英文 label 而非中文

**决策**: labelMap 使用英文标签（"Started"、"Paused"）

**理由**：
- ✅ 技术术语用英文更简洁（"Started" vs "已开始"）
- ✅ 与代码中的 action 枚举对应
- ✅ 国际化扩展性更好

**代价**：
- ❌ 中文用户需要理解英文
- 接受：都是基础词汇，易于理解

---

## 九、性能优化

### 9.1 Key 策略

```typescript
key={`${log.action}-${log.timestamp.toISOString()}-${index}`}
```

**组合 Key**：
- `log.action` - 区分不同类型活动
- `log.timestamp` - 时间戳唯一性
- `index` - 防止同一毫秒内多条日志冲突

**避免**：
- ❌ 只用 `index` 作为 key（数组顺序变化时 React 无法正确复用）
- ❌ 只用 `log.action` 作为 key（重复 action 冲突）

### 9.2 避免不必要的重渲染

```typescript
// 父组件
const logs = useMemo(() => task.activityLogs, [task.activityLogs])

<ActivityLogTimeline logs={logs} />
```

**优化点**：
- ActivityLogTimeline 是纯展示组件，无内部状态
- 如果 `logs` 引用不变，React.memo 可避免重渲染
- 当前未使用 React.memo（性能影响小，日志数量通常不超过 20 条）

---

## 十、可访问性

### 10.1 语义化 HTML

```typescript
<div role="list" aria-label="任务活动日志">
  {logs.map(log => (
    <div role="listitem">
      {/* ... */}
    </div>
  ))}
</div>
```

**建议改进**：
- 添加 `role="list"` 和 `role="listitem"`
- 添加 `aria-label` 描述时间线用途
- 时间戳使用 `<time datetime="...">`

### 10.2 屏幕阅读器支持

```typescript
<time dateTime={log.timestamp.toISOString()}>
  {log.timestamp.toLocaleString('zh-CN')}
</time>
```

**改进**：
- 使用 `<time>` 标签包裹时间戳
- `dateTime` 属性提供机器可读格式

---

## 十一、测试策略

### 11.1 单元测试

```typescript
// ActivityLogTimeline.test.tsx
import { render, screen } from '@testing-library/react'
import { ActivityLogTimeline } from './ActivityLogTimeline'

test('renders all activity logs', () => {
  const logs = [
    { action: 'STARTED', note: 'Begin work', timestamp: new Date('2026-06-14T09:00:00') },
    { action: 'PAUSED', note: 'Waiting', timestamp: new Date('2026-06-14T10:00:00') },
  ]
  
  render(<ActivityLogTimeline logs={logs} />)
  
  expect(screen.getByText('Started')).toBeInTheDocument()
  expect(screen.getByText('Paused')).toBeInTheDocument()
  expect(screen.getByText('Begin work')).toBeInTheDocument()
  expect(screen.getByText('Waiting')).toBeInTheDocument()
})

test('shows default note when log.note is empty', () => {
  const logs = [
    { action: 'COMPLETED', timestamp: new Date() },
  ]
  
  render(<ActivityLogTimeline logs={logs} />)
  
  expect(screen.getByText('状态已更新。')).toBeInTheDocument()
})

test('renders correct icon for each action', () => {
  const logs = [
    { action: 'STARTED', timestamp: new Date() },
    { action: 'PAUSED', timestamp: new Date() },
  ]
  
  const { container } = render(<ActivityLogTimeline logs={logs} />)
  
  // 检查图标是否渲染
  expect(container.querySelector('svg')).toBeInTheDocument()
})
```

### 11.2 视觉回归测试

**快照测试**：
```typescript
test('matches snapshot', () => {
  const logs = [
    { action: 'STARTED', note: 'Test', timestamp: new Date('2026-06-14T09:00:00') },
  ]
  
  const { container } = render(<ActivityLogTimeline logs={logs} />)
  expect(container.firstChild).toMatchSnapshot()
})
```

---

## 十二、未来优化

### 12.1 短期优化（1-2 周）

- [ ] **相对时间显示**：2 小时前、昨天 14:30
- [ ] **空状态提示**：logs.length === 0 时显示占位内容
- [ ] **可访问性改进**：添加 ARIA 标签和 `<time>` 标签

### 12.2 中期迭代（1-2 月）

- [ ] **折叠/展开**：超过 10 条日志时折叠旧记录
- [ ] **筛选功能**：按 action 类型筛选（只看 NOTE_ADDED）
- [ ] **图标动画**：节点圆点 hover 时放大

### 12.3 长期愿景（3-6 月）

- [ ] **富文本 note**：支持 Markdown 渲染
- [ ] **附件支持**：图片、文件链接
- [ ] **协作者显示**：多人编辑时显示操作者头像

---

## 十三、相关资源

### 文档
- [TaskDrawer Spec](./task-drawer.md)
- [Task 状态机 Spec](./task-state-machine.md)

### 代码
- [`src/components/drawer/ActivityLogTimeline.tsx`](../../src/components/drawer/ActivityLogTimeline.tsx)
- [`src/types/task.ts`](../../src/types/task.ts) - `TaskActivityLog` 类型定义

### 依赖库
- [lucide-react](https://lucide.dev/) - 图标库
- [Tailwind CSS](https://tailwindcss.com/) - 样式框架

---

**文档维护者**: Goal Desk 开发团队  
**最后更新**: 2026-06-14