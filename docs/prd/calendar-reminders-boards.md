# PRD: 日历看板与提醒看板

**状态**: 已实现 ✅  
**更新日期**: 2026-06-17  
**优先级**: P1  
**标签**: `implemented`, `feature`, `ui`

---

## Problem Statement

用户在使用 Goal Desk 管理任务和目标时，虽然可以在"今日焦点"视图中看到混合的时间线（Todos、Calendar Events、Reminders），但缺乏独立的日历视图和提醒视图来：

1. **查看整周或整月的日程安排** - 用户需要更宏观的视角来规划时间，而不是仅聚焦于单日
2. **按清单或时间维度管理系统提醒** - 系统提醒分散在多个清单中，缺乏统一的管理入口
3. **快速识别某一天的忙碌程度** - 用户无法一眼看出本周哪些天日程密集

当前的"今日焦点"视图虽然提供了时间线整合，但其设计目标是"今天要做什么"，而非"本周/本月的时间安排是什么"。用户需要两个新的专门视图来满足日历浏览和提醒管理的场景。

---

## Solution

新增两个独立的视图页面，放置在导航栏中"今日焦点"和"目标看板"之间：

### 1. 日历看板 (Calendar View)

提供**周视图**和**日视图**两种模式：

- **周视图**（默认）：类似 macOS 原生日历，7 列网格布局（周一到周日），每个日期格子下方直接显示当天的所有事件（Calendar Events、System Reminders、Desk Tasks）
- **日视图**：左侧月历选择器（360px）+ 右侧当日事件详细列表，复用现有"今日焦点"的时间线设计

两种视图通过顶部 Tab 切换，用户可以根据场景选择：周视图用于规划整周，日视图用于聚焦单日。

### 2. 提醒看板 (Reminders View)

提供**按清单**和**按时间**两种视图模式：

- **按清单视图**：自适应网格布局（2-4列），每个 Reminder List 显示为独立的卡片面板，清单内的提醒以复选框列表形式展示
- **按时间视图**：按紧急度分组（已过期 / 今天 / 未来7天 / 更晚 / 无日期），可折叠，不同颜色区分优先级

两种视图通过顶部 Tab 切换，支持全局"隐藏已完成"开关，点击提醒项打开详情抽屉，复选框勾选同步到系统提醒。

---

## User Stories

1. 作为一个需要规划每周工作的用户，我希望看到本周七天的所有日程安排，以便合理分配任务时间
2. 作为一个使用 macOS 日历和提醒的用户，我希望在 Goal Desk 中直接查看和操作这些系统数据，避免频繁切换应用
3. 作为一个有多个提醒清单的用户，我希望看到所有清单的概览，快速定位需要处理的提醒
4. 作为一个关注截止时间的用户，我希望按时间维度查看提醒，优先处理已过期和今天的事项
5. 作为一个需要查看具体日期安排的用户，我希望点击周视图中的某一天，快速切换到该日的详细视图
6. 作为一个希望了解本周工作负荷的用户，我希望一眼看出哪些天的事件较多，哪些天相对空闲
7. 作为一个在会议间隙查看日程的用户，我希望日历事件显示时间和地点，方便快速定位
8. 作为一个使用"购物清单"的用户，我希望在按清单视图中看到该清单的所有待买物品，而不是分散在时间维度中
9. 作为一个完成提醒后的用户，我希望勾选复选框后提醒状态同步到系统，在系统提醒中也能看到已完成状态
10. 作为一个不想被已完成项干扰的用户，我希望有"隐藏已完成"开关，保持列表简洁
11. 作为一个在周五规划下周的用户，我希望点击"下一周"按钮，查看下周的日程安排
12. 作为一个想要回顾上周工作的用户，我希望点击"上一周"按钮，查看历史日程
13. 作为一个有多个工作日历的用户，我希望通过颜色和来源标签区分不同来源的事件（日历事件 vs 提醒 vs 待办）
14. 作为一个点击日历事件的用户，我希望打开详情抽屉查看完整信息（时间、地点、参与者、备注）
15. 作为一个点击系统提醒的用户，我希望打开提醒详情抽屉，查看提醒的清单归属、截止时间和备注
16. 作为一个点击 Desk Task 的用户，我希望打开任务抽屉，查看任务的目标关联、状态和活动日志
17. 作为一个在周视图中看到事件过多的用户，我希望事件卡片支持垂直滚动，不遮挡其他日期
18. 作为一个习惯键盘操作的用户，我希望用方向键在周视图的日期间快速切换（未来增强）
19. 作为一个需要拖拽调整任务时间的用户，我希望在周视图中拖动 Desk Task 卡片到其他日期（未来增强）
20. 作为一个查看今天日期的用户，我希望"今天"在周视图中高亮显示（特殊背景色 + 脉冲动画）
21. 作为一个在不同视图间切换的用户，我希望切换动画流畅自然，给予视觉连贯性
22. 作为一个在按清单视图中看到空清单的用户，我希望看到占位符提示"暂无提醒事项"
23. 作为一个在按时间视图中看到多个分组的用户，我希望默认展开"已过期"和"今天"分组，其他分组默认折叠
24. 作为一个需要展开/折叠时间分组的用户，我希望点击分组标题时有旋转动画提示状态变化
25. 作为一个在手机上使用的用户，我希望布局能适配小屏幕（未来移动端优化）
26. 作为一个在日视图中选择日期的用户，我希望月历中有事件的日期显示不同的背景色
27. 作为一个查看日视图事件列表的用户，我希望事件按时间升序排列，早上的在上方
28. 作为一个需要快速回到今天的用户，我希望有"回到今天"快捷按钮（未来增强）
29. 作为一个在周视图中看到跨天事件的用户，我希望该事件在多个日期格子中都显示（未来增强）
30. 作为一个需要导出日历数据的用户，我希望能导出为 iCal 格式（未来增强，超出当前范围）

