# Kairos · 见独

**在时间流中推进你的顶层目标。**

Kairos（καιρός）— 古希腊语"对的时刻"。见独（jiàn dú）— 取自《庄子·大宗师》"朝彻而后能见独"，穿越纷扰后看见那个唯一重要的东西。

Kairos 是一个**本地优先的 macOS 桌面应用**，以 Goal（目标）为核心组织任务，帮助你在时间流中感知进展节奏，避免待办清单的无序堆积。

<p align="center">
  <em>🔨 开发中 · 尚未正式发版</em>
</p>

---

## 设计理念

### 为什么需要 Kairos？

现有的待办清单工具（Things 3、OmniFocus、Notion）擅长管理"要做什么"，但在"为什么做"这件事上几乎完全缺失。你的任务列表可能越堆越长，但你很难回答：

- 这些待办到底在推进什么目标？
- 目标目前进展如何？还差多少？
- 今天最应该推进的是哪几件事？

**Kairos 的核心设计哲学**：

1. **目标驱动** — 以 Goal 为进度容器，将待办事项关联到目标，让每一个 Todo 都服务于一个清晰的 Outcome
2. **本地优先** — 数据存储在本地 SQLite，无云依赖，保证隐私与速度
3. **时间可视化** — 通过"持续推进"视图，将目标的时间跨度（起始 → 截止）转化为直观的节奏感知
4. **原生集成** — 深度桥接 macOS EventKit（日历 / 提醒事项），在应用内统一管理，避免切换应用

### 与竞品的差异

| 产品      | 定位          | Kairos 的差异                                |
| --------- | ------------- | -------------------------------------------- |
| Things 3  | GTD 待办清单  | 强调 **Goal 进度可视化** 和 **时间跨度管理** |
| OmniFocus | 复杂项目管理  | 专注 **简洁的目标看板** 而非层级项目         |
| Notion    | 知识库 + 任务 | 轻量级桌面应用，**原生性能** 和 **离线优先** |

### 设计语言

- **视觉风格**：玻璃拟态（Glassmorphism）+ 极简主义
- **动画交互**：Framer Motion 驱动的微交互（悬停反馈、卡片淡入）
- **信息层级**：严格字重系统（Black → Extrabold → Bold → Semibold → Medium）

---

## 功能特性

### 🎯 核心功能

| 功能                | 说明                                                   | 状态 |
| ------------------- | ------------------------------------------------------ | ---- |
| **Quick Capture**   | 全局 `Option+Space` 快速捕获想法，支持自然语言时间解析 | ✅   |
| **Today View**      | 今日焦点：持续推进任务、目标看点、统一时间轴           | ✅   |
| **Inbox View**      | 收件箱：按状态分组的任务收集中心                       | ✅   |
| **Goals View**      | 目标看板：按领域 / 全部查看，进度卡片 + Next Todo      | ✅   |
| **Board View**      | 看板视图：TODO / IN_PROGRESS / DONE 三列看板           | ✅   |
| **Areas View**      | 领域管理：强实体分组，卡片网格布局                     | ✅   |
| **Calendar Board**  | 日历周视图 / 日视图，汇集日历事件、提醒和任务          | ✅   |
| **Reminders Board** | 系统提醒按清单 / 按时间只读展示                       | ✅   |

### 🛠 详细功能

#### Quick Capture（快速捕获）

全局快捷键 `Option+Space` 呼出独立窗口，输入即捕获，提交即关闭。

- 零摩擦输入：无需切换到主窗口
- 自然语言解析：`明天下午三点`、`今晚`、`下周三` 等中文时间短语
- 自动识别：Tauri 桌面环境用独立透明窗口，浏览器环境用 Modal 弹窗

<!-- TODO: SCREENSHOT — Quick Capture 窗口截图 -->

> ![Quick Capture](docs/screenshots/quick-capture.png) > _⬆ 截图占位 · 将 `docs/screenshots/quick-capture.png` 替换为实际截图_

---

#### Today View

在时间流中推进顶层目标，告诉你"今天应该做什么"和"离目标还有多远"。

