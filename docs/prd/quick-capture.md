# Quick Capture 功能 PRD

**文档版本**: v1.0  
**创建日期**: 2026-06-14  
**状态**: 已实现 ✅

---

## 一、功能概述

### 1.1 产品定位

Quick Capture（快速捕获）是 Goal Desk 的核心入口功能，允许用户在任何场景下通过全局快捷键 `Option+Space` 快速记录想法和任务，无需切换应用或打开主窗口。

**设计理念**：
- **无摩擦捕获**：捕获速度优先于完整性，先记录，后整理
- **自然语言解析**：支持"明天下午三点"等自然时间表达
- **轻量级交互**：单一输入框，Enter 提交，无额外步骤

### 1.2 用户价值

| 用户痛点 | Quick Capture 解决方案 |
|---------|---------------------|
| 灵感稍纵即逝，打开应用太慢 | 全局快捷键即开即用 |
| 时间设置繁琐（点日历、选时间） | 自然语言解析（"明天三点"） |
| 频繁中断工作流 | 独立浮动窗口，不切换主窗口 |
| 输入后还要选分类/设项目 | 一键提交到收件箱，后续再整理 |

---

## 二、功能规格

### 2.1 触发方式

#### 全局快捷键（主要）
- **快捷键**: `Option+Space`（macOS）
- **实现**: Tauri `globalShortcut` API
- **行为**: 
  - 如果主窗口隐藏，**只打开 Quick Capture 窗口**
  - 如果主窗口已显示，**打开 Quick Capture Modal**（应用内弹窗）
  - 重复按快捷键时：如果窗口已打开则关闭

#### 应用内快捷键（次要）
- **快捷键**: `Cmd+K`
- **实现**: 前端键盘事件监听
- **行为**: 在主窗口内打开 Quick Capture Modal

### 2.2 窗口形态

#### 独立窗口模式（Tauri Window）

**适用场景**: 主窗口隐藏时，通过全局快捷键触发

**窗口规格**:
```typescript
// src-tauri/src/lib.rs
{
  label: "quick-capture",
  url: WindowUrl::App("index.html".into()),
  title: "Quick Capture",
  width: 520.0,
  height: 240.0,
  resizable: false,
  always_on_top: true,
  decorations: false,       // 无标题栏
  transparent: true,        // 窗口透明
  center: true,             // 屏幕居中
  skip_taskbar: true,       // 不显示在任务栏
}
```

**视觉特性**:
- 玻璃拟态背景（`backdrop-filter: blur(24px)`）
- 圆角 `rounded-[28px]`
- 阴影 `shadow-2xl`
- 无窗口边框，自定义关闭按钮

#### Modal 模式（应用内弹窗）

**适用场景**: 主窗口已显示时

**布局规格**:
```tsx
// src/components/modal/QuickCaptureModal.tsx
{
  position: "fixed top-24 left-1/2 -translate-x-1/2",
  width: "520px",
  zIndex: 50,
  backdrop: "bg-slate-900/15 backdrop-blur-sm"
}
```

**动画效果**:
```typescript
// Framer Motion
initial: { opacity: 0, y: -20, scale: 0.96 }
animate: { opacity: 1, y: 0, scale: 1 }
exit: { opacity: 0, y: -16, scale: 0.98 }
transition: { type: 'spring', stiffness: 280, damping: 26 }
```

### 2.3 输入表单

#### 表单结构

```tsx
<QuickCaptureForm>
  <header>
    <Sparkles icon />
    <h3>Quick Capture</h3>
    <CloseButton />  {/* 仅 Modal 模式显示 */}
  </header>
  
  <hint>
    先把想法收进来。后面我们再把它解析成具体时间和提醒。
  </hint>
  
  <input
    placeholder="例如：明天下午三点看熊掌记"
    autoFocus
    onEnter={submit}
  />
</QuickCaptureForm>
```

