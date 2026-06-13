# 浏览器模式测试指南

## 修改内容

已为浏览器预览模式添加完整的模拟数据支持和 localStorage 持久化功能。

### 修改的文件

1. **src/lib/workspaceMutations.ts** - 主要修改
   - 添加 localStorage 辅助函数
   - `createTask` - 返回模拟 Task 对象并保存到 localStorage
   - `createTaskForGoal` - 返回关联到 Goal 的模拟 Task 对象
   - `createGoal` - 返回模拟 Goal 对象并保存到 localStorage
   - `createArea` - 返回模拟 Area 对象并保存到 localStorage
   - `listAreas` - 从 localStorage 加载 Area 列表

2. **src/App.tsx** - 启动时数据加载
   - 添加 `loadBrowserData` 函数从 localStorage 加载数据
   - 浏览器模式启动时自动加载已保存的 tasks 和 goals
   - 自动调用 `loadAreas()` 加载领域数据

3. **src/components/drawer/TaskDrawer.tsx** - 类型修复
   - 修复 `allAreas` 类型定义，添加 `isSystem` 字段

## 功能说明

### 浏览器模式现在支持：

1. **创建任务（Task）**
   - 自动生成 UUID
   - 创建时添加 "CREATED" 活动日志
   - 保存到 localStorage，刷新后仍然存在

2. **创建目标（Goal）**
   - 自动生成 UUID
   - 设置默认值（status: 'ACTIVE', progress: 0）
   - 保存到 localStorage

3. **创建领域（Area）**
   - 自动生成 UUID
   - 初始统计为 0（goalCount, activeGoalCount）
   - 保存到 localStorage

4. **从 Goal 创建 Task**
   - 自动关联到 Goal（linkedGoalId 和 linkedGoalLabel）
   - 保存到 localStorage

5. **数据持久化**
   - 使用 localStorage 存储数据
   - 刷新页面后数据不会丢失
   - 数据在同一域名下的所有标签页共享

## 测试步骤

### 前提条件
开发服务器已启动在 http://localhost:1420

### 测试 1：创建 Area（领域）

1. 在浏览器中打开 http://localhost:1420
2. 点击左侧 Sidebar 的 "Areas" 或直接访问领域管理页面
3. 点击"新建领域"按钮
4. 输入领域名称，例如 "工作"
5. 点击"创建"
6. ✅ 检查：领域卡片出现在列表中
7. ✅ 检查：显示"0 个目标"、"0 个活跃"
8. 刷新页面
9. ✅ 检查：领域仍然存在（localStorage 持久化成功）

### 测试 2：创建 Goal（目标）

1. 进入 Goals 视图
2. 点击"新建目标"按钮
3. 输入目标标题，例如 "完成项目需求文档"
4. 可选择刚创建的"工作"领域
5. 输入描述（可选）
6. 点击保存
7. ✅ 检查：目标卡片出现在看板中
8. ✅ 检查：进度显示为 0%
9. ✅ 检查：状态为 "ACTIVE"
10. 刷新页面
11. ✅ 检查：目标仍然存在

### 测试 3：创建 Task（待办）

1. 进入 Inbox 或 Today 视图
2. 点击"添加任务"或输入框
3. 输入任务标题，例如 "整理需求清单"
4. 按 Enter 或点击保存
5. ✅ 检查：任务出现在列表中
6. 点击任务打开抽屉
7. ✅ 检查：任务详情显示正确
8. ✅ 检查：活动日志显示 "CREATED" 记录
9. 刷新页面
10. ✅ 检查：任务仍然存在

### 测试 4：从 Goal 创建 Task

1. 打开某个 Goal 的详情抽屉
2. 在任务列表部分点击"添加任务"
3. 输入任务标题，例如 "撰写需求文档第一章"
4. 保存
5. ✅ 检查：任务出现在 Goal 的任务列表中
6. ✅ 检查：任务显示 Goal 标签（linkedGoalLabel）
7. 关闭抽屉，进入 Inbox 查看
8. ✅ 检查：任务显示关联的 Goal
9. 刷新页面
10. ✅ 检查：任务和 Goal 的关联关系仍然存在

### 测试 5：数据清空

如果需要清空浏览器模式的所有数据：

```javascript
// 在浏览器控制台执行
localStorage.removeItem('goal-desk-browser-tasks')
localStorage.removeItem('goal-desk-browser-goals')
localStorage.removeItem('goal-desk-browser-areas')
location.reload()
```

## localStorage 键名

- `goal-desk-browser-tasks` - 存储所有 Task 对象
- `goal-desk-browser-goals` - 存储所有 Goal 对象
- `goal-desk-browser-areas` - 存储所有 Area 对象

## 注意事项

1. **浏览器模式提示**
   - UI 顶部会显示 "Browser preview only · local database is unavailable"
   - 这是正常的，提醒用户当前处于浏览器预览模式

2. **数据隔离**
   - 浏览器模式数据与 Tauri 桌面应用的 SQLite 数据库完全隔离
   - 不会相互影响

3. **刷新行为**
   - **旧行为**：刷新后所有数据消失
   - **新行为**：刷新后数据从 localStorage 恢复

4. **跨标签页同步**
   - 同一域名下的所有标签页共享 localStorage
   - 在一个标签页创建的数据，其他标签页刷新后可见

5. **时间戳处理**
   - Date 对象会序列化为字符串存储
   - 加载时自动转换回 Date 对象

## 回归测试

确保 Tauri 桌面模式未受影响：

```bash
npm run tauri:dev
```

验证以下功能：
- ✅ 创建 Task 保存到 SQLite
- ✅ 创建 Goal 保存到 SQLite
- ✅ 创建 Area 保存到 SQLite
- ✅ 刷新后数据仍然存在（从 SQLite 加载）

## 已知限制

1. 浏览器模式不支持：
   - EventKit 日历和提醒集成
   - 全局快捷键（Alt+Space）
   - Bear 笔记集成
   - 原生窗口管理

2. localStorage 限制：
   - 每个域名约 5-10MB 存储空间
   - 数据存储在用户本地，清除浏览器数据会丢失

## 如果遇到问题

1. **类型错误**
   ```bash
   npm run build
   ```
   检查 TypeScript 编译错误

2. **服务器无法启动**
   ```bash
   lsof -ti:1420 | xargs kill -9
   npm run dev
   ```

3. **数据异常**
   清空 localStorage 并刷新页面（参见"测试 5：数据清空"）

4. **回滚更改**
   ```bash
   git checkout -- src/lib/workspaceMutations.ts src/App.tsx src/components/drawer/TaskDrawer.tsx
   ```