**今日持续推进** — 筛选 `startDay ≤ today ≤ dueDay` 的 `IN_PROGRESS` 任务：

| 紧急度  | 剩余天数 | 图标     |
| ------- | -------- | -------- |
| 🔥 紧急 | ≤ 2 天   | 红色高亮 |
| ⏰ 关注 | 3-7 天   | 橙色提示 |
| ✅ 宽裕 | > 7 天   | 绿色正常 |
| ∞       | 无截止   | 灰色     |

**今日目标看点** — 由持续推进任务牵引的目标，展示进度条和 Next Todo。

**今日时间轴** — 合并三种来源，按时间排序：

- 🟢 Desk Task（你的待办）
- 🔵 Reminder（系统提醒）
- 🟠 Calendar Event（系统日历）

<!-- TODO: SCREENSHOT — Today View 今日焦点截图 -->

> ![Today View](docs/screenshots/today-view.png) > _⬆ 截图占位 · 将 `docs/screenshots/today-view.png` 替换为实际截图_

---

#### Goals View（目标看板）

以 Goal 为核心组织任务，看板按状态分组。

- **Goal 状态流**：`ACTIVE → PAUSED → ACTIVE → READY_TO_COMPLETE → COMPLETED → ARCHIVED`
- **READY_TO_COMPLETE** 自动计算：关联任务全部完成时触发
- **进度展示**：由关联任务的完成比例自动计算
- **Area 筛选**：按领域查看目标，或查看全部
- **Next Todo**：每个目标卡片展示下一个待执行任务

<!-- TODO: SCREENSHOT — Goals View 目标看板截图 -->

> ![Goals View](docs/screenshots/goals-view.png) > _⬆ 截图占位 · 将 `docs/screenshots/goals-view.png` 替换为实际截图_

---

#### Inbox View（收件箱）

未归类任务的收集中心，按状态分组展示：

- **Recently Added & Todo**：最近添加和未开始的任务
- **Paused**：暂停的任务及暂停原因
- **Completed**：已完成任务，默认折叠

顶部内联快速输入框，Enter 提交，自动进入对应分组。

<!-- TODO: SCREENSHOT — Inbox View 收件箱截图 -->

> ![Inbox View](docs/screenshots/inbox-view.png) > _⬆ 截图占位 · 将 `docs/screenshots/inbox-view.png` 替换为实际截图_

---

#### Board View（看板视图）

三列看板拖拽管理任务状态：

```
TODO          IN_PROGRESS          DONE
┌──────┐      ┌────────┐         ┌──────┐
│ 任务A │  →  │ 任务B  │    →    │ 任务C │
│ 任务D │      │ 任务E  │         │ 任务F │
└──────┘      └────────┘         └──────┘
```

支持按领域筛选，任务卡片展示标题、状态、关联目标。

<!-- TODO: SCREENSHOT — Board View 看板视图截图 -->

> ![Board View](docs/screenshots/board-view.png) > _⬆ 截图占位 · 将 `docs/screenshots/board-view.png` 替换为实际截图_

---

#### Areas View（领域管理）

稳定的生活 / 工作领域分类，类似 Things 3 Areas。

- **强实体**：不允许自由标签，每个 Goal 必须归属到 Area
- **系统 Area**：内置"未分类"，不可删除 / 重命名
- **删除安全**：删除 Area 时自动迁移 Goals 到"未分类"
- **统计卡片**：显示每个 Area 的目标数和活跃目标数

<!-- TODO: SCREENSHOT — Areas View 领域管理截图 -->

> ![Areas View](docs/screenshots/areas-view.png) > _⬆ 截图占位 · 将 `docs/screenshots/areas-view.png` 替换为实际截图_

---

#### Calendar & Reminders Boards（日历与提醒看板）

整合 macOS 系统日历和提醒事项。

**日历看板**：

- **周视图**：7 列日程，汇集 Calendar、Reminders 和 Desk Tasks
- **日视图**：左侧日历时间选择 + 右侧当日详细日程混合流

**提醒看板**：

- **按清单**：2-4 列自适应网格，只读展示 macOS 提醒事项
- **按时间**：过期 / 今天 / 未来 7 天 / 更晚 / 无日期 五个分组

