# goal-desk

Goal Desk - 本地优先的目标管理桌面应用

## 技术栈

- **前端**: React + TypeScript + Tailwind CSS
- **桌面框架**: Tauri 2.0
- **数据库**: SQLite (本地存储)
- **原生集成**: EventKit (macOS 日历和提醒)

## 功能特性

- ✅ Goal 管理 (创建/编辑/状态切换)
- ✅ SQLite 持久化存储
- ✅ Timeline 今日视图
- ✅ Task 任务管理
- ✅ Quick Capture 快速捕获
- ✅ EventKit 桥接

## 开发

```bash
npm install
npm run tauri dev
```

## 测试

```bash
cd src-tauri
cargo test
```
