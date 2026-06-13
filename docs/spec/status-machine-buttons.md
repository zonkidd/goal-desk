# StatusMachineButtons 组件 Spec

**文档版本**: v1.0  
**创建日期**: 2026-06-14  
**状态**: 已实现 ✅

---

## 一、概述

### 1.1 组件定位

StatusMachineButtons 是任务状态转换按钮组，根据当前任务状态动态显示可执行的操作按钮（Start/Resume、Pause、Complete）。

**设计原则**：
- **状态机驱动**：按钮显示由任务状态机规则决定
- **视觉强调**：主要操作按钮（Start/Resume）使用高亮样式
- **动画反馈**：图标随状态变化缩放，提供视觉反馈
- **语义化文案**：动态文案反映当前状态（Start vs Resume）

---

## 二、组件结构

### 2.1 文件路径

- **组件文件**: `src/components/drawer/StatusMachineButtons.tsx` (~55 行)
- **依赖图标**: `lucide-react` - PlayCircle, PauseCircle, CheckCircle2
- **依赖工具**: `src/lib/cn.ts` - className 合并
- **文案函数**: `src/lib/taskPresentation.ts` - `getTaskPrimaryStatusLabel()`

### 2.2 Props 定义

```typescript
interface StatusMachineButtonsProps {
  status: TaskStatus                      // 当前任务状态
  statusActions: TaskStatus[]             // 可执行的状态转换列表
  onAction: (next: TaskStatus) => void    // 状态转换回调
}

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'PAUSED' | 'DONE'
```

**说明**：
- `statusActions` 由父组件（TaskDrawer）通过状态机规则计算
- `onAction` 触发时父组件负责弹出输入框（如 Pause 需要填写原因）

---

## 三、按钮显示规则

### 3.1 状态机映射表

| 当前状态 (`status`) | 可执行操作 (`statusActions`) | 显示的按钮 |
|---------------------|----------------------------|----------|
| `TODO` | `['IN_PROGRESS', 'DONE']` | **Start** (高亮) + Complete |
| `IN_PROGRESS` | `['PAUSED', 'DONE']` | **Pause** (高亮) + Complete |
| `PAUSED` | `['IN_PROGRESS', 'DONE']` | **Resume** (高亮) + Complete |
| `DONE` | `[]` | 不显示按钮 |

**规则来源**：`src/lib/taskStateMachine.ts` - `nextAllowedStatuses()`

### 3.2 按钮渲染逻辑

```typescript
export function StatusMachineButtons({ status, statusActions, onAction }: StatusMachineButtonsProps) {
  if (statusActions.length === 0) return null  // 已完成任务不显示按钮

  return (
    <div className="flex items-center gap-3">
      {/* Start/Resume 按钮 */}
      {statusActions.includes('IN_PROGRESS') && (
        <button onClick={() => onAction('IN_PROGRESS')}>
          <PlayCircle />
          {getTaskPrimaryStatusLabel(status)}
        </button>
      )}
      
      {/* Pause 按钮 */}
      {statusActions.includes('PAUSED') && (
        <button onClick={() => onAction('PAUSED')}>
          <PauseCircle />
          Pause
        </button>
      )}
      
      {/* Complete 按钮 */}
      {statusActions.includes('DONE') && (
        <button onClick={() => onAction('DONE')}>
          <CheckCircle2 />
          Complete
        </button>
      )}
    </div>
  )
}
```

---

## 四、视觉设计

### 4.1 Start/Resume 按钮（主要操作）

```typescript
className={cn(
  'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-bold shadow-sm transition-all duration-200',
  status === 'TODO'
    ? 'border-indigo-300 bg-indigo-50 text-indigo-700 shadow-indigo-100'  // TODO 状态高亮
    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300',  // PAUSED 状态常规
)}
```

**设计意图**：
- **TODO → Start**：靛蓝色高亮背景，强调"开始执行"是首要操作
- **PAUSED → Resume**：白色背景，降低视觉优先级（恢复不如开始紧急）

**图标动画**：
```typescript
<PlayCircle className={cn(
  'h-5 w-5 transition-transform duration-200',
  status === 'PAUSED' && 'scale-110'  // PAUSED 状态图标放大
)} />
```

### 4.2 Pause 按钮（次要操作）