---

## Implementation Decisions

### 架构决策

**新增视图类型**

在 `ViewKey` 类型中新增 `'calendar'` 和 `'reminders'`：

```typescript
// src/types/app.ts
export type ViewKey = 'inbox' | 'today' | 'board' | 'goals' | 'areas' | 'calendar' | 'reminders'
```

**组件结构**

创建两个顶层视图组件：

- `src/components/views/CalendarView.tsx`
- `src/components/views/RemindersView.tsx`

每个组件内部包含视图模式状态（`useState`）和子组件拆分：

- CalendarView:
  - `WeekView` (周视图主组件)
    - `WeekDayColumn` (单日列)
    - `WeekEventCard` (事件卡片)
  - `DayView` (日视图主组件，复用 TodayView 的月历和事件列表逻辑)

- RemindersView:
  - `ByListView` (按清单视图)
    - `ReminderListPanel` (清单面板)
    - `ReminderCard` (提醒卡片)
  - `ByTimeView` (按时间视图)
    - `TimeGroup` (时间分组)
    - `TimeGroupReminderCard` (分组内提醒卡片)

**状态管理**

视图模式状态（week/day, byList/byTime）由组件内部 `useState` 管理，不需要全局持久化。

隐藏已完成状态可选持久化到 `localStorage`，但初期版本使用组件内部状态即可。

分组折叠状态使用 `Set<string>` 管理，默认展开 `['overdue', 'today']`。

**数据流**

CalendarView 从 `appStore` 读取：
- `timeline: TimelineItem[]` - 已经混合了三种来源的时间线数据
- 需要按日期过滤：周视图需要当前周的 7 天数据，日视图需要选中日期的数据

RemindersView 从 `appStore` 读取：
- `systemReminders: ReminderItem[]` - 系统提醒数据
- `toggleSystemReminderDone(id, done)` - 切换完成状态
- `openReminderDrawer(id)` - 打开详情抽屉

**时间线数据按日期过滤**

CalendarView 需要新增辅助函数将 `timeline` 按日期分组：

```typescript
function groupTimelineByDate(timeline: TimelineItem[]): Map<string, TimelineItem[]> {
  // 将 timeLabel 解析为 Date，按 YYYY-MM-DD 分组
  // 返回 Map<'2026-06-16', [item1, item2, ...]>
}
```