<!-- TODO: SCREENSHOT — Calendar & Reminders 日历与提醒看板截图 -->

> ![Calendar & Reminders](docs/screenshots/calendar-reminders.png) > _⬆ 截图占位 · 将 `docs/screenshots/calendar-reminders.png` 替换为实际截图_

---

## 技术栈

### 前端

| 技术           | 版本 | 选型理由                          |
| -------------- | ---- | --------------------------------- |
| React          | 18.x | 成熟生态，Hooks 简化状态管理      |
| TypeScript     | 5.x  | 类型安全，减少运行时错误          |
| Zustand        | 5.x  | 轻量级状态管理，无 Redux 样板代码 |
| Tailwind CSS   | 3.x  | 快速原型，设计系统一致性          |
| Framer Motion  | 11.x | 流畅动画，Apple 式微交互          |
| date-fns       | 4.x  | 轻量日期处理                      |
| react-markdown | 9.x  | Markdown 渲染（任务备注）         |

### 后端

| 技术     | 版本       | 选型理由                     |
| -------- | ---------- | ---------------------------- |
| Tauri    | 2.0        | Rust 性能 + Web 前端，体积小 |
| SQLite   | 3.x        | 本地优先，零配置             |
| serde    | 1.x        | Rust ↔ JSON 序列化           |
| rusqlite | 0.32       | Rust SQLite 绑定             |
| chrono   | 0.4        | 时间类型处理                 |
| EventKit | macOS 原生 | 日历 / 提醒事项桥接          |

### 测试

| 工具       | 用途                       |
| ---------- | -------------------------- |
| Playwright | E2E 测试（浏览器 + Tauri） |
| cargo test | Rust 单元 / 集成测试       |
| Vitest     | TypeScript 单元测试        |

---

## 架构设计

### 架构原则

遵循 **深层模块（Deep Modules）** 和 **富领域模型（Rich Domain Model）** 原则：

> **简单接口 + 强大实现 = 高杠杆率** — John Ousterhout《A Philosophy of Software Design》

### 架构总览

```
┌──────────────────────────────────────────────────────┐
│                    React UI Layer                     │
│  views/ (Today, Inbox, Goals, Board, Areas, ...)      │
│  drawer/ (TaskDrawer, GoalDrawer, SystemReminderDrawer) │
│  modal/ (QuickCaptureModal, QuickCaptureWindow)       │
├──────────────────────────────────────────────────────┤
│                 Zustand State Layer                    │
│  appStore.ts (facade)                                  │
│  taskStore / goalStore / uiStore / eventkitStore       │
│  DerivedStateManager (智能缓存 + 选择性计算)            │
├──────────────────────────────────────────────────────┤
│              Adapter Layer (边界层)                     │
│  desktopApi.ts — 前端 ↔ Tauri 唯一边界                  │
│  mutationAdapter.ts — 持久化契约接口                    │
│  tauriAdapter / browserAdapter (双模式支持)              │
├──────────────────────────────────────────────────────┤
│                 Tauri Backend (Rust)                   │
│  commands (thin dispatchers) → Service Layer            │
│  GoalService / TaskService / AreaService                │
│  Repository Layer (GoalRepo / TaskRepo / AreaRepo)      │
│  SQLite (持久化)  │  EventKit (macOS 桥接)              │
└──────────────────────────────────────────────────────┘
```

### 核心设计决策

1. **DerivedStateManager**（派生状态管理器）— 194 行复杂逻辑封装在单一接口后，调用者只需 `manager.compute(ChangeType.TasksOnly)` 一行代码，智能缓存避免重复计算。

2. **分层 Repository** — 提供精细粒度的单实体操作（如 `find(id)`、`update(goal)`），更新单个 Goal 从 O(n) 全量读写降为 O(1) SQL UPDATE。

3. **富领域模型** — Goal / Task 的状态机规则和进度计算逻辑内聚在 `domain.rs` 中，前后端共享业务规则，41+ Rust 单元测试保证正确性。