```typescript
className={cn(
  'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all duration-200',
  status === 'IN_PROGRESS'
    ? 'bg-amber-100 text-amber-700 shadow-amber-100 shadow-sm scale-105'  // 进行中时高亮
    : 'bg-white border border-amber-200 text-amber-600 hover:bg-amber-50',  // 默认状态
)}
```

**颜色语义**：
- 琥珀色（Amber）表示"警告/暂停"
- `scale-105` 当任务进行中时按钮略微放大，提示可暂停

**图标动画**：
```typescript
<PauseCircle className={cn(
  'h-5 w-5 transition-transform duration-200',
  status === 'IN_PROGRESS' && 'scale-110'  // 进行中时图标放大
)} />
```

### 4.3 Complete 按钮（完成操作）

```typescript
className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-emerald-600 transition-all duration-200 hover:bg-emerald-50"
```

**颜色语义**：
- 翡翠绿（Emerald）表示"成功/完成"
- 白色背景，边框样式，避免过于突出

---

## 五、文案动态化

### 5.1 getTaskPrimaryStatusLabel 函数

```typescript
// src/lib/taskPresentation.ts
export function getTaskPrimaryStatusLabel(status: TaskStatus): string {
  switch (status) {
    case 'TODO':
      return 'Start'
    case 'PAUSED':
      return 'Resume'
    case 'IN_PROGRESS':
      return 'Continue'  // 理论上不会显示，因为进行中显示 Pause
    case 'DONE':
      return 'Reopen'    // 理论上不会显示，因为已完成不显示按钮
  }
}
```

**动态文案**：
- `TODO` → "**Start**" - 开始执行
- `PAUSED` → "**Resume**" - 恢复执行
- 其他状态不调用此函数

---

## 六、交互流程

### 6.1 Start 操作流程

```
1. 用户点击 "Start" 按钮
   ↓
2. 触发 onAction('IN_PROGRESS')
   ↓
3. TaskDrawer 处理：
   - 调用 updateTaskStatus(taskId, 'IN_PROGRESS')
   ↓
4. 后端/状态更新：
   - task.status = 'IN_PROGRESS'
   - activityLogs 插入 { action: 'STARTED', timestamp: now }
   ↓
5. UI 更新：
   - StatusMachineButtons 重新渲染
   - 显示 "Pause" 和 "Complete" 按钮
   - Start 按钮消失
```

### 6.2 Pause 操作流程

```
1. 用户点击 "Pause" 按钮
   ↓
2. 触发 onAction('PAUSED')
   ↓
3. TaskDrawer 处理：
   - 弹出输入框："为什么暂停？"
   - 用户输入原因："等待外部依赖"
   - 调用 updateTaskStatus(taskId, 'PAUSED', '等待外部依赖')
   ↓
4. 后端/状态更新：
   - task.status = 'PAUSED'
   - activityLogs 插入 { action: 'PAUSED', note: '等待外部依赖', timestamp: now }
   ↓
5. UI 更新：
   - StatusMachineButtons 重新渲染
   - 显示 "Resume" 和 "Complete" 按钮
   - Pause 按钮消失
```

### 6.3 Complete 操作流程

```
1. 用户点击 "Complete" 按钮
   ↓
2. 触发 onAction('DONE')
   ↓
3. TaskDrawer 处理：
   - （可选）弹出输入框："完成总结"
   - 调用 updateTaskStatus(taskId, 'DONE', note)
   ↓
4. 后端/状态更新：
   - task.status = 'DONE'
   - activityLogs 插入 { action: 'COMPLETED', note, timestamp: now }
   ↓
5. UI 更新：
   - StatusMachineButtons 返回 null（不显示按钮）
   - TaskDrawer 显示完成状态
```

---

## 七、使用场景

### 7.1 TaskDrawer 中使用

```typescript
// src/components/drawer/TaskDrawer.tsx
const statusActions = nextAllowedStatuses(task.status)  // 从状态机获取可执行操作

<StatusMachineButtons
  status={task.status}
  statusActions={statusActions}
  onAction={(nextStatus) => {
    if (nextStatus === 'PAUSED') {
      // 弹出输入框
      const reason = prompt('为什么暂停？')
      void updateTaskStatus(task.id, nextStatus, reason)
    } else {
      void updateTaskStatus(task.id, nextStatus)
    }
  }}
/>
```

**集成方式**：
- TaskDrawer 负责业务逻辑（弹窗、API 调用）
- StatusMachineButtons 只负责 UI 渲染和事件触发

---

## 八、设计决策（ADR）

### ADR-001: 按钮组而非下拉菜单

