# 日历看板与提醒看板 - React 组件实现

## 📦 新增组件

- `src/components/views/CalendarView.tsx` - 日历看板
- `src/components/views/RemindersView.tsx` - 提醒看板

## 🎨 设计特性

### CalendarView - 日历看板

#### 双视图模式
1. **周视图** (默认)
   - 类似 macOS 原生日历的周视图
   - 7 列网格布局（周一到周日）
   - 事件直接显示在对应日期格子内
   - 当天日期高亮（indigo 背景 + 脉冲动画）
   - 上一周/下一周导航

2. **日视图**
   - 左侧月历选择器（360px）
   - 右侧当日事件详细列表
   - 点击月历快速跳转日期

#### 动画效果
- **视图切换**：`opacity` + `y` 轴位移，平滑过渡 0.3s
- **事件卡片**：
  - 入场：从左侧淡入 + 位移，带延迟交错效果
  - 悬停：向右位移 4px + 放大 1.02 倍
  - 点击：缩小至 0.98 倍（触感反馈）
- **今日日期**：`scale` 脉冲动画 [1 → 1.1 → 1]
- **导航按钮**：悬停放大 1.05 倍

#### 颜色系统
```tsx
// 事件来源区分
calendar: {
  border: 'border-l-purple-500',
  bg: 'bg-purple-50',
  text: 'text-purple-900',
  label: 'text-purple-600',
  hover: 'hover:bg-purple-100',
}
reminder: {
  border: 'border-l-orange-500',
  bg: 'bg-orange-50',
  text: 'text-orange-900',
  label: 'text-orange-600',
  hover: 'hover:bg-orange-100',
}
todo: {
  border: 'border-l-indigo-500',
  bg: 'bg-indigo-50',
  text: 'text-indigo-900',
  label: 'text-indigo-600',
  hover: 'hover:bg-indigo-100',
}
```

---

### RemindersView - 提醒看板

#### 双视图模式
1. **按清单视图**
   - 自适应网格布局 `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`
   - 每个清单独立的 GlassPanel 卡片
   - 清单标题带 emoji 图标和颜色区分
   - 空清单显示占位符提示

2. **按时间视图**
   - 5 个固定时间分组：已过期/今天/未来7天/更晚/无日期
   - 可折叠分组（默认展开"已过期"和"今天"）
   - 不同颜色区分紧急度：
     - 已过期：红色 `text-red-600`
     - 今天：橙色 `text-orange-600`
     - 未来7天：蓝色 `text-indigo-600`
     - 更晚/无日期：灰色 `text-slate-600`

#### 动画效果
- **视图切换**：`opacity` + `scale` 0.95 → 1.0，0.3s
- **清单卡片**：入场交错动画，每个延迟 0.1s
- **提醒项**：
  - 入场：从左淡入，延迟 0.05s/项
  - 退出：向右淡出
- **分组展开/折叠**：
  - 高度：0 ↔ auto，带 opacity 变化
  - 箭头图标旋转：0° → 180°
- **Tab 按钮**：悬停 1.02 倍，点击 0.98 倍

#### 交互功能
- **完成状态**：只读展示系统提醒完成状态
- **点击提醒项**：打开只读提醒详情或系统提醒事项 App
- **隐藏已完成**：全局开关，过滤两种视图
- **分组折叠状态**：localStorage 持久化（可选）

---

## 🔧 技术实现

### 依赖
- `framer-motion` - 动画库（已在项目中）
- `lucide-react` - 图标库（已在项目中）
- `zustand` - 状态管理（已在项目中）

### 组件结构

#### CalendarView
```
CalendarView (主容器)
├── ViewModeTabs (视图切换)
├── AnimatePresence
│   ├── WeekView (周视图)
│   │   ├── Navigation (周导航)
│   │   └── WeekGrid
│   │       ├── DayHeaders (日期头部)
│   │       └── WeekDayColumn[] (日列)
│   │           └── WeekEventCard[] (事件卡片)
│   └── DayView (日视图)
│       ├── MonthCalendar (月历)
│       └── DayEventList (事件列表)
```

#### RemindersView
```
RemindersView (主容器)
├── ViewModeTabs (视图切换)
├── AnimatePresence
│   ├── ByListView (按清单)
│   │   └── ListPanel[]
│   │       └── ReminderCard[]
│   └── ByTimeView (按时间)
│       └── TimeGroup[]
│           └── TimeGroupReminderCard[]
```

