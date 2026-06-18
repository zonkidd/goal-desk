# EventKit 集成架构重构总结

**日期**: 2026-06-15  
**状态**: ✅ 已完成

---

## 🎯 重构目标

基于架构审查报告的发现，对 EventKit 集成进行深度模块化重构，提升代码的局部性（locality）和杠杆（leverage）。

---

## ✅ 已完成的改进

### 1. TimelineService — Timeline 数据转换管道深化

**问题**：Timeline 数据经过 4 层转换，理解渲染逻辑需要跳转 3 个文件。

**解决方案**：创建 `src/lib/TimelineService.ts`

```typescript
export function buildTimeline(
  localTodoItems: TimelineItem[],
  tasks: Task[],
  systemSnapshot?: RustSystemSnapshot
): TimelineItem[]
```

**改进**：
- ✅ **局部性提升**：从 5 步 × 3 文件 → 1 接口 × 1 模块
- ✅ **封装复杂度**：类型转换、日期过滤、排序、去重全部内部化
- ✅ **删除冗余**：移除 63 行 `mergeSystemTimeline` 函数
- ✅ **测试友好**：接口即测试面，输入 → 输出验证端到端行为

**集成点**：
- `desktopApi.ts` 第 166 行：`timeline: buildTimeline(localTimeline, normalizedTasks, systemSnapshot)`
- 删除旧函数：`mergeSystemTimeline`、`startOfToday`、`sameDay`、`timeLabelSortValue`

---

### 2. PermissionManager — 权限流程统一管理

**问题**：权限请求跨 3 层泄漏（TodayView → appStore → desktopApi），状态重复（`integrationStatus` vs `eventkitPermissions`）。

**解决方案**：创建 `src/lib/PermissionManager.ts`

```typescript
export class PermissionManager {
  async request(type: PermissionType): Promise<AuthorizationStatus>
  getStatus(type: PermissionType): AuthorizationStatus
  getState(): PermissionState
  updateState(newState: PermissionState): void
  onChange(callback: PermissionChangeCallback): () => void
}
```

**改进**：
- ✅ **单一真相源**：统一管理 calendar 和 reminders 权限状态
- ✅ **可扩展性**：添加新权限类型（如通讯录）只需一处修改
- ✅ **事件驱动**：支持状态变更监听
- ✅ **测试友好**：Mock PermissionManager 即可测试所有权限相关 UI

**集成点**：
- `appStore.ts` 第 196-202 行：创建 `permissionManager` 实例
- `appStore.ts` 第 805-844 行：`requestCalendarAccess` / `requestRemindersAccess` 使用 PermissionManager
- `appStore.ts` 第 258 行：`hydrateApp` 同步权限状态到 PermissionManager

---

### 3. 自动解决的候选

#### 候选 #4：Timeline 去重模块伪接缝
- ✅ **已解决**：去重逻辑 `deduplicateByTaskLink()` 内嵌到 TimelineService
- ✅ **改进**：调用方无需理解去重细节和数据拆分

#### 候选 #5：mergeSystemTimeline 做太多
- ✅ **已解决**：63 行函数被 TimelineService 的组合式内部实现替代
- ✅ **改进**：`convertCalendarEvents` + `convertReminders` + `sortByTime` + `deduplicateByTaskLink`

---

## 📊 重构收益

| 指标 | Before | After | 改进 |
|------|--------|-------|------|
| **Timeline 理解成本** | 5 步 × 3 文件 | 1 接口 | ⭐⭐⭐⭐⭐ |
| **权限流程层数** | 3 层泄漏 | 1 服务 | ⭐⭐⭐⭐ |
| **去重逻辑暴露** | 外部 + 调用方拆分 | 内部隐藏 | ⭐⭐⭐ |
| **代码行数** | 63 行 merge + 辅助 | 分解内聚 | ⭐⭐⭐ |
| **测试覆盖** | 55 个测试通过 | 55 个测试通过 | ✅ 无回归 |

---

## 🔍 架构原则应用

### 删除测试（Deletion Test）
- ❌ **Before**: 删除 `mergeSystemTimeline` → 复杂度分散到 N 个调用方
- ✅ **After**: 删除 `TimelineService` → 复杂度消失（pass-through）

### 接口即测试面
- ❌ **Before**: 需要 mock desktopApi、appStore 多个层次
- ✅ **After**: 只需测试 `buildTimeline(input) → output`

### 深度 = 小接口 + 大实现
- ✅ `TimelineService.buildTimeline()`: 3 参数 → 封装 5 步转换
- ✅ `PermissionManager.request()`: 1 参数 → 封装 invoke + 状态更新 + 回调通知

---

## 📁 文件清单

### 新增文件
- ✅ `src/lib/TimelineService.ts` (151 行)
- ✅ `src/lib/PermissionManager.ts` (95 行)

### 修改文件
- ✅ `src/lib/desktopApi.ts`: 替换 buildTimeline，删除 mergeSystemTimeline (减少 80 行)
- ✅ `src/store/appStore.ts`: 集成 PermissionManager (修改 40 行)

### 删除内容
- ✅ `mergeSystemTimeline()` 函数 (63 行)
- ✅ `startOfToday()`, `sameDay()`, `timeLabelSortValue()` 辅助函数
- ✅ 重复的 `RustTask`, `RustGoalCard` 接口定义

---

## 📝 术语更新

已添加到项目词汇表：

- **TimelineService**: Timeline 构建服务，封装从原始数据到可渲染 Timeline 的全部转换逻辑
- **PermissionManager**: 权限管理服务，统一管理 EventKit 权限请求、状态查询和变更通知

---

## 🚀 后续改进建议

### 待实现（可选）
1. **BaseDrawer 提取**（候选 #3）：减少 Drawer 组件 100+ 行重复
2. **死代码清理**：
   - 修复 CalendarEventDrawer 未挂载
   - 完成 Quick Capture 创建模式行为
   - 完成 TaskDrawer 系统提醒关联功能

### 不建议
- ❌ 过度拆分 TimelineService 内部函数（会降低局部性）
- ❌ 提取"BasePermissionManager"（只有 2 种权限，不需要抽象）

---

## ✅ 验证结果

- **TypeScript 编译**: ✅ 通过（除预先存在的 codecs 错误）
- **单元测试**: ✅ 55/55 通过
- **集成测试**: ✅ E2E 测试已覆盖（8 个测试用例）

---

**重构完成！** 🎊 代码库现在具有更好的深度、局部性和可维护性。
