# PRD: 壳层减负与 Todo 内部清单

**状态**: 已对齐，待实现  
**日期**: 2026-08-13  
**优先级**: P1  
**标签**: `feature`, `ui`, `todo-drawer`, `shell`  
**Issue**: `docs/issues/025-shell-chrome-and-todo-checklist.md`

---

## Problem Statement

日常使用时，主窗口被一层多余的顶栏挡住：所有视图共用一条 TopBar，左边重复写着 Inbox / Today Workbench，右边还有一颗「新建待办」。收集箱和今日焦点页里已经有大标题，左下角也有「全局速记」（⌥ Space），顶栏既占垂直空间，又和已有入口重复。

侧栏菜单一长，System Integration 等卡片会滚到「全局速记」上，两块叠在一起。

待办详情现在是半透明玻璃加硬编码白底、slate、indigo，和外面的米白原木对不上，阴影偏重。详情里还有一块最少 280px 的 Markdown 笔记，打开第一眼不是待办本身。同时缺一块可勾选的内部步骤清单——这是打开详情后最符合使用习惯的东西。领域里已经有 `TaskChecklistItem` 空壳，但没有落库，前端类型和 UI 都没有。

成功操作还会在顶栏下面常驻一行 `Saved to local database` 之类的回执，继续吃空间，也没有真正帮到操作手感。

## Solution

砍掉全局 TopBar，把主题切换放进设置，主窗口把垂直空间还给各视图自己的标题和列表。侧栏底部「全局速记」固定，和上方滚动区留出空隙，不再和 System Integration 重叠。

成功不弹窗；需要手感的操作给一记轻量 ✅；只有失败才 toast。加载不弹。

待办详情改成不透明纸面：原木主题米白，液态玻璃深色实面板。标题和元数据正下方放 Todo Checklist Item 清单：内部步骤，不是子待办，不影响 Todo Status。Things 式加项与勾选。列表（收集箱、今日焦点、看板）不展示进度。笔记按内容长高，空着只留一行入口。已完成待办只读，清单也不能改。勾选不写活动日志。

## User Stories

