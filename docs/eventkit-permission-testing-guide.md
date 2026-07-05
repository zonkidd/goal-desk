# EventKit 权限测试完整指南

## 前置说明

EventKit 的核心序列化问题已修复，但在 `npm run tauri:dev` 开发模式下无法正常测试权限授予流程。这是因为开发模式运行的是裸二进制文件，缺少 macOS 权限系统所需的元数据。

本指南提供三种方案，用于在开发完成后测试 EventKit 权限的完整流程。

---

## 方案 A：构建并测试完整的 .app（推荐）

这是最接近真实用户体验的测试方式。

### 前置条件

首先需要修复当前的 TypeScript 编译错误。错误主要集中在：
- `src/components/views/CalendarView.test.tsx` - 缺少 `TimelineItem` 类型定义
- `src/components/views/RemindersView.test.tsx` - 参数类型标注缺失
- `src/lib/calendarUtils.ts` - `TimelineItem` 类型属性访问错误

### 步骤 1：修复 TypeScript 错误

**选项 1.1：正确修复类型错误**（推荐）

检查并修复以下文件：

```bash
# 1. 确认 TimelineItem 类型定义位置
grep -r "type TimelineItem\|interface TimelineItem" src/

# 2. 修复 CalendarView.test.tsx
# 添加正确的 import 或类型定义

# 3. 修复 RemindersView.test.tsx  
# 为 selector 参数添加类型标注

# 4. 修复 calendarUtils.ts
# 确保 TimelineItem 类型包含 startsAt 属性
```

**选项 1.2：临时跳过测试文件**（快速验证）

如果只是为了快速测试权限，可以临时排除测试文件：

编辑 `tsconfig.json`：
```json
{
  "compilerOptions": { ... },
  "exclude": [
    "node_modules",
    "**/*.test.tsx",
    "**/*.test.ts"
  ]
}
```

### 步骤 2：构建 Debug 版本的 .app

```bash
cd /Users/zonkidd/IdeaProjects/goal-desk-tauri

# 确认 Node 版本
nvm use 26

# 构建前端
npm run build

# 构建 debug 版本的 macOS app
npm run tauri build -- --debug
```

构建成功后，.app 文件位于：
```
src-tauri/target/debug/bundle/macos/Goal Desk.app
```

### 步骤 3：重置权限（清除旧状态）

```bash
# 重置所有应用的 Calendar 和 Reminders 权限
tccutil reset Calendar
tccutil reset Reminders

# 或者只重置 Goal Desk 的权限
tccutil reset Calendar com.goaldesk.app
tccutil reset Reminders com.goaldesk.app
```

### 步骤 4：运行并测试权限流程

```bash
# 方式 1：从命令行启动
open "src-tauri/target/debug/bundle/macos/Goal Desk.app"

# 方式 2：从 Finder 双击启动
open src-tauri/target/debug/bundle/macos/
# 然后双击 Goal Desk.app
```

**预期行为**：

1. **首次启动**：应该弹出系统权限对话框
   - "Goal Desk would like to access your Reminders"
   - "Goal Desk would like to access your Calendar"

2. **点击"好"后**：应用应该显示权限已授予

3. **点击"不允许"后**：应用显示权限已拒绝，可以通过系统设置手动授权

### 步骤 5：验证权限状态

打开 **系统设置 > 隐私与安全性**，检查：
- **日历** → 应该看到 "Goal Desk" 已勾选
- **提醒事项** → 应该看到 "Goal Desk" 已勾选

### 步骤 6：测试功能

在应用中验证：
- 日历事件能否正常显示
- 提醒事项能否正常只读显示
- 打开系统提醒事项 App 是否正常工作

---

## 方案 B：系统设置手动授权（开发快速验证）

如果暂时不想修复 TypeScript 错误，可以在开发模式下手动授权。

### 注意事项

⚠️ **每次 `cargo build` 后二进制文件会变化，需要重新授权！**

这是因为裸二进制文件的代码签名（或缺乏签名）会随编译而改变。

### 步骤 1：确保应用已编译

```bash
cd /Users/zonkidd/IdeaProjects/goal-desk-tauri/src-tauri
cargo build
```

二进制文件位于：
```
target/debug/goal-desk-tauri
```

### 步骤 2：系统设置手动授权

