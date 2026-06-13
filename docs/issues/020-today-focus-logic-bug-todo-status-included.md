# Issue 020: getTodayFocusTasks 错误包含 TODO 状态任务

**发现时间**: 2026-06-13  
**严重程度**: 中等  
**状态**: ✅ 已修复

---

## 问题描述

在测试"今日焦点"功能时，发现 `getTodayFocusTasks()` 函数的过滤逻辑存在缺陷：

**原始代码**（错误）:
```typescript
export function getTodayFocusTasks(tasks: Task[], now = new Date()) {
  const today = startOfDay(now)
  return tasks.filter((task) => {
    if (task.status === 'DONE' || task.status === 'PAUSED') return false
    // ... 时间判断
  })
}
```

**问题**：
- 只排除了 `DONE` 和 `PAUSED` 状态
- **没有要求 `status === 'IN_PROGRESS'`**
- 结果：`TODO` 状态的任务也会被包含进"今日持续推进"

---

## 业务影响

根据需求，"今日持续推进"应该只显示**正在进行中**的任务。

**错误行为**：
- 场景 9（TODO 状态，今天 10:00 → 今天 18:00）会被错误地显示在"今日持续推进"中
- 用户会看到尚未开始的任务，与"持续推进"的语义不符

**预期行为**：
- 只有 `status === 'IN_PROGRESS'` 的任务才应该出现
- TODO 任务应该只在 Inbox 或 Board 中显示，不应出现在今日焦点

---

## 根本原因

在重构过程中，从"排除不需要的状态"的思路，改为"严格要求 IN_PROGRESS 状态"的思路时，`getTodayFocusTasks()` 函数未同步更新。

**对比**：
- `deriveTodayTimeline()`: ✅ 正确使用 `task.status !== 'IN_PROGRESS'`
- `deriveTodayAttentionGroups().ongoing`: ✅ 正确使用 `task.status !== 'IN_PROGRESS'`
- `getTodayFocusTasks()`: ❌ 只排除 DONE/PAUSED，遗漏 TODO

---

## 修复方案

**修改后代码**:
```typescript
export function getTodayFocusTasks(tasks: Task[], now = new Date()) {
  const today = startOfDay(now)
  return tasks.filter((task) => {
    // 必须是 IN_PROGRESS 状态
    if (task.status !== 'IN_PROGRESS') return false

    // 时间区间判断：今天在任务的开始和结束时间之间
    const startBoundary = task.plannedStartAt || task.createdAt
    if (!startBoundary) return false

    const startDay = startOfDay(startBoundary)
    const endDay = task.dueDate ? startOfDay(task.dueDate) : undefined

    return startDay.getTime() <= today.getTime() && (!endDay || today.getTime() <= endDay.getTime())
  })
}
```

**改动**：
```diff
- if (task.status === 'DONE' || task.status === 'PAUSED') return false
+ // 必须是 IN_PROGRESS 状态
+ if (task.status !== 'IN_PROGRESS') return false
```

---

## 测试验证

### 修复前
场景 9 的任务会出现在"今日持续推进"中：
- ❌ 【TODO 状态】待开始的邮件处理（今天 10:00 → 今天 18:00）

### 修复后
场景 9 的任务被正确过滤：
- ✅ 不出现在"今日持续推进"
- ✅ 只在 Inbox 的"活跃任务"中显示

### 完整测试结果
修复后，"今日持续推进"应显示 **6 个任务**：
1. ✅ 完成 Q2 产品规划文档（多日任务）
2. ✅ 阅读《Rust 异步编程》（多日任务）
3. ✅ 下午 2 点团队周会（今日任务）
4. ✅ 整理本周代码提交（今日任务）
5. ✅ 晚上 6 点开始跑步（无截止）
6. ✅ 学习 Tauri 插件开发（无截止）

**排除的任务**：
- ❌ 场景 7（已逾期，时间范围不覆盖今天）
- ❌ 场景 8（未来任务，时间范围不覆盖今天）
- ❌ 场景 9（TODO 状态）✨ **本次修复**
- ❌ 场景 10（DONE 状态）

---

## 相关文件

- `src/lib/workspaceDerivation.ts`: 修复 `getTodayFocusTasks()` 函数
- `docs/test-report-today-focus-2026-06-13.md`: 测试报告（已更新预期结果）
- `src-tauri/src/lib.rs`: 测试数据（场景 9）

---

## 经验教训

1. **状态过滤的两种思路**：
   - ❌ 排除式：`if (status === 'X' || status === 'Y') return false` — 容易遗漏边界状态
   - ✅ 白名单式：`if (status !== 'TARGET') return false` — 明确且安全

2. **重构时需要全局检查**：
   - 当核心概念变更时（如"持续推进"的定义），需要检查所有相关函数
   - 使用 grep 搜索 `task.status` 确保一致性

3. **测试驱动的价值**：
   - 边界测试场景（如场景 9 的 TODO 状态）能够暴露逻辑缺陷
   - 明确的测试数据让问题无所遁形

---

## 状态历史

- 2026-06-13 14:30 - 发现问题（代码审查）
- 2026-06-13 14:35 - 修复并验证编译通过
- 2026-06-13 14:40 - 记录 Issue