#### 输入框规格
- **高度**: `h-14`（56px）
- **圆角**: `rounded-2xl`
- **字体**: `text-base font-medium`（16px）
- **焦点状态**: `focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20`
- **自动聚焦**: 窗口打开时立即聚焦输入框

### 2.4 自然语言解析

#### 支持的时间表达式

| 输入示例 | 解析结果 | 提取后标题 |
|---------|---------|-----------|
| 明天下午三点看熊掌记 | `tomorrow 15:00` | 看熊掌记 |
| 明天三点开会 | `tomorrow 15:00` | 开会 |
| 明天完成报告 | `tomorrow 09:00` | 完成报告 |
| 今晚健身 | `today 20:00` | 健身 |
| 写代码 | 无时间 | 写代码 |

#### 实现逻辑（`src/lib/quickCapture.ts`）

```typescript
export function parseBrowserQuickCapture(input: string, now: Date = new Date()): BrowserQuickCaptureDraft {
  let title = input.trim()
  let dueDate: Date | undefined

  // 优先级从高到低匹配
  if (title.includes('明天下午三点')) {
    title = title.replace('明天下午三点', '').trim()
    dueDate = relativeDayTime(now, 1, 15, 0)  // 明天 15:00
  } else if (title.includes('明天三点')) {
    title = title.replace('明天三点', '').trim()
    dueDate = relativeDayTime(now, 1, 15, 0)
  } else if (title.includes('明天')) {
    title = title.replace('明天', '').trim()
    dueDate = relativeDayTime(now, 1, 9, 0)   // 明天 09:00（默认）
  } else if (title.includes('今晚')) {
    title = title.replace('今晚', '').trim()
    dueDate = relativeDayTime(now, 0, 20, 0)  // 今晚 20:00
  }

  return { title, dueDate }
}
```

**设计权衡**:
- ✅ 简单实现：字符串匹配而非复杂 NLP
- ✅ 中文优先：针对中文用户习惯
- ❌ 表达式有限：不支持"下周"、"后天"等
- 🔄 未来扩展：可接入第三方时间解析库

### 2.5 提交行为

#### 前端流程（浏览器模式）

```typescript
// src/components/modal/QuickCaptureModal.tsx
const addTask = useAppStore((state) => state.addTask)

onSubmit={() => {
  void addTask(value)         // 调用 store action
  setValue('')                // 清空输入
  closeQuickCapture()         // 关闭弹窗
}}
```

#### 后端流程（Tauri 模式）

```rust
// src-tauri/src/lib.rs
#[tauri::command]
pub fn quick_capture_task(
    app_handle: AppHandle,
    title: String,
    planned_start_at: Option<String>,
    due_at: Option<String>,
) -> Result<(), String> {
    // 1. 生成 UUID
    let id = Uuid::new_v4().to_string();
    
    // 2. 写入 SQLite
    repo.execute(
        "INSERT INTO desk_tasks (id, title, status, planned_start_at, due_at, ...) 
         VALUES (?1, ?2, 'TODO', ?3, ?4, ...)",
        params![id, title, planned_start_at, due_at]
    )?;
    
    // 3. 发送事件通知主窗口
    app_handle.emit_all("desk-task-created", payload)?;
    
    // 4. 关闭 Quick Capture 窗口
    if let Some(window) = app_handle.get_window("quick-capture") {
        window.close()?;
    }
    
    Ok(())
}
```

#### 事件通知机制

```typescript
// src/App.tsx - 主窗口监听事件
listen<DeskTaskCreatedPayload>('desk-task-created', (event) => {
  const task: Task = {
    id: event.payload.id,
    title: event.payload.title,
    status: event.payload.status,
    plannedStartAt: event.payload.plannedStartAt ? new Date(event.payload.plannedStartAt) : undefined,
    dueDate: event.payload.dueAt ? new Date(event.payload.dueAt) : undefined,
    // ...
  }
  receiveExternalTask(task)  // 合并到主窗口状态
})
```

