# AreaSelectWithCreate 组件 Spec

**文档版本**: v1.0  
**创建日期**: 2026-06-14  
**状态**: 已实现 ✅

---

## 一、概述

### 1.1 组件定位

AreaSelectWithCreate 是领域选择器组件，结合下拉选择和内联创建功能，支持快速选择现有领域或创建新领域。

**设计原则**：
- **选择优先**：优先展示现有领域，避免重复创建
- **快速创建**：通过特殊选项 `__create_new__` 触发创建模态框
- **即时反馈**：创建成功后自动选中新领域
- **无缝集成**：原生 `<select>` 元素 + 模态框，兼容表单

---

## 二、组件结构

### 2.1 文件路径

- **组件文件**: `src/components/shared/AreaSelectWithCreate.tsx` (~79 行)
- **类型定义**: `src/types/app.ts` - `AreaWithStats`

### 2.2 Props 定义

```typescript
interface AreaSelectWithCreateProps {
  value: string                           // 当前选中的领域标题
  areas: AreaWithStats[]                  // 可选领域列表
  onChange: (value: string) => void       // 选择变更回调
  onCreateArea: (title: string) => Promise<void>  // 创建领域回调
  placeholder?: string                    // 占位文案
  className?: string                      // 自定义样式
}

// AreaWithStats 类型
interface AreaWithStats {
  id: string
  title: string
  goalCount: number
  activeGoalCount: number
  isSystem: boolean
}
```

---

## 三、交互流程

### 3.1 选择现有领域

```
1. 用户点击下拉框
   ↓
2. 展开选项列表：
   - [占位选项] "选择领域"
   - 工作 (3)
   - 生活 (2)
   - 学习 (5)
   - + 创建新领域
   ↓
3. 用户选择"工作 (3)"
   ↓
4. 触发 onChange("工作")
   ↓
5. 父组件更新 value
```

### 3.2 创建新领域

```
1. 用户选择"+ 创建新领域"
   ↓
2. handleSelectChange 检测到 value === '__create_new__'
   ↓
3. 设置 showModal = true
   ↓
4. 渲染模态框（黑色半透明背景 + 白色卡片）
   ↓
5. 用户输入领域名称"健康"
   ↓
6. 按 Enter 或点击"创建"按钮
   ↓
7. 调用 await onCreateArea("健康")
   ↓
8. 父组件创建领域（调用 API/store）
   ↓
9. 调用 onChange("健康") 自动选中新领域
   ↓
10. 关闭模态框（showModal = false）
```

### 3.3 取消创建

```
1. 模态框打开状态
   ↓
2. 用户点击"取消"按钮 / 按 Escape / 点击背景
   ↓
3. 设置 showModal = false
   ↓
4. 清空 newAreaName
   ↓
5. 下拉框保持原值（不改变 value）
```

---

## 四、核心逻辑

### 4.1 handleSelectChange

```typescript
const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
  const selected = event.target.value
  
  // 检测是否选择"创建新领域"
  if (selected === '__create_new__') {
    setShowModal(true)
    setNewAreaName('')
  } else {
    // 选择现有领域
    onChange(selected)
  }
}
```

**特殊值**：
- `__create_new__` - 魔术字符串，触发创建模态框
- 不会调用 `onChange('__create_new__')`，避免污染父组件 state

### 4.2 handleCreate

```typescript
const handleCreate = async () => {
  const trimmed = newAreaName.trim()
  if (!trimmed) return  // 空字符串不提交
  
  await onCreateArea(trimmed)   // 调用父组件创建逻辑
  onChange(trimmed)              // 自动选中新领域
  setShowModal(false)            // 关闭模态框
  setNewAreaName('')             // 清空输入框
}
```

**异步处理**：
- `await onCreateArea(trimmed)` 等待创建完成
- 如果创建失败（抛出异常），不会调用 `onChange`
- 父组件负责错误处理（显示 toast 等）

---

## 五、下拉选项渲染

### 5.1 选项列表

```typescript
<select value={value} onChange={handleSelectChange} className={className}>
  {/* 占位选项 */}
  <option value="">{placeholder || '选择领域'}</option>
  
  {/* 现有领域 */}
  {areas.map(area => (
    <option key={area.id} value={area.title}>
      {area.title} ({area.goalCount})
    </option>
  ))}
  
  {/* 创建新领域 */}
  <option value="__create_new__">+ 创建新领域</option>
</select>
```

**显示格式**：
- 领域标题 + 目标数量：`工作 (3)`
- 占位选项：`value=""` 表示未选择状态
- 创建选项：`+` 前缀提示创建操作

### 5.2 为什么用 title 而非 id 作为 value

**决策**: `<option value={area.title}>` 而非 `<option value={area.id}>`

**理由**：
- ✅ Goal/Task 的 `area` 字段存储的是 `title` 字符串（历史设计）
- ✅ 父组件 `onChange(title)` 直接拿到 title，无需查表转换
- ✅ 简化数据流（不需要 id → title 映射）

**代价**：
- ❌ 重命名 Area 后，关联的 Goal/Task 需要同步更新
- 缓解：后端 `renameArea` 已处理批量更新