4. **边界清晰的适配器** — `desktopApi.ts` 是前端与 Tauri 的唯一边界，浏览器预览模式与 Tauri 模式通过 `mutationAdapter` 接口分离实现，未来替换框架只需改这一处。

### 领域模型（核心概念）

| 概念               | 定义                                       |
| ------------------ | ------------------------------------------ |
| **Goal**           | 目标 — 进度容器，分组 Todo、反映完成度     |
| **Task（Todo）**   | 待办 — 可执行动作，可选挂 Goal             |
| **Area**           | 领域 — 稳定的生活 / 工作分类               |
| **Reminder**       | 提醒 — 时间触发的注意力项（EventKit 桥接） |
| **Calendar Event** | 日历事件 — EventKit 只读导入               |
| **Today Timeline** | 今日时间轴 — 以上三者的统一时间线          |

Task 状态流：`TODO → IN_PROGRESS → PAUSED` / `IN_PROGRESS → DONE` / `PAUSED → IN_PROGRESS`

Goal 状态流：`ACTIVE ⇄ PAUSED → READY_TO_COMPLETE → COMPLETED → ARCHIVED`

---

## 快速开始

### 环境要求

- macOS（EventKit 桥接依赖）
- Node.js 26（通过 nvm 管理）
- Rust 工具链

### 开发

```bash
# 安装依赖（需先征得同意）
npm install

# 浏览器预览模式（端口 1420）
npm run dev

# Tauri 桌面应用模式
npm run tauri:dev

# 构建
npm run build
```

### 测试

```bash
# Rust 全量测试
cd src-tauri && cargo test

# Rust 单个集成测试
cd src-tauri && cargo test --test repository_tests

# E2E 测试
npm run test:e2e

# TypeScript 单元测试
npm run test
```

### 数据迁移

从旧版本升级时，应用会在启动时自动执行数据迁移。详见 [Areas 迁移指南](docs/areas-migration-guide.md)。建议在首次运行新版本前备份数据库文件。

---

## 文档索引

### 产品与设计

| 文档                                                   | 说明                                |
| ------------------------------------------------------ | ----------------------------------- |
| [设计理念与架构思想](docs/design/design-philosophy.md) | 产品定位、设计哲学、架构决策        |
| [未来规划与核心开发方向](docs/design/future-directions.md) | 深入沉淀的产品核心演进与技术架构规划 |
| [PRD 索引](docs/prd/README.md)                         | 7 份 PRD + 15 份 Spec，100% 覆盖    |
| [CONTEXT.md](CONTEXT.md)                               | 领域语言（Ubiquitous Language）定义 |
| [Areas 重设计 PRD](docs/areas-redesign-prd.md)         | Area 强实体重设计方案               |

### 架构

| 文档                                                  | 说明                                       |
| ----------------------------------------------------- | ------------------------------------------ |
| [架构重构总结](docs/architecture-refactor-summary.md) | DerivedStateManager、Repository 层、适配器 |
| [AGENTS.md](AGENTS.md)                                | AI 辅助开发约束与规范                      |
| [CLAUDE.md](CLAUDE.md)                                | Claude Code 开发指南                       |

### 测试

| 文档                                      | 说明               |
| ----------------------------------------- | ------------------ |
| [快速测试指南](QUICK_TEST_GUIDE.md)       | 常用测试命令与流程 |
| [浏览器模式测试](BROWSER_MODE_TESTING.md) | 浏览器预览模式验证 |

---

## 未来规划

### 短期（1-2 周）

- E2E 测试覆盖：Today View、Areas 管理、Goal 创建流程
- 性能监控：量化 DerivedStateManager 优化效果
- Vitest 集成：为派生状态逻辑添加单元测试

### 中期（1-2 月）

- Area 扩展属性：颜色、图标自定义
- 批量操作：批量移动 Goals 到其他 Area
- 数据库索引优化

### 长期（3-6 月）

- ViewModel 层：封装 Store 交互，降低 View 组件复杂度
- 自然语言解析增强：更丰富的时间表达式
- iOS / iPadOS 同步探索

---

## 许可

内部开发项目，尚未正式发版。
