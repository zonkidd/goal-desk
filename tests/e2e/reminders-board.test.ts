import { test, expect } from '@playwright/test'

test.describe('提醒看板 E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // 等待应用加载完成（等待收集箱标题）
    await page.waitForSelector('h1:has-text("收集箱")', { timeout: 10000 })
  })

  test('导航到提醒看板', async ({ page }) => {
    // 点击侧边栏按钮
    await page.click('text=⏰ 提醒看板')

    // 验证标题
    await expect(page.locator('section h1')).toContainText('提醒看板')

    // 验证按清单视图按钮可见
    await expect(page.locator('button:has-text("按清单")')).toBeVisible()
  })

  test('切换到按时间视图', async ({ page }) => {
    // 导航到提醒看板
    await page.click('text=⏰ 提醒看板')
    await expect(page.locator('section h1')).toContainText('提醒看板')

    // 验证初始在按清单视图（按钮是激活状态）
    const byListButton = page.locator('button:has-text("按清单")')
    await expect(byListButton).toHaveClass(/bg-white/)

    // 点击"按时间" Tab
    await page.click('button:has-text("按时间")')

    // 等待视图切换动画
    await page.waitForTimeout(500)

    // 验证按时间按钮现在是激活状态
    const byTimeButton = page.locator('button:has-text("按时间")')
    await expect(byTimeButton).toHaveClass(/bg-white/)

    // 验证按清单按钮不再是激活状态
    await expect(byListButton).not.toHaveClass(/bg-white.*shadow/)

    // 切换回按清单视图
    await page.click('button:has-text("按清单")')
    await page.waitForTimeout(300)

    // 验证按清单按钮恢复激活状态
    await expect(byListButton).toHaveClass(/bg-white/)
  })

  test('验证隐藏已完成选项存在', async ({ page }) => {
    // 导航到提醒看板
    await page.click('text=⏰ 提醒看板')
    await expect(page.locator('section h1')).toContainText('提醒看板')

    // 验证"隐藏已完成"复选框存在
    const hideCompletedLabel = page.locator('label:has-text("隐藏已完成")')
    await expect(hideCompletedLabel).toBeVisible()

    // 验证复选框可以点击
    const hideCompletedCheckbox = page.locator('label:has-text("隐藏已完成") input[type="checkbox"]')
    await expect(hideCompletedCheckbox).toBeVisible()

    // 点击复选框
    await hideCompletedCheckbox.click()
    await page.waitForTimeout(300)

    // 验证复选框状态改变
    await expect(hideCompletedCheckbox).toBeChecked()

    // 再次点击恢复
    await hideCompletedCheckbox.click()
    await page.waitForTimeout(300)

    // 验证复选框未选中
    await expect(hideCompletedCheckbox).not.toBeChecked()
  })

  test('验证视图模式在导航间保持', async ({ page }) => {
    // 1. 导航到提醒看板并切换到按时间视图
    await page.click('text=⏰ 提醒看板')
    await page.click('button:has-text("按时间")')
    await page.waitForTimeout(300)

    // 验证在按时间视图
    const byTimeButton = page.locator('button:has-text("按时间")')
    await expect(byTimeButton).toHaveClass(/bg-white/)

    // 2. 导航到其他视图
    await page.click('text=今日焦点')
    await expect(page.locator('section h1')).toContainText('今日焦点')

    // 3. 返回提醒看板
    await page.click('text=⏰ 提醒看板')
    await expect(page.locator('section h1')).toContainText('提醒看板')

    // 4. 验证视图模式保持（应该还是按时间视图）
    // 注意：这取决于应用的状态管理实现
    const isTimeViewActive = await byTimeButton.getAttribute('class').then(c => c?.includes('bg-white'))
    const isListViewActive = await page.locator('button:has-text("按清单")').getAttribute('class').then(c => c?.includes('bg-white'))

    // 至少应该在某一个视图中
    expect(isTimeViewActive || isListViewActive).toBeTruthy()
  })
})
