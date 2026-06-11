# E2E 测试说明

## 运行冒烟测试

```bash
# 方式 1：自动启动应用并测试（推荐）
npm run test:e2e

# 方式 2：手动启动应用
# 终端 1：
npm run tauri:dev

# 终端 2：
npx playwright test
```

## 测试技术栈

- **Playwright** - 浏览器自动化测试框架
- 自动启动 Tauri 开发服务器（`http://localhost:1420`）
- 失败时自动截图到 `tests/screenshots/`

## 测试覆盖

当前冒烟测试验证：
- ✅ 应用主界面加载
- ✅ Today 任务列表显示
- ✅ Goal Drawer 打开
- ✅ 任务列表交互

## 查看测试截图

失败时查看 `tests/screenshots/*.png` 了解界面状态。

## 调整端口

如果 Tauri 应用使用不同端口，修改 `playwright.config.ts` 中的 `baseURL`。
