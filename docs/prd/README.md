# Kairos · 见独 — 功能 PRD/Spec 索引

**更新日期**: 2026-06-14  
**文档版本**: v1.0

---

## 📚 文档说明

本索引整合了 Kairos 所有功能的 PRD（Product Requirement Document）和 Spec（Technical Specification）文档。每个功能都包含完整的需求定义、技术实现和设计决策。

**文档分类**：

- **PRD（产品需求文档）**：面向产品经理和用户，描述功能价值、用户流程、交互设计
- **Spec（技术规格文档）**：面向开发者，描述技术实现、数据结构、API 设计

**文档状态标识**：

- ✅ 已完成：功能已实现，文档已完整
- 🔄 进行中：功能开发中，文档同步更新
- 📋 计划中：功能规划中，文档待编写

---

## 🎯 核心功能 PRD

### 1. Quick Capture（快速捕获）✅

**文档路径**: [`docs/prd/quick-capture.md`](./quick-capture.md)  
**功能状态**: 已实现 ✅  
**最后更新**: 2026-06-14

**功能概述**：
全局快捷键 `Option+Space` 快速记录任务，支持自然语言时间解析，无需切换应用。

**核心特性**：

- 全局快捷键（`Option+Space`）和应用内快捷键（`Cmd+K`）
- 独立窗口模式 + Modal 模式自动切换
- 自然语言解析："明天下午三点"、"今晚"等
- 提交即关闭，无摩擦捕获

**关键文件**：

- `src/lib/quickCapture.ts` - 自然语言解析
- `src/components/modal/QuickCaptureModal.tsx` - Modal 模式
- `src/components/modal/QuickCaptureWindow.tsx` - 独立窗口

---

### 2. Inbox View（收件箱视图）✅

**文档路径**: [`docs/prd/inbox-view.md`](./inbox-view.md)  
**功能状态**: 已实现 ✅  
**最后更新**: 2026-06-14

**功能概述**：
展示所有未归类、进行中或被暂停的待办事项，按状态分组，支持快速添加和管理。

**核心特性**：

- 按状态分组：Recently Added & Todo / Paused / Completed
- 快速输入框：顶部内联输入，Enter 提交
- 完成任务折叠：默认隐藏，点击展开
- 状态可视化：暂停原因、完成记录直接展示

**关键文件**：

- `src/components/views/InboxView.tsx` - Inbox 视图
- `src/lib/workspaceDerivation.ts` - 分组逻辑

---

### 3. Today View（今日焦点）✅

**文档路径**: [`docs/prd/today-view.md`](./today-view.md)  
**功能状态**: 已实现 ✅  
**最后更新**: 2026-06-14

**功能概述**：
在时间流中推进顶层目标，展示今日持续推进任务、目标进度和时间轴。

**核心特性**：

- **今日持续推进**：筛选 `startDay ≤ today ≤ dueDay` 的任务，展示已推进天数和剩余天数
- **今日目标看点**：由持续推进任务牵引的目标，显示进度和 Next Todo
- **今日时间轴**：合并 Desk Task、Apple Reminders、Calendar Events
- **时间展示策略**：🔥 ≤2 天 / ⏰ 3-7 天 / ✅ >7 天 / ∞ 无截止

**关键文件**：

- `src/components/views/TodayView.tsx` - Today 视图
- `src/lib/taskPresentation.ts` - 时间展示逻辑

---

### 4. Goals View（目标视图）✅

**文档路径**: [`docs/prd/goals-view.md`](./goals-view.md)  
**功能状态**: 已实现 ✅  
**最后更新**: 2026-06-14

**功能概述**：
以目标为核心组织任务，支持目标创建、状态管理、看板视图和领域筛选。

**核心特性**：

- 全部目标模式 vs 领域看板模式
- 目标看板：按状态分组（推进中/等待中/已收束）
- 目标卡片：显示进度、任务数、Next Todo
- 内联创建：左侧面板快速创建目标

**关键文件**：

