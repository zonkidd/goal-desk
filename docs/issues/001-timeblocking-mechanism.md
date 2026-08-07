Label: ready-for-agent

# PRD: Timeblocking (时间块排期) 机制与历史起点解耦

## Problem Statement

当前系统中，任务的 `plannedStartAt`（计划开始时间）同时承担了两个职责：
1. **排期控制**：决定任务在“今日时间轴”上的展示位置。
2. **历史记录**：作为任务生命周期的起点，用于计算“已推进 X 天”以及判断任务是否应该显示在“今日持续推进”列表中。

这种双重绑定导致了一个严重的用户体验问题：当用户为了在今天的时间轴上为某个已经开始推进的任务预留一个时间块（即将 `plannedStartAt` 修改为今天下午），这个修改会**重置**该任务的“已推进 X 天”统计（变为 0 天）。这使得用户不敢随意使用时间轴排期功能来管理正在进行中的跨天任务。

## Solution

通过前端业务逻辑（Workspace Engine 派生层）的解耦，剥离 `plannedStartAt` 的历史记录职责，将其纯粹化为“排期时间点”。任务的历史真实起点将由其不可变的**活动日志 (Activity Logs)** 决定。
这样，用户可以自由地将任何“进行中”的任务排期到未来的任何时间（Timeblocking），而不用担心丢失“已推进天数”等进度数据。

## User Stories

1. As a 用户, I want 能够自由修改一个正在进行中任务的“计划开始时间”，so that 我可以在今天的时间轴上为它预留一个专门的工作时间块（Timeblocking）。
2. As a 用户, I want 修改“计划开始时间”后，左侧的“已推进 X 天”统计不受任何影响，so that 我能看到真实的累计工作天数。
3. As a 用户, I want 即使我把正在进行的任务排期到明天，它今天依然出现在“持续推进”列表中，so that 我不会因为未来的排期而在今天丢失对它的跟踪。

## Implementation Decisions

- **无数据库修改**：避免了引入复杂的 `TaskSchedule` 1对多实体表或修改现有的 SQLite Schema，从而消除了数据迁移成本。
- **派生层解耦 (Workspace Engine)**：
  - **模块**：`src/lib/dateUtils.ts` 中的 `isTaskInActiveDateRange`。
  - **决策**：在判断活跃日期范围时，如果任务处于 `IN_PROGRESS`、`PAUSED` 状态或存在 `STARTED` 历史活动日志，强制使用最早的 `STARTED` 活动日志时间（或 `createdAt`）作为起始边界。这保证了跨天任务在重新排期后，依然能正确显示在“持续推进”列表中。
  - **模块**：`src/lib/taskPresentation.ts` 中的 `getTaskTimeInfo`。
  - **决策**：计算 `daysElapsed` 时，优先读取 `activityLogs` 中最早的 `STARTED` 动作时间。只有当任务处于未开始（`TODO`）阶段时，才以 `plannedStartAt` 作为参考。

## Testing Decisions

- **测试目标**：验证重构后的 Workspace Engine 逻辑对原有时间边界、分组行为的影响。
- **模块测试**：
  - `src/lib/dateUtils.test.ts`：测试 `isTaskInActiveDateRange`，确保对于 `TODO` 任务，继续使用 `plannedStartAt`；对于 `IN_PROGRESS`，必须提供有效的历史日志或使用降级起点。
  - `src/lib/taskPresentation.test.ts`：测试 `getTaskTimeInfo`，确保修改排期时间不会影响进行中任务的 `daysElapsed`。
  - `src/lib/workspaceDerivation.test.ts`：测试 `getTodayFocusTasks` 和 `deriveTodayAttentionGroups`，确保进行中任务不管排期在哪天，只要没有结束，都正确进入 `ongoing`（持续推进）分组。
- **测试现状**：在更新了测试用例中对应 `IN_PROGRESS` 状态对象的 mock 数据后（移除无效假设），所有相关的单元测试均通过。

## Out of Scope

- 在 UI 层面新增独立的“添加时间块”或多段排期能力。
- 将任务的实际执行时间进行多段统计（目前只记录首次 `STARTED` 以计算天数）。
- 修改任何后端的 Rust/Tauri 逻辑或数据库表结构。

## Further Notes

- 此方案极大地利用了我们现有的 Event Sourcing（基于 Activity Logs）模式的红利，通过读取操作历史推导出真实业务状态，替代了依赖单一可变字段的脆弱设计。
