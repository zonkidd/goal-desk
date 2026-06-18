# TimelineBuilder 统一实现

## 概述

实现架构改进候选 2：创建统一的 TimelineBuilder 模块，消除理解"时间线如何生成"需要跨越多个文件的局部性问题。

## 改进前的问题

理解时间线生成需要跨越 4 个文件：
1. `desktopApi.ts` - 数据从哪来，部分转换
2. `TimelineService.ts` - 如何合并事件
3. `workspaceDerivation.ts` - 如何过滤到今天
4. `DerivedStateManager.ts` - 缓存策略

**局部性缺失**：概念分散在多个模块。

## 解决方案

创建深层模块 `TimelineBuilder`，提供清晰的单一入口。

### 新增文件

- `src/lib/TimelineBuilder.ts` - 统一的时间线构建器
- `src/lib/TimelineBuilder.test.ts` - 完整的测试覆盖

### TimelineBuilder API

```typescript
export class TimelineBuilder {
  /**
   * 从 desktop snapshot 构建完整时间线
   * 包含：EventKit 事件、系统提醒、Desk 任务
   */
  static fromSnapshot(
    snapshot: {
      events: CalendarEvent[]
      reminders: ReminderItem[]
      tasks: Task[]
    },
    now?: Date
  ): TimelineItem[]

  /**
   * 过滤到今天的时间线项
   * 包含：今天的事件 + 未完成的任务
   */
  static filterToday(
    timeline: TimelineItem[],
    now?: Date
  ): TimelineItem[]

  /**
   * 按领域过滤时间线
   */
  static applyAreaFilter(
    timeline: TimelineItem[],
    area: AreaFilter | null,
    goals?: GoalCard[]
  ): TimelineItem[]

  /**
   * 按日期分组（用于日历周视图）
   */
  static groupByDate(
    timeline: TimelineItem[]
  ): Map<string, TimelineItem[]>
}
```

## 实施步骤

### 阶段 1: 创建 TimelineBuilder（测试先行）✅

1. 创建 `TimelineBuilder.ts`
2. 创建 `TimelineBuilder.test.ts`，18 个测试用例全部通过
3. 更新 `TimelineService.ts` 支持 `now` 参数

### 阶段 2: 迁移现有逻辑 ✅

**更新的文件：**

1. **desktopApi.ts**:
   - 导入 `TimelineBuilder` 替代 `buildTimeline`
   - 简化 `loadDesktopSnapshot()`，使用 `TimelineBuilder.fromSnapshot()`
   - 删除不再需要的 `formatTimeLabel` 和 `parseDateFields` 辅助函数

2. **workspaceDerivation.ts**:
   - 导入 `TimelineBuilder`
   - 保留 `deriveTodayTimeline()`（负责将 Desk Tasks 添加到时间线）
   - 添加 `startsAt` 和 `linkedGoalId` 字段到任务项

3. **CalendarView.tsx**:
   - 导入 `TimelineBuilder` 替代 `groupTimelineByDate`
   - 使用 `TimelineBuilder.groupByDate()` 按日期分组

4. **CalendarView.test.tsx**:
   - 更新所有测试 mock，添加 `baseTimeline` 字段
   - 所有 37 个测试用例通过

### 阶段 3: 测试验证 ✅

- `TimelineBuilder.test.ts`: 18/18 通过 ✅
- `CalendarView.test.tsx`: 37/37 通过 ✅
- 所有其他测试: 199/199 通过 ✅

## 预期结果

✅ **单一入口**：理解时间线生成只需看 `TimelineBuilder.ts` 一个文件
✅ **清晰接口**：4 个静态方法，职责明确
✅ **隐藏细节**：调用方无需理解内部如何合并、过滤、分组
✅ **易于测试**：每个方法是纯函数，有完整的测试覆盖
✅ **向后兼容**：保留了 `TimelineService` 作为内部实现

## 注意事项

- **TimelineService 保留**：它是良好的深层模块，作为 TimelineBuilder 的内部实现
- **防御性检查**：所有方法都添加了数组类型检查，避免运行时错误
- **deriveTodayTimeline 保留**：它有特殊职责（将 Desk Tasks 添加到时间线），暂时保留在 workspaceDerivation.ts

## 后续优化建议

1. 考虑将 `deriveTodayTimeline` 的逻辑也整合到 TimelineBuilder
2. 评估是否可以将 `calendarUtils.ts` 中的其他工具函数迁移到 TimelineBuilder
3. 考虑为 TimelineBuilder 添加更多便捷方法，如 `filterBySource`、`filterByDateRange` 等

## 相关文档

- [EventKit Integration Complete](./eventkit-integration-complete.md)
- [深层模块原则](../../AGENTS.md#深层模块原则)
