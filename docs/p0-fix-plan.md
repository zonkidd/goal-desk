# P0/P1/P2 问题修复计划

**日期**: 2026-06-18
**方法**: TDD（红-绿-重构循环）

---

## 修复顺序

### P0 - Quick Capture Toggle (T2)
**问题**: 全局快捷键 `Option+Space` 不能隐藏已打开的窗口
**修复**: 在 `show_quick_capture_window_internal` 中添加窗口可见性检查

### P1 - Today View 颜色修正 (T3)
**问题**: 时间轴颜色与 PRD 不一致
**修复**: 调整 `getTimelineStyles()` 中的颜色配置

### P1 - GoalBoardCard 补全 (T4)
**问题**: Area Board 模式下卡片缺少 area tag 和 Next Todo
**修复**: 在 `GoalBoardCard` 中添加 area tag 和 Next Todo 显示

### P1 - Quick Capture 窗口高度 (T5)
**问题**: 窗口高度 320px ≠ 需求 240px
**修复**: 修改 `lib.rs` 中的窗口高度配置

### P2 - Goals View area tag 颜色 (T6)
**问题**: area tag 为 indigo 而非 purple
**修复**: 修改 `GoalsView.tsx` 中的颜色类

### P2 - GoalDrawer 进度条 (T7)
**问题**: 进度无可视化进度条
**修复**: 在 `GoalDrawer.tsx` 中添加进度条组件

---

## TDD 工作流

每个修复遵循：
1. **RED**: 编写失败的测试
2. **GREEN**: 编写最小代码使测试通过
3. **REFACTOR**: 清理代码

---

## 依赖关系

- T2 (Toggle) 和 T5 (窗口高度) 可并行
- T3 (颜色) 和 T6 (area tag 颜色) 可并行
- T4 (GoalBoardCard) 和 T7 (GoalDrawer 进度条) 可并行
