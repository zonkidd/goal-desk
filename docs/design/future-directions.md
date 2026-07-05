# Kairos · 见独 — 核心开发方向与未来规划 (Future Directions)

**文档版本**: v1.0  
**更新日期**: 2026-07-03  
**状态**: 草稿 (Draft)  

---

## 概述

本规划文档基于 [README.md](file:///Users/zonkidd/IdeaProjects/goal-desk-tauri/README.md) 中定义的短期与中长期规划，对 Kairos（见独）的核心演进方向进行深度沉淀。文档共分为三个核心维度：
1. **核心功能与哲学深化**：如何通过功能设计引导用户践行“见独”（聚焦）与“朝彻”（回顾）。
2. **macOS 原生生态集成**：如何最大化 Tauri 2.0 与 macOS 桥接的硬件/系统级优势。
3. **技术与架构加固**：如何实现本地优先的高效同步、健壮的测试和可靠的数据安全。

---

## 一、 核心功能与哲学深化（围绕“见独”与“朝彻”）

### 1.1 “见独”专注守护者 (Focus Guardian — 今日焦点上限)
* **设计意图**：
  * 防止用户堆积过多的今日任务。限制今日的 `IN_PROGRESS` 任务数量，强迫用户做减法，聚焦于当下最重要的事情。
* **业务规则**：
  * **上限设定**：默认今日焦点任务上限为 **3** 个（最高不超过 5 个）。
  * **超载提示**：当用户试图通过 `StatusMachineButtons` 将第 4 个任务标记为 `IN_PROGRESS` 时，系统触发软性拦截：
    * UI 弹出半透明玻璃拟态浮窗提示：“*今日焦点已达上限。贪多则惑，是否先收束其他任务？*”
    * 允许用户强行继续，但会记录“超载日志”，以便在周回顾中反思。
* **技术实现要点**：
  * 在 [WorkspaceEngine.ts](file:///Users/zonkidd/IdeaProjects/goal-desk-tauri/src/lib/WorkspaceEngine.ts) 计算派生状态时，统计 `IN_PROGRESS` 状态的 Desk Task 数量。
  * 前端 `uiStore` 增加拦截逻辑，控制状态流转前的确认弹窗。

---

### 1.2 “朝彻”周/月度回顾与展望 (Weekly/Monthly Review)
* **设计意图**：
  * 庄子曰“朝彻而后能见独”。“朝彻”是像清晨一样清明透彻。用户需要定期（每周/每月）从具体事务中抽离，评估顶层目标并调整节奏。
* **功能规格**：
  * **回顾仪式感**：每周五下午或周末，在侧边栏显示“朝彻回顾”入口。
  * **回顾看板**：
    * **成效统计**：本周完成的 Todo 数量、已推进的 Goal 进度占比。
    * **停滞反思**：展示处于 `PAUSED` 状态的目标及填写的暂停原因，促使用户思考是“目标不切实际”还是“执行力受阻”。
  * **下周展望**：
    * 清理收件箱（Inbox），将未归类的任务关联到目标，指派到特定的开始日期。
    * 重新评估目标的优先级。
* **技术实现要点**：
  * 数据库表 `activity_logs` 需要完整记录任务状态流转时间戳。
  * 编写 `src/lib/reviewDerivation.ts` 用于汇总周/月度统计指标。

---

### 1.3 可手动排序与指派的 "Next Todo"
* **设计意图**：
  * 当前目标的 "Next Todo" 是通过算法自动计算出来的（例如最先创建的未完成任务）。但在实际推进中，用户对任务的先后顺序是有主动预期的。
* **功能规格**：
  * 在 [GoalDrawer.tsx](file:///Users/zonkidd/IdeaProjects/goal-desk-tauri/src/components/drawer/GoalDrawer.tsx) 的任务列表中，支持用户通过拖拽（Drag and Drop）手动排列任务顺序。
  * 允许用户直接右键将某个 Todo 固定（Pin）为当前目标的“下一推进项”。
  * 目标的 Progress 卡片和看板自动渲染该指定的 Next Todo。
* **技术实现要点**：
  * `tasks` 表和 Rust `Task` domain 实体中，新增 `sort_order`（排序权重，f64 或整数）字段。
  * 拖拽完成后，调用 `update_task_order` 命令，通过 Repository 更新排序值。

---

### 1.4 里程碑与关键结果 (Milestones / Key Results)
* **设计意图**：
  * Goal 作为长期目标的跨度较大（1-3个月），直接挂载几十个扁平的 Todo 会让进度失去阶段性感。引入中间层“里程碑”来做承上启下。
* **功能规格**：
  * 每个 Goal 下支持创建最多 3-5 个里程碑（如“第一阶段：完成设计”、“第二阶段：核心开发”）。
  * 任务抽屉中，Todo 可以归属到某一个具体的里程碑下。
  * 进度条算法升级：从原先的“扁平 Todo 完成度”演进为“基于里程碑加权的整体进度”。
* **技术实现要点**：
  * **新增数据库表** `milestones` (id, goal_id, title, status, sort_order, created_at)。
  * 更新 `src-tauri/src/domain.rs` 和前端 `DerivedStateManager` 的进度计算逻辑。

---

## 二、 macOS 原生生态集成

### 2.1 菜单栏助手与迷你卡片 (Menu Bar App / Menulet)
* **设计意图**：
  * 保持“无摩擦”的体验，使用户不需要频繁呼出主应用，随时掌握和勾选今日最核心的任务。
* **功能规格**：
  * **托盘常驻**：常驻 macOS 菜单栏。
  * **迷你画板**：点击菜单栏图标弹出一个玻璃拟态的悬浮画板（Popover）：
    * 顶部显示今日持续推进的 3 个 `IN_PROGRESS` 任务（可直接勾选完成）。
    * 底部提供一个快速输入框（输入即捕获，同步至收件箱）。
    * 包含一键进入专注模式（沉浸定时器）的入口。
* **技术实现要点**：
  * 利用 Tauri 2.0 的 `tauri-plugin-positioner` 和 `tauri::tray` 模块，管理托盘和定位悬浮窗口。
  * 迷你画板共享前端 `appStore` 状态，需确保多窗口间 Zustand 状态的实时同步。

---

### 2.2 系统右键菜单捕捉服务 (macOS Services Integration)
* **设计意图**：
  * 彻底打破软件边界。当用户在浏览器、邮件、PDF 中阅读时，看到需要记录的任务，可以零切换直接捕捉。
* **功能规格**：
  * 选中任意文本 -> 右键菜单 -> 共享/服务 -> “发送到 Kairos 见独”。
  * 触发后，Kairos 自动从后台接收文本，作为一条新待办静默存入 [Inbox View](file:///Users/zonkidd/IdeaProjects/goal-desk-tauri/docs/prd/inbox-view.md)。
* **技术实现要点**：
  * 在 macOS 平台打包时配置 `Info.plist`，声明系统级服务（NSServices）。
  * 后端 Rust 监听该系统级事件，捕获文本内容并写入数据库。

---

### 2.3 交互式通知 (Interactive Notifications)
* **设计意图**：
  * 使定时任务提醒不仅具有提示作用，还能直接完成操作。
* **功能规格**：
  * 当任务到达 Planned Start Time 或系统的 Reminder 时间时，推送 macOS 原生通知。
  * 通知卡片提供“完成”和“推迟 15分钟”等交互式按钮，用户点击后直接修改任务状态，无须唤醒主窗口。
* **技术实现要点**：
  * 使用 Tauri 2.0 的通知机制，结合系统原生 Action Button。

---

## 三、 技术与架构优化

### 3.1 iCloud Drive 本地优先同步 (Zero-Server Sync)
* **设计意图**：
  * 实现 Mac ↔ Mac 及未来的 Mac ↔ iOS/iPadOS 之间的同步，但不引入高昂和繁琐的中心化服务器，保持数据隐私性。
* **技术方案**：
  * 将应用数据目录中的 SQLite 数据库（或增量操作日志 `changelog.json`）定位在用户的 iCloud 云盘沙盒内（`~/Library/Mobile Documents/`）。
  * **文件变更监听**：Rust 后端通过 `notify` 库监听 iCloud 目录下数据文件的变化。
  * **数据合并冲突处理（LWW / CRDT）**：
    * 当检测到多端写冲突时，使用基于 UUID 和变更时间戳（Last-Write-Wins）的策略自动合并 Tasks 和 Goals。
    * 对 Area 强实体的删除和新增保持强一致性校验。

---

### 3.2 E2E 测试中的 EventKit 模拟器 (Deterministic E2E Testing)
* **设计意图**：
  * macOS EventKit 的权限限制和数据不确定性导致 CI/CD 无法完整测试日历和提醒看板。
* **技术方案**：
  * 在 [tauriAdapter.ts](file:///Users/zonkidd/IdeaProjects/goal-desk-tauri/src/lib/tauriAdapter.ts) 中增加一个“测试桩模式”（Test Stub Mode）。
  * 允许 Playwright 在初始化时通过全局变量或 Mock IPC 指令注入一组模拟的日历事件与系统提醒数据。
  * 使得 `npm run test:e2e` 可以在无权限的虚拟机 headless 环境下百分之百通过。

---

### 3.3 SQLite WAL 模式与自动备份
* **设计意图**：
  * 本地优先应用必须对数据安全和性能做极致保护。
* **优化策略**：
  * **并发性能**：在 Rust 数据库连接池初始化时执行：
    ```sql
    PRAGMA journal_mode=WAL;
    PRAGMA synchronous=NORMAL;
    ```
    使得读写互不阻塞，即便在 EventKit 同步大量数据时，UI 操作的数据库响应也毫无延迟。
  * **自动滚动备份**：应用启动时，如果今日还未备份，则自动将 `kairos.db` 拷贝一份至备份目录，保存最近 7 天的备份记录。
