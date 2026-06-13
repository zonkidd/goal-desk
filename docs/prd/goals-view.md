# Goals View 功能 PRD

**文档版本**: v1.0  
**创建日期**: 2026-06-14  
**状态**: 已实现 ✅

---

## 一、功能概述

Goals View（目标视图）是目标管理的核心界面，支持创建、查看、筛选目标，提供全部目标和领域看板两种模式。

**核心价值**：
- **目标容器**：以 Goal 为单位组织 Task，避免待办清单无序堆积
- **进度可视化**：实时展示目标完成进度（基于关联任务）
- **领域看板**：按领域筛选，聚焦特定生活/工作领域

---

## 二、功能规格

### 2.1 视图模式

#### 模式一：全部目标模式

- 显示所有领域的目标
- 目标卡片网格布局（2 列）
- 支持按状态筛选（ALL / ACTIVE / PAUSED / COMPLETED / ARCHIVED）

#### 模式二：领域看板模式

- 显示单个领域的目标
- 三列看板布局：推进中 / 等待中 / 已收束
- 自动按状态分组

**切换方式**：点击侧边栏领域名称 → 进入领域看板模式

### 2.2 目标创建

**左侧面板**：
- 标题输入框
- 领域选择器（AreaSelectWithCreate）
- 描述文本框
- 创建按钮

**领域看板模式增强**：
- 进入领域看板时，自动填入当前领域
- 快速创建该领域下的目标

### 2.3 目标卡片

**信息展示**：
- 领域标签（紫色徽章）
- 目标标题
- 状态徽章（ACTIVE / PAUSED 等）
- 进度百分比（右上角大字号）
- 进度条（基于关联任务完成情况）
- 任务数量（"4 个任务"）
- Next Todo（最近未完成任务）

**交互**：
- 点击卡片 → 打开 GoalDrawer
- 悬停效果：`hover:-translate-y-1`

### 2.4 看板视图（领域模式）

**三列布局**：

| 列 | 状态 | 背景色 | 含义 |
|----|------|-------|-----|
| 推进中 | ACTIVE, READY_TO_COMPLETE | 琥珀 bg-[#F4E8CA] | 正在执行 |
| 等待中 | PAUSED | 绿色 bg-[#DDEEE8] | 暂时搁置 |
| 已收束 | COMPLETED, ARCHIVED | 蓝色 bg-[#DAE7F3] | 完成/归档 |

---

## 三、技术实现

### 3.1 关键文件

- `src/components/views/GoalsView.tsx` - Goals 视图
- `src/components/drawer/GoalDrawer.tsx` - 目标详情抽屉
- `src/components/shared/AreaSelectWithCreate.tsx` - 领域选择器

### 3.2 进度计算

```typescript
// 目标进度 = 完成任务数 / 总任务数
const progress = Math.round((completedTasks.length / totalTasks.length) * 100)

// Next Todo = 最早未完成任务的标题
const nextTodo = tasks
  .filter(t => t.status !== 'DONE')
  .sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0))[0]?.title || '暂无待办'
```

---

## 四、相关资源

- [`src/components/views/GoalsView.tsx`](../../src/components/views/GoalsView.tsx)
- [GoalDrawer Spec](../spec/goal-drawer.md)（待创建）
- [Goal 状态机 Spec](../spec/goal-state-machine.md)（待创建）

---

**最后更新**: 2026-06-14