- `src/components/views/GoalsView.tsx` - Goals 视图
- `src/components/drawer/GoalDrawer.tsx` - 目标详情抽屉

---

### 5. Board View（看板视图）✅

**文档路径**: [`docs/prd/board-view.md`](./board-view.md)  
**功能状态**: 已实现 ✅  
**最后更新**: 2026-06-14

**功能概述**：
把 Inbox 中的任务推进到具体状态，三列看板展示（计划中/进行中/完成）。

**核心特性**：

- 三列看板布局：TODO / IN_PROGRESS+PAUSED / DONE
- 领域筛选：按 activeArea 过滤任务
- 卡片展示：任务标题、状态、关联目标

**关键文件**：

- `src/components/views/BoardView.tsx` - Board 视图

---

### 6. Areas View（领域管理）✅

**文档路径**: [`docs/areas-redesign-prd.md`](../areas-redesign-prd.md)  
**功能状态**: 已实现 ✅  
**最后更新**: 2026-06-13

**功能概述**：
管理目标分类领域，支持创建、重命名、删除，确保数据一致性。

**核心特性**：

- Area 作为强实体（禁止自由标签）
- 系统 Area "未分类"（不可删除）
- 删除 Area 时自动迁移 Goals
- 卡片网格布局，显示目标数和活跃数

**关键文件**：

- `src/components/views/AreasView.tsx` - Areas 视图
- `src/components/shared/AreaSelectWithCreate.tsx` - 领域选择器

---

### 7. Calendar & Reminders Boards（日历与提醒看板）✅

**文档路径**: [`docs/prd/calendar-reminders-boards.md`](./calendar-reminders-boards.md)  
**功能状态**: 已实现 ✅  
**最后更新**: 2026-06-17

**功能概述**：
整合 macOS 系统的日历事件和提醒事项，提供宏观的周/日日历视图和按清单/按时间的提醒事项看板，在应用内统一管理。

**核心特性**：

- **日历周视图**：7 列日程，汇集 Calendar、Reminders 和 Desk Tasks，支持日期跨周导航与高亮
- **日历日视图**：左侧日历时间选择，右侧当日详细日程混合流
- **提醒按清单**：2-4 列自适应网格排布各清单，支持勾选状态双向同步与隐藏已完成
- **提醒按时间**：已过期/今天/未来 7 天/更晚/无日期 5 个分类的折叠与展开分组

**关键文件**：

- `src/components/views/CalendarView.tsx` - 日历看板
- `src/components/views/RemindersView.tsx` - 提醒看板
- `src/lib/calendarUtils.ts` - 日历分组计算
- `src/lib/reminderUtils.ts` - 提醒分组计算

---

## 🛠️ 技术规格 Spec

### 1. Task 状态机系统 ✅

**文档路径**: [`docs/spec/task-state-machine.md`](../spec/task-state-machine.md)  
**功能状态**: 已实现 ✅  
**最后更新**: 2026-06-14

**系统概述**：
定义任务生命周期的所有状态（TODO/IN_PROGRESS/PAUSED/DONE）及转换规则。

**核心内容**：

- 状态定义和语义
- 状态转换图（State Diagram）
- 合法转换表和实现逻辑
- 活动日志系统
- StatusMachineButtons 组件

**关键文件**：

- `src/lib/taskStateMachine.ts` - 前端状态机逻辑
- `src-tauri/src/domain.rs` - 后端状态机逻辑
- `src/components/drawer/StatusMachineButtons.tsx` - 状态按钮组件

---

### 2. TaskDrawer 系统 ✅

**文档路径**: [`docs/spec/task-drawer.md`](../spec/task-drawer.md)  
**功能状态**: 已实现 ✅  
**最后更新**: 2026-06-14

**系统概述**：
右侧抽屉式任务详情编辑器，支持状态转换、时间规划、目标关联、Markdown 编辑。

**核心功能**：

