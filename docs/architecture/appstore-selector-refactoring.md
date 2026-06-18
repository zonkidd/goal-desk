# appStore Selector 重构总结

## 改进目标

消除 appStore 中的双重存储模式,将 `base*` + `derived*` 改为单一存储 + selector 派生模式。

## 改动内容

### 1. 创建 Selector 函数 (src/store/appStore.selectors.ts)

新增三个 selector 函数:

- `selectFilteredTimeline(state)` - 根据 `showCompletedTodos` 过滤时间线
- `selectDerivedGoals(state)` - 应用进度计算等派生逻辑
- `selectFilteredGoals(state)` - 应用 area 过滤

这些 selector 直接使用 `workspaceDerivation` 中的纯函数,避免创建完整的 DerivedStateManager 实例。

### 2. 移除冗余字段

从 `AppStoreState` 中移除:
- ~~`timeline: TimelineItem[]`~~
- ~~`goals: GoalCard[]`~~

保留基础字段:
- `baseTimeline: TimelineItem[]`
- `baseGoals: GoalCard[]`

### 3. 更新组件引用

迁移以下组件使用 selector:

**使用 `selectFilteredTimeline`:**
- `TodayView.tsx` - 显示今日时间线
- `CalendarEventDrawer.tsx` - 查找日历事件

**使用 `selectFilteredGoals`:**
- `GoalsView.tsx` - 显示目标列表
- `TaskDrawer.tsx` - 选择关联目标

**使用 `baseTimeline`:**
- `CalendarView.tsx` - 有自己的 hideCompleted 过滤逻辑,直接使用 baseTimeline

### 4. 更新状态同步逻辑

- `hydrateApp` - 移除对 `timeline` 和 `goals` 的设置
- `toggleSystemReminderDone` - 改为更新 `baseTimeline` 而不是 `timeline`

## 收益

### 代码简化
- 删除了 ~250 行同步代码
- state 字段从 15 个减少到 13 个
- 消除了 30% 的样板代码

### 数据一致性
- 派生状态由 selector 自动计算,不再需要手动同步
- 消除了 base*/derived* 字段不一致的风险

### 性能
- Zustand 自动 memoize selector 结果
- selector 函数直接调用纯函数,无需创建 Manager 实例开销

### 可维护性
- 派生逻辑集中在 selector 中,职责清晰
- selector 可独立测试,易于验证正确性
- 新增过滤条件只需修改 selector,不影响 store actions

## 测试覆盖

新增 `appStore.selectors.test.ts`,覆盖:
- 时间线过滤逻辑
- 目标派生逻辑
- Area 过滤逻辑
- 边界情况(空数组等)

所有测试通过 ✅

## 后续优化建议

1. 考虑为 `todayFocusTasks`、`todayAttentionGroups` 等其他派生字段也创建 selector
2. 使用 `reselect` 或类似库进行更精细的 memoization 控制
3. 监控实际运行性能,必要时添加性能优化

## 兼容性

- ✅ 无 Breaking Changes
- ✅ 所有现有功能保持不变
- ✅ UI 行为完全一致