**决策**: 使用水平排列的按钮组，而非下拉菜单选择状态

**理由**：
- ✅ 一次性展示所有可选操作，减少点击次数
- ✅ 视觉优先级明确（主要/次要操作）
- ✅ 符合"快速操作"的设计目标

**代价**：
- ❌ 占用更多横向空间
- 接受：TaskDrawer 宽度足够（600px），按钮数量固定（最多 2-3 个）

### ADR-002: 动态文案（Start vs Resume）

**决策**: Start/Resume 按钮文案根据当前状态动态变化

**理由**：
- ✅ 语义准确（"开始"和"恢复"是不同的操作）
- ✅ 帮助用户理解当前状态
- ✅ 符合任务状态机的语义

**代价**：
- ❌ 需要额外的文案映射函数
- 接受：函数逻辑简单（switch-case），性能无影响

### ADR-003: 主要操作高亮

**决策**: TODO 状态下 Start 按钮使用靛蓝色高亮背景

**理由**：
- ✅ 强调"开始执行"是 TODO 状态的首要操作
- ✅ 视觉引导用户立即行动
- ✅ 符合 CTA（Call To Action）设计模式

**代价**：
- ❌ 颜色过于突出可能分散注意力
- 接受：只在 TODO 状态高亮，其他状态降低优先级

### ADR-004: 图标动画

**决策**: 图标根据当前状态动态缩放（`scale-110`）

**理由**：
- ✅ 提供微妙的视觉反馈
- ✅ 吸引用户注意可执行操作
- ✅ 增强界面活力

**代价**：
- ❌ 过度使用动画可能显得不专业
- 接受：只在按钮 hover 和状态变化时动画，频率可控

---

## 九、状态机集成

### 9.1 nextAllowedStatuses 函数

```typescript
// src/lib/taskStateMachine.ts
export function nextAllowedStatuses(current: TaskStatus): TaskStatus[] {
  switch (current) {
    case 'TODO':
      return ['IN_PROGRESS', 'DONE']
    case 'IN_PROGRESS':
      return ['PAUSED', 'DONE']
    case 'PAUSED':
      return ['IN_PROGRESS', 'DONE']
    case 'DONE':
      return []  // 已完成不允许转换
  }
}
```

**StatusMachineButtons 依赖此函数**：
- 父组件调用 `nextAllowedStatuses(task.status)` 获取 `statusActions`
- 传递给 StatusMachineButtons 作为 props
- 按钮组根据 `statusActions` 决定显示哪些按钮

### 9.2 状态机保护

```typescript
// 后端校验（src-tauri/src/domain.rs）
impl Task {
  pub fn can_transition_to(&self, next: TaskStatus) -> bool {
    match (&self.status, &next) {
      (TaskStatus::TODO, TaskStatus::IN_PROGRESS) => true,
      (TaskStatus::TODO, TaskStatus::DONE) => true,
      (TaskStatus::IN_PROGRESS, TaskStatus::PAUSED) => true,
      (TaskStatus::IN_PROGRESS, TaskStatus::DONE) => true,
      (TaskStatus::PAUSED, TaskStatus::IN_PROGRESS) => true,
      (TaskStatus::PAUSED, TaskStatus::DONE) => true,
      _ => false,
    }
  }
}
```

**双重保护**：
- 前端：StatusMachineButtons 只显示允许的按钮
- 后端：Task::can_transition_to() 拒绝非法转换

---

## 十、可访问性

### 10.1 键盘导航

```typescript
<button
  onClick={() => onAction('IN_PROGRESS')}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onAction('IN_PROGRESS')
    }
  }}
>
```

**建议改进**：
- 添加 `tabIndex` 确保键盘可访问
- 添加 `aria-label` 描述按钮用途

### 10.2 ARIA 属性

```typescript
<button
  aria-label={`将任务状态更改为 ${nextStatus}`}
  aria-describedby="status-help-text"
>
```

**建议改进**：
- 添加 `role="group"` 到按钮组容器
- 添加 `aria-label="任务状态操作"` 到容器

---

## 十一、测试策略

### 11.1 单元测试