**EventKit 数据加载范围扩展**

当前 `loadDesktopSnapshot()` 只加载今天的 EventKit 数据。需要新增 Tauri command：

```rust
#[tauri::command]
async fn load_calendar_range(
    app: AppHandle,
    start_date: String,  // ISO 8601 格式
    end_date: String
) -> Result<CalendarRangeData, String>
```

返回指定日期范围的 Calendar Events 和 Reminders，前端在周视图初始化时调用，加载当前周 ± 1 周的数据（共 3 周），缓存在组件状态中。

**提醒数据按清单/时间分组**

RemindersView 需要两个辅助函数：

```typescript
function groupRemindersByList(reminders: ReminderItem[]): Map<string, ReminderItem[]>
function groupRemindersByTime(reminders: ReminderItem[]): {
  overdue: ReminderItem[]
  today: ReminderItem[]
  next7days: ReminderItem[]
  later: ReminderItem[]
  nodate: ReminderItem[]
}
```

### 视觉设计决策

**事件来源颜色系统**（已在原型中定义）

```typescript
const eventStyles = {
  calendar: {
    border: 'border-l-purple-500',
    bg: 'bg-purple-50',
    text: 'text-purple-900',
    label: 'text-purple-600',
  },
  reminder: {
    border: 'border-l-orange-500',
    bg: 'bg-orange-50',
    text: 'text-orange-900',
    label: 'text-orange-600',
  },
  todo: {
    border: 'border-l-indigo-500',
    bg: 'bg-indigo-50',
    text: 'text-indigo-900',
    label: 'text-indigo-600',
  },
}
```

**时间分组颜色系统**

```typescript
const timeGroupStyles = {
  overdue: { color: 'text-red-600', bg: 'bg-red-50/30', border: 'border-l-red-500' },
  today: { color: 'text-orange-600', bg: 'bg-orange-50/30', border: 'border-l-orange-500' },
  next7days: { color: 'text-indigo-600', bg: 'bg-indigo-50/30', border: 'border-l-indigo-500' },
  later: { color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-l-slate-500' },
  nodate: { color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-l-slate-400' },
}
```

**动画规范**

- 视图切换：`framer-motion` 的 `initial/animate/exit`，0.3s 过渡
- 事件卡片入场：交错动画，每项延迟 0.05s
- 悬停效果：`whileHover={{ x: 4, scale: 1.02 }}`
- 点击效果：`whileTap={{ scale: 0.98 }}`
- 分组折叠：高度 0 ↔ auto，箭头旋转 0° → 180°

**布局规范**

- 周视图日列最小高度：500px
- 日视图左侧月历宽度：360px（固定）
- 提醒按清单网格：`minmax(280px, 1fr)`，自适应 2-4 列
- 面板圆角：`rounded-3xl` (24px)
- 卡片圆角：`rounded-xl` (12px)
- 小卡片圆角：`rounded-lg` (8px)

### 交互决策

**Tab 切换交互**

顶部 Tab 使用 GlassPanel 包裹的按钮组，激活状态有白色背景 + 阴影，非激活状态半透明文字。点击切换时触发 `AnimatePresence` 的视图过渡动画。

**事件卡片点击行为**

点击事件卡片时，根据 `source` 类型打开不同的抽屉：
- `source === 'calendar'` → `openCalendarEventDrawer(id)`
- `source === 'reminder'` → `openReminderDrawer(id)`
- `source === 'todo'` → `openTaskDrawer(id)`

**提醒复选框行为**

勾选/取消勾选时：
1. 调用 `toggleSystemReminderDone(id, done)` 同步到系统
2. 如果"隐藏已完成"开关打开，已完成的提醒淡出并从列表移除
3. 提醒卡片添加 `opacity-60` 和划线样式表示已完成

**分组折叠行为**

点击分组标题时：
1. 切换 `expandedGroups` Set 中该分组的状态
2. 箭头图标旋转 180°
3. 分组内容区域高度从 0 展开到 auto（或反向）

### 导航集成

在 `Sidebar.tsx` 中新增两个导航按钮，顺序为：