1. As a 用户, I want 主窗口不再显示全局 TopBar, so that 收集箱和今日焦点的第一屏能多出列表高度。
2. As a 用户, I want Inbox / Today / Goals / Board / 日历 / 提醒 / 回收站 / 每日复盘都不再出现 TopBar, so that 壳层在所有视图上一致。
3. As a 用户, I want 收集箱页内大标题「收集箱」仍然在, so that 我还知道自己在哪个工作区。
4. As a 用户, I want 今日焦点页内大标题「今日焦点」仍然在, so that 今日工作台的身份不被侧栏高亮单独承担。
5. As a 用户, I want 右上角不再出现「新建待办」, so that 创建入口只留在全局速记和页面自己的引导动作里。
6. As a 用户, I want 今日焦点空状态里的「新建待办」仍然可用, so that 没有今日事项时仍有明确的下一步。
7. As a 用户, I want 用左下角「全局速记」或 ⌥ Space 创建 Todo, so that 去掉顶栏之后我不会失去快速捕获。
8. As a 用户, I want 在设置里切换日式原木和液态玻璃, so that 主题能力还在，但不占主窗口 chrome。
9. As a 用户, I want 打开设置就能看到一块「外观」, so that 我不用猜主题藏在哪里。
10. As a 用户, I want 切换主题后立刻作用到整个窗口, so that 设置里的选择和当前界面一致。
11. As a 用户, I want 主题选择在下次打开应用时还在, so that 我不用每次重选。
12. As a 用户, I want 侧栏顶部仍然可以拖动窗口, so that 去掉 TopBar 之后桌面窗口还能拖。
13. As a 用户, I want 侧栏菜单滚动时「全局速记」和设置齿轮固定在底部, so that 入口不会滚出视野。
14. As a 用户, I want 滚动区与「全局速记」之间有约 20–24px 空隙, so that System Integration 卡片不会叠在按钮上。
15. As a 用户, I want 成功保存、状态变更、速记就绪不再弹出回执, so that 日常操作不被打断。
16. As a 用户, I want 需要手感确认的交互给一记轻量 ✅ 动画, so that 我知道动作生效了，但不必读一行字。
17. As a 用户, I want 只有失败才出现 toast, so that 我不会漏掉备份失败、工作区加载失败、速记打不开这类问题。
18. As a 用户, I want 错误 toast 可以手动关掉，且不阻断当前操作, so that 我能一边看错误一边继续改。
19. As a 用户, I want 工作区加载中不弹窗, so that 启动时不会先闪一层状态框。
20. As a 用户, I want 浏览器预览模式不再用常驻黄条占主栏, so that 预览和桌面的主工作区一样干净；预览提示可改到设置或不挡内容的弱提示。
21. As a 用户, I want 打开一条 Todo 看到不透明的纸面详情, so that 后面的列表不会透过来把详情弄脏。
22. As a 用户, I want 原木主题下的详情是米白纸感, so that 详情和桌面背景是同一套暖色。
23. As a 用户, I want 液态玻璃主题下的详情是深色实面板, so that 暗色界面上不会突然浮一张浅纸。
24. As a 用户, I want 详情里不再使用和主题无关的大块白底、slate、indigo, so that 两套主题都干净。
25. As a 用户, I want 打开详情后在标题和计划时间正下方看到清单, so that 我第一眼就能开始勾步骤。
26. As a 用户, I want 给当前 Todo 添加内部步骤, so that 我可以把一件待办拆成可勾选的备忘，而不另建一批 Todo。
27. As a 用户, I want 点圆圈勾选或取消勾选一步, so that 进度只记在这条 Todo 内部。
28. As a 用户, I want 在底部「添加步骤」输入并按回车立刻进入下一项, so that 我可以连续往下写，手不离开键盘。
29. As a 用户, I want 在空行按退格删掉该步, so that 误加的步骤可以马上去掉。
30. As a 用户, I want 已有步骤的标题可以就地改, so that 我不用删了重加。
31. As a 用户, I want 清单按添加顺序排列, so that 第一版不必学习拖拽。
32. As a 用户, I want 勾完所有步骤后这条 Todo 仍然保持原来的 Todo Status, so that 我不会因为勾最后一步而让待办从收集箱或今日焦点消失。
33. As a 用户, I want 把 Todo 标完成后，未勾的步骤保持未勾, so that 我能分清哪些步骤真的做过。
34. As a 用户, I want 未完成清单时仍然可以把 Todo 标完成、暂停或开始, so that 清单不会卡住状态机。
35. As a 用户, I want 收集箱、今日焦点、目标看板的列表行不显示 `3/5` 或展开的步骤, so that 列表密度不变。
36. As a 用户, I want 勾选步骤不出现在活动日志里, so that 时间线只留状态变更和我手写的进度。
37. As a 用户, I want 清单保存在本地 SQLite, so that 关掉应用再打开，步骤还在。
38. As a 用户, I want 浏览器预览里也能增删勾选清单, so that 不启动桌面端也能改交互。
39. As a 用户, I want 已完成（DONE）的 Todo 里清单只读, so that 完成态是一张快照，和标题、时间、笔记的只读规则一致。
40. As a 用户, I want 进行中或暂停的 Todo 仍可改清单, so that 做的过程中还能补步骤。
41. As a 用户, I want 空清单时只看到一行「添加步骤」, so that 没有步骤的待办不会多出一块空盒子。
42. As a 用户, I want Markdown 笔记仍在清单下面, so that 长说明、链接、草稿和步骤是分开的。
43. As a 用户, I want 空笔记不再占掉半个抽屉, so that 第一屏留给标题和清单。
44. As a 用户, I want 有笔记时按内容长高, so that 写过的内容都还在，只是不再被最小高度撑开。
45. As a 用户, I want Bear 关联和系统提醒状态仍在详情里, so that 这次改版不拿掉已有集成。
46. As a 用户, I want 删除 Todo 后清单一起进回收站语义（随 Todo 软删除）, so that 恢复待办时步骤还在。
47. As a 用户, I want 从回收站恢复 Todo 时清单完整回来, so that 内部步骤不会丢。
48. As a 用户, I want 设置里的备份/恢复仍能带上清单数据, so that 导出的库不是半套。
49. As a 用户, I want 导入覆盖前的确认仍然走设置里已有的危险操作流程, so that 状态回执改版不会把不可逆操作变成轻 toast。
50. As a 开发 agent, I want Todo Checklist Item 作为独立领域词写进 CONTEXT, so that 后续实现不会把它做成子 Todo 或 Goal 里程碑。

## Implementation Decisions

