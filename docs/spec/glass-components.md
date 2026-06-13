# 玻璃拟态组件系统 Spec

**文档版本**: v1.0  
**创建日期**: 2026-06-14  
**状态**: 已实现 ✅

---

## 一、概述

### 1.1 系统定位

玻璃拟态（Glassmorphism）组件系统提供视觉一致的半透明毛玻璃效果容器，用于卡片、面板等 UI 元素，营造现代、轻盈的视觉风格。

**设计原则**：
- **统一视觉语言**：全局一致的毛玻璃效果参数
- **轻量封装**：薄壳组件，主要逻辑在 CSS
- **灵活组合**：支持 className 覆盖和扩展
- **可访问性**：确保半透明背景下文字可读性

---

## 二、组件结构

### 2.1 文件路径

- **组件文件**: `src/components/common/GlassCard.tsx` (~7 行)
- **全局样式**: `src/index.css` - `.glass-card` 和 `.glass-panel` 类

### 2.2 GlassCard 组件

```typescript
// src/components/common/GlassCard.tsx
import type { PropsWithChildren } from 'react'
import { cn } from '../../lib/cn'

export function GlassCard({ 
  children, 
  className 
}: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('glass-card', className)}>{children}</div>
}
```

**极简设计**：
- 只有 7 行代码
- 职责：应用 `.glass-card` 类 + 支持自定义样式
- 使用 `cn()` 工具函数合并 className

---

## 三、CSS 实现

### 3.1 glass-card 样式

```css
/* src/index.css */
.glass-card {
  @apply rounded-2xl border border-white/20 bg-white/60 shadow-lg backdrop-blur-md;
}
```

**Tailwind 类名展开**：
- `rounded-2xl` - 圆角 16px
- `border border-white/20` - 白色 20% 透明度边框
- `bg-white/60` - 白色 60% 透明度背景
- `shadow-lg` - 大阴影（0 10px 15px -3px rgba(0,0,0,0.1)）
- `backdrop-blur-md` - 背景模糊 12px

### 3.2 glass-panel 样式

```css
.glass-panel {
  @apply rounded-3xl border border-white/80 bg-white/90 shadow-2xl backdrop-blur-xl;
}
```

**与 glass-card 的区别**：
| 属性 | glass-card | glass-panel | 说明 |
|------|-----------|------------|-----|
| 圆角 | `rounded-2xl` (16px) | `rounded-3xl` (24px) | panel 更圆润 |
| 边框透明度 | `border-white/20` | `border-white/80` | panel 更明显 |
| 背景透明度 | `bg-white/60` | `bg-white/90` | panel 更不透明 |
| 阴影 | `shadow-lg` | `shadow-2xl` | panel 更强烈 |
| 模糊 | `backdrop-blur-md` (12px) | `backdrop-blur-xl` (24px) | panel 更模糊 |

**使用场景**：
- `glass-card` - 内容卡片、列表项、小组件
- `glass-panel` - 大面板、抽屉、模态框背景

---

## 四、视觉效果

### 4.1 glass-card 视觉

```
┌──────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ← 白色 60% 透明 + 模糊 12px
│ ░░  任务标题                  ░░ │
│ ░░  关联目标 · 已推进 3 天     ░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└──────────────────────────────────┘
    ↑ 16px 圆角 + 轻微阴影
```

**特点**：
- 半透明背景透出底层内容
- 边框弱化（20% 透明度）
- 阴影轻柔，不抢眼

### 4.2 glass-panel 视觉

```
┌────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← 白色 90% 透明 + 模糊 24px
│ ▓▓                                ▓▓ │
│ ▓▓  TaskDrawer                    ▓▓ │
│ ▓▓  ────────────────────────────  ▓▓ │
│ ▓▓  [内容区域]                     ▓▓ │
│ ▓▓                                ▓▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
└────────────────────────────────────────┘
    ↑ 24px 圆角 + 强阴影
```

**特点**：
- 背景几乎不透明（90%）
- 边框明显（80% 透明度）
- 强烈阴影，浮在页面上

---

## 五、使用场景

### 5.1 GlassCard 使用场景

**Inbox 任务卡片**：
```typescript
// src/components/views/InboxView.tsx
<GlassCard className="p-4 hover:-translate-y-1 transition-transform">
  <div className="text-xs font-black uppercase text-slate-400">{task.status}</div>
  <h3 className="text-base font-bold text-slate-900">{task.title}</h3>
  <p className="text-sm text-slate-500">{task.linkedGoalLabel}</p>
</GlassCard>
```

**GoalDrawer 快速添加任务**：
```typescript
// src/components/drawer/GoalDrawer.tsx
<GlassCard className="rounded-3xl p-5">
  <div className="text-xs font-bold">快速添加任务</div>
  <input placeholder="把这个目标拆出一个待办..." />
</GlassCard>
```

**Today View 目标看点卡片**：
```typescript
// src/components/views/TodayView.tsx
<GlassCard className="rounded-2xl p-6">
  <div className="flex items-center justify-between">
    <AreaBadge>{goal.area}</AreaBadge>
    <Progress>{goal.progress}%</Progress>
  </div>
  <h3>{goal.title}</h3>
</GlassCard>
```

