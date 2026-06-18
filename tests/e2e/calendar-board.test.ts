import { test, expect } from '@playwright/test'

test.describe('日历看板 E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // 等待应用加载完成（等待收集箱标题）
    await page.waitForSelector('h1:has-text("收集箱")', { timeout: 10000 })
  })

  test('导航到日历看板', async ({ page }) => {
    // 点击侧边栏按钮
    await page.click('text=📅 日历看板')

    // 验证标题（使用更精确的选择器，避免匹配侧边栏的 Goal Desk 标题）
    await expect(page.locator('section h1')).toContainText('日历看板')

    // 验证周视图内容（周一到周日应该可见）
    await expect(page.locator('text=周一')).toBeVisible()
    await expect(page.locator('text=周二')).toBeVisible()
    await expect(page.locator('text=周三')).toBeVisible()
    await expect(page.locator('text=周四')).toBeVisible()
    await expect(page.locator('text=周五')).toBeVisible()
    await expect(page.locator('text=周六')).toBeVisible()
    await expect(page.locator('text=周日')).toBeVisible()
  })

  test('切换到日视图', async ({ page }) => {
    // 导航到日历看板
    await page.click('text=📅 日历看板')
    await expect(page.locator('section h1')).toContainText('日历看板')

    // 点击日视图 Tab
    await page.click('button:has-text("日视图")')

    // 验证日视图内容（应该显示月历组件）
    await expect(page.locator('text=月历组件')).toBeVisible()

    // 切换回周视图
    await page.click('button:has-text("周视图")')

    // 验证周视图内容恢复
    await expect(page.locator('text=周一')).toBeVisible()
  })

  test('日历看板周导航', async ({ page }) => {
    // 导航到日历看板（周视图）
    await page.click('text=📅 日历看板')
    await expect(page.locator('section h1')).toContainText('日历看板')

    // 记录当前周范围（h2 元素包含周范围，例如 "2026年6月16日 - 6月22日"）
    const weekRangeElement = page.locator('section h2').filter({ hasText: /\d{4}年\d{1,2}月\d{1,2}日/ })
    const initialWeekText = await weekRangeElement.textContent()

    // 点击"下一周"按钮
    await page.click('button:has-text("下一周")')

    // 等待内容更新
    await page.waitForTimeout(500)

    // 验证周范围更新
    const nextWeekText = await weekRangeElement.textContent()
    expect(nextWeekText).not.toBe(initialWeekText)

    // 点击"上一周"按钮
    await page.click('button:has-text("上一周")')

    // 等待内容更新
    await page.waitForTimeout(500)

    // 验证周范围恢复
    const restoredWeekText = await weekRangeElement.textContent()
    expect(restoredWeekText).toBe(initialWeekText)
  })
})
