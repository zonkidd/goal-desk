# Markdown 渲染组件 Spec

**文档版本**: v1.0  
**创建日期**: 2026-06-14  
**状态**: 已实现 ✅

---

## 一、概述

### 1.1 组件定位

MarkdownContent 是 Markdown 内容渲染组件，将 Markdown 字符串转换为格式化的 HTML，支持 GitHub Flavored Markdown (GFM) 扩展语法。

**设计原则**：
- **零配置使用**：开箱即用的 Markdown 渲染
- **GFM 支持**：表格、任务列表、删除线等扩展语法
- **样式统一**：使用 Tailwind Typography 插件提供一致的排版
- **纯展示组件**：只负责渲染，不包含编辑功能

---

## 二、组件结构

### 2.1 文件路径

- **组件文件**: `src/components/drawer/MarkdownContent.tsx` (~10 行)
- **依赖库**: `react-markdown` - Markdown 解析和渲染
- **GFM 插件**: `remark-gfm` - GitHub Flavored Markdown 支持
- **样式**: Tailwind CSS Typography (`@tailwindcss/typography`)

### 2.2 Props 定义

```typescript
interface MarkdownContentProps {
  content: string  // Markdown 字符串
}

export function MarkdownContent({ content }: MarkdownContentProps)
```

---

## 三、实现代码

### 3.1 完整实现

```typescript
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-slate max-w-none prose-headings:tracking-tight prose-code:before:hidden prose-code:after:hidden">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
```

**代码说明**：
- `prose` - Tailwind Typography 基础类
- `prose-slate` - 使用 Slate 配色方案
- `max-w-none` - 移除默认最大宽度限制
- `prose-headings:tracking-tight` - 标题紧凑字间距
- `prose-code:before:hidden` / `prose-code:after:hidden` - 隐藏行内代码的引号装饰

---

## 四、支持的 Markdown 语法

### 4.1 基础语法

