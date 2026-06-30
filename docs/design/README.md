# Kairos · 见独 — 设计资源索引

**更新日期**: 2026-06-14  
**文档版本**: v1.0

---

## 📚 核心设计文档

### 1. [设计理念与架构思想](./design-philosophy.md)

**最新更新**: 2026-06-14

**内容概览**：

- **产品定位**：本地优先的目标管理桌面应用，在时间流中推进顶层目标
- **架构设计原则**：深层模块、富领域模型、分层 Repository、边界清晰的适配器
- **UI/UX 设计系统**：玻璃拟态风格、颜色系统、动画交互、信息层级
- **核心视图设计**：今日焦点、目标看板、领域管理
- **状态管理架构**：Zustand Store 结构、派生状态计算策略
- **数据模型**：Goal/Task/Area 实体定义、状态机规则
- **技术栈选型**：React + TypeScript + Tailwind + Tauri + SQLite
- **设计决策记录（ADR）**：Area 强实体、serde camelCase 转换、独立 DerivedStateManager

**适合人群**：

- ✅ 新加入的开发者了解项目整体设计
- ✅ 产品经理理解核心理念和功能架构
- ✅ UI 设计师查阅设计系统规范

---

### 2. [今日焦点 - 时间展示设计方案](./today-workbench-time-display.md)

**最新更新**: 2026-06-13

**内容概览**：

- **背景理解**：plannedStartAt（开始时间）和 dueDate（截止时间）语义
- **当前过滤逻辑**：`startDay ≤ today ≤ endDay` 的持续推进任务
- **设计方案**：相对时间 + 紧急度视觉提示
- **时间展示策略**：
  - 🔥 还剩 ≤2 天（红色 critical）
  - ⏰ 还剩 3-7 天（橙色 warning）
  - ✅ 还剩 >7 天（绿色 normal）
  - ∞ 无截止日期（灰色 none）
- **代码实现**：`getTaskTimeInfo` 辅助函数、Tooltip 完整时间线

**适合人群**：

- ✅ 前端开发者实现 TodayView 时间展示逻辑
- ✅ 产品经理理解"持续推进"概念

---

### 3. [isOngoing 重构为 showInTimeline](./refactor-isOngoing-to-showInTimeline.md)

**最新更新**: 2026-06-13

**内容概览**：

- **重命名原因**：`isOngoing` 语义模糊，与 `status = IN_PROGRESS` 混淆
- **新语义**：`showInTimeline` 明确表示"是否显示在今日时间轴"
- **影响范围**：数据库字段、Rust domain、TypeScript 类型、UI 组件
- **迁移步骤**：数据库 ALTER TABLE、代码批量重命名、测试验证

**适合人群**：

- ✅ 维护者理解字段重命名历史
- ✅ 数据迁移开发者参考迁移逻辑

---

## 🎨 交互式原型

### 原型图索引

| 文件                                                                                                | 版本     | 更新日期       | 说明                     |
| --------------------------------------------------------------------------------------------------- | -------- | -------------- | ------------------------ |
| [prototype-1.html](../history/prototype/prototype-1.html)                                           | v1.0     | 2026-06-10     | 初始概念原型             |
| [prototype-2.html](../history/prototype/prototype-2.html)                                           | v2.0     | 2026-06-10     | 优化布局和交互           |
| **[prototype-3-current-implementation.html](../prototype/prototype-3-current-implementation.html)** | **v3.0** | **2026-06-14** | **当前实现的真实 UI** ✨ |

### 最新原型（v3.0）功能演示

**今日焦点视图**：

- ✅ 今日持续推进模块（3 个任务示例）
- ✅ 时间展示：已推进天数 + 剩余天数 + 紧急度图标
- ✅ Hover Tooltip：完整时间线（开始/今天/截止）
- ✅ 今日目标看点模块（2 个目标示例）
- ✅ 进度条动画 + Next Todo 展示
- ✅ 今日时间轴（日历/提醒/待办混合）

**视觉风格**：

- 玻璃拟态（backdrop-filter blur）
- Indigo 主色调 + Slate 中性色
- rounded-3xl 卡片风格
- 悬停微动效（translateY -2px）

**如何查看**：

```bash
# 在浏览器打开
open docs/prototype/prototype-3-current-implementation.html
```

---

## 📋 产品需求文档（PRD）

### 1. [Areas 领域重设计 PRD](../areas-redesign-prd.md)

**状态**: Draft  
**版本**: v1.0  
**创建日期**: 2026-06-13

**核心内容**：

- **问题诊断**：
  - ❌ 数据一致性混乱（`deriveAreasFromGoals` 导致幽灵领域）
  - ❌ 概念模糊（Area 同时扮演"标签"和"实体"）
  - ❌ 删除逻辑不完整（孤儿引用）
- **技术方案**：
  - ✅ Area 作为强实体，禁止自由标签
  - ✅ 系统 Area "未分类"（UUID `00000000-0000-0000-0000-000000000000`）
  - ✅ 删除 Area 时自动迁移 Goals 到"未分类"
  - ✅ 前后端统一使用 `area_id`（UUID）
- **实施计划**：5 个 Phase（数据层修复 → 后端逻辑 → 前端重构 → UI 改进 → 测试发布）

**实施状态**：

- ✅ Phase 1-4 已完成（数据层、后端、前端、UI）
- 🔄 Phase 5 进行中（E2E 测试覆盖）

---

## 🏗️ 架构文档

### 1. [架构重构总结报告](../architecture-refactor-summary.md)

**日期**: 2026-06-13  
**状态**: 已完成 ✅