- 状态机按钮组（Start/Pause/Resume/Complete）
- 时间选择器（plannedStartAt / dueDate）
- 富文本内容编辑（Markdown 三种模式：预览/编辑/分屏）
- 活动日志时间线
- 关联目标选择器（支持内联创建目标）
- Bear URL Scheme 集成

**关键文件**：

- `src/components/drawer/TaskDrawer.tsx` - 主组件
- `src/lib/todoEditing.ts` - 编辑逻辑封装

---

### 3. GoalDrawer 系统 ✅

**文档路径**: [`docs/spec/goal-drawer.md`](../spec/goal-drawer.md)  
**功能状态**: 已实现 ✅  
**最后更新**: 2026-06-14

**系统概述**：
右侧抽屉式目标详情编辑器，支持状态管理、进度展示、关联任务管理。

**核心功能**：

- 目标状态按钮组（ACTIVE/PAUSED/COMPLETED/ARCHIVED）
- 领域选择器（AreaSelectWithCreate）
- 进度展示（自动计算）
- 快速添加任务（关联到当前目标）
- 关联任务列表

**关键文件**：

- `src/components/drawer/GoalDrawer.tsx` - 主组件

---

### 4. Goal 状态机系统 ✅

**文档路径**: [`docs/spec/goal-state-machine.md`](../spec/goal-state-machine.md)  
**功能状态**: 已实现 ✅  
**最后更新**: 2026-06-14

**系统概述**：
定义目标生命周期的所有状态（ACTIVE/PAUSED/COMPLETED/ARCHIVED/READY_TO_COMPLETE）及转换规则。

**核心内容**：

- 状态定义和语义
- 状态转换图（允许双向转换）
- READY_TO_COMPLETE 自动计算逻辑
- Goals View 看板分组规则
- 前后端一致性保证

**关键文件**：

- `src/lib/workspaceDerivation.ts` - `deriveGoalStatus()`
- `src-tauri/src/domain.rs` - `Goal::derive_status()`

---

### 5. EventKit 集成系统 ✅

**文档路径**: [`docs/spec/eventkit-integration.md`](../spec/eventkit-integration.md)  
**功能状态**: 已实现 ✅  
**最后更新**: 2026-06-14

**系统概述**：
桥接 macOS EventKit 框架，读取日历事件和提醒事项，合并到 Today 时间轴。

**核心功能**：

- 请求日历/提醒权限
- 读取今日日历事件（只读）
- 读取系统提醒事项（支持完成状态同步）
- 时间轴数据合并（Calendar / Reminders / Desk Task）
- 跨平台兼容（非 macOS 返回空数据）

**关键文件**：

- `src-tauri/src/eventkit.rs` - Rust EventKit 桥接
- `src-tauri/native/` - Objective-C 原生代码
- `src/lib/desktopApi.ts` - 前端 API 封装

**文档路径**: [`docs/architecture-refactor-summary.md`](../architecture-refactor-summary.md) - 第 1 节  
**功能状态**: 已实现 ✅  
**最后更新**: 2026-06-13

**系统概述**：
DerivedStateManager 封装派生状态计算逻辑，支持智能缓存和选择性计算。

**核心内容**：

- ChangeType 枚举（Everything/TasksOnly/GoalsOnly 等）
- 记忆化缓存策略
- 7 种派生函数（todayAttentionGroups、todayRelevantGoals 等）

**关键文件**：

- `src/lib/DerivedStateManager.ts` - 派生状态管理
- `src/store/appStore.ts` - Zustand store 集成

---

### 5. Repository 层架构 ✅

**文档路径**: [`docs/architecture-refactor-summary.md`](../architecture-refactor-summary.md) - 第 3 节  
**功能状态**: 已实现 ✅  
**最后更新**: 2026-06-13

**系统概述**：
分层 Repository trait 提供精细粒度的数据库操作，避免全量读写。

**核心内容**：

- GoalRepository trait（7 个方法）
- TaskRepository trait（8 个方法）
- AreaRepository trait（5 个方法）
- SQLite 单实体操作优化

**关键文件**：