1. 打开 **系统设置 > 隐私与安全性 > 日历**
2. 点击左下角的 **锁图标**，输入密码解锁
3. 点击列表下方的 **"+"** 按钮
4. 使用 **Cmd+Shift+G** 打开"前往文件夹"对话框
5. 输入路径：
   ```
   /Users/zonkidd/IdeaProjects/goal-desk-tauri/src-tauri/target/debug/
   ```
6. 选择 **goal-desk-tauri** 二进制文件
7. 确认添加，确保它被勾选

8. 重复以上步骤授权 **提醒事项**：
   - 系统设置 > 隐私与安全性 > 提醒事项
   - 添加同样的二进制文件

### 步骤 3：启动应用验证

```bash
cd /Users/zonkidd/IdeaProjects/goal-desk-tauri
npm run tauri:dev
```

应用应该显示权限已授予（而不是"已拒绝"）。

### 步骤 4：测试功能

验证日历和提醒事项功能是否正常工作。

### 注意事项

- **代码改动后重新编译**：需要重新在系统设置中授权
- **不推荐长期使用**：这只是临时验证方案
- **调试日志**：终端会输出序列化日志，可以验证数据流是否正确

---

## 方案 C：生产构建测试（最终验证）

这是最接近真实发布环境的测试方式。

### 步骤 1：修复所有 TypeScript 错误

确保 `npm run build` 能成功执行。

### 步骤 2：构建 Release 版本

```bash
cd /Users/zonkidd/IdeaProjects/goal-desk-tauri
npm run tauri build
```

构建成功后，.app 文件位于：
```
src-tauri/target/release/bundle/macos/Goal Desk.app
```

### 步骤 3：代码签名（如果需要）

如果你有 Apple Developer 账号和证书：

```bash
codesign --deep --force --verify --verbose \
  --sign "Developer ID Application: Your Name" \
  "src-tauri/target/release/bundle/macos/Goal Desk.app"
```

如果没有证书，macOS 会在首次运行时要求用户确认"来自未识别开发者的应用"。

### 步骤 4：重置权限

```bash
tccutil reset Calendar
tccutil reset Reminders
```

### 步骤 5：首次运行验证

```bash
open "src-tauri/target/release/bundle/macos/Goal Desk.app"
```

验证：
1. 权限对话框是否正常弹出
2. 授予权限后功能是否正常
3. Info.plist 中的权限说明文案是否正确显示

### 步骤 6：分发测试（可选）

将 .app 复制到其他 Mac 上测试：
- 首次运行体验
- 权限请求流程
- 功能完整性

---

## 调试检查清单

如果权限测试遇到问题，按以下顺序排查：

### ✅ 序列化修复验证

查看终端输出，应该看到：
```
🔍 [EventKit] Raw payload from native: "denied" 或 "granted"
✅ [EventKit] Successfully deserialized
```

如果看到反序列化错误，说明序列化修复未生效。

### ✅ Info.plist 配置检查

确认 `src-tauri/Info.plist` 包含：

```xml
<key>NSCalendarsFullAccessUsageDescription</key>
<string>Goal Desk needs calendar access to render your upcoming schedule inside the unified timeline.</string>

<key>NSRemindersFullAccessUsageDescription</key>
<string>Goal Desk needs reminders access to sync Apple Reminders with goal progress and task completion.</string>
```

### ✅ Bundle Identifier 检查

确认 `src-tauri/tauri.conf.json`：

```json
{
  "identifier": "com.goaldesk.app"
}
```

### ✅ macOS 版本兼容性

- macOS 14+：需要 `NSCalendarsFullAccessUsageDescription`
- macOS 13 及以下：需要 `NSCalendarsUsageDescription`

当前配置已包含两者，兼容所有版本。

### ✅ 权限状态检查命令

```bash
# 查看当前授权状态
tccutil dump Calendar | grep -A 5 "goaldesk"
tccutil dump Reminders | grep -A 5 "goaldesk"
```

---

## 预期的完整权限流程

### 场景 1：首次启动（未授权）

1. 用户启动应用
2. 应用调用 `request_reminders_access()` 和 `request_calendar_access()`
3. macOS 弹出系统对话框（每个权限一次）
4. 对话框显示 Info.plist 中的说明文案
5. 用户点击"好"或"不允许"
6. 应用接收到权限状态：`granted` 或 `denied`
7. 应用根据状态显示相应的 UI

