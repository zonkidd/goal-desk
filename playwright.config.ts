import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:1420',
    headless: false,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run tauri:dev',
    url: 'http://localhost:1420',
    timeout: 120000,
    reuseExistingServer: true,
  },
})
