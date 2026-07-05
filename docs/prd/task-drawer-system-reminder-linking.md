# PRD: TaskDrawer 系统提醒关联状态展示

**状态**: 已调整为只读策略
**更新日期**: 2026-07-04
**优先级**: P3  
**标签**: `feature`, `ui`, `eventkit`

---

## Problem Statement

TaskDrawer 需要说明 Todo 是否关联了从 macOS Reminders 导入的系统提醒，同时必须遵守当前 EventKit 策略：系统提醒是只读外部源，Goal Desk 不创建、不编辑、不标记完成系统提醒。

---

## Solution

在 TaskDrawer 中展示系统提醒关联状态，支持：
1. **只读显示**: 已关联时展示提醒状态和外部来源说明
2. **打开系统 App**: 需要编辑标题、时间或完成状态时跳转到系统提醒事项
3. **解除本地关联**: 只清除 Todo 上的 `systemReminderId`，不删除、不修改系统提醒

---

## User Stories

1. 作为一个用户，我希望能看出 Todo 是否关联了系统提醒
2. 作为一个用户，我希望能从 TaskDrawer 打开系统提醒事项 App 查看或编辑外部提醒
3. 作为一个用户，我希望能解除本地关联但保留系统提醒

---

## Implementation Decisions

### 数据模型

Task 类型已有 `systemReminderId` 字段，无需修改。

### Store Actions

不新增系统提醒写入 action。解除关联复用 Todo 字段更新：

```typescript
// appStore.types.ts
interface AppState {
  // 现有 actions...
  updateTaskFields: (taskId: string, input: { systemReminderId?: string | null }) => Promise<void>
}
```

### UI 组件

TaskDrawer 中的系统提醒关联区域：

```
已关联时：
┌─────────────────────────────────────┐
│ 已关联系统提醒（只读）              │
│ 在系统提醒事项中编辑标题、时间、完成状态 │
│                    [打开] [解除关联] │
└─────────────────────────────────────┘

未关联时不提供创建或选择系统提醒入口。
```

### 实现流程

1. **查看关联状态**:
   - TaskDrawer 根据 `systemReminderId` 和导入的 Reminders 展示只读状态
   - 未找到外部提醒时展示“提醒可能已被外部删除”

2. **打开系统提醒事项**:
   - 用户点击“打开”
   - 调用 EventKit adapter 的 open URL 行为

3. **解除本地关联**:
   - 用户点击"解除"按钮
   - 调用 `updateTaskFields(taskId, { systemReminderId: null })`
   - UI 更新为未关联状态

---

## Testing Decisions

### 测试原则

- 测试用户可见的 UI 变化和交互结果
- 不测试内部状态（如 `useState` 的值）

### 测试用例

1. 未关联状态不显示创建系统提醒入口
2. 已关联状态显示只读提醒信息
3. 点击打开按钮跳转到系统提醒事项
4. 点击解除按钮只清除本地关联
5. 外部提醒缺失时显示只读降级状态