- 领域上新增稳定概念 **Todo Checklist Item**，挂在一条 Todo 上。它不是 Todo，没有 Todo Status，不进入 Inbox / Today Workbench / Goal Board / Today Timeline。与 Goal、Reminder、Calendar Event 不合并。
- 复用已有领域形状，不另起一套模型：

```text
TaskChecklistItem { id, title, completed, sort_order }
DeskTask.checklists: Vec<TaskChecklistItem>
```

  这是当前 Rust 空壳已有的形状，不是新原型。

- SQLite 按活动日志的方式落库：独立子表（建议名 `desk_task_checklists`），按 `task_id` 读写；列表/查找 Todo 时装回 `checklists`。禁止继续在 repository 里写死 `checklists: vec![]`。
- 项目尚未发版，不做旧库兼容分支；初始化或补列即可，不必保留「没有清单表也能跑」的双路径。
- 不把清单塞进现有 `updateTaskFields` / `TaskFieldPatch`。字段补丁已经负责标题、时间、Goal 关联、时间轴、系统提醒；清单是高频、整表替换的内部集合。Mutation 契约新增 `updateTaskChecklists(taskId, items)`（名称可微调），返回更新后的整条 Todo。
- TaskService 增加对应方法：整表替换该 Todo 的清单，不改 Todo Status，不追加活动日志。
- 前端 `Task` 类型补上 `checklists`。`desktopApi` 的 snake_case → camelCase 规范化必须带上该项。浏览器 adapter 在内存 Todo 上做同样替换。
- 勾选、改标题、回车新增、空行退格删除都走同一条 mutation，不各自开 command。
- 清单与 Todo Status 互不影响：勾完全部步骤不自动完成；完成 Todo 不自动勾剩余步骤；有未勾项也可以 Start / Pause / Resume / Complete。
- `canEditFields` 仍为 `status !== DONE`。DONE 时清单只读，不能加、改、勾、删。
- 不写 `STARTED` / `PAUSED` / `RESUMED` / `COMPLETED` / `NOTE_ADDED` 之外的新活动类型。勾选不是活动。
- 列表派生（WorkspaceEngine / workspaceDerivation）不读取清单。收集箱、今日焦点、看板卡片不加 `3/5`，不内联勾选。
- 详情信息架构（从上到下）：状态操作 → 标题与元数据 → **清单** → 系统提醒 → Bear → 按内容长高的 Notes → 活动日志。清单在标题正下方。
- 清单交互按 Things 习惯：底部「添加步骤」；回车提交当前项并聚焦下一项；点圆圈切换 `completed`；空行退格删除；标题就地编辑，失焦或回车保存。第一版不拖拽；`sort_order` 按添加顺序写入，留给以后排序。
- 空清单不渲染空盒子，只留「添加步骤」。
- Notes 去掉固定最小高度（当前约 280px）。无内容时一行入口；有内容按文本长高。预览 / 编辑 / 分屏可以保留，但默认视觉重量必须让位给清单。
- 详情容器改为不透明纸面：wabi-sabi 用米白实底，liquid-glass 用深色实面板。去掉玻璃漏底和与主题无关的白底/slate/indigo 大块。两套主题都走主题变量，不在液态玻璃下硬编码米白。
- 全局移除 TopBar 组件的挂载。所有视图统一，不做「只在 Inbox/Today 隐藏」。页内 `h1`（收集箱、今日焦点等）保留。
- 顶栏「新建待办」随 TopBar 消失。Quick Capture（全局速记、⌥ Space）和今日焦点空状态按钮保留。
- 主题切换从 TopBar 挪到设置弹窗的「外观」区块，继续调用已有 `setTheme` 与 `kairos-theme` 本地存储。
- 去掉 AppShell 主栏里常驻的 `statusMessage` 行和预览黄条。
- 反馈分层：
  - 成功：不 toast。若该交互需要手感，在被操作的控件上播放轻量 ✅，不居中弹层。
  - 失败：非阻断 toast，可手动关。
  - 加载：不弹，沿用现有页面/按钮 loading。
  - 导入覆盖等不可逆确认：继续用设置里已有的确认流程，不改成 toast。
