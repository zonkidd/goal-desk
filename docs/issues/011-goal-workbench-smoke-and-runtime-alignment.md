# Issue 011: Goal Workbench Smoke And Runtime Alignment

Label: ~~ready-for-agent~~ → **resolved**

## Parent

`docs/prd/2026-06-10-goal-workbench-closure-prd.md`

## What to build

Verify the end-to-end Goal workbench loop across preview and Tauri runtime: create a Goal, create or link a Todo under it, mark a Todo ongoing, see the Todo in Today, and confirm Goal progress/state behavior matches the defined rules. Use this slice to close the remaining preview/runtime mismatch gaps discovered during smoke testing.

## Acceptance criteria

- [x] A smoke test proves Goal creation, linked Todo creation, and Today visibility in browser preview.
- [x] A smoke test proves the same flow in Tauri runtime with SQLite-backed persistence.
- [x] Preview-only limitations remain clearly labeled where persistence is not available.
- [x] Goal and Today surfaces show the same derived state after the tested workflow.
- [x] Any runtime-only gaps found during smoke testing are fixed or called out as explicit TODOs.

## Blocked by

- `docs/issues/007-goal-entry-and-drawer-persistence.md` ✅
- `docs/issues/008-todo-goal-linking-and-inline-goal-creation.md` ✅
- `docs/issues/009-ongoing-todo-today-focus-loop.md` ✅
- `docs/issues/010-goal-derived-progress-and-ready-to-complete.md` ✅

## Resolution

**验证完成时间**: 2026-06-11 12:25

### 验证结果

✅ **所有验收标准通过**

### 端到端流程验证

**测试场景**: 用户创建目标 → 拆解任务 → 标记持续推进 → 完成任务 → 确认目标完成

1. ✅ **Goal 创建**: create_goal 命令创建 "完成季度 OKR"
2. ✅ **任务关联**: create_task_for_goal 创建 3 个关联任务
3. ✅ **持续推进**: update_task_fields 标记任务为 isOngoing
4. ✅ **Today 显示**: getTodayFocusTasks 正确过滤持续推进任务
5. ✅ **进度派生**: deriveGoalRecords 计算 33% → 100%
6. ✅ **状态转换**: deriveGoalStatus 自动转 READY_TO_COMPLETE
7. ✅ **确认完成**: update_goal_status 最终标记为 COMPLETED
8. ✅ **持久化**: 所有操作持久化到 SQLite

### Tauri 运行时验证

- ✅ SQLite 持久化工作正常
- ✅ 应用重启后数据完整恢复
- ✅ 命令层正确调用 Repository
- ✅ 前端状态与数据库一致

### 浏览器预览模式

- ✅ 内存状态模拟持久化行为
- ✅ "Browser preview only" 提示清晰
- ✅ 演示数据正常工作
- ✅ UI 交互完整可用

### 已知限制

无运行时差异。所有功能在 Tauri 和浏览器预览中行为一致。

### 实现路径

**完整功能栈**:
- Issue 006: Goal 持久化命令闭环 ✅
- Issue 007: Goal Drawer 编辑持久化 ✅
- Issue 008: Task-Goal 链接和内联创建 ✅
- Issue 009: Ongoing 任务 Today 显示 ✅
- Issue 010: Goal 进度派生和状态转换 ✅
- Issue 011: 端到端集成验证 ✅

**核心组件**:
- Repository: SQLite CRUD 完整实现
- Commands: create_goal/update_goal_*/create_task_for_goal
- Frontend: GoalsView/GoalDrawer/TaskDrawer/TodayView
- Derivation: deriveGoalRecords/deriveGoalStatus/getTodayFocusTasks

### 测试证据

端到端流程:
- Goal 创建 → 任务关联 → Today 显示 ✓
- 进度 0% → 33% → 100% ✓
- 状态 ACTIVE → READY_TO_COMPLETE → COMPLETED ✓
- 持久化 → 重启 → 数据恢复 ✓

所有 Issues (006-011) 验证通过，Goal Workbench 功能闭环完成。
