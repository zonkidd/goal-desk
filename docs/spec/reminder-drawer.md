# SystemReminderDrawer 组件 Spec

**文档版本**: v1.0  
**创建日期**: 2026-06-14  
**状态**: 已实现 ✅

---

## 一、概述

### 1.1 组件定位

SystemReminderDrawer 是 Apple Reminders（系统提醒事项）的只读详情抽屉组件，展示从 EventKit 读取的系统提醒，并提供跳转到系统提醒事项 App 的入口。

**设计原则**：
- **只读外部源**：展示提醒，不支持创建、编辑或标记完成（由系统提醒事项 App 负责）
- **外部编辑入口**：需要修改标题、时间或完成状态时打开系统提醒事项 App
- **权限透明**：清晰展示 Calendar 和 Reminders 权限状态
- **时间范围**：默认显示未来 7 天内的提醒

---

## 二、组件结构

### 2.1 文件路径

- **组件文件**: `src/components/drawer/SystemReminderDrawer.tsx`
- **依赖图标**: `lucide-react` - Bell, Clock3, ExternalLink, ShieldAlert, X
- **状态管理**: `useAppStore` - 提醒数据、权限状态、抽屉开关
- **后端集成**: EventKit API（通过 `src-tauri/src/eventkit.rs`）

### 2.2 数据结构

```typescript
// 提醒事项数据
interface ReminderItem {
  id: string
  title: string
  done: boolean
  dueAt?: Date
  listTitle?: string  // 提醒列表名称（如"工作"、"购物清单"）
}

// 权限状态
interface IntegrationStatus {
  calendar: AccessStatus
  reminders: AccessStatus
}

type AccessStatus = 
  | 'granted'          // 已授权
  | 'denied'           // 已拒绝
  | 'restricted'       // 受限制（家长控制等）
  | 'not_determined'   // 未询问
  | 'error'            // 不可用（非 macOS）
```

---

## 三、视觉设计

### 3.1 抽屉布局

```
┌──────────────────────────────────────┐
│  🔔 Apple Reminders          [X]     │ ← 标题栏
├──────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐         │
│  │ Calendar │  │ Reminders│         │ ← 权限状态卡片
│  │ Granted  │  │ Granted  │         │
│  └──────────┘  └──────────┘         │
├──────────────────────────────────────┤
│  ⚠️ 提醒事项权限未就绪...           │ ← 权限警告（条件渲染）
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐ │
│  │ 工作                           │ │
│  │ 完成季度报告                   │ │
│  │ 🕐 06/15 14:00          [打开] │ │
│  └────────────────────────────────┘ │
│  ┌────────────────────────────────┐ │
│  │ 购物清单                       │ │
│  │ 买牛奶                         │ │
│  │ 🕐 06/16 10:00          [打开] │ │
│  └────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### 3.2 位置和尺寸

```typescript
className="glass-panel fixed bottom-4 right-4 top-4 z-50 w-[600px] rounded-3xl"
```

**定位**：
- `fixed` - 固定定位
- `right-4` - 与 TaskDrawer、CalendarEventDrawer 保持同侧详情抽屉位置
- `top-4` - 距离顶部 16px
- `bottom-4` - 距离底部 16px
- `w-[600px]` - 固定宽度 600px

**层级**：
- `z-50` - 与其他详情抽屉一致

### 3.3 动画效果

```typescript
<motion.aside
  initial={{ x: 40, opacity: 0 }}     // 从右侧 40px 外淡入
  animate={{ x: 0, opacity: 1 }}      // 滑动到位置
  exit={{ x: 40, opacity: 0 }}        // 淡出到右侧
  transition={{ type: 'spring', stiffness: 240, damping: 28 }}
>
```

**动画参数**：
- `spring` 弹簧动画，自然感
- `stiffness: 240` - 较高刚度，快速响应
- `damping: 28` - 适中阻尼，无过度弹跳

---

## 四、权限状态展示

### 4.1 权限卡片

```typescript
<div className="mb-4 grid grid-cols-2 gap-3">
  {/* Calendar 权限 */}
  <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-3">
    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
      Calendar
    </div>
    <div className="text-sm font-semibold text-slate-700">
      {accessLabel[integrationStatus.calendar]}
    </div>
  </div>
  
  {/* Reminders 权限 */}
  <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-3">
    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
      Reminders
    </div>
    <div className="text-sm font-semibold text-slate-700">
      {accessLabel[integrationStatus.reminders]}
    </div>
  </div>