- `src-tauri/src/repository.rs` - Repository trait 定义和实现
- `src-tauri/src/lib.rs` - Tauri command 调用 Repository

---

### 6. EventKit 集成系统 ✅

**文档路径**: [`docs/spec/eventkit-integration.md`](../spec/eventkit-integration.md)  
**功能状态**: 已实现 ✅  
**最后更新**: 2026-06-14

**系统概述**：
桥接 macOS EventKit 框架，读取日历事件和提醒事项，合并到 Today 时间轴。

**核心功能**：

- 请求日历/提醒权限
- 读取今日日历事件（只读）
- 读取系统提醒事项（支持完成状态同步）
- 时间轴数据合并（Calendar / Reminders / Desk Task）
- 跨平台兼容（非 macOS 返回空数据）

**关键文件**：

- `src-tauri/src/eventkit.rs` - Rust EventKit 桥接
- `src-tauri/native/` - Objective-C 原生代码
- `src/lib/desktopApi.ts` - 前端 API 封装

---

## 📖 按功能模块分类

### 任务管理模块

| 功能                 | PRD | Spec | 状态   |
| -------------------- | --- | ---- | ------ |
| Quick Capture        | ✅  | -    | 已实现 |
| Inbox View           | ✅  | -    | 已实现 |
| Today View           | ✅  | -    | 已实现 |
| Board View           | ✅  | -    | 已实现 |
| Calendar & Reminders | ✅  | ✅   | 已实现 |
| Task 状态机          | -   | ✅   | 已实现 |
| TaskDrawer           | -   | ✅   | 已实现 |

### 目标管理模块

| 功能        | PRD | Spec | 状态   |
| ----------- | --- | ---- | ------ |
| Goals View  | ✅  | -    | 已实现 |
| GoalDrawer  | -   | ✅   | 已实现 |
| Areas 管理  | ✅  | -    | 已实现 |
| Goal 状态机 | -   | ✅   | 已实现 |

### 系统架构模块

| 功能                | PRD | Spec | 状态   |
| ------------------- | --- | ---- | ------ |
| 派生状态管理        | -   | ✅   | 已实现 |
| Repository 层       | -   | ✅   | 已实现 |
| EventKit 集成       | -   | ✅   | 已实现 |
| 状态管理（Zustand） | -   | ✅   | 已实现 |

### UI 组件模块

| 功能                 | PRD | Spec | 状态   |
| -------------------- | --- | ---- | ------ |
| TaskDrawer           | -   | ✅   | 已实现 |
| GoalDrawer           | -   | ✅   | 已实现 |
| ReminderDrawer       | -   | ✅   | 已实现 |
| 活动日志时间线       | -   | ✅   | 已实现 |
| 领域选择器           | -   | ✅   | 已实现 |
| 玻璃拟态组件         | -   | ✅   | 已实现 |
| StatusMachineButtons | -   | ✅   | 已实现 |
| MarkdownContent      | -   | ✅   | 已实现 |

---

## 🎯 按阅读路径推荐

### 新加入的产品经理

**推荐阅读顺序**：

1. [设计理念与架构思想](../design/design-philosophy.md) - 了解产品定位
2. [Quick Capture PRD](./quick-capture.md) - 核心入口功能
3. [Inbox View PRD](./inbox-view.md) - 任务收集中心
4. [Today View 设计](../design/today-workbench-time-display.md) - 时间管理视图
5. [Areas 重设计 PRD](../areas-redesign-prd.md) - 分类体系

### 新加入的前端开发者

**推荐阅读顺序**：

1. [设计理念与架构思想](../design/design-philosophy.md) - 第二章"架构设计原则"
2. [Task 状态机 Spec](../spec/task-state-machine.md) - 核心业务逻辑
3. [派生状态管理](../architecture-refactor-summary.md) - 第 1 节
4. [Quick Capture PRD](./quick-capture.md) - 前端交互示例
5. 代码阅读：`src/store/appStore.ts`、`src/lib/DerivedStateManager.ts`

### 新加入的后端/Rust 开发者