```typescript
// StatusMachineButtons.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { StatusMachineButtons } from './StatusMachineButtons'

test('renders Start button for TODO status', () => {
  const onAction = vi.fn()
  render(
    <StatusMachineButtons
      status="TODO"
      statusActions={['IN_PROGRESS', 'DONE']}
      onAction={onAction}
    />
  )
  
  expect(screen.getByText('Start')).toBeInTheDocument()
  expect(screen.getByText('Complete')).toBeInTheDocument()
  expect(screen.queryByText('Pause')).not.toBeInTheDocument()
})

test('calls onAction when Start button clicked', () => {
  const onAction = vi.fn()
  render(
    <StatusMachineButtons
      status="TODO"
      statusActions={['IN_PROGRESS', 'DONE']}
      onAction={onAction}
    />
  )
  
  fireEvent.click(screen.getByText('Start'))
  
  expect(onAction).toHaveBeenCalledWith('IN_PROGRESS')
})

test('renders Resume button for PAUSED status', () => {
  render(
    <StatusMachineButtons
      status="PAUSED"
      statusActions={['IN_PROGRESS', 'DONE']}
      onAction={() => {}}
    />
  )
  
  expect(screen.getByText('Resume')).toBeInTheDocument()
})

test('renders no buttons for DONE status', () => {
  const { container } = render(
    <StatusMachineButtons
      status="DONE"
      statusActions={[]}
      onAction={() => {}}
    />
  )
  
  expect(container.firstChild).toBeNull()
})

test('renders Pause and Complete for IN_PROGRESS status', () => {
  render(
    <StatusMachineButtons
      status="IN_PROGRESS"
      statusActions={['PAUSED', 'DONE']}
      onAction={() => {}}
    />
  )
  
  expect(screen.getByText('Pause')).toBeInTheDocument()
  expect(screen.getByText('Complete')).toBeInTheDocument()
  expect(screen.queryByText('Start')).not.toBeInTheDocument()
})
```

### 11.2 集成测试

```typescript
// tests/e2e/task-status-flow.test.ts
test('full task status flow: TODO → IN_PROGRESS → PAUSED → IN_PROGRESS → DONE', async ({ page }) => {
  await page.goto('http://localhost:1420')
  
  // 创建任务
  await page.fill('input[placeholder*="快速添加"]', 'Test task')
  await page.keyboard.press('Enter')
  
  // 打开 TaskDrawer
  await page.click('text=Test task')
  
  // TODO → IN_PROGRESS
  await page.click('button:has-text("Start")')
  await expect(page.locator('button:has-text("Pause")')).toBeVisible()
  
  // IN_PROGRESS → PAUSED
  await page.click('button:has-text("Pause")')
  await page.fill('input[placeholder*="暂停原因"]', 'Need review')
  await page.keyboard.press('Enter')
  await expect(page.locator('button:has-text("Resume")')).toBeVisible()
  
  // PAUSED → IN_PROGRESS
  await page.click('button:has-text("Resume")')
  await expect(page.locator('button:has-text("Pause")')).toBeVisible()
  
  // IN_PROGRESS → DONE
  await page.click('button:has-text("Complete")')
  await expect(page.locator('button:has-text("Start")')).not.toBeVisible()
})
```

---

## 十二、性能优化

### 12.1 避免不必要的重渲染

```typescript
import { memo } from 'react'

export const StatusMachineButtons = memo(function StatusMachineButtons({
  status,
  statusActions,
  onAction,
}: StatusMachineButtonsProps) {
  // ...
})
```

**优化点**：
- 使用 React.memo 包裹组件
- 只有 props 变化时才重渲染
- `onAction` 应使用 useCallback 在父组件中包裹

### 12.2 CSS 动画性能

```css
/* 使用 transform 而非 width/height */
.button-icon {
  transition: transform 200ms ease-out;
}

.button-icon.scale-up {
  transform: scale(1.1);  /* GPU 加速 */
}
```

**优化策略**：
- `transform` 和 `opacity` 由 GPU 加速
- 避免动画 `width`、`height`、`margin` 等会触发重排的属性

---

## 十三、相关资源

### 文档
- [Task 状态机 Spec](./task-state-machine.md)
- [TaskDrawer Spec](./task-drawer.md)

### 代码
- [`src/components/drawer/StatusMachineButtons.tsx`](../../src/components/drawer/StatusMachineButtons.tsx)
- [`src/lib/taskStateMachine.ts`](../../src/lib/taskStateMachine.ts)
- [`src/lib/taskPresentation.ts`](../../src/lib/taskPresentation.ts)

### 依赖库
- [lucide-react](https://lucide.dev/) - 图标库

---

**文档维护者**: Goal Desk 开发团队  
**最后更新**: 2026-06-14