- `statusMessage` 不能再既表示成功又表示失败。UI store 需要能区分错误（例如独立的 error toast 状态，或带 kind 的通知）。成功路径可以继续写内部状态，但不得渲染为弹层。
- 侧栏结构保持「顶栏品牌 / 中部滚动导航 / 底部固定速记+设置」。底部栏 `shrink-0`，与滚动区之间保留约 20–24px。不要靠加大窗口底边距来假装分开。
- 窗口拖拽：侧栏顶部已有拖拽区，必须保留。TopBar 去掉后，若主内容区顶部无法拖动，只补一条不影响布局的拖拽热区，不把 TopBar 加回来。
- 浏览器模式和 Tauri 模式的壳层、详情、清单必须视觉一致；以浏览器为准。
- 不顺手改 `tauri.conf.json`、`Cargo.toml`、`vite.config.ts`。
- 不把 Quick Capture 改成清单编辑器。

## Testing Decisions

好的测试只断言用户能观察到的行为：顶栏在不在、失败才出现 toast、清单增删勾选后再次打开还在、Todo Status 没被勾选改掉。不测 className、动画帧、SQL 拼字符串。

优先走已有最高接缝，不新开架构层。建议保持 **两条** 现有接缝，而不是一条新的超级模块：

1. **壳层接缝：AppShell + Sidebar + SettingsModal（现有组件测试）**  
   断言不再渲染 TopBar / 「新建待办」顶栏按钮；设置里能切换主题；主栏不再常驻成功文案；仅错误时出现 toast；侧栏底部与滚动内容分离。先验：`AppShell.test.tsx`、`Sidebar.test.tsx`。

2. **清单接缝：MutationAdapter / TaskService 返回的整条 Todo，外加 TaskDrawer 组件测试**  
   这是新能力的最高接缝。所有持久化与「勾选不影响状态」的规则先在 adapter/service 测；抽屉只测能看见的交互（添加、回车下一项、勾选、空行退格、DONE 只读、笔记空态不再占大块）。先验：`TaskDrawer.test.tsx`、`service_tests.rs`、`repository_tests.rs`、`mutationAdapter.test.ts`、`browserAdapter` 行为。

不要为清单去改 WorkspaceEngine 测试——列表不读清单。不要为成功 ✅ 写像素测试。

Rust 侧补：写入后 `find`/`list` 能读回步骤；`update_task_checklists` 不改 `status`、不增加 `activity_logs`；软删除/恢复带上清单。

E2E 继续以页内「收集箱」「今日焦点」标题为锚点（现有 smoke / navigation 已如此）。不要再断言 TopBar 英文标题。今日焦点空状态的「新建待办」若覆盖到，应仍可用。

浏览器预览与 Tauri 的视觉一致性用手动对照，不作为本 PRD 的自动化门槛。

## Out of Scope

- 清单拖拽排序、缩进、多级嵌套。
- 把 Todo Checklist Item 做成子 Todo，或让它出现在收集箱、今日焦点、看板、今日时间轴。
- 列表行上的 `3/5` 或内联勾选。
- 勾选写入活动日志，或「全部勾完自动完成」。
- 新的 Todo Status、Goal 状态，或 Goal 里程碑。
- 改 Quick Capture 解析语法去创建步骤。
- 改 EventKit / Bear 的读写策略。
- 只在 Inbox/Today 隐藏顶栏、其它视图保留。
- 成功操作的模态框或常驻状态条。
- 液态玻璃主题下强制米白详情。
- 主题预览以外的第三套主题。
- 发布兼容、数据迁移双写、远程同步。

## Further Notes

本 PRD 来自 2026-08-13 的 grill 对齐，决策树已关闭：

| 主题 | 选择 |
| --- | --- |
| 顶栏 | 全局去掉整条 TopBar |
| 主题 | 进设置「外观」 |
| 成功回执 | 不弹；需要手感则控件上 ✅ |
| 失败 | 非阻断 toast |
| 全局速记 | 底部固定，上沿留 20–24px |
| 详情材质 | 不透明纸面；原木米白 + 液态玻璃深色实面板 |
| 清单身份 | Todo 内部步骤，不是子待办 |
| 清单 vs 状态 | 互不影响 |
| 清单曝光 | 只在详情 |
| 清单位置 | 标题/元数据下、笔记上 |
| 清单交互 | Things 式，第一版不拖拽 |
| 活动日志 | 勾选不写 |
| 笔记 | 按内容长高，空态一行入口 |

实现时若接缝与上文两条不一致（例如把清单塞进 `updateTaskFields`，或新写一套 checklist store），先改本 PRD，不要默默分叉。