**重构成果**：

- ✅ **摩擦点 1**：过度派生的状态管理层 → `DerivedStateManager` 深层模块
- ✅ **摩擦点 2**：贫血的 Domain 层 → 富领域模型（20 个实体方法）
- ✅ **摩擦点 3**：浅层 Repository 抽象 → 分层 Repository trait
- ✅ **摩擦点 4**：snake_case 转换泄漏 → serde `rename_all = "camelCase"`
- ✅ **摩擦点 5**：WorkspaceMutationAdapter 假接口 → 两个独立实现类

**代码质量指标**：
| 指标 | Before | After | 改善 |
|------|--------|-------|------|
| normalize 函数 | 9 个（100+ 行） | 0 个 | 维护成本 ↓ |
| Domain 行为方法 | 4 个纯函数 | 20 个实体方法 | 内聚性 ↑ |
| Rust 单元测试 | 16 个 | 41 个 | 测试覆盖 ↑ |

---

## 🧪 测试报告

### 最新测试报告索引

| 文件                                                                                                  | 日期       | 测试范围               |
| ----------------------------------------------------------------------------------------------------- | ---------- | ---------------------- |
| [test-report-today-focus-2026-06-13.md](../test-report-today-focus-2026-06-13.md)                     | 2026-06-13 | Today Focus 手动测试   |
| [test-report-automated-today-focus-2026-06-13.md](../test-report-automated-today-focus-2026-06-13.md) | 2026-06-13 | Today Focus 自动化测试 |
| [test-summary-today-focus-2026-06-13.md](../test-summary-today-focus-2026-06-13.md)                   | 2026-06-13 | Today Focus 测试总结   |

---

## 🚀 迁移指南

### [Areas 迁移指南](../areas-migration-guide.md)

**目标用户**：从旧版本升级的用户

**迁移内容**：

- 自动添加"未分类"系统 Area
- 修复孤儿 Goals（area_id = NULL 或指向不存在的 Area）
- 数据库 schema 兼容性处理

**使用方式**：

```bash
# 应用会在启动时自动执行迁移
npm run tauri:dev

# 建议首次运行前备份数据库
cp ~/Library/Application\ Support/com.goaldesk.app/goaldesk.db ~/goaldesk-backup.db
```

---

## 📖 快速索引

### 按角色推荐阅读顺序

**新加入的前端开发者**：

1. [设计理念与架构思想](./design-philosophy.md) - 了解整体架构
2. [prototype-3-current-implementation.html](../prototype/prototype-3-current-implementation.html) - 查看 UI 实现
3. [今日焦点时间展示设计](./today-workbench-time-display.md) - 理解核心功能
4. [架构重构总结](../architecture-refactor-summary.md) - 了解代码组织

**新加入的后端/Rust 开发者**：

1. [设计理念与架构思想](./design-philosophy.md) - 第二章"架构设计原则"
2. [架构重构总结](../architecture-refactor-summary.md) - 第 2/3 节（Domain 层和 Repository）
3. [Areas 重设计 PRD](../areas-redesign-prd.md) - 数据模型设计

**产品经理**：

1. [设计理念与架构思想](./design-philosophy.md) - 第一章"产品定位"
2. [prototype-3-current-implementation.html](../prototype/prototype-3-current-implementation.html) - 交互式原型
3. [Areas 重设计 PRD](../areas-redesign-prd.md) - 功能设计思路

**UI 设计师**：

1. [prototype-3-current-implementation.html](../prototype/prototype-3-current-implementation.html) - 当前 UI 实现
2. [设计理念与架构思想](./design-philosophy.md) - 第三章"UI/UX 设计系统"
3. [今日焦点时间展示设计](./today-workbench-time-display.md) - 时间展示规范

---

## 🔗 相关资源

### 根目录文档

- [README.md](../../README.md) - 项目介绍和快速开始
- [CONTEXT.md](../../CONTEXT.md) - 领域语言和术语定义
- [CLAUDE.md](../../CLAUDE.md) - AI 辅助开发指南
- [AGENTS.md](../../AGENTS.md) - 多 Agent 协作规范

### 技术文档

- [REFACTOR_REPORT.md](../../REFACTOR_REPORT.md) - Areas 功能重构报告
- [QUICK_TEST_GUIDE.md](../../QUICK_TEST_GUIDE.md) - 测试快速指南
- [BROWSER_MODE_TESTING.md](../../BROWSER_MODE_TESTING.md) - 浏览器模式测试

### 外部参考

- [Tauri 2.0 官方文档](https://v2.tauri.app/)
- [Zustand 状态管理](https://zustand-demo.pmnd.rs/)
- [Tailwind CSS](https://tailwindcss.com/)
- [A Philosophy of Software Design](https://web.stanford.edu/~ouster/cgi-bin/book.php) - 深层模块理论来源

---

## 📝 更新日志

| 日期       | 更新内容                              | 负责人      |
| ---------- | ------------------------------------- | ----------- |
| 2026-06-14 | 创建设计资源索引，整合所有设计文档    | Claude Code |
| 2026-06-14 | 新增 prototype-3（当前实现原型）      | Claude Code |
| 2026-06-14 | 新增《设计理念与架构思想》综合文档    | Claude Code |
| 2026-06-13 | Areas 重设计 PRD v1.0 发布            | -           |
| 2026-06-13 | 架构重构完成，41 个 Rust 单元测试通过 | -           |

---

**维护者**: Kairos · 见独 开发团队  
**联系方式**: 项目 GitHub Issues  
**最后更新**: 2026-06-14