### 数据流
```tsx
// 获取系统提醒
const systemReminders = useAppStore((state) => state.systemReminders)

// 打开系统提醒事项
const openSystemReminder = useAppStore((state) => state.openSystemReminder)

// 打开抽屉
const openReminderDrawer = useAppStore((state) => state.openReminderDrawer)
```

---

## 🚀 集成步骤

### 1. 更新路由配置

在 `src/components/shell/AppShell.tsx` 中添加新视图：

```tsx
import { CalendarView } from '../views/CalendarView'
import { RemindersView } from '../views/RemindersView'

// ...

{currentView === 'calendar' && <CalendarView />}
{currentView === 'reminders' && <RemindersView />}
```

### 2. 更新导航栏

在 `src/components/shell/Sidebar.tsx` 中添加导航按钮：

```tsx
<button
  onClick={() => setView('calendar')}
  className={`sidebar-item ${currentView === 'calendar' ? 'active' : ''}`}
>
  📅 日历看板
</button>
<button
  onClick={() => setView('reminders')}
  className={`sidebar-item ${currentView === 'reminders' ? 'active' : ''}`}
>
  ⏰ 提醒看板
</button>
```

### 3. 更新类型定义

在 `src/types/app.ts` 中添加新的 ViewKey：

```tsx
export type ViewKey = 'inbox' | 'today' | 'board' | 'goals' | 'areas' | 'calendar' | 'reminders'
```

### 4. 数据对接

CalendarView 和 RemindersView 已经使用 `useAppStore` 连接到状态管理，需要确保：

- `timeline` - 时间轴数据（已有）
- `systemReminders` - 系统提醒数据（已有）
- `openSystemReminder` - 打开系统提醒事项（只读外部源）
- `openReminderDrawer` - 打开提醒详情抽屉（已有）

**注意**：CalendarView 中的 `WeekView` 组件目前使用 Mock 数据，需要根据实际 `timeline` 数据按日期分组过滤。

---

## 🎯 待完善功能

### CalendarView
- [ ] DayView 完整实现（月历选择器 + 事件列表）
- [ ] 从 `timeline` 按日期过滤事件数据
- [ ] 周视图支持拖拽调整事件时间
- [ ] 跨周/跨月事件的显示优化

### RemindersView
- [ ] 与真实 `systemReminders` 数据对接
- [ ] 分组折叠状态持久化到 localStorage
- [ ] 支持新建提醒（调用 EventKit API）
- [ ] 支持拖拽排序和分组移动

---

## 📐 设计规范

### 间距系统
- 组件间距：`gap-6` (24px)
- 卡片内边距：`p-6` (24px)
- 小卡片内边距：`p-3` (12px)
- 事件卡片内边距：`p-2` (8px)

### 圆角系统
- 大面板：`rounded-3xl` (24px)
- 卡片：`rounded-xl` (12px)
- 小卡片：`rounded-lg` (8px)
- Tab/按钮：`rounded-2xl` (16px)

### 字体大小
- 页面标题：`text-4xl font-extrabold` (36px)
- 面板标题：`text-xl font-bold` (20px)
- 分组标题：`text-lg font-bold` (18px)
- 事件标题：`text-sm font-bold` (14px)
- 事件详情：`text-xs` (12px)
- 周视图事件：`text-[11px]` (11px)

### 动画时长
- 视图切换：0.3s
- 卡片入场：0.2s
- 悬停效果：0.2s
- 折叠展开：0.2s

---

## 📝 使用示例

### 基础使用
```tsx
import { CalendarView } from './components/views/CalendarView'
import { RemindersView } from './components/views/RemindersView'

function App() {
  return (
    <>
      <CalendarView />
      <RemindersView />
    </>
  )
}
```

### 自定义初始视图
```tsx
// CalendarView 默认显示周视图
<CalendarView initialView="week" />

// RemindersView 默认显示按清单视图
<RemindersView initialView="byList" />
```

---

## 🐛 已知问题

1. **性能优化**：大量事件时（>50项）周视图可能出现卡顿，需要虚拟滚动优化
2. **移动端适配**：当前布局针对桌面设计，小屏幕需要响应式调整
3. **时区处理**：日期计算未考虑时区差异，需要统一使用 `DateTime<Local>`

---

## 📚 参考资源

- [Framer Motion 文档](https://www.framer.com/motion/)
- [Lucide Icons](https://lucide.dev/)
- [Tailwind CSS 文档](https://tailwindcss.com/)
- [macOS Calendar 设计规范](https://developer.apple.com/design/human-interface-guidelines/components/layout-and-organization/collections)

---

**创建日期**: 2026-06-16  
**作者**: Goal Desk 开发团队  
**版本**: v1.0