---

## 六、创建模态框

### 6.1 模态框布局

```typescript
{showModal && (
  <div 
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    onClick={() => setShowModal(false)}  // 点击背景关闭
  >
    <div 
      className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      onClick={(e) => e.stopPropagation()}  // 阻止事件冒泡
    >
      <h3>创建新领域</h3>
      <input
        value={newAreaName}
        onChange={(e) => setNewAreaName(e.target.value)}
        placeholder="输入领域名称"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') void handleCreate()
          if (e.key === 'Escape') setShowModal(false)
        }}
      />
      <div className="flex gap-2">
        <button onClick={() => void handleCreate()}>创建</button>
        <button onClick={() => setShowModal(false)}>取消</button>
      </div>
    </div>
  </div>
)}
```

### 6.2 交互细节

**键盘快捷键**：
- `Enter` - 提交创建
- `Escape` - 取消关闭

**点击行为**：
- 点击背景遮罩 → 关闭模态框
- 点击白色卡片 → `e.stopPropagation()` 阻止冒泡，不关闭

**自动聚焦**：
- `autoFocus` 属性，模态框打开时输入框自动获得焦点
- 用户可以直接输入，无需手动点击

---

## 七、样式设计

### 7.1 下拉框样式

```typescript
// 默认样式（父组件未传 className）
<select className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 outline-none focus:border-indigo-500">
```

**父组件可覆盖**：
```typescript
<AreaSelectWithCreate
  className="h-8 rounded-lg text-xs"  // 自定义样式
/>
```

### 7.2 模态框样式

**背景遮罩**：
- `fixed inset-0` - 覆盖整个视口
- `z-50` - 层级高于其他内容
- `bg-black/50` - 半透明黑色
- `flex items-center justify-center` - 居中卡片

**白色卡片**：
- `max-w-md` - 最大宽度 28rem (448px)
- `rounded-lg` - 圆角 8px
- `p-6` - 内边距 24px
- `shadow-xl` - 大阴影

---

## 八、使用场景

### 8.1 GoalDrawer 中使用

```typescript
// src/components/drawer/GoalDrawer.tsx
<AreaSelectWithCreate
  value={area}
  areas={allAreas}
  onChange={(value) => {
    setArea(value)
    void updateGoalFields(goal.id, { title, area: value, description })
  }}
  onCreateArea={async (title) => {
    await createArea(title)
  }}
  placeholder="选择或创建领域"
  className="h-11 rounded-2xl"
/>
```

**集成方式**：
- `onChange` 立即保存（不等 blur）
- `onCreateArea` 调用 store 的 `createArea` action
- 创建成功后自动选中新领域

### 8.2 TaskDrawer 内联创建目标时使用

```typescript
// src/components/drawer/TaskDrawer.tsx (GoalPickerPopover 内)
<AreaSelectWithCreate
  value={draft.newGoalArea}
  areas={draft.allAreas}
  onChange={(value) => editingSession.actions.setNewGoalArea(value)}
  onCreateArea={createArea}
  placeholder="选择或创建领域"
  className="h-8 rounded-lg"
/>
```

**场景**：
- 用户在 TaskDrawer 中内联创建目标
- 需要为新目标指定领域
- AreaSelectWithCreate 提供领域选择 + 快速创建

---

## 九、设计决策（ADR）

### ADR-001: 魔术字符串 `__create_new__`

**决策**: 使用 `__create_new__` 作为特殊 value 触发创建

**理由**：
- ✅ 简单直接，无需额外状态管理
- ✅ 利用原生 `<select>` onChange 事件
- ✅ 不会与真实领域名称冲突（`__` 前缀）

**代价**：
- ❌ 魔术字符串不优雅（硬编码）
- 接受：封装在组件内部，外部无感知

### ADR-002: 模态框而非下拉展开输入框

**决策**: 点击"创建新领域"后弹出模态框，而非在下拉框内嵌入输入框

**理由**：
- ✅ 原生 `<select>` 无法在选项中嵌入输入框
- ✅ 模态框提供更大的交互空间
- ✅ 清晰的视觉层级（创建是独立操作）

**代价**：
- ❌ 需要额外的模态框状态管理
- 接受：React useState 轻量，无性能问题

### ADR-003: 异步 onCreateArea

**决策**: `onCreateArea` 返回 `Promise<void>`，组件等待完成

**理由**：
- ✅ 支持异步操作（调用 Tauri command / API）
- ✅ 创建成功后才调用 `onChange`，保证数据一致性
- ✅ 错误处理由父组件负责

**代价**：
- ❌ 父组件必须返回 Promise（即使浏览器 mock）
- 接受：现代前端开发标准实践

### ADR-004: 显示目标数量

**决策**: 选项显示 `工作 (3)` 而非 `工作`

**理由**：
- ✅ 帮助用户判断领域规模
- ✅ 提示哪些领域活跃
- ✅ 对齐 Areas View 卡片显示

**代价**：
- ❌ 选项文本变长
- 接受：下拉框宽度足够，不影响阅读

---

## 十、边界情况处理

### 10.1 空领域列表

