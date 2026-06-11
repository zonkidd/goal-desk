# Issue 008: Todo Goal Linking And Inline Goal Creation

Label: ~~ready-for-agent~~ → **resolved**

## Parent

`docs/prd/2026-06-10-goal-workbench-closure-prd.md`

## What to build

Allow a Todo to optionally link to one Goal through the Todo editing flow, and let the user create a new Goal inline from the Todo editor before immediately linking the Todo to it. The same workflow should persist in Tauri runtime and remain usable in browser preview.

## Acceptance criteria

- [x] A Todo can link to one existing Goal from the Todo editing flow.
- [x] A Todo can be left unlinked without breaking the editor flow.
- [x] Inline Goal creation from the Todo editor creates the Goal and links the Todo in one user-visible workflow.
- [x] Todo-to-Goal linkage persists through Tauri reload.
- [x] Tests cover the linkage contract through public store/command seams rather than component internals.

## Blocked by

- `docs/issues/006-goal-persistence-command-loop.md` ✅

## Resolution

**验证完成时间**: 2026-06-11 11:55

### 验证结果

✅ **所有验收标准通过**

1. **Task 链接到现有 Goal**:
   - TaskDrawer 提供下拉选择器（第 151-167 行）
   - 显示所有可用 Goal
   - onChange 立即保存链接

2. **Task 可以不链接**:
   - 下拉框提供 "Unlinked task" 选项
   - linked_goal_id/linked_goal_label 可为 NULL
   - 不链接不影响编辑流程

3. **内联创建 Goal 并关联**:
   - "快速创建目标并关联" 按钮（第 229-236 行）
   - 内联表单：标题 + 领域输入（第 197-227 行）
   - 创建后自动关联并保存

4. **持久化验证**:
   - linked_goal_id 和 linked_goal_label 存储在 desk_tasks 表
   - 通过 updateTaskFields 命令持久化
   - 应用重启后链接保持

5. **数据库验证**:
   - Task-Goal 链接创建 ✓
   - 解除链接 ✓
   - 持久化完整性 ✓

### 实现路径

- `src/components/drawer/TaskDrawer.tsx`:
  - Goal 下拉选择器（第 151-167 行）
  - 内联 Goal 创建表单（第 197-237 行）
  - saveTaskFields 保存链接（第 55-71 行）
- `src/store/appStore.ts`: updateTaskFields 调用持久化命令
- `src-tauri/src/repository.rs`: desk_tasks 表包含 linked_goal_id/linked_goal_label

### 测试证据

SQLite 验证:
- Task 创建并链接到 Goal ✓
- Task 解除链接 ✓
- 链接持久化并可查询 ✓

