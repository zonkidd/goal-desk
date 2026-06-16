# 切片 10 - 手动验证清单（HITL）

## 前置条件

- [ ] 在 macOS 环境
- [ ] 系统日历中有一些测试事件（建议在 2026-06-09 到 2026-06-29 期间添加几个事件）
- [ ] 系统提醒事项中有一些测试数据

## 快速启动

```bash
cd /Users/zonkidd/IdeaProjects/goal-desk-tauri
nvm use 26
npm run tauri:dev
```

## 验证步骤

### 1. 权限验证 ⏱️ 2 分钟

打开开发者工具（右键 → Inspect），在 Console 执行：

```javascript
// 测试 API 调用
const result = await window.__TAURI__.invoke('load_calendar_range', {
  startDate: '2026-06-09',
  endDate: '2026-06-29'
});

console.log('✅ API 调用成功');
console.log('📅 Events:', result.events.length);
console.log('📝 Reminders:', result.reminders.length);
console.log('Sample event:', result.events[0]);
```

**预期结果**：
- [ ] 首次调用时弹出 macOS 权限请求对话框
- [ ] 授权后成功返回数据
- [ ] `result.events` 和 `result.reminders` 是数组
- [ ] 拒绝权限后返回空数组或错误信息

### 2. 数据准确性验证 ⏱️ 3 分钟

打开 macOS 系统日历应用，查看 2026-06-09 到 2026-06-29 期间的事件。

在开发者工具执行：

```javascript
const result = await window.__TAURI__.invoke('load_calendar_range', {
  startDate: '2026-06-09',
  endDate: '2026-06-29'
});

// 打印所有事件标题
result.events.forEach(e => {
  console.log(`📅 ${e.title} - ${e.startsAt}`);
});
```

**验证项**：
- [ ] API 返回的事件数量与系统日历中的事件数量一致
- [ ] 事件标题匹配
- [ ] 事件时间正确（检查 2-3 个典型事件）
- [ ] 没有范围外的事件（检查是否有 6 月 9 日之前或 6 月 29 日之后的事件）

### 3. 性能验证 ⏱️ 2 分钟

在开发者工具执行：

```javascript
// 性能测试
const times = [];
for (let i = 0; i < 10; i++) {
  const start = performance.now();
  await window.__TAURI__.invoke('load_calendar_range', {
    startDate: '2026-06-09',
    endDate: '2026-06-29'
  });
  const end = performance.now();
  times.push(end - start);
}

const avg = times.reduce((a, b) => a + b) / times.length;
const max = Math.max(...times);

console.log('⚡ 平均响应时间:', avg.toFixed(2), 'ms');
console.log('⚡ 最大响应时间:', max.toFixed(2), 'ms');
console.log('✅ 目标: < 500ms');
```

**预期结果**：
- [ ] 平均响应时间 < 500ms
- [ ] 应用保持流畅，无卡顿
- [ ] 内存占用正常（在 Activity Monitor 中检查）

### 4. 边界情况验证 ⏱️ 3 分钟

在开发者工具执行：

```javascript
// 测试 1: 跨月边界
const crossMonth = await window.__TAURI__.invoke('load_calendar_range', {
  startDate: '2026-05-25',
  endDate: '2026-06-10'
});
console.log('跨月测试:', crossMonth.events.length, 'events');

// 测试 2: 空日期范围（未来日期，假设无事件）
const empty = await window.__TAURI__.invoke('load_calendar_range', {
  startDate: '2050-01-01',
  endDate: '2050-01-07'
});
console.log('空范围测试:', empty.events.length, 'events (应该为 0)');

// 测试 3: 单日范围
const singleDay = await window.__TAURI__.invoke('load_calendar_range', {
  startDate: '2026-06-15',
  endDate: '2026-06-15'
});
console.log('单日测试:', singleDay.events.length, 'events');

// 测试 4: 跨年边界
const crossYear = await window.__TAURI__.invoke('load_calendar_range', {
  startDate: '2026-12-25',
  endDate: '2027-01-05'
});
console.log('跨年测试:', crossYear.events.length, 'events');
```

**验证项**：
- [ ] 跨月边界正确处理
- [ ] 空日期范围返回空数组（不崩溃）
- [ ] 单日范围正确返回当天事件
- [ ] 跨年边界正确处理

### 5. 错误处理验证 ⏱️ 1 分钟

在开发者工具执行：

```javascript
// 测试无效日期格式
try {
  await window.__TAURI__.invoke('load_calendar_range', {
    startDate: 'invalid-date',
    endDate: '2026-06-29'
  });
} catch (error) {
  console.log('✅ 错误正确捕获:', error);
}

// 测试缺少参数
try {
  await window.__TAURI__.invoke('load_calendar_range', {
    startDate: '2026-06-09'
    // 缺少 endDate
  });
} catch (error) {
  console.log('✅ 参数验证正确:', error);
}
```

**预期结果**：
- [ ] 无效日期格式返回明确错误信息
- [ ] 缺少参数返回明确错误信息
- [ ] 不会导致应用崩溃

## 验证结果记录

### 通过 ✅

- 权限验证：[ ]
- 数据准确性：[ ]
- 性能：[ ]
- 边界情况：[ ]
- 错误处理：[ ]

### 发现的问题 ⚠️

（记录任何发现的问题）

1. 
2. 
3. 

### 额外观察 📝

（记录任何额外的观察或建议）

1. 
2. 
3. 

## 验证完成

- [ ] 所有验证项通过
- [ ] 问题已记录
- [ ] 准备集成到 CalendarView

**验证时间**: ___________  
**验证人**: ___________  
**备注**: ___________
