# Issue 025: 壳层减负与 Todo 内部清单

Label: ready-for-agent

## Parent

`docs/prd/2026-08-13-shell-chrome-and-todo-checklist.md`

## What to build

去掉全局 TopBar，把主题切换放进设置，成功回执不再占主栏（失败才 toast，需要手感的操作给控件上的 ✅）。侧栏「全局速记」与滚动区留 20–24px，避免和 System Integration 重叠。

Todo 详情改为不透明纸面（原木米白 / 液态玻璃深色实面板）。标题下增加 Todo Checklist Item：内部步骤，落库，Things 式增删勾选；不影响 Todo Status；不写活动日志；列表不展示。Notes 按内容长高。

## Acceptance criteria

- [ ] 所有视图不再渲染 TopBar；右上角「新建待办」消失；页内「收集箱」「今日焦点」等大标题仍在。
- [ ] 设置弹窗有「外观」，可切换 wabi-sabi / liquid-glass，并持久化。
- [ ] 成功操作不出现 toast 或常驻状态条；失败出现可关闭的非阻断 toast；加载不弹窗。
- [ ] 侧栏底部「全局速记」固定，与上方滚动内容之间有约 20–24px 空隙，滚动时不重叠。
- [ ] Todo 详情为不透明纸面，跟主题走，不再玻璃漏底。
- [ ] 详情在标题/元数据下方可添加、回车连续新增、勾选、空行退格删除步骤；DONE 只读。
- [ ] 清单写入 SQLite 并从 list/find/恢复中读回；勾选不改变 Todo Status、不追加活动日志。
- [ ] 收集箱 / 今日焦点 / 看板列表不显示清单进度；空 Notes 不再占固定大块高度。
- [ ] Quick Capture（全局速记 / ⌥ Space）与今日焦点空状态「新建待办」仍可用。

## Blocked by

None - can start immediately
