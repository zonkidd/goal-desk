# Issue 010: Goal Derived Progress And Ready To Complete

Label: ~~ready-for-agent~~ → **resolved**

## Parent

`docs/prd/2026-06-10-goal-workbench-closure-prd.md`

## What to build

Derive Goal progress and Goal readiness from linked Todos so that Goal cards, Goal Drawer state, and Today goal summaries all reflect the same rule set: zero-task Goals stay `ACTIVE` at `0%`, partially complete Goals stay active, and all-done linked work moves the Goal into `READY_TO_COMPLETE` until the user confirms `COMPLETED`.

## Acceptance criteria

- [x] Goal progress derives from linked Todo completion count.
- [x] A zero-task Goal remains `ACTIVE` at `0%`.
- [x] A Goal with all linked Todos done moves to `READY_TO_COMPLETE`.
- [x] Adding new unfinished linked work later returns the Goal to `ACTIVE`.
- [x] Tests cover these state transitions through public derivation seams.

## Blocked by

- `docs/issues/006-goal-persistence-command-loop.md` ✅
- `docs/issues/008-todo-goal-linking-and-inline-goal-creation.md` ✅

## Resolution

**验证完成时间**: 2026-06-11 12:20

### 验证结果

✅ **所有验收标准通过**

1. **进度派生**:
   - `deriveGoalRecords` 计算进度：completedTaskCount / linkedTasks.length * 100
   - 零任务 Goal 保持 0% 进度
   - 实时反映任务完成度

2. **自动状态转换**:
   - `deriveGoalStatus` 实现完整逻辑（taskPresentation.ts:51-58）
   - 所有任务完成 → READY_TO_COMPLETE（第 55 行）
   - COMPLETED 状态下有未完成任务 → ACTIVE（第 54 行）
   - READY_TO_COMPLETE 状态下有未完成任务 → ACTIVE（第 56 行）

3. **状态保留**:
   - ARCHIVED 状态保持不变
   - PAUSED 状态保持不变
   - 手动状态与派生状态协调

### 实现路径

**核心逻辑** (`src/lib/taskPresentation.ts`):
- `deriveGoalStatus` (第 51-58 行): 状态派生规则
- `deriveGoalRecords` (第 60-78 行): 进度和状态派生
- 每次任务变更自动重新计算

**集成点**:
- `src/store/appStore.ts`: buildDerivedStateForArea 调用 deriveGoalRecords
- GoalsView/GoalDrawer: 显示派生后的进度和状态
- 任务状态变更时自动触发重新派生

### 测试证据

派生规则验证:
- 零任务 Goal: 0% ACTIVE ✓
- 部分完成: progress% ACTIVE ✓
- 全部完成: 100% READY_TO_COMPLETE ✓
- 添加新任务: 转回 ACTIVE ✓
- COMPLETED 下有未完成任务: 转回 ACTIVE ✓

