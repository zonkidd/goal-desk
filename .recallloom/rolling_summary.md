<!-- recallloom:file=rolling_summary version=1.0 lang=en -->
<!-- last-writer: [RecallLoom] | 2026-06-11 -->
<!-- file-state: revision=4 | updated-at=2026-06-11T22:20:37+08:00 | writer-id=RecallLoom | base-workspace-revision=6 -->

<!-- section: current_state -->
# Current State

- 任务详情抽屉已经完成一轮可用性升级，并通过浏览器端回归验证：
  - Markdown 区改为 `编辑 / 预览 / 分屏`
  - 截止时间改为紧凑触发器，点击后展开大编辑卡
  - 所属目标改为紧凑触发器，点击后展开大列表选择面板
  - “快速创建目标并关联”已并入目标选择面板
- 新的 RecallLoom `.recallloom/` 已由官方 helper 重建、通过 `validate_context.py`，并已迁回项目的有效上下文
- 旧的损坏 sidecar 仍保留在 `.recallloom.damaged-2026-06-11/` 作为备份

<!-- section: active_judgments -->
# Active Judgments

- 抽屉整体视觉保持紧凑，不做厚重卡片化页面重排。
- 交互上采用“静态轻、编辑态大”的策略，而不是一直展示大输入控件。
- Markdown 继续使用原生 `textarea`，避免为这一轮体验优化引入新编辑器依赖。
- RecallLoom 恢复优先走官方 helper；旧 sidecar 不再继续点修。

<!-- section: risks_open_questions -->
# Risks / Open Questions

- 新生成的 RecallLoom sidecar workspace language 当前是 `en`，但迁回的连续性内容主要用中文；结构合法，但后续如果要严格统一语言风格，可以再做一次受控迁移。
- 仓库里的 `@tauri-apps/cli` 仍存在 optional native binding 缺失问题，直接走 `npm run tauri:dev` 或默认 Playwright `webServer` 可能失败。
- 旧 sidecar 备份目录还在，后续可以在确认无额外信息需要迁回后手动归档或删除。

<!-- section: next_step -->
# Next Step

如果继续当前产品工作，优先从任务详情页的进一步细节打磨或下一个 issue 垂直切片开始；如果继续基础设施工作，优先修复本地 Tauri CLI optional binding 问题，减少后续测试和开发启动摩擦。

<!-- section: recent_pivots -->
# Recent Pivots

- 原本尝试最小修补旧 RecallLoom `config.json`，验证后确认整套 sidecar 都已过时，不适合继续点修。
- 前端 TDD 从系统 Node 14 切换到线程自带的新 Node runtime，并使用独立的 `playwright.local.config.ts` 规避默认 `tauri:dev` 启动链路问题。
- 当前任务从“仅恢复上下文”升级为“完成 UI 改版、回归验证，并修复连续性系统”。