```
📥 收件箱 (inbox)
🌟 今日焦点 (today)
📅 日历看板 (calendar)  ← 新增
⏰ 提醒看板 (reminders)  ← 新增
📊 目标看板 (board)
🎯 目标管理 (goals)
🏷️ 领域管理 (areas)
```

在 `AppShell.tsx` 中添加视图路由：

```tsx
{currentView === 'calendar' && <CalendarView />}
{currentView === 'reminders' && <RemindersView />}
```

### 复用现有组件

两个新视图复用以下现有组件和样式：
- `GlassCard` - 卡片容器
- `GlassPanel` - 面板容器
- `TaskDrawer` - 打开 Desk Task 详情
- `SystemReminderDrawer` - 打开系统提醒详情
- `CalendarEventDrawer` - 打开日历事件详情（只读）
- `globals.css` 中的 `.mesh-bg`, `.glass-card`, `.glass-panel` 样式

---

## Testing Decisions

### 测试原则

遵循"测试外部行为，而非实现细节"原则：
- 不测试内部状态（如 `useState` 的值）
- 测试用户可见的 UI 变化和交互结果
- 测试与 store 的数据契约（输入输出）

### 测试范围

**1. CalendarView 组件测试**

参考：`src/components/views/TodayView.tsx` 的测试模式（如果存在）

测试要点：
- 视图切换：点击"周视图"/"日视图" Tab 后，对应视图内容可见
- 周导航：点击"上一周"/"下一周"按钮，日期范围更新
- 事件按日期分组：给定 `timeline` 数据，验证周视图正确按日期分组显示
- 事件点击：点击不同 source 的事件卡片，验证调用正确的抽屉打开函数
- 隐藏已完成：勾选开关后，已完成的事件从列表中移除

**2. RemindersView 组件测试**

参考：现有视图组件的测试模式

测试要点：
- 视图切换：点击"按清单"/"按时间" Tab 后，对应视图内容可见
- 按清单分组：给定 `systemReminders` 数据，验证按 `listTitle` 正确分组
- 按时间分组：验证按截止时间正确分类到 5 个时间分组
- 复选框切换：勾选提醒时，验证调用 `toggleSystemReminderDone(id, true)`
- 分组折叠：点击分组标题时，验证内容区域展开/折叠
- 隐藏已完成：勾选开关后，`done: true` 的提醒从列表中移除

**3. 数据过滤工具函数测试**

创建 `src/lib/calendarUtils.test.ts` 和 `src/lib/reminderUtils.test.ts`：

测试工具函数：
- `groupTimelineByDate(timeline)` - 给定包含不同日期的 timeline，验证返回正确的分组 Map
- `groupRemindersByList(reminders)` - 验证按 `listTitle` 分组
- `groupRemindersByTime(reminders)` - 验证按截止时间分类到正确的时间桶
- `formatDueDate(date)` - 验证相对时间格式化（"今天", "明天", "3天后", "过期2天"）

**4. 集成测试（可选）**

如果已有 E2E 测试框架（Playwright），可添加：
- 导航到日历看板 → 切换周/日视图 → 点击事件打开抽屉
- 导航到提醒看板 → 切换按清单/按时间视图 → 勾选提醒复选框

### 不测试的内容

- Framer Motion 动画的具体数值（交给视觉回归测试）
- CSS 样式的具体类名（脆弱且不稳定）
- `useState` 内部状态的中间值（实现细节）
- EventKit FFI 层逻辑（已在 `eventkit.rs` 单元测试中覆盖）

---

## Out of Scope

以下功能不在本 PRD 范围内，可作为未来增强：

