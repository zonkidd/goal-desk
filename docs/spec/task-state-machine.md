# Task 状态机系统 Spec

**文档版本**: v1.0  
**创建日期**: 2026-06-14  
**状态**: 已实现 ✅

---

## 一、概述

### 1.1 系统定位

Task 状态机系统定义了任务（Desk Task）在生命周期中的所有可能状态及其转换规则。这是 Goal Desk 任务管理的核心业务逻辑，确保任务状态变更的合法性和可追溯性。

**设计原则**：
- **有限状态机（FSM）**：明确定义所有状态和转换路径
- **单向流动**：任务从创建到完成，不可逆（除 PAUSED ↔ IN_PROGRESS）
- **活动日志**：每次状态转换生成活动记录，可追溯
- **前后端一致**：Rust domain 层和 TypeScript 共享状态机规则

---

## 二、状态定义

### 2.1 状态枚举

```typescript
// src/types/task.ts
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'PAUSED' | 'DONE'
```

```rust
// src-tauri/src/domain.rs
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TaskStatus {
    Todo,
    InProgress,
    Paused,
    Done,
}
```

### 2.2 状态语义

| 状态 | 中文 | 语义 | 用户可见描述 |
|------|------|------|------------|
| `TODO` | 计划中 | 任务已创建，尚未开始执行 | 等待开始 |
| `IN_PROGRESS` | 进行中 | 任务正在执行，占用用户精力 | 正在推进 |
| `PAUSED` | 已暂停 | 任务暂时搁置，等待恢复 | 暂时中断 |
| `DONE` | 已完成 | 任务已完成，不再变更 | 已完成 ✅ |

### 2.3 状态颜色编码

| 状态 | 视觉标识 | 颜色 | Tailwind Class |
|------|---------|------|---------------|
| `TODO` | ☐ 空心方框 | 灰色 | `border-slate-300` |
| `IN_PROGRESS` | ▶ 蓝色圆点 | 靛蓝 | `bg-indigo-500` |
| `PAUSED` | ⏸ 暂停图标 | 琥珀 | `bg-amber-500` |
| `DONE` | ✅ 对勾 | 绿色 | `bg-emerald-500` |

---

## 三、状态转换规则

### 3.1 转换图（State Diagram）

```
         ┌─────────────────────────────────┐
         │         创建任务                  │
         └──────────────┬──────────────────┘
                        ↓
                    ┌───────┐
                    │ TODO  │
                    └───┬───┘
                        │
                   Start│
                        ↓
                 ┌─────────────┐
          ┌──────│ IN_PROGRESS │──────┐
          │      └─────────────┘      │
       Resume                       Pause
          │                            │
          ↓                            ↓
      ┌────────┐                  ┌────────┐
      │ PAUSED │                  │ PAUSED │
      └────┬───┘                  └────┬───┘
           │                            │
           └─────────Resume─────────────┘
                        │
                   Complete
                        ↓
                    ┌──────┐
                    │ DONE │ (终态)
                    └──────┘
```

### 3.2 合法转换表

| 当前状态 | 允许转换到 | 转换动作 | 活动日志 Action |
|---------|-----------|---------|----------------|
| `TODO` | `IN_PROGRESS` | Start | `STARTED` |
| `TODO` | `DONE` | Complete | `COMPLETED` |
| `IN_PROGRESS` | `PAUSED` | Pause | `PAUSED` |
| `IN_PROGRESS` | `DONE` | Complete | `COMPLETED` |
| `PAUSED` | `IN_PROGRESS` | Resume | `RESUMED` |
| `PAUSED` | `DONE` | Complete | `COMPLETED` |
| `DONE` | - | （终态，不可转换） | - |

### 3.3 实现逻辑

#### TypeScript 实现（前端）

