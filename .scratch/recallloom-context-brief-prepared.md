<!-- section: mission -->
# Mission

Goal Desk Tauri 是 Goal Desk 的 Tauri + TypeScript 重写版本，目标是围绕 Goal、Task、Today Timeline 等独立领域对象，提供本地优先的桌面任务与目标推进体验。

<!-- section: audience_stakeholders -->
# Audience / Stakeholders

- 主要使用者：当前仓库维护者与日常个人任务管理使用者
- 协作者：在这个仓库中协作的编码代理与后续人工维护者

<!-- section: current_phase -->
# Current Phase

项目处于可用性打磨与连续性修复阶段。核心 Goal/Task 持久化闭环已经存在，当前已完成任务详情抽屉的编辑体验升级，并重建了健康的 RecallLoom sidecar。

<!-- section: scope -->
# Scope

- Tauri + React 桌面应用
- Goal、Task、Reminder、Calendar Event、Today Timeline 保持独立概念
- 本地 SQLite 持久化与前端交互体验
- EventKit / Apple 集成作为外部只读来源

<!-- section: source_of_truth -->
# Source of Truth

- 仓库约束：`AGENTS.md`
- 当前代码实现：`src/` 与 `src-tauri/`
- 计划与设计记录：`docs/superpowers/specs/`、`docs/superpowers/plans/`
- 本地 issue / domain 文档：`docs/issues/`、`CONTEXT.md`、`docs/agents/`

<!-- section: core_workflow -->
# Core Workflow

1. 先确认需求和设计方向，再写 spec / implementation plan。
2. 对新行为或 bug 修复遵循红绿重构 TDD，优先跑最小相关测试。
3. 在这个仓库里，前端行为验证当前主要依赖 Playwright；浏览器预览逻辑有单独的 Node 测试。
4. 修改时尊重现有模式，避免回退用户已有改动。

<!-- section: boundaries -->
# Boundaries

- 不未经批准安装依赖。
- 不引入旧 `rust-goal-manager-clean` 实现代码。
- 保持 Goal、Project、Todo、Reminder、Calendar Event、Today Timeline 的概念分离。
- 持久化以 SQLite 为准；macOS Calendar / Reminders 当前是只读外部源。
- 不随意手改 RecallLoom managed 文件，优先使用官方 helper。
