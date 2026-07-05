import { expect, test } from '@playwright/test'

test.describe('Task drawer polish', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:1420')
    // 注入包含指定标题的任务到 localStorage 以便测试能够点击打开该任务
    await page.evaluate(() => {
      const mockTask = {
        id: 'task-tauri-eventkit',
        title: '研究 Tauri 与 EventKit 的通信机制',
        content: '# 任务描述\n\n研究 Tauri 与 EventKit 的通信机制。',
        status: 'TODO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activityLogs: []
      }
      localStorage.setItem('goal-desk-browser-tasks', JSON.stringify([mockTask]))
    })
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: '研究 Tauri 与 EventKit 的通信机制' }).click()
  })

  test('shows markdown mode controls and keeps expanded editors closed by default', async ({ page }) => {
    const markdownModeGroup = page.locator('div').filter({ has: page.getByRole('button', { name: '分屏', exact: true }) }).first()
    await expect(markdownModeGroup.getByRole('button', { name: '编辑', exact: true })).toBeVisible()
    await expect(markdownModeGroup.getByRole('button', { name: '预览', exact: true })).toBeVisible()
    await expect(markdownModeGroup.getByRole('button', { name: '分屏', exact: true })).toBeVisible()
    await expect(page.getByText('选择所属目标')).toHaveCount(0)
    await expect(page.getByText('截止时间')).toHaveCount(0)
  })

  test('clicking due date opens the expanded due date editor', async ({ page }) => {
    await page.getByRole('button', { name: '编辑截止时间' }).click()
    await expect(page.getByText('截止时间')).toBeVisible()
  })

  test('clicking linked goal opens the expanded goal picker', async ({ page }) => {
    await page.getByRole('button', { name: '编辑所属目标' }).click()
    await expect(page.getByText('选择所属目标')).toBeVisible()
    await expect(page.getByText('先从现有 Goal 中选择；如果没有合适的，再新建并关联。')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Unlinked task' })).toBeVisible()
  })

  test('expanded goal picker keeps inline goal creation available', async ({ page }) => {
    await page.getByRole('button', { name: '编辑所属目标' }).click()
    await page.getByRole('button', { name: '新建并关联 Goal' }).click()
    await expect(page.getByPlaceholder('新 Goal 标题')).toBeVisible()
    await expect(page.getByPlaceholder('Area（可选）')).toBeVisible()
  })
})
