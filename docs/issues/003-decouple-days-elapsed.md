Label: ready-for-agent

## Parent

[001-timeblocking-mechanism.md](file:///Users/zonkidd/IdeaProjects/goal-desk-tauri/docs/issues/001-timeblocking-mechanism.md)

## What to build

解耦任务“已推进天数”的统计算法。当前系统在计算天数时，优先读取 `plannedStartAt` 作为初始启动时间。由于用户即将需要频繁修改 `plannedStartAt` 来实现特定日期的 Timeblocking 排期，这会导致进度数据不断重置。

需要更新表现层的时长计算逻辑，使其在计算 `daysElapsed` 等进度指标时，针对已经开始的任务，强制通过 `activityLogs` 中最早的 `STARTED` 日志来确定真实的起始时间。

## Acceptance criteria

- [x] 调整任务时长与进度结算逻辑，优先采纳 `STARTED` 活动日志作为进度原点。
- [x] 确保测试用例覆盖“修改 IN_PROGRESS 任务的排期时间后，其 daysElapsed 依然维持不变”的场景。
- [x] 确保没有破坏对 TODO 任务（尚未生成 STARTED 日志）原有的占位时间计算逻辑。

## Blocked by

None - can start immediately
