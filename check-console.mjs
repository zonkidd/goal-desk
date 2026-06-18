import('playwright').then(async ({ chromium }) => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  
  page.on('pageerror', error => {
    console.error('PAGE ERROR:', error.message);
    errors.push(error.message);
  });

  try {
    await page.goto('http://localhost:1420', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2000);
    
    if (errors.length > 0) {
      console.log('\n=== Errors Found ===');
      errors.forEach(e => console.log('ERROR:', e));
    } else {
      console.log('✓ No page errors detected');
    }
  } catch (error) {
    console.error('Navigation error:', error.message);
  } finally {
    await browser.close();
  }
});