1. **日历事件创建/编辑** - 根据 ADR-001，日历事件只读，不支持在 Goal Desk 中创建或修改
2. **系统提醒创建** - 当前只支持查看和标记完成，不支持在 Goal Desk 中创建新的系统提醒
3. **拖拽调整事件时间** - 周视图中拖动事件卡片到其他日期，需要额外的拖拽库和 EventKit 写入权限
4. **跨天事件显示** - 多日事件（如 3 天的会议）在周视图中跨多个格子显示，需要复杂的布局计算
5. **月视图** - 完整的月历视图（类似 Google Calendar 月视图），需要更密集的事件布局算法
6. **键盘导航** - 用方向键在周视图的日期间切换，需要焦点管理和快捷键系统
7. **事件搜索/过滤** - 按关键词、标签或来源过滤事件列表
8. **导出为 iCal** - 导出选定日期范围的事件为 .ics 文件
9. **与 Desk Task 的双向同步** - 在日历看板中拖动 Desk Task 自动更新其 `plannedStartAt`
10. **提醒清单颜色自定义** - 让用户为每个清单设置自定义颜色（当前使用预设配色）
11. **提醒优先级标记** - 系统提醒本身支持优先级，但 EventKit API 可能不暴露，需要调研
12. **移动端优化** - 当前布局针对桌面设计，移动端需要响应式调整（如单列布局）
13. **离线缓存策略** - EventKit 数据的本地缓存和增量同步机制
14. **分组折叠状态持久化** - 将用户的分组展开/折叠偏好保存到 localStorage 或 SQLite

---

## Further Notes

### 与现有功能的关系

**日历看板 vs 今日焦点**

- "今日焦点"的定位是"今天要推进什么"，强调执行和进度（持续推进任务 + 目标看点）
- "日历看板"的定位是"本周/本月的时间安排"，强调规划和浏览
- 两者数据来源重叠（都读取 `timeline`），但呈现维度不同：Today 是单日聚焦，Calendar 是多日总览

**提醒看板 vs Today 时间轴中的提醒**

- Today 时间轴中的提醒是"今天需要关注的"，按时间排序混合在日历和任务中
- 提醒看板展示"所有提醒的全貌"，支持按清单和时间两种维度切换，方便批量管理

### 性能考虑

**周视图事件数量**

如果某一天的事件超过 10 项，可能导致格子过高。初期版本可接受垂直滚动；未来可优化为：
- 只显示前 5 项，其余显示"+N 项"折叠提示
- 或采用虚拟滚动（react-window）

**大量提醒的渲染性能**

如果用户有超过 100 项提醒，可能出现卡顿。优化方案：
- 使用 `React.memo` 包裹 `ReminderCard` 组件
- 或引入虚拟列表库（react-virtualized）

### 数据一致性

**EventKit 数据的实时性**

当前 EventKit 数据在应用启动时加载一次。如果用户在系统日历/提醒中修改数据，Goal Desk 不会自动刷新。

未来可考虑：
- 定时轮询（每 5 分钟）
- 或监听 macOS 的 `EKEventStoreChangedNotification`（需要 Objective-C 层支持）

**Desk Task 与 Timeline 的同步**

当用户在 TaskDrawer 中修改 `plannedStartAt` 或 `dueDate`，需要重新生成 `timeline` 并刷新日历看板。

当前 `appStore` 的 `updateTaskFields` 已经触发 `DerivedStateManager` 重算，无需额外处理。

### 无障碍访问（Accessibility）

- Tab 按钮和事件卡片需要正确的 `role` 和 `aria-label`
- 复选框需要关联 `label` 元素
- 分组折叠按钮需要 `aria-expanded` 属性
- 键盘导航（Tab / Enter / Space）需要在未来版本中完善

### 国际化（i18n）

当前硬编码了中文文案（"周一"、"已过期"等）。如果未来支持英文：
- 星期名称：使用 `date.toLocaleDateString('en-US', { weekday: 'short' })`
- 时间分组名称：提取到 i18n 配置文件

### 原型文件的作用

统一交互原型 `docs/prototype/prototype-3-current-implementation.html`（已集成日历与提醒看板）用于：
1. 与用户确认视觉设计和交互流程
2. 作为开发参考，确保实现与原型一致
3. 在实现 React 组件时，可直接复用原型中的 Tailwind 类名和布局结构

历史分散的 `calendar-board-v1.html` 和 `reminders-board-v1.html` 已被归档在 `docs/history/prototype/` 目录中。

---

**PRD 作者**: Goal Desk 开发团队  
**审核状态**: 📋 已完成对齐并归档历史版本  
**预计工作量**: 5-8 个工作日（已于 2026-06-17 完全实现 ✅）