| 语法 | 效果 | 示例 |
|------|-----|------|
| `# 标题` | 一级标题 | # Hello |
| `## 标题` | 二级标题 | ## World |
| `**粗体**` | 粗体文字 | **bold** |
| `*斜体*` | 斜体文字 | *italic* |
| `` `代码` `` | 行内代码 | `const x = 1` |
| `[链接](url)` | 超链接 | [Google](https://google.com) |
| `![图片](url)` | 图片 | ![logo](logo.png) |

### 4.2 GFM 扩展语法

#### 表格

```markdown
| 列1 | 列2 |
|-----|-----|
| A   | B   |
```

渲染效果：

| 列1 | 列2 |
|-----|-----|
| A   | B   |

#### 任务列表

```markdown
- [x] 已完成任务
- [ ] 未完成任务
```

渲染效果：
- ☑ 已完成任务
- ☐ 未完成任务

#### 删除线

```markdown
~~删除的文字~~
```

渲染效果：~~删除的文字~~

#### 自动链接

```markdown
https://example.com
```

渲染效果：自动转换为可点击链接

---

## 五、样式定制

### 5.1 Tailwind Typography 配置

```css
/* src/index.css 或 tailwind.config.js */
.prose {
  /* 自动应用以下样式 */
  font-size: 1rem;
  line-height: 1.75;
  color: #374151;  /* slate-700 */
}

.prose h1 {
  font-size: 2.25em;
  font-weight: 800;
  margin-top: 0;
  margin-bottom: 0.8888889em;
}

.prose h2 {
  font-size: 1.5em;
  font-weight: 700;
  margin-top: 2em;
  margin-bottom: 1em;
}

.prose code {
  background-color: #f1f5f9;  /* slate-100 */
  padding: 0.2em 0.4em;
  border-radius: 0.25rem;
  font-size: 0.875em;
}

.prose pre code {
  background-color: transparent;
  padding: 0;
}
```

### 5.2 自定义样式覆盖

```typescript
// 修改配色方案
<div className="prose prose-indigo">
  <ReactMarkdown>{content}</ReactMarkdown>
</div>

// 修改字体大小
<div className="prose prose-lg">
  <ReactMarkdown>{content}</ReactMarkdown>
</div>

// 修改标题样式
<div className="prose prose-headings:font-black">
  <ReactMarkdown>{content}</ReactMarkdown>
</div>
```

---

## 六、使用场景

### 6.1 TaskDrawer 中使用

```typescript
// src/components/drawer/TaskDrawer.tsx
<div className="content-section">
  <h3>CONTENT</h3>
  
  {editingSession.draft.markdownMode === 'preview' && (
    <MarkdownContent content={editingSession.draft.content} />
  )}
  
  {editingSession.draft.markdownMode === 'edit' && (
    <textarea value={editingSession.draft.content} />
  )}
  
  {editingSession.draft.markdownMode === 'split' && (
    <div className="grid grid-cols-2 gap-4">
      <textarea value={editingSession.draft.content} />
      <MarkdownContent content={editingSession.draft.content} />
    </div>
  )}
</div>
```

**集成方式**：
- 预览模式：只显示 MarkdownContent
- 编辑模式：只显示 textarea
- 分屏模式：左侧 textarea，右侧 MarkdownContent

### 6.2 GoalDrawer 中使用

```typescript
// src/components/drawer/GoalDrawer.tsx
<div className="description-section">
  <h3>描述</h3>
  
  {editMode ? (
    <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
  ) : (
    <MarkdownContent content={goal.description} />
  )}
</div>
```

---

## 七、性能优化

### 7.1 避免重复解析

```typescript
// ❌ 错误：每次渲染都解析
function TaskCard({ task }) {
  return (
    <div>
      <MarkdownContent content={task.content} />
    </div>
  )
}

// ✅ 正确：使用 React.memo
const MarkdownContent = React.memo(function MarkdownContent({ content }) {
  return (
    <div className="prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
})
```

### 7.2 长内容截断

```typescript
// 只在卡片预览中显示前 200 字符
function TaskCard({ task }) {
  const preview = task.content.slice(0, 200)
  
  return (
    <div>
      <MarkdownContent content={preview} />
      {task.content.length > 200 && <span>...</span>}
    </div>
  )
}
```

---

## 八、安全性

### 8.1 XSS 防护

**react-markdown 默认安全**：
- 不渲染原始 HTML（`<script>` 等标签会被转义）
- 不执行内联 JavaScript
- 链接使用 `rel="noopener noreferrer"`

### 8.2 允许 HTML（不推荐）

```typescript
import rehypeRaw from 'rehype-raw'

<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeRaw]}  // 允许原始 HTML
>
  {content}
</ReactMarkdown>
```

**警告**：
- 只在完全信任内容来源时使用
- 用户输入的 Markdown 绝对不要启用 `rehypeRaw`

---

## 九、测试策略

### 9.1 单元测试

```typescript
// MarkdownContent.test.tsx
import { render, screen } from '@testing-library/react'
import { MarkdownContent } from './MarkdownContent'

test('renders heading', () => {
  render(<MarkdownContent content="# Hello World" />)
  
  const heading = screen.getByRole('heading', { level: 1 })
  expect(heading).toHaveTextContent('Hello World')
})

test('renders bold text', () => {
  render(<MarkdownContent content="**bold text**" />)
  
  const bold = screen.getByText('bold text')
  expect(bold.tagName).toBe('STRONG')
})

test('renders GFM table', () => {
  const markdown = `
| A | B |
|---|---|
| 1 | 2 |
  `
  
  render(<MarkdownContent content={markdown} />)
  
  expect(screen.getByRole('table')).toBeInTheDocument()
  expect(screen.getByText('A')).toBeInTheDocument()
  expect(screen.getByText('1')).toBeInTheDocument()
})

test('renders task list', () => {
  const markdown = `
- [x] Done
- [ ] Todo
  `
  
  render(<MarkdownContent content={markdown} />)
  
  const checkboxes = screen.getAllByRole('checkbox')
  expect(checkboxes).toHaveLength(2)
  expect(checkboxes[0]).toBeChecked()
  expect(checkboxes[1]).not.toBeChecked()
})

test('escapes HTML tags', () => {
  render(<MarkdownContent content="<script>alert('XSS')</script>" />)
  
  // 应该显示为纯文本，而非执行脚本
  expect(screen.getByText("<script>alert('XSS')</script>")).toBeInTheDocument()
})
```

### 9.2 快照测试

```typescript
test('matches snapshot', () => {
  const markdown = `
# Heading

**Bold** and *italic*

- Item 1
- Item 2
  `
  
  const { container } = render(<MarkdownContent content={markdown} />)
  expect(container.firstChild).toMatchSnapshot()
})
```

---

## 十、依赖库版本

### 10.1 package.json

```json
{
  "dependencies": {
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0"
  },
  "devDependencies": {
    "@tailwindcss/typography": "^0.5.0"
  }
}
```

### 10.2 Tailwind 配置

```javascript
// tailwind.config.js
module.exports = {
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
```

---

## 十一、相关资源

### 文档
- [TaskDrawer Spec](./task-drawer.md)
- [GoalDrawer Spec](./goal-drawer.md)

### 代码
- [`src/components/drawer/MarkdownContent.tsx`](../../src/components/drawer/MarkdownContent.tsx)

### 依赖库
- [react-markdown](https://github.com/remarkjs/react-markdown) - Markdown 渲染库
- [remark-gfm](https://github.com/remarkjs/remark-gfm) - GFM 插件
- [Tailwind Typography](https://tailwindcss.com/docs/typography-plugin) - 排版样式

---

**文档维护者**: Goal Desk 开发团队  
**最后更新**: 2026-06-14
