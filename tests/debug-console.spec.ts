import { test } from '@playwright/test'

test('check console errors', async ({ page }) => {
  const errors: string[] = []
  
  page.on('pageerror', error => {
    console.error('PAGE ERROR:', error.message)
    errors.push(error.message)
  })

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('CONSOLE ERROR:', msg.text())
    }
  })

  await page.goto('http://localhost:1420')
  await page.waitForTimeout(3000)
  
  console.log('\n=== Test Complete ===')
  console.log('Errors found:', errors.length)
  errors.forEach(e => console.log('  -', e))
})
