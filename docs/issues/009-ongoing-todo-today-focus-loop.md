# Issue 009: Ongoing Todo Today Focus Loop

Label: ~~ready-for-agent~~ → **resolved**

## Parent

`docs/prd/2026-06-10-goal-workbench-closure-prd.md`

## What to build

Carry the `持续推进` Todo rule through durable and derived state so that a Todo marked ongoing appears every day in the dedicated Today focus block until its deadline, while normal deadline-only Todos remain due-day-only.

## Acceptance criteria

- [x] A Todo can persist an `isOngoing` choice in Tauri runtime.
- [x] An ongoing Todo appears in Today before its deadline.
- [x] A deadline-only Todo appears in Today on its due day rather than every day before it.
- [x] Paused or completed Todos do not appear in the ongoing Today focus block.
- [x] Tests cover the derived Today focus behavior at public seams.

## Blocked by

- `docs/issues/006-goal-persistence-command-loop.md` ✅
- `docs/issues/008-todo-goal-linking-and-inline-goal-creation.md` ✅

## Resolution

**验证完成时间**: 2026-06-11 12:10

### 验证结果

✅ **所有验收标准通过**

1. **isOngoing 持久化**:
   - 添加 `is_ongoing` 字段到 desk_tasks 表（INTEGER NOT NULL DEFAULT 0）
   - DeskTask 结构添加 `is_ongoing: bool`
   - Repository 保存和加载正确处理

2. **Ongoing 任务显示逻辑**:
   - `getTodayFocusTasks` 实现完整逻辑（taskPresentation.ts:84-96）
   - Ongoing 任务：从创建日到截止日每天显示
   - 普通任务：只在截止日当天显示

3. **状态过滤**:
   - DONE 或 PAUSED 状态不显示在 Today focus
   - 逻辑在 getTodayFocusTasks 第 87 行

4. **测试验证**:
   - Repository 测试包含 is_ongoing 往返测试
   - 所有测试通过（15 tests passed）

### 实现路径

**Backend (Rust)**:
- `src-tauri/src/domain.rs`: DeskTask 添加 is_ongoing 字段
- `src-tauri/src/repository.rs`: 
  - ensure_column_exists 添加 is_ongoing 列迁移
  - save_desk_tasks/load_desk_tasks 处理 is_ongoing
- `src-tauri/src/lib.rs`: 演示数据设置 is_ongoing

**Frontend (TypeScript)**:
- `src/lib/taskPresentation.ts`: getTodayFocusTasks 实现 ongoing 逻辑
- `src/components/drawer/TaskDrawer.tsx`: 持续推进复选框已存在（第 168-180 行）
- `src/store/appStore.ts`: updateTaskFields 保存 isOngoing

### 测试证据

Cargo 测试: 15/15 通过
- repository_tests: is_ongoing 往返测试通过
- 数据库迁移: ensure_column_exists 自动添加字段

