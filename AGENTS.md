# Goal Desk Tauri · Agent Instructions

Tauri 2 + React + TypeScript + Tailwind 本地优先桌面应用。持久化在 SQLite，macOS EventKit 桥接日历/提醒。

## 硬性约束

- **依赖安装必须先问用户**——`npm install`、`cargo add` 等不可自动执行。
- **运行任何 Node 命令前先 `nvm use 26`**。
- **不引入旧 egui 实现**——`rust-goal-manager-clean` 仅作领域参考。
- **领域概念不合并**：Goal、Project、Todo、Reminder、Calendar Event、Today Timeline 各自独立。
- **SQLite 是唯一持久化**；macOS 日历/提醒是**只读**外部源，除非 issue 明确修改此约束。
- **不顺手改 Tauri/Rust/Node 基础配置**（tauri.conf.json、Cargo.toml、vite.config.ts 等）。
- **UI 样式一致性**：浏览器模式和 Tauri 模式的 UI 必须完全一致。如有差异，**以浏览器模式为准**，修改 Tauri 模式匹配之。

## 命令速查

```bash
nvm use 26                        # 每次开终端必跑
npm run dev                       # 仅 Vite 浏览器预览，端口 1420
npm run tauri:dev                 # 完整 Tauri 桌面应用（会自动启动 Vite）
npm run build                     # tsc && vite build
npm run test:e2e                  # Playwright E2E（headed、单 worker、自动启动 tauri:dev）
npx playwright test tests/e2e/smoke.test.ts  # 跑单个 E2E
cd src-tauri && cargo test        # 全量 Rust 测试
cd src-tauri && cargo test --test repository_tests  # 单个集成测试文件
node src/lib/todoEditing.test.mjs # 前端 .mjs 测试无 npm script，直跑
```

## 架构要点

- `src/App.tsx`：按环境分流——Tauri 下 `quick-capture` 窗口渲染 `QuickCaptureWindow`，否则渲染 `AppShell`。主窗口拦截关闭事件改为隐藏。
- `src/lib/desktopApi.ts`：**前端 ↔ Tauri command 边界层**——负责 `invoke()`、Tauri 运行时判断、Rust `snake_case` → 前端 `camelCase` 的 payload 规范化、EventKit 时间线合并。改 payload/枚举时**必须同步检查此文件**。
- `src/store/appStore.ts`：Zustand 状态容器（re-export facade）；组合 `taskStore`、`goalStore`、`uiStore`、`eventkitStore`。
- `src/store/taskStore.ts` / `goalStore.ts` / `uiStore.ts` / `eventkitStore.ts`：分拆的 Zustand stores，各自管理独立状态切片。
- `src/hooks/useStoreComposition.ts`：协调跨 store 交互——水合、派生状态同步、消息桥接。使用 `WorkspaceEngine` 计算派生状态。
- `src/lib/WorkspaceEngine.ts`：派生状态计算引擎——接收原子状态（tasks, goals, timeline, filters），返回不可变快照。
- `src/lib/workspaceDerivation.ts`：底层派生函数（`getTodayFocusTasks`、`getInboxTaskGroups` 等），被 WorkspaceEngine 调用。
- `src/lib/mutationAdapter.ts`：**MutationAdapter 接口**——定义所有持久化操作的契约。`tauriAdapter.ts`（Tauri 后端）和 `browserAdapter.ts`（浏览器预览）分别实现。
- `src/lib/workspaceMutations.ts`：re-export 层，`createWorkspaceMutationAdapter()` 根据运行时返回对应 adapter。
- `src/components/`：`shell/` 框架、`views/` 主视图（Today/Inbox/Goals/Board）、`drawer/` 详情面板、`modal/` 弹窗和独立窗口。
- `src-tauri/src/domain.rs`：核心领域类型和纯逻辑（状态转换、时间线、快速捕获解析）。
- `src-tauri/src/repository.rs`：SQLite 表初始化、兼容性补列、CRUD traits（`GoalRepository`、`TaskRepository`、`AreaRepository`）。
- `src-tauri/src/service.rs`：**Service Layer**——`GoalService`、`TaskService`、`AreaService`。封装业务逻辑（验证、UUID 解析、错误映射），Tauri commands 调用 service 而非直接操作 repository。
- `src-tauri/src/lib.rs`：Tauri runtime、命令处理（thin dispatchers → service layer）、全局快捷键 `alt+space`、Bear URL Scheme、EventKit 同步。
- `src-tauri/src/eventkit.rs` + `src-tauri/native/`：macOS EventKit 桥接——修改后需在 Tauri 环境手动验证权限。

## 测试注意事项

- **前端 .mjs 测试**未挂 npm script：`node src/lib/<name>.test.mjs`、`node src/store/appStore.test.mjs`。
- **Playwright**配置：headed、单 worker、固定 1280×720 viewport、失败截图。本地调试用 `playwright.local.config.ts`（headless、无 webServer）。
- **Rust 集成测试**在 `src-tauri/tests/`：`command_tests.rs`、`domain_tests.rs`、`repository_tests.rs`、`service_tests.rs`。
- **跨层改动**（desktopApi payload、Rust serde 枚举、SQLite schema）必须同步检查 TS 类型、Rust domain 类型、repository 列名。

## 开发流程

- **垂直切片**：schema → Rust core → Tauri command → TypeScript UI → 测试同步推进。
- **TDD**：新行为和 bug 修复走红/绿/重构。Rust 测试用 `cargo test <test_name>`。
- **UI 改动验证**：
  1. 先运行 `npm run dev` 在浏览器（端口 1420）预览并确认样式
  2. 再运行 `npm run tauri:dev` 验证 Tauri 桌面窗口
  3. 对比两者，确保视觉呈现完全一致（背景、间距、颜色、字体、圆角等）
  4. 如有差异，以浏览器模式为准，修改 Tauri 相关代码
- **Tauri 独有功能验证**：浏览器预览无法验证 Tauri command、SQLite、原生窗口、全局快捷键（`alt+space`）、EventKit 同步——这些必须在 Tauri 环境中测试。

## 领域术语

术语定义见 `CONTEXT.md`。核心区分：Goal 是进度容器（分组 Todo、反映完成度）；Todo 是可执行动作（可选挂 Goal）；Reminder 是时间触发的注意力项；Calendar Event 是 EventKit 只读导入；Today Timeline 是三者的统一时间线。

## Agent skills

- 创建/查看/关闭 issue → `docs/agents/issue-tracker.md`（本地 markdown 格式，`docs/issues/`）。
- 打 triage 标签 → `docs/agents/triage-labels.md`。
- 更新领域文档 → `docs/agents/domain.md`（`CONTEXT.md` + `docs/adr/` 布局）。