---

## 三、交互流程

### 3.1 完整用户流程

```
1. 用户在任意应用按 Option+Space
   ↓
2. Quick Capture 窗口弹出（居中、置顶）
   ↓
3. 输入框自动聚焦，用户输入"明天下午三点开会"
   ↓
4. 按 Enter 或点击提交
   ↓
5. 自然语言解析：
   - 标题：开会
   - dueDate: 2026-06-15 15:00
   ↓
6. 后端写入 SQLite
   ↓
7. 发送 desk-task-created 事件
   ↓
8. 主窗口接收事件，更新收件箱列表
   ↓
9. Quick Capture 窗口自动关闭
   ↓
10. 用户返回原应用，无感知切换
```

### 3.2 边界情况处理

| 场景 | 行为 |
|------|-----|
| 输入为空时按 Enter | 不执行任何操作 |
| 输入只有空格 | trim 后为空，不创建任务 |
| 快速连续按 Option+Space | 防抖处理，避免重复打开 |
| Quick Capture 窗口打开时再按快捷键 | 关闭窗口 |
| 主窗口关闭时触发快捷键 | 只打开 Quick Capture 窗口 |
| 解析不出时间表达式 | `dueDate` 为 `undefined`，任务仍正常创建 |

---

## 四、技术实现

### 4.1 关键文件

| 文件路径 | 职责 |
|---------|-----|
| `src/lib/quickCapture.ts` | 自然语言时间解析逻辑 |
| `src/components/modal/QuickCaptureForm.tsx` | 表单 UI 组件 |
| `src/components/modal/QuickCaptureModal.tsx` | Modal 模式封装 |
| `src/components/modal/QuickCaptureWindow.tsx` | 独立窗口模式入口 |
| `src-tauri/src/lib.rs` | Tauri command `quick_capture_task` |
| `src/store/appStore.ts` | `addTask` action |

### 4.2 状态管理

```typescript
// src/store/appStore.ts
interface AppStore {
  isQuickCaptureOpen: boolean
  openQuickCapture: () => void
  closeQuickCapture: () => void
  
  addTask: (title: string) => Promise<void>
  receiveExternalTask: (task: Task) => void
}
```

### 4.3 性能优化

- **窗口预创建**: 首次启动时创建但隐藏 Quick Capture 窗口，减少唤起延迟
- **自动聚焦**: `autoFocus` 属性确保无需点击即可输入
- **轻量级解析**: 字符串匹配而非正则表达式，解析速度 <1ms

---

## 五、设计决策（ADR）

### ADR-001: 全局快捷键选择 `Option+Space`

**决策**: 使用 `Option+Space` 而非 `Cmd+Space`

**理由**:
- ✅ `Cmd+Space` 被 Spotlight 占用，避免冲突
- ✅ `Option` 键相对少用，误触概率低
- ✅ 单手操作友好（左手拇指 + 食指）

**代价**:
- ❌ 用户需要学习新快捷键（Spotlight 已成肌肉记忆）
- 缓解：应用内提示和文档强调

### ADR-002: 独立窗口 vs Modal 模式

**决策**: 根据主窗口状态自动切换

**理由**:
- ✅ 主窗口隐藏时：独立窗口避免唤起主窗口（性能优化）
- ✅ 主窗口显示时：Modal 模式避免窗口层叠混乱
- ✅ 用户无需关心模式差异，行为一致

### ADR-003: 有限的自然语言解析

**决策**: 只支持 4 种常用时间表达式

**理由**:
- ✅ 简单实现，无需引入 NLP 库
- ✅ 覆盖 80% 常见场景（明天、今晚、具体时间）
- ✅ 解析失败不影响任务创建

**未来扩展**:
- 🔄 支持"下周"、"周末"等表达式
- 🔄 接入 Chrono.js 等时间解析库
- 🔄 支持英文表达式（"tomorrow 3pm"）