### 5.2 glass-panel 使用场景

**TaskDrawer 抽屉**：
```typescript
// src/components/drawer/TaskDrawer.tsx
<motion.aside className="glass-panel fixed bottom-4 right-4 top-4 w-[600px]">
  {/* 抽屉内容 */}
</motion.aside>
```

**主视图容器**：
```typescript
// src/components/views/InboxView.tsx
<div className="glass-panel p-8 rounded-3xl">
  <h1>收件箱</h1>
  {/* 任务列表 */}
</div>
```

---

## 六、cn() 工具函数

### 6.1 实现

```typescript
// src/lib/cn.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**职责**：
- `clsx` - 条件拼接 className（处理数组、对象、条件）
- `twMerge` - 合并 Tailwind 类，后面的覆盖前面的

### 6.2 使用示例

```typescript
// 基础使用
cn('glass-card', 'p-4')
// → "glass-card p-4"

// 覆盖样式
cn('glass-card', 'rounded-xl')
// → "glass-panel rounded-xl" (twMerge 移除 rounded-2xl)

// 条件样式
cn('glass-card', isActive && 'border-indigo-500')
// → "glass-card border-indigo-500" (isActive 为 true 时)

// 对象语法
cn('glass-card', {
  'border-red-500': hasError,
  'opacity-50': isDisabled,
})
```

**为什么需要 twMerge**：
```typescript
// 错误：冲突的 Tailwind 类
className="rounded-2xl rounded-xl"  // 两个 rounded 都会应用，产生冲突

// 正确：twMerge 自动移除旧类
twMerge('rounded-2xl', 'rounded-xl')  // → "rounded-xl"
```

---

## 七、样式扩展

### 7.1 覆盖圆角

```typescript
<GlassCard className="rounded-xl">
  {/* 圆角变为 12px（覆盖默认 16px） */}
</GlassCard>
```

### 7.2 覆盖背景透明度

```typescript
<GlassCard className="bg-white/80">
  {/* 背景透明度变为 80%（覆盖默认 60%） */}
</GlassCard>
```

### 7.3 添加 hover 效果

```typescript
<GlassCard className="hover:-translate-y-1 hover:shadow-xl transition-all">
  {/* hover 时上浮 4px + 阴影增强 */}
</GlassCard>
```

### 7.4 添加边框高亮

```typescript
<GlassCard className={cn(
  'transition-colors',
  isActive && 'border-indigo-500/50'
)}>
  {/* 激活时边框变为靛蓝色 */}
</GlassCard>
```

---

## 八、设计决策（ADR）

### ADR-001: 全局 CSS 类而非内联样式

**决策**: 使用 `.glass-card` CSS 类，而非组件内联 Tailwind 类

**理由**：
- ✅ 统一视觉语言（所有 GlassCard 外观一致）
- ✅ 便于全局调整（一处修改，全局生效）
- ✅ 减少重复（不需要每处都写长串 className）

**代价**：
- ❌ 增加一层抽象（需要查看 CSS 定义）
- 接受：封装良好，开发者只需知道 `<GlassCard>` 用法

### ADR-002: 60% 背景透明度

**决策**: glass-card 背景透明度设为 60%（`bg-white/60`）

**理由**：
- ✅ 保留毛玻璃透视感（能看到底层内容）
- ✅ 确保前景文字可读性（60% 足够不透明）
- ✅ 符合现代设计趋势（macOS Big Sur、iOS 风格）

**代价**：
- ❌ 底层内容过于复杂时可能干扰阅读
- 缓解：重要内容区域使用 glass-panel（90% 不透明）

### ADR-003: backdrop-blur-md (12px)

**决策**: 使用 12px 背景模糊（`backdrop-blur-md`）

**理由**：
- ✅ 模糊效果明显但不过度
- ✅ 性能可接受（CSS `backdrop-filter` 硬件加速）
- ✅ 兼容性良好（现代浏览器支持）

**代价**：
- ❌ 旧浏览器不支持 backdrop-filter（降级为纯色）
- 接受：目标用户使用现代浏览器（Tauri 基于 WebView）

### ADR-004: 组件只做 className 合并

**决策**: GlassCard 组件只负责应用样式类，不包含业务逻辑

**理由**：
- ✅ 单一职责（样式容器）
- ✅ 轻量高效（无状态组件）
- ✅ 易于测试和维护

**代价**：
- ❌ 功能有限（如需交互，父组件自行处理）
- 接受：设计如此，纯展示组件

---

## 九、浏览器兼容性

### 9.1 backdrop-filter 支持

| 浏览器 | 支持版本 | 备注 |
|--------|---------|-----|
| Chrome | 76+ | 全支持 |
| Safari | 9+ | 需 `-webkit-` 前缀 |
| Firefox | 103+ | 全支持 |
| Edge | 79+ | 基于 Chromium |

**Tailwind 自动处理前缀**：
```css
/* Tailwind 生成 */
.backdrop-blur-md {
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
}
```

### 9.2 降级方案

**不支持 backdrop-filter 的浏览器**：
- 自动降级为纯色背景（失去模糊效果）
- 透明度保留（`bg-white/60` 仍生效）
- 整体可用性不受影响

**检测支持**：
```typescript
const supportsBackdropFilter = CSS.supports('backdrop-filter', 'blur(1px)')
  || CSS.supports('-webkit-backdrop-filter', 'blur(1px)')