### 场景 2：已授权

1. 用户启动应用
2. 应用调用权限请求函数
3. macOS 直接返回 `granted`（不弹对话框）
4. 应用正常加载日历和提醒事项数据

### 场景 3：已拒绝

1. 用户启动应用
2. 应用调用权限请求函数
3. macOS 直接返回 `denied`（不弹对话框）
4. 应用显示权限被拒绝的提示
5. 引导用户去系统设置手动授权

---

## 常见问题

### Q1: 为什么开发模式下权限总是被拒绝？

**A**: `npm run tauri:dev` 运行的是裸二进制文件（`target/debug/goal-desk-tauri`），它缺少：
- Info.plist（权限说明文案）
- Bundle identifier（TCC 系统识别标识）
- 代码签名（可选，但有助于系统信任）

macOS TCC 系统无法识别这样的应用，直接拒绝权限请求。

**解决方案**：使用方案 A 或 B 进行测试。

### Q2: 构建 .app 时出现 TypeScript 错误怎么办？

**A**: 两个选择：
1. **正确修复**：找到类型错误的根源并修复（推荐）
2. **临时绕过**：在 `tsconfig.json` 中排除 `.test.tsx` 文件，或临时禁用严格模式

### Q3: 手动授权后重新编译，权限又被拒绝了？

**A**: 正常现象。每次 `cargo build` 会生成新的二进制文件，macOS 认为这是"不同的应用"，需要重新授权。

**解决方案**：
- 开发阶段：每次编译后重新在系统设置授权（麻烦但有效）
- 测试阶段：构建一次 .app，反复测试这个 .app（不重新编译）

### Q4: 如何验证序列化修复是否生效？

**A**: 查看终端输出，应该看到：
```
🔍 [EventKit] Raw payload from native: "denied"
✅ [EventKit] Successfully deserialized
```

如果看到 `❌ [EventKit] Deserialization failed`，说明修复未生效。

### Q5: Info.plist 的权限说明文案可以修改吗？

**A**: 可以。编辑 `src-tauri/Info.plist`，修改 `<string>` 标签内的内容。

建议保持简洁、清晰，说明应用为什么需要这些权限。

### Q6: 可以在代码中检测权限状态吗？

**A**: 可以。Rust 端：
```rust
let status = eventkit::request_calendar_access()?;
match status {
    AccessStatus::Granted => { /* 已授予 */ }
    AccessStatus::Denied => { /* 已拒绝 */ }
    AccessStatus::NotDetermined => { /* 未决定 */ }
    _ => { /* 其他状态 */ }
}
```

前端：
```typescript
const status = await desktopApi.requestCalendarAccess();
if (status === 'granted') {
  // 已授予
}
```

---

## 推荐的测试顺序

1. **先验证序列化修复**（方案 B）
   - 确认调试日志显示 `✅ Successfully deserialized`
   - 确认应用不会因反序列化错误而崩溃

2. **修复 TypeScript 错误**
   - 确保 `npm run build` 成功

3. **构建并测试完整权限流程**（方案 A）
   - 构建 debug .app
   - 测试首次授权流程
   - 测试拒绝后的 UI 提示
   - 测试从系统设置手动授权

4. **生产构建最终验证**（方案 C）
   - 构建 release .app
   - 模拟真实用户首次使用体验
   - 在干净的 Mac 上测试（如果可能）

---

## 总结

- ✅ **序列化问题已修复**：这是最重要的，应用不会再因数据格式错误而崩溃
- ⚠️ **权限测试需要完整 .app**：开发模式的限制是 macOS 系统机制，不是代码问题
- 🎯 **推荐流程**：修复 TS 错误 → 构建 .app → 测试权限流程

**当你准备好测试权限时，按照方案 A 的步骤操作即可。**

---

## 相关文件

- 序列化修复：`src-tauri/native/EventKitBridge.m` (line 193-195, 219-221, 235-237, 261-263)
- 调试日志：`src-tauri/src/eventkit.rs` (line 222-230)
- 权限配置：`src-tauri/Info.plist`
- Bundle ID：`src-tauri/tauri.conf.json`
- 实施计划：`/Users/zonkidd/.claude/plans/eventkit-object-c-twinkly-sifakis.md`
