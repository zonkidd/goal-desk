# AI 驱动冒烟测试方案

## 方案一：Chrome DevTools MCP（推荐）

### 原理
- Tauri 应用基于 WebView，可通过 Chrome DevTools Protocol 访问
- 使用 `mcp__chrome-devtools` 工具直接驱动
- AI 通过 `take_snapshot` 获取 DOM 树，`click`/`fill`/`evaluate_script` 操作 UI

### 启动步骤
```bash
# 1. 启动 Tauri 开发服务器（启用 DevTools）
npm run tauri:dev

# 2. 在 Claude Code 中使用 MCP 工具
```

### AI 测试脚本示例
```typescript
// 1. 连接到应用
await mcp__chrome-devtools__navigate_page({ url: 'http://localhost:1420' })

// 2. 获取页面快照
const snapshot = await mcp__chrome-devtools__take_snapshot({ verbose: false })

// 3. AI 分析快照，找到目标元素 uid
// 4. 执行操作
await mcp__chrome-devtools__click({ uid: '<element-uid>', element: 'Goal 按钮' })

// 5. 验证结果
const afterSnapshot = await mcp__chrome-devtools__take_snapshot({})
// AI 检查 Drawer 是否打开
```

### 优势
- ✅ 零额外依赖，MCP 工具已内置
- ✅ AI 可直接理解 DOM 树
- ✅ 支持截图、快照、脚本执行
- ✅ 适合桌面应用 WebView

---

## 方案二：Playwright + AI 视觉

### 原理
- Playwright 控制浏览器，截图后由 AI 视觉分析
- AI 通过坐标或选择器指导 Playwright 操作

### 实现
```typescript
// tests/ai-visual-smoke.ts
import { test } from '@playwright/test'

test('AI 视觉冒烟', async ({ page }) => {
  await page.goto('http://localhost:1420')
  
  // 截图给 AI 分析
  const screenshot = await page.screenshot({ fullPage: true })
  
  // AI 指令：点击 Goal 按钮
  await page.click('button:has-text("Goal")')
  
  // 再次截图验证
  await page.screenshot({ path: 'after-click.png' })
})
```

### 劣势
- ❌ 需要 AI 视觉模型（Claude 支持但需多轮交互）
- ❌ 选择器定位不如 DOM 树精准

---

## 推荐方案：Chrome DevTools MCP

**立即可用**，无需额外配置，AI 可通过 `take_snapshot` 直接理解 UI 结构并操作。