</div>
```

### 4.2 权限状态文案

```typescript
const accessLabel = {
  granted: 'Granted',
  denied: 'Denied',
  restricted: 'Restricted',
  not_determined: 'Not Asked',
  error: 'Unavailable',
} as const
```

**文案说明**：
- `Granted` - 已授权，可正常访问
- `Denied` - 用户拒绝，需到系统设置开启
- `Restricted` - 受限制（家长控制、MDM 策略）
- `Not Asked` - 首次使用，未触发授权弹窗
- `Unavailable` - 非 macOS 或 EventKit 不可用

### 4.3 权限警告

```typescript
{integrationStatus.reminders !== 'granted' && (
  <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-700">
    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
    <p>提醒事项权限未就绪。首次打开会触发系统授权；若已拒绝，需要到系统设置里重新开启。</p>
  </div>
)}
```

**显示条件**：
- 只在 `reminders !== 'granted'` 时显示
- 琥珀色背景（Amber）表示警告

---

## 五、提醒列表

### 5.1 空状态

```typescript
{reminders.length === 0 ? (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-4 text-sm text-slate-500">
    当前 7 天内没有可展示的系统提醒。
  </div>
) : (
  // 提醒列表
)}
```

**空状态设计**：
- 虚线边框（`border-dashed`）
- 半透明白色背景
- 灰色文字提示

### 5.2 提醒卡片

```typescript
<div
  key={reminder.id}
  className={`rounded-2xl border p-4 transition-colors ${
    isSelected 
      ? 'border-indigo-200 bg-indigo-50/70'  // 选中状态
      : 'border-slate-200/80 bg-white/75'    // 默认状态
  }`}
>
  <div className="flex items-start justify-between gap-3">
    {/* 左侧内容 */}
    <div className="min-w-0">
      {/* 列表标题 */}
      <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
        {reminder.listTitle || 'Apple Reminders'}
      </div>
      
      {/* 提醒标题 */}
      <div className={`text-sm font-semibold ${
        reminder.done 
          ? 'text-slate-500 line-through'  // 已完成样式
          : 'text-slate-800'               // 未完成样式
      }`}>
        {reminder.title}
      </div>
      
      {/* 时间 */}
      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
        <Clock3 className="h-3.5 w-3.5" />
        {dueLabel}
      </div>
    </div>
    
    {/* 右侧按钮：只打开 Apple Reminders，不写回提醒状态 */}
    <button
      type="button"
      onClick={() => void openSystemReminder(reminder.id)}
      className="inline-flex h-9 items-center gap-1 rounded-full bg-slate-100 px-3 text-xs font-bold text-slate-700 hover:bg-slate-200"
    >
      打开
      <ExternalLink className="h-3.5 w-3.5" />
    </button>
  </div>
</div>
```

### 5.3 时间格式化

```typescript
const dueLabel = reminder.dueAt
  ? reminder.dueAt.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  : 'No due date'

// 输出示例: "06/15 14:00"
```

---

## 六、交互逻辑

### 6.1 打开系统提醒事项

```typescript
const openSystemReminder = useAppStore((state) => state.openSystemReminder)

<button
  onClick={() => void openSystemReminder(reminder.id)}
>
  打开系统提醒事项
</button>
```

**流程**：
```
1. 用户点击 "打开系统提醒事项" 按钮
   ↓
2. 调用 openSystemReminder(reminderId)
   ↓
3. EventKit adapter:
   - 通过系统 URL 打开系统提醒事项 App
   ↓
4. 用户在系统提醒事项 App 中查看或编辑外部提醒
```

### 6.2 选中提醒

```typescript
const selectedReminderId = useAppStore((state) => state.selectedReminderId)
const isSelected = selectedReminderId === reminder.id
```

**选中效果**：
- 背景色变为靛蓝色（`bg-indigo-50/70`）
- 边框色变为靛蓝色（`border-indigo-200`）

**选中方式**：
- 当前未实现点击选中逻辑
- `selectedReminderId` 状态预留给未来功能（如查看提醒详情）

### 6.3 关闭抽屉

```typescript
const closeReminderDrawer = useAppStore((state) => state.closeReminderDrawer)

<button onClick={closeReminderDrawer}>
  <X className="h-4 w-4" />
</button>
```

---

## 七、EventKit 集成

### 7.1 数据加载

```typescript
// src/store/appStore.ts
hydrateApp: (payload: HydratePayload) =>
  set((state) => ({
    systemReminders: payload.systemReminders,
    integrationStatus: payload.integrationStatus,
    // ...
  }))
