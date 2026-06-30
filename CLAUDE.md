# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 环境约束

- 运行任何 Node.js / npm / npx 命令前，先执行 `nvm use 26`。
- 这是 Kairos · 见独（Tauri 2 + React + TypeScript + Tailwind）的本地优先桌面应用；持久化数据在本机 SQLite，macOS 日历/提醒事项通过原生 EventKit 桥接。
- **重要**：本项目尚未正式发版，所有代码改动无需考虑向后兼容性。可以直接修改数据结构、API 接口、数据库 schema 等，不需要保留旧版本兼容逻辑。

## 常用命令

```bash
nvm use 26
npm install
npm run dev
npm run tauri:dev
npm run build
npm run test:e2e
```

- `npm run dev`：只启动 Vite 浏览器预览，端口固定为 `1420`。
- `npm run tauri:dev`：启动完整 Tauri 桌面应用；Tauri 配置会先运行 Vite dev server。
- `npm run build`：执行 `tsc && vite build`。
- `npm run test:e2e`：运行 Playwright E2E，配置会启动 `npm run tauri:dev` 并访问 `http://localhost:1420`。
- 单个 E2E：`npx playwright test tests/e2e/smoke.test.ts`。
- Rust 测试：`cd src-tauri && cargo test`。
- 单个 Rust 集成测试：`cd src-tauri && cargo test --test repository_tests`。
- 现有前端 `.mjs` 测试未挂到 npm script，可按需直跑，例如 `node src/lib/todoEditing.test.mjs` 或 `node src/store/appStore.test.mjs`。

## 架构概览

- `src/main.tsx` 只挂载 React 根组件和全局样式。
- `src/App.tsx` 根据运行环境分流：Tauri 的 `quick-capture` 窗口渲染 `QuickCaptureWindow`，其它情况渲染主应用 `AppShell`。主窗口在 Tauri 中拦截关闭事件改为隐藏，并监听 `desk-task-created` 事件把快速捕获的新任务合入状态。
- `src/lib/desktopApi.ts` 是前端和 Tauri command 的边界层：负责 `invoke(...)`、Tauri 运行时判断、Rust snake_case payload 到前端 camelCase 类型的规范化，以及 EventKit 时间线合并。
- `src/store/appStore.ts` 是主要 Zustand 状态容器：管理视图、抽屉、快速捕获、任务/目标/提醒的派生状态；在 Tauri 环境调用 `desktopApi` 持久化，在浏览器预览中使用内存/mock 行为。
- `src/components/shell/` 组织应用框架；`src/components/views/` 是 Today/Inbox/Goals/Board 等主视图；`src/components/drawer/` 管理任务、目标、提醒的右侧详情；`src/components/modal/` 管理快速捕获弹窗和独立窗口。
- `src/mock/prototypeData.ts` 提供浏览器预览和初始体验数据；真实桌面数据由 Rust 侧 SQLite seed/load 提供。
- `src-tauri/src/domain.rs` 定义核心领域类型和纯逻辑，例如时间线生成、目标进度、快速捕获解析。
- `src-tauri/src/repository.rs` 封装 SQLite 表初始化、兼容性补列、workspace 与 desk task 的读写。
- `src-tauri/src/lib.rs` 组合 Tauri runtime、命令处理、demo seed、全局快捷键 `alt+space`、快速捕获窗口、Bear URL Scheme、EventKit 同步等桌面能力。
- `src-tauri/src/eventkit.rs` 和 `src-tauri/native/` 负责 macOS EventKit 桥接；修改这里通常需要在 macOS Tauri 环境手动验证权限与系统集成。

## UI 样式一致性原则

**关键规范**：浏览器模式（`npm run dev`）和 Tauri 模式（`npm run tauri:dev`）的 UI 样式必须保持一致。

- 所有共享组件（如 `QuickCaptureForm`、对话框、卡片等）在两种模式下应该有相同的视觉呈现。
- 如果存在样式差异，**以浏览器模式的样式为准**，修改 Tauri 模式以匹配浏览器模式。
- 涉及样式改动时，必须同时在两种模式下验证视觉一致性。
- 背景、间距、颜色、字体、圆角等视觉属性应该在两个环境中完全相同。

**验证流程**：

1. 修改 UI 组件后，先运行 `npm run dev` 在浏览器中预览
2. 确认样式符合预期后，运行 `npm run tauri:dev` 验证 Tauri 窗口
3. 对比两者，确保视觉呈现一致

## 测试与验证注意事项

- UI 改动优先用 `npm run tauri:dev` 或 `npm run dev` 实际打开页面验证；浏览器预览不代表 Tauri command、SQLite、原生窗口、全局快捷键或 EventKit 都正常。
- Playwright 配置为 headed、单 worker、固定 viewport；失败截图按配置写入测试结果/截图目录。
- 涉及 `desktopApi` payload、Rust `serde` 枚举或 SQLite schema 时，同步检查 TypeScript 类型、Rust domain 类型和 repository 读写列名。
- Tauri 配置文件、Rust 后端和 Node 脚本变更会影响开发/构建链路；除非任务明确需要，不要顺手调整这些基础配置。