**推荐阅读顺序**：

1. [设计理念与架构思想](../design/design-philosophy.md) - 第六章"数据模型"
2. [Task 状态机 Spec](../spec/task-state-machine.md) - 状态转换规则
3. [Repository 层架构](../architecture-refactor-summary.md) - 第 3 节
4. [Areas 重设计 PRD](../areas-redesign-prd.md) - 数据一致性设计
5. 代码阅读：`src-tauri/src/domain.rs`、`src-tauri/src/repository.rs`

---

## 📝 待创建文档清单

### 高优先级（核心功能）

- [x] **Today View PRD** - 今日焦点视图完整需求 ✅
- [x] **Goals View PRD** - 目标视图功能需求 ✅
- [x] **Board View PRD** - 看板视图功能需求 ✅
- [x] **TaskDrawer Spec** - 任务抽屉技术规格 ✅
- [x] **GoalDrawer Spec** - 目标抽屉技术规格 ✅
- [x] **Goal 状态机 Spec** - 目标状态转换规则 ✅
- [x] **EventKit 集成 Spec** - macOS 原生集成技术规格 ✅

### 中优先级（系统架构）

- [x] **状态管理 Spec** - Zustand store 架构设计 ✅
- [x] **派生状态管理 Spec** - DerivedStateManager 智能缓存 ✅
- [x] **Repository 层 Spec** - 后端数据访问层 ✅

### 低优先级（UI 组件）

- [x] **活动日志时间线 Spec** - ActivityLogTimeline 组件 ✅
- [x] **领域选择器 Spec** - AreaSelectWithCreate 组件 ✅
- [x] **玻璃拟态组件 Spec** - GlassCard/GlassPanel 设计 ✅
- [x] **StatusMachineButtons Spec** - 任务状态按钮组 ✅
- [x] **ReminderDrawer Spec** - 系统提醒抽屉 ✅
- [x] **MarkdownContent Spec** - Markdown 渲染组件 ✅

---

## 🔗 相关资源

### 设计文档

- [设计理念与架构思想](../design/design-philosophy.md)
- [设计资源索引](../design/README.md)
- [原型图 v3](../prototype/prototype-3-current-implementation.html)

### 架构文档

- [架构重构总结](../architecture-refactor-summary.md)
- [CONTEXT.md](../../CONTEXT.md) - 领域语言定义
- [CLAUDE.md](../../CLAUDE.md) - AI 辅助开发指南

### 测试文档

- [快速测试指南](../../QUICK_TEST_GUIDE.md)
- [浏览器模式测试](../../BROWSER_MODE_TESTING.md)

---

## 📊 文档完成度统计

**已完成**:

- PRD: 7 / 7（100%）✅
- Spec: 15 / 15（100%）✅
- 总计: 22 / 22（100%）✅

**完成时间线**:

- ~~2 周内完成核心功能 PRD（5 个）~~ ✅ 已完成 7 个
- ~~1 月内完成核心系统 Spec（3 个）~~ ✅ 已完成 15 个
- ~~3 月内完成所有文档~~ ✅ 2026-06-17 全部完成

---

## 💡 文档贡献指南

### 创建新 PRD 的模板

1. **功能概述**：产品定位、用户价值
2. **功能规格**：布局结构、交互流程、视觉设计
3. **技术实现**：关键文件、数据结构、API 接口
4. **设计决策（ADR）**：为什么这样设计？代价是什么？
5. **测试用例**：功能测试、边界测试
6. **未来优化**：短期/中期/长期计划

### 创建新 Spec 的模板

1. **系统概述**：技术定位、核心职责
2. **架构设计**：模块划分、数据流
3. **接口定义**：API/函数签名、参数说明
4. **实现细节**：算法逻辑、性能优化
5. **测试策略**：单元测试、集成测试
6. **前后端一致性**：类型定义、业务规则同步

---

**文档维护者**: Kairos · 见独 开发团队  
**最后更新**: 2026-06-17  
**联系方式**: 项目 GitHub Issues