```

**加载时机**：
- 应用启动时调用 `hydrateApp()`
- `payload` 来自 `desktopApi.loadWorkspace()`
- `loadWorkspace()` 内部调用 `eventkit_snapshot()`

### 7.2 权限请求

```rust
// src-tauri/src/eventkit.rs
pub fn eventkit_snapshot(start_iso: &str, end_iso: &str) -> EventKitSnapshot {
    // 调用 Objective-C 桥接层
    let result = unsafe { gd_eventkit_snapshot(...) };
    
    // 返回包含 reminders 和 integration_status
    EventKitSnapshot {
        reminders: vec![...],
        integration_status: IntegrationStatus {
            calendar: access_status_calendar,
            reminders: access_status_reminders,
        },
    }
}
```

**权限流程**：
1. 首次调用 `eventkit_snapshot()` 时触发系统授权弹窗
2. 用户选择"允许"或"拒绝"
3. 后续调用返回实际权限状态
4. 前端根据 `integration_status` 显示权限卡片

### 7.3 只读提醒操作

```rust
// 当前策略：不提供 toggle_system_reminder_done / create_system_reminder 等写入命令。
// 前端只通过 openSystemReminder 打开系统提醒事项 App。
```

**Objective-C 层**：
```objc
// 当前策略：EventKitBridge 不保存 EKReminder。
```

---

## 八、设计决策（ADR）

### ADR-001: 独立抽屉而非嵌入 Today

**决策**: SystemReminderDrawer 是独立抽屉，而非嵌入 Today 时间轴

**理由**：
- ✅ 权限状态需要专门展示区域
- ✅ 提醒列表可能很长，独立抽屉避免干扰 Today 视图
- ✅ 支持批量操作（未来扩展）

**代价**：
- ❌ 用户需要额外点击打开抽屉
- 接受：Today 视图可以快速访问系统提醒，SystemReminderDrawer 用于只读详情和外部打开

### ADR-002: 系统提醒作为只读外部源

**决策**: SystemReminderDrawer 不支持创建、编辑或标记完成系统提醒，只展示导入数据并打开系统提醒事项 App

**理由**：
- ✅ 避免与系统提醒 App 功能重复
- ✅ 避免 EventKit 写操作和双向同步冲突
- ✅ 保持 Goal Desk 核心定位（任务管理，而非日历替代）

**代价**：
- ❌ 用户需要切换到系统提醒 App 创建提醒
- 接受：Goal Desk 的 Quick Capture 足够快，用户不需要依赖系统提醒

### ADR-003: 7 天时间范围

**决策**: 默认只显示未来 7 天内的提醒

**理由**：
- ✅ 7 天是合理的"近期"范围
- ✅ 避免加载过多历史提醒（性能）
- ✅ 对齐 Today 视图的"今日焦点"理念

**代价**：
- ❌ 无法查看 7 天后的提醒
- 接受：用户可以在系统提醒 App 查看全部提醒

### ADR-004: 固定宽度 600px

**决策**: SystemReminderDrawer 固定宽度 600px，无法调整

**理由**：
- ✅ 与 TaskDrawer、CalendarEventDrawer 的详情抽屉尺寸一致
- ✅ 只读状态、权限状态和外部打开说明有足够展示空间
- ✅ 固定宽度简化布局计算

**代价**：
- ❌ 无法适应超长提醒标题
- 接受：长标题会自动换行，`min-w-0` 避免溢出

---

## 九、跨平台兼容性

### 9.1 非 macOS 环境

```typescript
// src/lib/desktopApi.ts
export async function loadWorkspace(): Promise<HydratePayload> {
  if (isTauriRuntime()) {
    // Tauri 环境
    const workspace = await invoke<DeskWorkspace>('load_workspace')
    return normalizeWorkspace(workspace)
  } else {
    // 浏览器环境
    return {
      systemReminders: [],  // 空提醒列表
      integrationStatus: {
        calendar: 'error',
        reminders: 'error',
      },
      // ...
    }
  }
}
```

**行为**：
- 浏览器预览：`systemReminders = []`，权限显示 "Unavailable"
- Windows/Linux Tauri：EventKit 返回空数据，权限显示 "Unavailable"
- macOS Tauri：正常读取系统提醒

### 9.2 权限被拒绝

```typescript
{integrationStatus.reminders === 'denied' && (
  <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
    <p>权限已被拒绝。请到 系统设置 → 隐私与安全性 → 提醒事项 中允许 Goal Desk。</p>
  </div>
)}
```

**建议改进**：
- 添加"打开系统设置"按钮（通过 `open` crate 调用 `open "x-apple.systempreferences:com.apple.preference.security?Privacy_Reminders"`）

---

## 十、测试策略

### 10.1 单元测试

```typescript
// SystemReminderDrawer.test.tsx
import { render, screen } from '@testing-library/react'
import { SystemReminderDrawer } from './SystemReminderDrawer'

