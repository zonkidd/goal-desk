# Board View 功能 PRD

**文档版本**: v1.0  
**创建日期**: 2026-06-14  
**状态**: 已实现 ✅

---

## 一、功能概述

Board View（看板视图）是任务状态管理的可视化界面，采用三列看板布局，帮助用户把 Inbox 中的任务推进到具体状态。

**核心价值**：
- **状态可视化**：一目了然看到任务分布（计划中 / 进行中 / 完成）
- **拖拽友好**：（未来）支持拖拽任务在列间移动
- **领域筛选**：按 activeArea 过滤任务，聚焦特定领域

---

## 二、功能规格

### 2.1 三列看板布局

| 列名 | 包含状态 | 背景色 | 含义 |
|------|---------|-------|-----|
| 计划中 | TODO | 琥珀 bg-[#F4E8CA] | 尚未开始 |
| 进行中 | IN_PROGRESS, PAUSED | 绿色 bg-[#DDEEE8] | 正在执行或暂停 |
| 完成 | DONE | 蓝色 bg-[#DAE7F3] | 已完成 |

**设计意图**：
- 简化为三列，避免过多列导致横向滚动
- IN_PROGRESS 和 PAUSED 合并（都是"活跃"状态）
- 视觉上清晰区分未开始、进行中、已完成

### 2.2 任务卡片

**显示内容**：
- 状态标签（TODO / IN_PROGRESS / DONE）
- 任务标题
- 关联目标（`task.linkedGoalLabel` 或 "Unlinked task"）

**交互**：
- 点击卡片 → 打开 TaskDrawer
- 悬停效果：`whileHover={{ y: -2 }}`

### 2.3 领域筛选

**筛选逻辑**：
```typescript
const visibleTasks = activeArea === 'ALL' 
  ? tasks 
  : tasks.filter(task => 
      task.linkedGoalId && goals.some(goal => 
        goal.id === task.linkedGoalId && goal.area === activeArea
      )
    )
```

**说明**：
- 只显示"关联目标且目标属于当前领域"的任务
- 未关联目标的任务不参与领域筛选

---

## 三、技术实现

### 3.1 关键文件

- `src/components/views/BoardView.tsx` - Board 视图主组件

### 3.2 列定义

```typescript
const columns: Array<{ title: string; statuses: TaskStatus[]; bg: string }> = [
  { title: '计划中', statuses: ['TODO'], bg: 'bg-[#F4E8CA]' },
  { title: '进行中', statuses: ['IN_PROGRESS', 'PAUSED'], bg: 'bg-[#DDEEE8]' },
  { title: '完成', statuses: ['DONE'], bg: 'bg-[#DAE7F3]' },
]
```

---

## 四、未来优化

- [ ] **拖拽排序**：支持拖拽任务在列间移动改变状态
- [ ] **泳道视图**：按目标分组显示任务（横向泳道）
- [ ] **WIP 限制**：设置"进行中"列最大任务数

---

## 五、相关资源

- [`src/components/views/BoardView.tsx`](../../src/components/views/BoardView.tsx)
- [Task 状态机系统 Spec](../spec/task-state-machine.md)

---

**最后更新**: 2026-06-14
