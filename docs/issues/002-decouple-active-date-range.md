Label: ready-for-agent

## Parent

[001-timeblocking-mechanism.md](file:///Users/zonkidd/IdeaProjects/goal-desk-tauri/docs/issues/001-timeblocking-mechanism.md)

## What to build

解耦任务在“今日持续推进”等列表中的活跃周期判定逻辑。当前系统在判定任务是否跨天（活跃）时，过度依赖 `plannedStartAt` 字段，导致当用户将一个进行中的任务排期到未来某天时，该任务会错误地从今天的持续推进列表中消失。

需要修改相关逻辑（主要在 `WorkspaceEngine` 的衍生链路中），当任务处于 `IN_PROGRESS`、`PAUSED` 状态或具有 `STARTED` 历史日志时，强制以历史活动时间作为起始边界，不再受 `plannedStartAt` 的干扰。

## Acceptance criteria

- [x] 修改底层的日期判定逻辑，针对已开始的任务剥离对 `plannedStartAt` 的依赖。
- [x] 确保测试用例覆盖“将 IN_PROGRESS 任务的计划时间修改到明天后，今天依旧显示在持续推进列表中”的场景。
- [x] 确保没有破坏对 TODO 任务原有时间边界的判定规则。

## Blocked by

None - can start immediately