```

---

## 十、性能优化

### 10.1 backdrop-filter 性能

**性能特点**：
- ✅ GPU 硬件加速（现代浏览器）
- ❌ 复杂布局下可能影响滚动性能
- ✅ 静态内容无性能问题

**优化建议**：
- 避免大面积使用（如整个页面背景）
- 避免动画中频繁改变模糊值
- 固定模糊值（不用 `blur(calc(...))`）

### 10.2 组件性能

**GlassCard 性能**：
- 纯函数组件，无状态
- React.memo 可选（性能提升有限）
- 渲染成本 < 1ms（仅 div + className）

---

## 十一、可访问性

### 11.1 颜色对比度

**WCAG 2.1 标准**：
- AA 级：文字与背景对比度 ≥ 4.5:1
- AAA 级：对比度 ≥ 7:1

**glass-card 对比度检查**：
```
文字颜色: text-slate-900 (rgba(15, 23, 42, 1))
背景颜色: bg-white/60 (rgba(255, 255, 255, 0.6)) + 底层内容

对比度: 取决于底层内容
```

**确保可读性**：
- 使用深色文字（`text-slate-900`、`text-slate-700`）
- 避免浅色文字（`text-slate-400` 在半透明背景上可读性差）
- 重要内容使用 glass-panel（90% 不透明）

### 11.2 语义化 HTML

```typescript
// 不推荐：纯 div
<GlassCard>
  <div>标题</div>
  <div>内容</div>
</GlassCard>

// 推荐：语义化标签
<GlassCard>
  <h3>标题</h3>
  <p>内容</p>
</GlassCard>
```

---

## 十二、测试策略

### 12.1 单元测试

```typescript
// GlassCard.test.tsx
import { render } from '@testing-library/react'
import { GlassCard } from './GlassCard'

test('applies glass-card class', () => {
  const { container } = render(<GlassCard>Content</GlassCard>)
  expect(container.firstChild).toHaveClass('glass-card')
})

test('merges custom className', () => {
  const { container } = render(
    <GlassCard className="custom-class">Content</GlassCard>
  )
  expect(container.firstChild).toHaveClass('glass-card')
  expect(container.firstChild).toHaveClass('custom-class')
})

test('renders children', () => {
  const { getByText } = render(<GlassCard>Test Content</GlassCard>)
  expect(getByText('Test Content')).toBeInTheDocument()
})
```

### 12.2 视觉回归测试

**Storybook 示例**：
```typescript
// GlassCard.stories.tsx
export const Default = () => (
  <GlassCard>
    <h3>Card Title</h3>
    <p>Card content</p>
  </GlassCard>
)

export const WithCustomClass = () => (
  <GlassCard className="p-8 rounded-xl">
    <h3>Custom Styled</h3>
  </GlassCard>
)

export const OverComplexBackground = () => (
  <div style={{ backgroundImage: 'url(/pattern.png)' }}>
    <GlassCard>
      <p>Content over complex background</p>
    </GlassCard>
  </div>
)
```

---

## 十三、未来优化

### 13.1 短期优化（1-2 周）

- [ ] **颜色主题变体**：dark 模式下的 glass-card-dark
- [ ] **预设尺寸**：glass-card-sm / glass-card-lg
- [ ] **边框高亮变体**：glass-card-accent（靛蓝边框）

### 13.2 中期迭代（1-2 月）

- [ ] **动画支持**：hover 时模糊值增加
- [ ] **渐变背景**：glass-card-gradient（渐变半透明）
- [ ] **嵌套优化**：glass-card 内嵌套时减少透明度叠加

### 13.3 长期愿景（3-6 月）

- [ ] **自适应模糊**：根据底层复杂度自动调整模糊值
- [ ] **Material You 风格**：动态色彩提取
- [ ] **3D 深度感**：结合阴影和变换

---

## 十四、相关资源

### 文档
- [设计系统规范](../../design/design-philosophy.md)
- [Tailwind CSS 官方文档 - backdrop-filter](https://tailwindcss.com/docs/backdrop-filter)

### 代码
- [`src/components/common/GlassCard.tsx`](../../src/components/common/GlassCard.tsx)
- [`src/index.css`](../../src/index.css) - `.glass-card` 和 `.glass-panel` 定义
- [`src/lib/cn.ts`](../../src/lib/cn.ts) - className 合并工具

### 设计参考
- [Apple Human Interface Guidelines - Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Glassmorphism in UI Design](https://uxdesign.cc/glassmorphism-in-user-interfaces-1f39bb1308c9)

---

**文档维护者**: Goal Desk 开发团队  
**最后更新**: 2026-06-14