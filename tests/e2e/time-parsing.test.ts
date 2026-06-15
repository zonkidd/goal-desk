import { test, expect } from '@playwright/test'

/**
 * E2E 测试：增强版自然语言时间解析
 *
 * 验证完整的时间解析流程：
 * 1. 用户在快速捕获中输入自然语言
 * 2. Rust 端解析时间表达式
 * 3. 任务保存到 SQLite
 * 4. 前端正确显示解析结果
 */

test.describe('自然语言时间解析 E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:1420')
    await page.waitForLoadState('networkidle')
  })

  test('相对日期：明天开会', async ({ page }) => {
    // 打开快速捕获
    await page.keyboard.press('Alt+Space')

    // 输入自然语言
    await page.fill('[data-testid="quick-capture-input"]', '明天开会')
    await page.keyboard.press('Enter')

    // 等待任务创建
    await page.waitForTimeout(500)

    // 验证任务出现在 Timeline
    const task = page.locator('text=开会').first()
    await expect(task).toBeVisible()

    // 验证时间显示（应该显示明天的日期）
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const expectedDate = tomorrow.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })

    await expect(page.locator(`text=${expectedDate}`)).toBeVisible()
  })

  test('精确时间：明天15:30评审', async ({ page }) => {
    await page.keyboard.press('Alt+Space')
    await page.fill('[data-testid="quick-capture-input"]', '明天15:30评审')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)

    const task = page.locator('text=评审').first()
    await expect(task).toBeVisible()

    // 验证时间显示包含 15:30
    await expect(page.locator('text=/15:30|3:30/')).toBeVisible()
  })

  test('截止时间：明天3点前提交报告', async ({ page }) => {
    await page.keyboard.press('Alt+Space')
    await page.fill('[data-testid="quick-capture-input"]', '明天3点前提交报告')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)

    // 验证标题只包含"提交报告"，时间关键词已被清理
    const task = page.locator('text=提交报告').first()
    await expect(task).toBeVisible()

    // 点击任务打开详情抽屉
    await task.click()
    await page.waitForTimeout(300)

    // 验证截止时间字段有值（due_at）
    const dueAtLabel = page.locator('text=/截止|Due/')
    await expect(dueAtLabel).toBeVisible()
  })

  test('智能上下午判断：3点开会', async ({ page }) => {
    await page.keyboard.press('Alt+Space')
    await page.fill('[data-testid="quick-capture-input"]', '3点开会')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)

    const task = page.locator('text=开会').first()
    await expect(task).toBeVisible()

    // 验证显示的是下午时间（15:00 或 3:00 PM）
    await expect(page.locator('text=/15:00|3:00/')).toBeVisible()
  })

  test('中文数字：明天三点开会', async ({ page }) => {
    await page.keyboard.press('Alt+Space')
    await page.fill('[data-testid="quick-capture-input"]', '明天三点开会')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)

    const task = page.locator('text=开会').first()
    await expect(task).toBeVisible()

    // 验证"三点"被正确解析为15:00
    await expect(page.locator('text=/15:00|3:00/')).toBeVisible()
  })

  test('相对星期：下周一开会', async ({ page }) => {
    await page.keyboard.press('Alt+Space')
    await page.fill('[data-testid="quick-capture-input"]', '下周一开会')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)

    const task = page.locator('text=开会').first()
    await expect(task).toBeVisible()

    // 验证显示的是下周一的日期
    const nextMonday = getNextMonday()
    const expectedDate = nextMonday.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })

    await expect(page.locator(`text=${expectedDate}`)).toBeVisible()
  })

  test('组合表达式：后天下午2点评审', async ({ page }) => {
    await page.keyboard.press('Alt+Space')
    await page.fill('[data-testid="quick-capture-input"]', '后天下午2点评审')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)

    const task = page.locator('text=评审').first()
    await expect(task).toBeVisible()

    // 验证显示14:00
    await expect(page.locator('text=/14:00|2:00/')).toBeVisible()
  })

  test('标题清理：明天下午三点 review notes', async ({ page }) => {
    await page.keyboard.press('Alt+Space')
    await page.fill('[data-testid="quick-capture-input"]', '明天下午三点 review notes')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)

    // 验证标题只保留"review notes"，时间表达式已被移除
    const task = page.locator('text=review notes').first()
    await expect(task).toBeVisible()

    // 验证没有残留的时间关键词
    await expect(page.locator('text=/明天|下午|三点/')).not.toBeVisible()
  })
})

// 辅助函数：获取下周一的日期
function getNextMonday(): Date {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek

  const nextMonday = new Date(today)
  nextMonday.setDate(today.getDate() + daysUntilMonday)
  nextMonday.setHours(9, 0, 0, 0)

  return nextMonday
}
