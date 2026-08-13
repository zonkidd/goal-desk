# Issue 028: Todo Checklist Item 贯通：落库 + 详情 Things 式清单

Label: ready-for-agent

## Parent

`docs/issues/025-shell-chrome-and-todo-checklist.md`

PRD: `docs/prd/2026-08-13-shell-chrome-and-todo-checklist.md`（故事 25–41、46–48）

## What to build

在 Todo 详情里贯通 **Todo Checklist Item**：一条 Todo 的内部步骤，不是子 Todo，没有 Todo Status，不进入 Inbox / Today Workbench / Goal Board / Today Timeline。与 Goal、Reminder、Calendar Event 不合并。

复用已有领域形状，不另起模型：

```text
TaskChecklistItem { id, title, completed, sort_order }
DeskTask.checklists: Vec<TaskChecklistItem>
```

SQLite 用独立子表（建议名 `desk_task_checklists`）按 `task_id` 读写；list / find / 恢复时装回 `checklists`。禁止继续写死空数组。项目未发版，初始化或补列即可，不必双路径兼容。

Mutation 契约新增 `updateTaskChecklists(taskId, items)`（名称可微调），返回更新后的整条 Todo。不要塞进 `updateTaskFields`。勾选、改标题、回车新增、空行退格删除都走同一条 mutation。TaskService 整表替换该 Todo 的清单：不改 Todo Status，不追加活动日志。前端 `Task` 补上 `checklists`；桌面 API 规范化必须带上；浏览器预览在内存 Todo 上做同样替换。

详情信息架构（从上到下）：状态操作 → 标题与元数据 → **清单** → 系统提醒 → Bear → 按内容长高的 Notes → 活动日志。交互按 Things 习惯：底部「添加步骤」；回车提交当前项并聚焦下一项；点圆圈切换 `completed`；空行退格删除；标题就地编辑，失焦或回车保存。第一版不拖拽；`sort_order` 按添加顺序写。空清单不渲染空盒子，只留「添加步骤」。

清单与 Todo Status 互不影响：勾完全部步骤不自动完成；完成 Todo 不自动勾剩余步骤；有未勾项也可以 Start / Pause / Resume / Complete。`canEditFields` 仍为 `status !== DONE`；DONE 时清单只读。不写新的活动类型。收集箱 / 今日焦点 / 看板列表不显示 `3/5`、不内联勾选。列表派生不读取清单。

删除 Todo 后清单随 Todo 软删除；从回收站恢复时步骤完整回来。设置里的备份 / 恢复带上清单数据。不把 Quick Capture 改成清单编辑器。不改 `tauri.conf.json`、`Cargo.toml`、`vite.config.ts`。浏览器与 Tauri 以浏览器为准。

## Acceptance criteria

- [ ] 详情在标题/元数据下方、Notes 上方可添加、回车连续新增、勾选/取消、就地改标题、空行退格删除步骤。
- [ ] 空清单只看到一行「添加步骤」，没有空盒子。
- [ ] DONE 的 Todo 清单只读（不能加、改、勾、删）；进行中或暂停仍可改。
- [ ] 清单写入 SQLite，并从 list / find / 恢复中读回；浏览器预览也能增删勾选。
- [ ] 勾选不改变 Todo Status，不追加活动日志；勾完全部步骤后 Todo 仍保持原状态。
- [ ] 把 Todo 标完成、暂停或开始时，未勾步骤保持未勾；有未勾项也不卡住状态机。
- [ ] 收集箱 / 今日焦点 / 看板列表不显示 `3/5` 或展开的步骤。
- [ ] 软删除后恢复 Todo，清单完整回来；备份 / 恢复带上清单数据。
- [ ] 测试接缝：MutationAdapter / TaskService 返回的整条 Todo 覆盖持久化与「勾选不影响状态」；TaskDrawer 覆盖添加、回车下一项、勾选、空行退格、DONE 只读。Rust：写入后 find/list 能读回；`update_task_checklists` 不改 `status`、不增加 `activity_logs`；软删除/恢复带上清单。不要为清单去改 WorkspaceEngine 测试。

## Blocked by

`docs/issues/027-todo-drawer-paper-and-notes-height.md`
