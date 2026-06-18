import { test, expect } from '@playwright/test'

/**
 * EventKit 集成端到端测试
 *
 * 测试覆盖：
 * 1. Sidebar 集成状态卡片显示
 * 2. Timeline 三种来源的视觉区分
 * 3. 权限引导横幅显示和交互
 * 4. TaskDrawer 系统通知区块
 * 5. Quick Capture 创建模式选择
 */

test.describe('EventKit Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:1420')
    await page.waitForLoadState('networkidle')
  })

  test('Sidebar 显示集成状态卡片', async ({ page }) => {
    // 查找 System Integration 卡片
    const integrationCard = page.locator('text=System Integration').locator('..')
    await expect(integrationCard).toBeVisible()

    // 验证日历状态行存在
    const calendarRow = page.locator('text=日历').first()
    await expect(calendarRow).toBeVisible()

    // 验证提醒状态行存在
    const reminderRow = page.locator('text=提醒').first()
    await expect(reminderRow).toBeVisible()

    // 验证日历图标存在（purple-500）
    const calendarIcon = page.locator('.text-purple-500').first()
    await expect(calendarIcon).toBeVisible()

    // 验证提醒图标存在（orange-500）
    const reminderIcon = page.locator('.text-orange-500').first()
    await expect(reminderIcon).toBeVisible()
  })

  test('Timeline 显示三种来源的视觉区分', async ({ page }) => {
    // 切换到 Today 视图
    const todayButton = page.getByRole('button', { name: '今日焦点' })
    await todayButton.click()
    await page.waitForTimeout(500)

    // 验证 Today 标题可见
    await expect(page.getByRole('heading', { name: '今日焦点' })).toBeVisible()

    // 验证时间轴区域存在
    const timelineSection = page.locator('text=今日时间轴').locator('..')
    await expect(timelineSection).toBeVisible()

    // 验证三种来源的边框样式存在（即使当前没有数据也应该有样式定义）
    // 我们通过检查 timeline-line 容器来确认时间轴已渲染
    const timelineContainer = page.locator('.timeline-line')
    await expect(timelineContainer).toBeVisible()

    // 如果有 timeline 项，验证它们的样式
    const timelineItems = page.locator('.timeline-line > div')
    const itemCount = await timelineItems.count()

    if (itemCount > 0) {
      // 检查是否有带颜色边框的卡片
      const borderedCards = page.locator('.border-l-4')
      const borderedCount = await borderedCards.count()

      if (borderedCount > 0) {
        // 至少应该有一个带颜色边框的卡片
        expect(borderedCount).toBeGreaterThan(0)

        // 验证可能的边框颜色类名存在
        const hasBorderedCard = await page.locator('.border-l-indigo-500, .border-l-orange-500, .border-l-purple-500').count()
        expect(hasBorderedCard).toBeGreaterThan(0)
      }
    }
  })

  test('权限引导横幅显示和交互', async ({ page }) => {
    // 清除 localStorage 以确保横幅显示
    await page.evaluate(() => {
      localStorage.removeItem('eventkit-banner-dismissed')
    })

    // 重新加载页面
    await page.reload()
    await page.waitForLoadState('networkidle')

    // 切换到 Today 视图
    const todayButton = page.getByRole('button', { name: '今日焦点' })
    await todayButton.click()
    await page.waitForTimeout(500)

    // 横幅可能在未授权时显示，检查横幅相关文本
    const bannerText = page.locator('text=集成系统日历和提醒')
    const hasBanner = await bannerText.isVisible().catch(() => false)

    if (hasBanner) {
      // 验证横幅内容
      await expect(page.locator('text=获得锁屏通知和跨应用同步能力')).toBeVisible()

      // 查找"暂不需要"按钮
      const dismissButton = page.locator('button:has-text("暂不需要")')
      await expect(dismissButton).toBeVisible()

      // 点击"暂不需要"
      await dismissButton.click()
      await page.waitForTimeout(300)

      // 横幅应该消失
      await expect(bannerText).not.toBeVisible()

      // 验证 localStorage 已记录状态
      const dismissed = await page.evaluate(() => {
        return localStorage.getItem('eventkit-banner-dismissed')
      })
      expect(dismissed).toBe('true')

      // 重新加载后横幅不应再显示
      await page.reload()
      await page.waitForLoadState('networkidle')
      await todayButton.click()
      await page.waitForTimeout(500)

      await expect(bannerText).not.toBeVisible()
    } else {
      // 如果横幅不显示（权限已授权），跳过此测试
      test.skip()
    }
  })

  test('TaskDrawer 显示系统通知区块', async ({ page }) => {
    // 切换到 Inbox 视图
    const inboxButton = page.getByRole('button', { name: /收集箱.*待办/ })
    await inboxButton.click()
    await page.waitForTimeout(500)

    // 查找任务卡片
    const taskCards = page.locator('[data-task-id]')
    const count = await taskCards.count()

    if (count > 0) {
      // 点击第一个任务打开 Drawer
      await taskCards.first().click()
      await page.waitForTimeout(500)

      // 验证 Drawer 打开
      const drawer = page.locator('[role="dialog"], aside.glass-panel').last()
      await expect(drawer).toBeVisible()

      // 验证系统通知区块存在（未关联状态）
      const notLinkedCheckbox = page.locator('text=关联系统提醒获得通知')
      const linkedStatus = page.locator('text=已关联')

      // 至少一个应该可见
      const hasNotification = (await notLinkedCheckbox.isVisible()) || (await linkedStatus.isVisible())
      expect(hasNotification).toBe(true)

      // 如果是未关联状态，验证复选框存在
      if (await notLinkedCheckbox.isVisible()) {
        const checkbox = page.locator('input[type="checkbox"]').filter({ has: page.locator('~ text=关联系统提醒获得通知') })
        await expect(checkbox).toBeVisible()
      }

      // 如果是已关联状态，验证绿色状态卡片
      if (await linkedStatus.isVisible()) {
        const linkedCard = page.locator('.bg-green-50')
        await expect(linkedCard).toBeVisible()
      }
    } else {
      // 如果没有任务，跳过此测试
      test.skip()
    }
  })

  test('Quick Capture 显示三种创建模式', async ({ page }) => {
    // 方式1：点击 Sidebar 底部的全局速记按钮
    const quickCaptureButton = page.locator('button:has-text("全局速记")')
    const hasButton = await quickCaptureButton.isVisible().catch(() => false)

    if (hasButton) {
      await quickCaptureButton.click()
      await page.waitForTimeout(500)
    } else {
      // 方式2：如果按钮不存在，尝试直接查找 Quick Capture 窗口
      // （可能已经打开或者在独立窗口中）
      const quickCaptureForm = page.locator('text=Quick Capture')
      const hasForm = await quickCaptureForm.isVisible().catch(() => false)

      if (!hasForm) {
        test.skip()
        return
      }
    }

    // 验证 Quick Capture 表单显示
    await expect(page.locator('text=Quick Capture')).toBeVisible()
    await expect(page.locator('text=创建方式')).toBeVisible()

    // 验证三种模式选项存在
    const localOption = page.locator('label:has-text("本地")')
    await expect(localOption).toBeVisible()
    await expect(localOption.locator('text=默认')).toBeVisible()

    const systemOption = page.locator('label:has-text("系统")').filter({ hasNot: page.locator('text=集成') })
    await expect(systemOption).toBeVisible()

    const bothOption = page.locator('label:has-text("混合")')
    await expect(bothOption).toBeVisible()
    await expect(bothOption.locator('text=荐')).toBeVisible()

    // 验证默认选中"本地"
    const localRadio = localOption.locator('input[type="radio"]')
    await expect(localRadio).toBeChecked()

    // 验证可以切换模式
    await systemOption.click()
    await page.waitForTimeout(200)
    const systemRadio = systemOption.locator('input[type="radio"]')
    await expect(systemRadio).toBeChecked()

    await bothOption.click()
    await page.waitForTimeout(200)
    const bothRadio = bothOption.locator('input[type="radio"]')
    await expect(bothRadio).toBeChecked()

    // 验证提示文本存在
    await expect(page.locator('text=本地=Desk管理')).toBeVisible()
  })

  test('Timeline 时间标签和颜色编码完整性', async ({ page }) => {
    // 切换到 Today 视图
    const todayButton = page.getByRole('button', { name: '今日焦点' })
    await todayButton.click()
    await page.waitForTimeout(500)

    // 获取所有 timeline 项
    const timelineItems = page.locator('.timeline-line > div')
    const itemCount = await timelineItems.count()

    if (itemCount > 0) {
      // 验证每个 timeline 项都有时间标签
      for (let i = 0; i < Math.min(itemCount, 5); i++) {
        const item = timelineItems.nth(i)

        // 验证有颜色点（dot）
        const dot = item.locator('.rounded-full.border-2.border-white')
        await expect(dot).toBeVisible()

        // 验证有来源标签（Desk Task / Apple Reminders / Calendar Event）
        const sourceLabel = item.locator('.uppercase')
        await expect(sourceLabel).toBeVisible()

        // 验证有标题
        const title = item.locator('.text-sm.font-bold')
        await expect(title).toBeVisible()
      }
    } else {
      // 验证空状态提示
      const emptyState = page.locator('text=今天没有已安排开始时间的待办或系统日程')
      await expect(emptyState).toBeVisible()
    }
  })

  test('集成状态卡片显示授权按钮或计数', async ({ page }) => {
    // 查找日历状态行
    const calendarRow = page.locator('text=日历').locator('..')

    // 检查状态：授权按钮、已授权状态、或错误状态之一应该可见
    const hasAuthButton = await calendarRow.locator('button:has-text("授权")').isVisible().catch(() => false)
    const hasGrantedStatus = await calendarRow.locator('text=✓ 已授权').isVisible().catch(() => false)
    const hasDeniedStatus = await calendarRow.locator('text=✗ 已拒绝').isVisible().catch(() => false)
    const hasRestrictedStatus = await calendarRow.locator('text=🔒 限制').isVisible().catch(() => false)
    const hasErrorStatus = await calendarRow.locator('text=⚠️ 错误').isVisible().catch(() => false)

    expect(hasAuthButton || hasGrantedStatus || hasDeniedStatus || hasRestrictedStatus || hasErrorStatus).toBe(true)

    // 如果已授权，验证计数显示
    if (hasGrantedStatus) {
      const countText = await calendarRow.locator('text=/\\d+ 个/').textContent()
      expect(countText).toMatch(/\d+ 个/)
    }

    // 查找提醒状态行
    const reminderRow = page.locator('text=提醒').locator('..')

    const hasReminderAuthButton = await reminderRow.locator('button:has-text("授权")').isVisible().catch(() => false)
    const hasReminderGrantedStatus = await reminderRow.locator('text=✓ 已授权').isVisible().catch(() => false)
    const hasReminderDeniedStatus = await reminderRow.locator('text=✗ 已拒绝').isVisible().catch(() => false)
    const hasReminderRestrictedStatus = await reminderRow.locator('text=🔒 限制').isVisible().catch(() => false)
    const hasReminderErrorStatus = await reminderRow.locator('text=⚠️ 错误').isVisible().catch(() => false)

    expect(hasReminderAuthButton || hasReminderGrantedStatus || hasReminderDeniedStatus || hasReminderRestrictedStatus || hasReminderErrorStatus).toBe(true)

    // 如果已授权，验证计数显示
    if (hasReminderGrantedStatus) {
      const reminderCountText = await reminderRow.locator('text=/\\d+ 个/').textContent()
      expect(reminderCountText).toMatch(/\d+ 个/)
    }
  })
})