```typescript
// src/lib/taskStateMachine.ts
export function getValidTransitions(status: TaskStatus): TaskStatus[] {
  switch (status) {
    case 'TODO':
      return ['IN_PROGRESS', 'DONE']
    case 'IN_PROGRESS':
      return ['PAUSED', 'DONE']
    case 'PAUSED':
      return ['IN_PROGRESS', 'DONE']
    case 'DONE':
      return []  // 终态
    default:
      return []
  }
}

export function getTransitionAction(
  fromStatus: TaskStatus, 
  toStatus: TaskStatus
): TaskActivityAction {
  if (toStatus === 'IN_PROGRESS') {
    return fromStatus === 'PAUSED' ? 'RESUMED' : 'STARTED'
  }
  if (toStatus === 'PAUSED') return 'PAUSED'
  if (toStatus === 'DONE') return 'COMPLETED'
  return 'NOTE_ADDED'
}
```

#### Rust 实现（后端）

```rust
// src-tauri/src/domain.rs
impl DeskTask {
    pub fn can_transition_to(&self, new_status: TaskStatus) -> bool {
        match (&self.status, &new_status) {
            (TaskStatus::Todo, TaskStatus::InProgress) => true,
            (TaskStatus::Todo, TaskStatus::Done) => true,
            (TaskStatus::InProgress, TaskStatus::Paused) => true,
            (TaskStatus::InProgress, TaskStatus::Done) => true,
            (TaskStatus::Paused, TaskStatus::InProgress) => true,
            (TaskStatus::Paused, TaskStatus::Done) => true,
            (TaskStatus::Done, _) => false,  // 终态
            _ => false,
        }
    }
}
```

---

## 四、活动日志系统

### 4.1 活动日志结构

```typescript
// src/types/task.ts
export interface TaskActivityLog {
  action: TaskActivityAction
  note?: string
  timestamp: Date
}

export type TaskActivityAction = 
  | 'STARTED'      // 从 TODO 开始
  | 'RESUMED'      // 从 PAUSED 恢复
  | 'PAUSED'       // 暂停
  | 'COMPLETED'    // 完成
  | 'NOTE_ADDED'   // 添加备注（不改变状态）
```

### 4.2 日志记录规则

| 转换 | 日志 Action | 是否必须记录 Note |
|------|------------|-----------------|
| TODO → IN_PROGRESS | `STARTED` | 可选（开始说明） |
| IN_PROGRESS → PAUSED | `PAUSED` | **推荐**（暂停原因） |
| PAUSED → IN_PROGRESS | `RESUMED` | 可选（恢复说明） |
| * → DONE | `COMPLETED` | **推荐**（完成总结） |
| 任意状态 | `NOTE_ADDED` | **必须**（添加备注） |

**设计意图**：
- **暂停原因**：帮助用户回忆上下文（"为什么当时暂停？"）
- **完成总结**：记录任务成果或心得
- **开始/恢复说明**：可选，用于记录执行计划

### 4.3 活动日志在 UI 中的展示

#### Inbox 任务卡片
```tsx
// 暂停任务显示暂停原因
{task.status === 'PAUSED' && (
  <PauseReason>
    暂停原因: {task.activityLogs.find(log => log.action === 'PAUSED')?.note || '等待恢复'}
  </PauseReason>
)}

// 完成任务显示完成记录
{task.status === 'DONE' && (
  <CompletionNote>
    完成记录: {task.activityLogs.find(log => log.action === 'COMPLETED')?.note || '已完成'}
  </CompletionNote>
)}
```

#### TaskDrawer 活动时间线
```tsx
// src/components/drawer/ActivityLogTimeline.tsx
<Timeline>
  {task.activityLogs.map((log) => (
    <TimelineItem>
      <ActionIcon action={log.action} />
      <ActionLabel>{getActionLabel(log.action)}</ActionLabel>
      <Timestamp>{formatTimestamp(log.timestamp)}</Timestamp>
      {log.note && <Note>{log.note}</Note>}
    </TimelineItem>
  ))}
</Timeline>
```

---

## 五、状态机按钮组件

### 5.1 StatusMachineButtons 组件

