# Issue 027: Todo 详情纸面与 Notes 收高

Label: ready-for-agent

## Parent

`docs/issues/025-shell-chrome-and-todo-checklist.md`

PRD: `docs/prd/2026-08-13-shell-chrome-and-todo-checklist.md`（故事 21–24、42–45）

## What to build

打开一条 Todo，详情是不透明纸面，后面的列表不再透过来。原木主题用米白纸感；液态玻璃主题用深色实面板。两套主题都走主题变量，不要玻璃漏底，不要与主题无关的大块白底 / slate / indigo，也不要在液态玻璃下硬编码米白。

本片只改详情材质和 Notes 视觉重量，不实现 Todo Checklist Item。Notes 仍在详情里、仍支持 Markdown；空笔记不再占掉半个抽屉（去掉约 280px 的固定最小高度），只留一行入口；有内容时按文本长高。预览 / 编辑 / 分屏可以保留，但默认视觉重量必须让位给后续清单。

Bear 关联和系统提醒状态仍在详情里。浏览器与 Tauri 详情以浏览器为准。不改 `tauri.conf.json`、`Cargo.toml`、`vite.config.ts`。

## Acceptance criteria

- [ ] Todo 详情为不透明纸面，列表不再透过详情漏出来。
- [ ] 原木主题下详情是米白纸感；液态玻璃主题下是深色实面板；两套都跟主题走。
- [ ] 详情里不再使用和主题无关的大块白底、slate、indigo。
- [ ] 空 Notes 不再占固定大块高度，只留一行入口；有内容时按文本长高。
- [ ] Markdown 笔记仍在详情中可用。
- [ ] Bear 关联和系统提醒状态仍在详情里。
- [ ] TaskDrawer 组件测试覆盖：空笔记不再占大块；纸面材质行为可从用户可见状态断言（不测 className / 动画帧）。

## Blocked by

None - can start immediately（可与 `docs/issues/026-shell-chrome-declutter.md` 平行）