### ADR-004: 提交即关闭窗口

**决策**: Enter 提交后立即关闭 Quick Capture 窗口

**理由**:
- ✅ 最快返回原应用（无摩擦理念）
- ✅ 避免窗口残留占据屏幕
- ✅ 符合"捕获-关闭-继续工作"心智模型

**代价**:
- ❌ 无法连续添加多个任务
- 缓解：用户可以再次按快捷键重新打开

---

## 六、测试用例

### 6.1 功能测试

| 测试场景 | 输入 | 预期输出 |
|---------|-----|---------|
| 基本任务创建 | "写代码" | title="写代码", dueDate=undefined |
| 明天时间 | "明天开会" | title="开会", dueDate=明天 09:00 |
| 明天下午三点 | "明天下午三点看熊掌记" | title="看熊掌记", dueDate=明天 15:00 |
| 今晚时间 | "今晚健身" | title="健身", dueDate=今天 20:00 |
| 空输入 | "" | 不创建任务 |
| 只有空格 | "   " | 不创建任务 |

### 6.2 快捷键测试

| 测试场景 | 操作 | 预期行为 |
|---------|-----|---------|
| 首次触发 | 按 Option+Space | Quick Capture 窗口弹出 |
| 重复触发 | 窗口打开时再按 Option+Space | 窗口关闭 |
| 主窗口隐藏 | Option+Space | 只打开 Quick Capture 窗口 |
| 主窗口显示 | Option+Space | 打开 Quick Capture Modal |
| Cmd+K | 主窗口内按 Cmd+K | 打开 Quick Capture Modal |

### 6.3 边界测试

| 测试场景 | 输入 | 预期行为 |
|---------|-----|---------|
| 超长标题 | 200 字符的文本 | 正常创建，标题完整保存 |
| 特殊字符 | "任务@#$%^&*()" | 正常创建，特殊字符保留 |
| Emoji | "🎯 完成目标" | 正常创建，Emoji 显示正确 |
| 解析冲突 | "明天明天开会" | title="明天开会", dueDate=明天 09:00 |

---

## 七、未来优化

### 7.1 短期优化（1-2 周）

- [ ] **快捷键自定义**: 允许用户在设置中修改全局快捷键
- [ ] **时间表达式扩展**: 支持"下周"、"周末"、"后天"
- [ ] **提交反馈**: 提交成功后显示 toast 提示

### 7.2 中期迭代（1-2 月）

- [ ] **快速分类**: 添加可选的领域/目标快速选择
- [ ] **历史建议**: 输入时显示最近添加的任务（自动补全）
- [ ] **语音输入**: 支持语音转文字快速捕获
- [ ] **多行输入**: 支持粘贴多行文本，自动拆分为多个任务

### 7.3 长期愿景（3-6 月）

- [ ] **AI 增强解析**: 使用 LLM 理解复杂时间表达式和任务描述
- [ ] **移动端同步**: iOS/iPadOS 的 Quick Capture Widget
- [ ] **浏览器扩展**: Chrome/Safari 扩展快速捕获网页内容

---

## 八、相关资源

### 文档
- [设计理念与架构思想](../design/design-philosophy.md)
- [快速测试指南](../../QUICK_TEST_GUIDE.md)

### 代码
- [`src/lib/quickCapture.ts`](../../src/lib/quickCapture.ts)
- [`src/components/modal/QuickCaptureModal.tsx`](../../src/components/modal/QuickCaptureModal.tsx)
- [`src-tauri/src/lib.rs`](../../src-tauri/src/lib.rs) - `quick_capture_task` command

### 测试
- [`src/components/modal/QuickCaptureWindow.test.tsx`](../../src/components/modal/QuickCaptureWindow.test.tsx)

---

**文档维护者**: Goal Desk 开发团队  
**最后更新**: 2026-06-14