```tsx
// src/components/drawer/StatusMachineButtons.tsx
interface StatusMachineButtonsProps {
  status: TaskStatus
  statusActions: Array<{ toStatus: TaskStatus; label: string; icon: LucideIcon }>
  onAction: (toStatus: TaskStatus) => void
}

export function StatusMachineButtons({ status, statusActions, onAction }: StatusMachineButtonsProps) {
  return (
    <div className="flex gap-2">
      {statusActions.map((action) => {
        const Icon = action.icon
        const isActive = status === action.toStatus
        return (
          <button
            key={action.toStatus}
            onClick={() => onAction(action.toStatus)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black ${
              isActive
                ? 'bg-slate-900 text-white shadow-lg'
                : 'border border-slate-200 bg-white text-slate-500'
            }`}
          >
            <Icon className="h-4 w-4" />
            {action.label}
          </button>
        )
      })}
    </div>
  )
}
```

### 5.2 按钮配置

```typescript
// 根据当前状态动态生成可用按钮
const statusActions = useMemo(() => {
  const validTransitions = getValidTransitions(task.status)
  return validTransitions.map((toStatus) => ({
    toStatus,
    label: getTransitionLabel(toStatus),
    icon: getTransitionIcon(toStatus)
  }))
}, [task.status])

function getTransitionLabel(toStatus: TaskStatus): string {
  switch (toStatus) {
    case 'IN_PROGRESS':
      return task.status === 'PAUSED' ? 'Resume' : 'Start'
    case 'PAUSED':
      return 'Pause'
    case 'DONE':
      return 'Complete'
    default:
      return ''
  }
}

function getTransitionIcon(toStatus: TaskStatus): LucideIcon {
  switch (toStatus) {
    case 'IN_PROGRESS':
      return task.status === 'PAUSED' ? Play : ArrowRight
    case 'PAUSED':
      return Pause
    case 'DONE':
      return CheckCircle2
    default:
      return Clock
  }
}
```

### 5.3 状态转换流程

```
1. 用户在 TaskDrawer 中点击 "Pause" 按钮
   ↓
2. 触发 onAction('PAUSED')
   ↓
3. TaskDrawer 显示输入框："记录一下暂停原因"
   ↓
4. 用户输入 "等待服务器资源" + Enter
   ↓
5. 调用 updateTaskStatus(taskId, 'PAUSED', '等待服务器资源')
   ↓
6. Tauri command 或浏览器 store action 执行：
   - 更新 task.status = 'PAUSED'
   - 添加活动日志：{ action: 'PAUSED', note: '等待服务器资源', timestamp: now }
   ↓
7. 派生状态重新计算（Inbox 分组、Today 持续推进）
   ↓
8. UI 更新：
   - TaskDrawer 按钮变为 "Resume" 和 "Complete"
   - Inbox 中任务移动到 "PAUSED" 分组
   - 卡片显示左侧琥珀色边框和暂停原因
```

---

## 六、设计决策（ADR）

### ADR-001: DONE 状态为终态

**决策**: 任务完成后不可再变更状态

**理由**:
- ✅ 简化状态机复杂度
- ✅ 完成任务代表"结果已产出"，不应撤销
- ✅ 避免"完成-未完成"循环导致的数据混乱

**代价**:
- ❌ 误标记为完成的任务无法恢复
- 缓解：删除任务重新创建，或在活动日志中添加备注说明

### ADR-002: PAUSED 与 IN_PROGRESS 可双向转换

**决策**: 允许 PAUSED ↔ IN_PROGRESS 互相转换

**理由**:
- ✅ 任务暂停是临时状态，恢复后继续推进
- ✅ 支持"暂停-恢复-再暂停"的真实工作场景
- ✅ 活动日志记录每次暂停/恢复，可追溯

**注意**:
- 多次暂停会产生多条 `PAUSED` 日志
- UI 展示时取最后一条暂停记录

### ADR-003: TODO 可直接跳到 DONE

**决策**: 允许 TODO → DONE 的直接转换

**理由**:
- ✅ 有些任务创建后立即完成（如"记录想法"）
- ✅ 减少不必要的中间状态（不强制经过 IN_PROGRESS）
- ✅ 灵活性高，适应快速任务

**代价**:
- ❌ 缺少 `STARTED` 日志
- 接受：活动日志中只有 `COMPLETED` 记录

### ADR-004: 状态转换必须记录活动日志

**决策**: 每次状态转换都生成一条活动日志

**理由**:
- ✅ 可追溯：查看任务完整生命周期
- ✅ 可回忆：暂停原因、完成总结帮助回顾
- ✅ 数据完整性：timestamp 精确到毫秒

**代价**:
- ❌ 数据库存储增加
- 接受：活动日志是核心功能，存储成本可接受

---

## 七、前后端一致性保证

### 7.1 类型定义同步

| 层级 | 文件 | 类型定义 |
|------|-----|---------|
| TypeScript | `src/types/task.ts` | `TaskStatus` enum |
| Rust | `src-tauri/src/domain.rs` | `TaskStatus` enum |
| serde | serde 配置 | `#[serde(rename_all = "SCREAMING_SNAKE_CASE")]` |

