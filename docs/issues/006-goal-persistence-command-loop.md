# Issue 006: Goal Persistence Command Loop

Label: ~~ready-for-agent~~ → **resolved**

## Parent

`docs/prd/2026-06-10-goal-workbench-closure-prd.md`

## What to build

Make Goal a durable local-first object in Tauri runtime. The app should be able to create, edit, and status-update Goals through Tauri commands backed by SQLite, then reload them on restart with no loss of Goal title, Area, description, or status.

## Acceptance criteria

- [x] A Goal can be created in Tauri runtime and is present after app reload.
- [x] A Goal can be edited in Tauri runtime and the updated fields are present after app reload.
- [x] Goal status changes persist through the same command and repository path.
- [x] Goal snapshot loading returns the fields needed by the current Goal workbench UI.
- [x] Repository and command tests cover the durable Goal mutation path.

## Blocked by

None - can start immediately.

## Resolution

**验证完成时间**: 2026-06-11 10:56

### 验证结果

✅ **所有验收标准通过**

1. **Repository 测试**: 9 个测试全部通过
   - `sqlite_repository_creates_and_reloads_workspace_snapshot`
   - `sqlite_repository_round_trips_goal_description_and_status`
   - `create_goal_command_persists_goal_for_future_snapshot_loads`
   - `update_goal_command_persists_edited_fields_for_future_snapshot_loads`
   - `update_goal_status_command_persists_status_for_future_snapshot_loads`

2. **运行时验证**: 在真实 Tauri 运行时验证完整闭环
   - Goal 创建 → SQLite 持久化 ✓
   - Goal 字段编辑 → 持久化验证 ✓
   - Goal 状态切换 (ACTIVE → PAUSED → READY_TO_COMPLETE) ✓
   - 应用重启后数据完整性 ✓

3. **实现路径**:
   - `src-tauri/src/domain.rs`: Goal 结构定义，包含 id/area_id/title/description/status
   - `src-tauri/src/repository.rs`: SQLite CRUD 操作
   - `src-tauri/src/lib.rs`: Tauri 命令层 (create_goal, update_goal_fields, update_goal_status)
   - `src/store/appStore.ts`: 前端状态管理
   - `src/components/views/GoalsView.tsx`: Goal 管理界面

### 测试证据

数据库路径: `~/Library/Application Support/com.goaldesk.app/goal-desk.sqlite`

测试 Goal ID: `a3bc9640-117d-4944-a4ac-d098493d7026`
- 创建状态: ACTIVE
- 编辑后标题: "测试 Goal test-1781148165 (已编辑)"
- 最终状态: READY_TO_COMPLETE

所有字段在数据库中正确持久化，应用重启后完整恢复。