test('renders permission cards', () => {
  // Mock useAppStore
  vi.mock('../../store/appStore', () => ({
    useAppStore: (selector) => selector({
      isReminderDrawerOpen: true,
      integrationStatus: { calendar: 'granted', reminders: 'granted' },
      systemReminders: [],
    }),
  }))
  
  render(<SystemReminderDrawer />)
  
  expect(screen.getByText('Calendar')).toBeInTheDocument()
  expect(screen.getByText('Reminders')).toBeInTheDocument()
  expect(screen.getByText('Granted')).toBeInTheDocument()
})

test('renders warning when reminders permission is not granted', () => {
  vi.mock('../../store/appStore', () => ({
    useAppStore: (selector) => selector({
      isReminderDrawerOpen: true,
      integrationStatus: { calendar: 'granted', reminders: 'denied' },
      systemReminders: [],
    }),
  }))
  
  render(<SystemReminderDrawer />)
  
  expect(screen.getByText(/提醒事项权限未就绪/)).toBeInTheDocument()
})

test('renders empty state when no reminders', () => {
  vi.mock('../../store/appStore', () => ({
    useAppStore: (selector) => selector({
      isReminderDrawerOpen: true,
      integrationStatus: { calendar: 'granted', reminders: 'granted' },
      systemReminders: [],
    }),
  }))
  
  render(<SystemReminderDrawer />)
  
  expect(screen.getByText(/当前 7 天内没有可展示的系统提醒/)).toBeInTheDocument()
})

test('renders reminder list', () => {
  const reminders = [
    { id: '1', title: '买牛奶', done: false, dueAt: new Date('2026-06-15T10:00:00') },
    { id: '2', title: '完成报告', done: true, dueAt: new Date('2026-06-16T14:00:00') },
  ]
  
  vi.mock('../../store/appStore', () => ({
    useAppStore: (selector) => selector({
      isReminderDrawerOpen: true,
      integrationStatus: { calendar: 'granted', reminders: 'granted' },
      systemReminders: reminders,
    }),
  }))
  
  render(<SystemReminderDrawer />)
  
  expect(screen.getByText('买牛奶')).toBeInTheDocument()
  expect(screen.getByText('完成报告')).toBeInTheDocument()
  expect(screen.getByText('完成报告')).toHaveClass('line-through')
})
```

### 10.2 集成测试（macOS 手动测试）

**测试步骤**：
1. 首次打开 Goal Desk，触发 EventKit 授权弹窗
2. 选择"允许"，验证权限卡片显示 "Granted"
3. 在系统提醒 App 创建一个提醒（未来 7 天内）
4. 重新加载 Goal Desk，验证提醒出现在 SystemReminderDrawer
5. 点击“打开系统提醒事项”，验证系统提醒事项 App 被打开
6. 在系统提醒事项 App 修改完成状态后刷新 Goal Desk，验证只读状态更新

---

## 十一、未来优化

### 11.1 短期优化（1-2 周）

- [ ] **打开系统设置按钮**：权限被拒绝时提供快捷入口
- [ ] **提醒详情**：点击提醒卡片展开详情（notes、location 等）
- [ ] **筛选功能**：按列表名称筛选提醒

### 11.2 中期迭代（1-2 月）

- [ ] **批量打开/筛选**：批量定位或筛选提醒
- [ ] **时间范围调整**：支持切换 7 天 / 30 天 / 全部
- [ ] **提醒创建**：仅在未来明确调整只读策略并记录 ADR 后考虑

### 11.3 长期愿景（3-6 月）

- [ ] **外部变更观察**：只读监听系统提醒变化并刷新本地展示
- [ ] **Siri 集成**：通过 Siri 快捷指令创建任务
- [ ] **Apple Watch 集成**：手表查看和完成提醒

---

## 十二、相关资源

### 文档
- [EventKit 集成 Spec](./eventkit-integration.md)
- [Today View PRD](../prd/today-view.md)

### 代码
- [`src/components/drawer/SystemReminderDrawer.tsx`](../../src/components/drawer/SystemReminderDrawer.tsx)
- [`src-tauri/src/eventkit.rs`](../../src-tauri/src/eventkit.rs)
- [`src-tauri/native/eventkit_bridge.m`](../../src-tauri/native/eventkit_bridge.m)

### 依赖库
- [Framer Motion](https://www.framer.com/motion/) - 动画库
- [lucide-react](https://lucide.dev/) - 图标库

---

**文档维护者**: Goal Desk 开发团队  
**最后更新**: 2026-06-14