**保证机制**:
- Rust 枚举通过 serde 序列化为 `"TODO"`, `"IN_PROGRESS"` 等字符串
- TypeScript 直接使用字符串字面量类型
- 编译时检查：Rust enum 变更后，TypeScript 类型需同步更新

### 7.2 状态机规则同步

| 实现位置 | 函数 | 职责 |
|---------|-----|------|
| Rust domain | `DeskTask::can_transition_to()` | 后端校验转换合法性 |
| TypeScript | `getValidTransitions()` | 前端生成可用按钮 |
| 单元测试 | `src-tauri/src/domain.rs` | 验证 Rust 状态机规则 |

**保证机制**:
- 前端只生成合法按钮，用户无法触发非法转换
- 后端再次校验，防止绕过前端的非法请求
- 单元测试覆盖所有转换场景

---

## 八、测试用例

### 8.1 状态转换测试

| 测试场景 | 初始状态 | 目标状态 | 预期结果 |
|---------|---------|---------|---------|
| 开始任务 | TODO | IN_PROGRESS | ✅ 成功，日志 action=STARTED |
| 暂停任务 | IN_PROGRESS | PAUSED | ✅ 成功，日志 action=PAUSED |
| 恢复任务 | PAUSED | IN_PROGRESS | ✅ 成功，日志 action=RESUMED |
| 完成任务 | IN_PROGRESS | DONE | ✅ 成功，日志 action=COMPLETED |
| 非法转换 | TODO | PAUSED | ❌ 拒绝，按钮不可见 |
| 非法转换 | DONE | TODO | ❌ 拒绝，DONE 是终态 |

### 8.2 边界测试

| 测试场景 | 操作 | 预期行为 |
|---------|-----|---------|
| 暂停后立即恢复 | PAUSED → IN_PROGRESS | 生成两条日志 |
| 多次暂停 | IN_PROGRESS → PAUSED → IN_PROGRESS → PAUSED | 每次暂停生成独立日志 |
| 空 note 提交 | 暂停时不输入原因 + 确认 | note=undefined，允许提交 |
| 直接完成 | TODO → DONE（跳过 IN_PROGRESS） | 只有 COMPLETED 日志 |

---

## 九、相关资源

### 文档
- [Task 系统 PRD](./task-system.md)（待创建）
- [TaskDrawer Spec](./task-drawer.md)（待创建）
- [活动日志时间线 Spec](./activity-log-timeline.md)（待创建）

### 代码
- [`src/lib/taskStateMachine.ts`](../../src/lib/taskStateMachine.ts)
- [`src-tauri/src/domain.rs`](../../src-tauri/src/domain.rs) - `DeskTask::can_transition_to()`
- [`src/components/drawer/StatusMachineButtons.tsx`](../../src/components/drawer/StatusMachineButtons.tsx)

### 测试
- [`src-tauri/src/domain.rs`](../../src-tauri/src/domain.rs) - `#[cfg(test)]` 模块

---

**文档维护者**: Goal Desk 开发团队  
**最后更新**: 2026-06-14
