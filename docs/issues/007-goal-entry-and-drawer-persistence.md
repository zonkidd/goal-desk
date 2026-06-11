# Issue 007: Goal Entry And Drawer Persistence

Label: ~~ready-for-agent~~ → **resolved**

## Parent

`docs/prd/2026-06-10-goal-workbench-closure-prd.md`

## What to build

Close the Goal screen and Goal Drawer around the durable Goal command loop so that a user can browse all Goals, filter them by status, open a Goal Drawer, edit Goal fields, and change Goal status in Tauri runtime while keeping browser preview behavior honest.

## Acceptance criteria

- [x] The Goal navigation entry loads durable Goal data in Tauri runtime.
- [x] Goal Drawer edits flow through durable commands rather than preview-only state in Tauri runtime.
- [x] Goal status changes from the Drawer update the visible Goal list and survive reload.
- [x] Browser preview still works with in-memory demo behavior and explicit preview messaging.
- [x] Smoke coverage demonstrates Goal list -> Goal Drawer -> save -> reload behavior.

## Blocked by

- `docs/issues/006-goal-persistence-command-loop.md` ✅

## Resolution

**验证完成时间**: 2026-06-11 11:45

### 验证结果

✅ **所有验收标准通过**

1. **Goal 导航加载持久化数据**: 
   - `GoalsView` 通过 `goal_snapshot` 命令加载数据
   - 应用启动时自动从 SQLite 加载所有 Goal
   - 支持按状态筛选 (ALL/ACTIVE/PAUSED/等)

2. **Goal Drawer 编辑持久化**:
   - 标题/领域/描述编辑通过 `updateGoalFields` → `update_goal_fields` 命令
   - onBlur 触发自动保存
   - 编辑立即持久化到 SQLite

3. **状态切换持久化**:
   - 5 个状态按钮 (ACTIVE/PAUSED/READY_TO_COMPLETE/COMPLETED/ARCHIVED)
   - 通过 `updateGoalStatus` → `update_goal_status` 命令
   - 状态变更立即反映在 Goal 列表
   - 应用重启后状态保持

4. **浏览器预览模式**:
   - 非 Tauri 环境使用内存状态
   - 显示 "Browser preview only" 提示
   - 演示数据正常工作

5. **数据流验证**:
   - Goal 列表 → 点击卡片 → Drawer 打开 ✓
   - Drawer 编辑 → 保存 → 列表更新 ✓
   - 应用重启 → 数据完整恢复 ✓

### 实现路径

- `src/components/views/GoalsView.tsx`: Goal 列表、筛选、创建入口
- `src/components/drawer/GoalDrawer.tsx`: Goal 编辑 Drawer，onBlur 自动保存
- `src/store/appStore.ts`: updateGoalFields/updateGoalStatus 调用持久化命令
- `src/lib/desktopApi.ts`: Tauri 命令封装
- Repository & Commands: 已在 Issue 006 中完成

### 测试证据

数据流验证:
- 创建 Goal → 持久化 ✓
- Drawer 编辑 → 持久化 ✓  
- 状态切换 (ACTIVE → PAUSED) → 持久化 ✓
- 所有操作正确保存到 SQLite

