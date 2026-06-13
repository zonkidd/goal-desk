---
recallloom: context-brief
---

# Goal Desk Tauri - 项目概述

## 项目定位

Goal Desk 是一个基于 Tauri + React 的跨平台目标管理桌面应用，专注于目标追踪、任务管理和持续推进。

## 核心特性

- **Goal 管理**: 创建、编辑、状态跟踪
- **Task 管理**: 任务关联 Goal，支持持续推进标记
- **Today 视图**: 智能显示今日待办和持续推进任务
- **进度派生**: 自动计算 Goal 进度和状态转换
- **SQLite 持久化**: 完整的本地数据存储

## 技术栈

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: Tauri + Rust + SQLite
- **状态管理**: Zustand
- **动画**: Framer Motion

## 项目结构

- `src/`: React 前端代码
- `src-tauri/`: Rust 后端代码
- `docs/`: 文档和 Issue 跟踪
- `.recallloom/`: 项目记忆系统

## 开发工作流

1. 功能开发按 Issue 驱动
2. UI 优化注重可用性和交互反馈
3. 所有功能需要持久化验证
4. 提交前运行测试确保质量

## 重要约束

- 遵循 CLAUDE.md 中的格式规范（不做大规模重构）
- 保持向后兼容
- UI 组件保持一致的设计语言
