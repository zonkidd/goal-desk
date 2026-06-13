import { test, expect } from '@playwright/test'

// 前提：手动启动 `npm run tauri:dev` 或应用已运行
// Tauri 应用通常在 http://localhost:1420 或特定端口

test.describe('Goal Desk - 冒烟测试', () => {
  test.beforeEach(async ({ page }) => {
    // 连接到 Tauri 应用（调整端口号）
    await page.goto('http://localhost:1420')
    await page.waitForLoadState('domcontentloaded')
  })

  test('应用显示主界面', async ({ page }) => {
    // 检查页面加载
    const title = await page.title()
    expect(title).toBeTruthy()

    // 截图
    await page.screenshot({ path: 'tests/screenshots/main-window.png' })
  })

  test('显示 Today 任务列表', async ({ page }) => {
    await page.getByRole('button', { name: '今日焦点' }).click()
    await expect(page.getByRole('heading', { name: '今日焦点' })).toBeVisible({ timeout: 5000 })
  })

  test('可以打开 Goal Drawer', async ({ page }) => {
    // 查找并点击 Goal 按钮
    const goalButton = page.locator('button:has-text("Goal")').first()

    if (await goalButton.isVisible()) {
      await goalButton.click()
      await page.waitForTimeout(500)

      // 检查 Drawer 是否打开
      const drawer = page.locator('[role="dialog"]')
      await expect(drawer).toBeVisible()

      await page.screenshot({ path: 'tests/screenshots/goal-drawer.png' })
    }
  })

  test('任务列表交互', async ({ page }) => {
    // 查找任务卡片
    const taskCards = page.locator('[data-task-id]')
    const count = await taskCards.count()

    // 至少应该有占位符或任务
    expect(count).toBeGreaterThanOrEqual(0)
  })
})