```typescript
{areas.length === 0 && (
  <option value="" disabled>暂无领域</option>
)}
```

**建议改进**：
- 当前实现：直接显示"+ 创建新领域"选项
- 改进：提示用户"暂无领域，请先创建"

### 10.2 重复领域名称

```typescript
const handleCreate = async () => {
  const trimmed = newAreaName.trim()
  
  // 检查是否重复
  const exists = areas.some(area => area.title === trimmed)
  if (exists) {
    alert('领域名称已存在')
    return
  }
  
  await onCreateArea(trimmed)
  // ...
}
```

**建议改进**：
- 当前实现：后端校验，前端无提示
- 改进：前端预检查，提前提示用户

### 10.3 创建失败处理

```typescript
const handleCreate = async () => {
  try {
    await onCreateArea(trimmed)
    onChange(trimmed)
    setShowModal(false)
  } catch (error) {
    // 当前：错误由父组件处理（显示 statusMessage）
    // 改进：组件内显示错误提示
    alert('创建失败，请重试')
  }
}
```

---

## 十一、可访问性

### 11.1 ARIA 属性

```typescript
<select
  aria-label="选择领域"
  aria-describedby="area-help-text"
>
```

**建议改进**：
- 添加 `aria-label` 描述下拉框用途
- 添加 `aria-invalid` 标记错误状态

### 11.2 模态框可访问性

```typescript
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="area-create-title"
>
  <h3 id="area-create-title">创建新领域</h3>
  {/* ... */}
</div>
```

**建议改进**：
- 添加 `role="dialog"` 和 `aria-modal="true"`
- 使用 `aria-labelledby` 关联标题
- 模态框打开时禁用背景滚动

---

## 十二、测试策略

### 12.1 单元测试

```typescript
// AreaSelectWithCreate.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AreaSelectWithCreate } from './AreaSelectWithCreate'

test('renders area options with goal count', () => {
  const areas = [
    { id: '1', title: '工作', goalCount: 3, activeGoalCount: 2, isSystem: false },
    { id: '2', title: '生活', goalCount: 5, activeGoalCount: 3, isSystem: false },
  ]
  
  render(
    <AreaSelectWithCreate
      value=""
      areas={areas}
      onChange={() => {}}
      onCreateArea={async () => {}}
    />
  )
  
  expect(screen.getByText('工作 (3)')).toBeInTheDocument()
  expect(screen.getByText('生活 (5)')).toBeInTheDocument()
  expect(screen.getByText('+ 创建新领域')).toBeInTheDocument()
})

test('calls onChange when selecting an existing area', () => {
  const onChange = vi.fn()
  const areas = [
    { id: '1', title: '工作', goalCount: 3, activeGoalCount: 2, isSystem: false },
  ]
  
  render(
    <AreaSelectWithCreate
      value=""
      areas={areas}
      onChange={onChange}
      onCreateArea={async () => {}}
    />
  )
  
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '工作' } })
  
  expect(onChange).toHaveBeenCalledWith('工作')
})

test('opens modal when selecting create new option', () => {
  render(
    <AreaSelectWithCreate
      value=""
      areas={[]}
      onChange={() => {}}
      onCreateArea={async () => {}}
    />
  )
  
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '__create_new__' } })
  
  expect(screen.getByText('创建新领域')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('输入领域名称')).toBeInTheDocument()
})

test('creates new area and selects it', async () => {
  const onCreateArea = vi.fn().mockResolvedValue(undefined)
  const onChange = vi.fn()
  
  render(
    <AreaSelectWithCreate
      value=""
      areas={[]}
      onChange={onChange}
      onCreateArea={onCreateArea}
    />
  )
  
  // 打开模态框
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '__create_new__' } })
  
  // 输入领域名称
  const input = screen.getByPlaceholderText('输入领域名称')
  fireEvent.change(input, { target: { value: '健康' } })
  
  // 点击创建按钮
  fireEvent.click(screen.getByText('创建'))
  
  await waitFor(() => {
    expect(onCreateArea).toHaveBeenCalledWith('健康')
    expect(onChange).toHaveBeenCalledWith('健康')
  })
  
  // 模态框应该关闭
  expect(screen.queryByText('创建新领域')).not.toBeInTheDocument()
})

test('closes modal on cancel', () => {
  render(
    <AreaSelectWithCreate
      value=""
      areas={[]}
      onChange={() => {}}
      onCreateArea={async () => }
    />
  )
  
  // 打开模态框
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '__create_new__' } })
  
  // 点击取消
  fireEvent.click(screen.getByText('取消'))
  
  expect(screen.queryByText('创建新领域')).not.toBeInTheDocument()
})
```

---

## 十三、相关资源

### 文档
- [GoalDrawer Spec](./goal-drawer.md)
- [Areas 重设计 PRD](../prd/areas-view.md)

### 代码
- [`src/components/shared/AreaSelectWithCreate.tsx`](../../src/components/shared/AreaSelectWithCreate.tsx)
- [`src/types/app.ts`](../../src/types/app.ts) - `AreaWithStats` 类型定义

---

**文档维护者**: Goal Desk 开发团队  
**最后更新**: 2026-06-14