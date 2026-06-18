# PRD: TaskDrawer 系统提醒关联功能

**状态**: 计划中  
**更新日期**: 2026-06-18  
**优先级**: P3  
**标签**: `feature`, `ui`, `eventkit`

---

## Problem Statement

用户在 TaskDrawer 中可以看到任务，但无法将任务与 macOS 系统提醒关联。这导致：
1. 任务无法获得系统提醒的通知能力
2. 用户需要在 Goal Desk 和系统提醒之间手动同步

---

## Solution

在 TaskDrawer 中添加系统提醒关联功能，支持：
1. **创建新提醒**: 点击 checkbox 直接创建默认提醒并关联
2. **选择已有提醒**: 下拉选择已有系统提醒进行关联
3. **解除关联**: 直接解除关联，不删除系统提醒

---

## User Stories

1. 作为一个用户，我希望能一键创建系统提醒来获得任务通知
2. 作为一个用户，我希望能选择已有的系统提醒来关联系统
3. 作为一个用户，我希望能解除关联但保留系统提醒

---

## Implementation Decisions

### 数据模型

Task 类型已有 `systemReminderId` 字段，无需修改。

### Store Actions

需要新增以下 actions：

```typescript
// appStore.types.ts
interface AppState {
  // 现有 actions...
  
  // 新增 actions
  linkTaskToReminder: (taskId: string, reminderId: string) => Promise<void>
  unlinkTaskFromReminder: (taskId: string) => Promise<void>
  createAndLinkReminder: (taskId: string, title: string, dueAt?: Date) => Promise<string>
}
```

### UI 组件

TaskDrawer 中的系统提醒关联区域：

```
未关联时：
┌─────────────────────────────────────┐
│ ☐ 关联系统提醒获得通知              │
└─────────────────────────────────────┘

已关联时：
┌─────────────────────────────────────┐
│ ✓ 已关联: 任务标题 · 2026-06-20     │
│                            [解除]   │
└─────────────────────────────────────┘
```

### 实现流程

1. **创建新提醒**:
   - 用户点击 checkbox
   - 调用 `createAndLinkReminder(taskId, task.title, task.dueDate)`
   - 系统创建提醒并关联到任务

2. **选择已有提醒**:
   - 用户点击下拉选择器
   - 显示已有系统提醒列表
   - 用户选择后调用 `linkTaskToReminder(taskId, reminderId)`

3. **解除关联**:
   - 用户点击"解除"按钮
   - 调用 `unlinkTaskFromReminder(taskId)`
   - UI 更新为未关联状态

---

## Testing Decisions

### 测试原则

- 测试用户可见的 UI 变化和交互结果
- 不测试内部状态（如 `useState` 的值）

### 测试用例

1. 未关联状态显示 checkbox
2. 点击 checkbox 创建提醒并关联
3. 已关联状态显示提醒信息
4. 点击解除按钮解除关联
5. 选择已有提醒进行关联
