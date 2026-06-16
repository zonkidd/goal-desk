# 切片 10: 日历看板 - EventKit 数据范围扩展（Rust 层）实施总结

## 实施日期
2026-06-16

## 任务目标
新增 Tauri command `load_calendar_range`，支持加载指定日期范围的 EventKit 数据，前端在周视图初始化时调用，加载当前周 ± 1 周的数据（共 3 周）。

## 已完成的工作

### 1. TypeScript 层实现 ✅

**文件**: `src/lib/desktopApi.ts`

新增函数：
```typescript
export async function loadCalendarRange(
  startDate: string,  // "2026-06-09"
  endDate: string     // "2026-06-29"
): Promise<{
  events: Array<{...}>
  reminders: Array<{...}>
}>
```

**特性**：
- 在非 Tauri 环境返回空数据（支持浏览器预览）
- 自动转换 ISO 8601 日期字符串为 Date 对象
- 类型安全的返回值

**测试文件**: `src/lib/desktopApi.timeline.test.ts`

测试覆盖：
- ✅ 非 Tauri 环境返回空数据
- ✅ Tauri 环境正确调用 `load_calendar_range` command
- ✅ 日期格式正确转换

**测试结果**: 3/3 通过

### 2. Rust 层实现 ✅

#### 2.1 EventKit Service 扩展

**文件**: `src-tauri/src/eventkit.rs`

新增类型：
```rust
pub struct CalendarRangeData {
    pub events: Vec<SystemCalendarEvent>,
    pub reminders: Vec<SystemReminder>,
}
```

新增 trait 方法：
```rust
trait SystemAgendaAdapter {
    fn load_range(
        &self,
        start: DateTime<Local>,
        end: DateTime<Local>,
    ) -> Result<CalendarRangeData, String>;
}
```

**特性**：
- 复用现有 `gd_eventkit_snapshot` native 函数
- macOS 和非 macOS 平台分别实现
- 非 macOS 返回空数据

**测试文件**: `src-tauri/src/eventkit.rs` (tests module)

测试覆盖：
- ✅ 正常加载多周数据
- ✅ 错误传播
- ✅ 与现有 snapshot 功能隔离

**测试结果**: 6/6 通过（包括 3 个新增测试）

#### 2.2 Tauri Command 实现

**文件**: `src-tauri/src/lib.rs`

新增 command：
```rust
#[tauri::command]
pub fn load_calendar_range(
    app: AppHandle,
    start_date: String,  // "2026-06-09"
    end_date: String,    // "2026-06-29"
) -> Result<eventkit::CalendarRangeData, String>
```

**特性**：
- 接受 ISO 8601 日期字符串（YYYY-MM-DD 格式）
- 自动转换为 DateTime<Local>
- 结束日期包含全天（23:59:59）
- 完整的错误处理

**已注册**: ✅ 添加到 `tauri::generate_handler![]`

#### 2.3 Native Bridge 复用

**决策**: 不修改 `EventKitBridge.m`，复用现有 `gd_eventkit_snapshot` 函数

**理由**：
1. 现有实现已经支持任意日期范围
2. 减少 native 层改动，降低风险
3. 保持代码简洁

### 3. 编译和测试状态

#### TypeScript 测试
```bash
npm test -- src/lib/desktopApi.timeline.test.ts
✓ 3 tests passed
```

#### Rust 测试
```bash
cargo test eventkit_service --lib
✓ 6 tests passed (包括 3 个新增)
```

#### 编译检查
```bash
cargo check
✓ 编译成功（仅有 2 个无害的 unused import 警告）
```

## 需要人工验证的项目（HITL）

由于这是涉及 macOS EventKit 权限和真实系统数据的 HITL 切片，以下项目需要在 macOS 环境手动验证：

### ✋ 权限验证

- [ ] 首次调用 `load_calendar_range` 时是否正确触发权限请求
- [ ] 用户授权后能否成功读取日历和提醒数据
- [ ] 用户拒绝权限后是否返回空数据或明确错误

### ✋ 性能验证

- [ ] 加载 3 周数据的响应时间是否 < 500ms
- [ ] 是否阻塞 UI 主线程
- [ ] 内存占用是否合理

### ✋ 数据准确性验证

- [ ] 返回的事件是否完整覆盖指定日期范围
- [ ] 是否包含范围外的事件（应该不包含）
- [ ] 跨月边界情况（如 2026-06-30 到 2026-07-01）是否正确处理
- [ ] 返回的日期时间是否保持本地时区

### ✋ 边界情况测试

测试场景：

1. **空日历**：系统日历无事件时
2. **大量事件**：日历有 100+ 事件时
3. **跨年范围**：如 2026-12-15 到 2027-01-05
4. **夏令时边界**：跨越夏令时切换日期
5. **无到期日的提醒**：是否正确包含

## 手动验证步骤

### 步骤 1: 启动 Tauri 应用

```bash
nvm use 26
npm run tauri:dev
```

### 步骤 2: 在开发者控制台测试 API

打开开发者工具，执行：

```javascript
// 测试加载 3 周数据
const result = await window.__TAURI__.invoke('load_calendar_range', {
  startDate: '2026-06-09',
  endDate: '2026-06-29'
});

console.log('Events:', result.events.length);
console.log('Reminders:', result.reminders.length);
console.log('Sample event:', result.events[0]);
```

### 步骤 3: 检查系统日历

在 macOS 系统日历中：
1. 查看 2026-06-09 到 2026-06-29 期间的事件数量
2. 对比 API 返回的事件数量是否一致
3. 检查几个典型事件的标题、时间是否匹配

### 步骤 4: 性能测试

```javascript
// 多次调用测试性能
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
console.log('Average time:', times.reduce((a, b) => a + b) / times.length, 'ms');
console.log('Max time:', Math.max(...times), 'ms');
```

### 步骤 5: 边界情况测试

```javascript
// 测试跨月
await window.__TAURI__.invoke('load_calendar_range', {
  startDate: '2026-05-25',
  endDate: '2026-06-10'
});

// 测试空范围
await window.__TAURI__.invoke('load_calendar_range', {
  startDate: '2050-01-01',
  endDate: '2050-01-07'
});
```

## 集成到 CalendarView 的下一步

### 前端集成示例

```typescript
// src/components/views/CalendarView.tsx
import { loadCalendarRange } from '@/lib/desktopApi'

export function WeekView() {
  const [weekData, setWeekData] = useState<{
    events: CalendarEvent[]
    reminders: ReminderItem[]
  }>({ events: [], reminders: [] })

  useEffect(() => {
    async function loadWeekData() {
      const today = new Date()
      const startDate = addDays(today, -7)  // 前一周
      const endDate = addDays(today, 14)    // 后两周
      
      const data = await loadCalendarRange(
        format(startDate, 'yyyy-MM-dd'),
        format(endDate, 'yyyy-MM-dd')
      )
      
      setWeekData(data)
    }
    
    loadWeekData()
  }, [])
  
  // ... 渲染周视图
}
```

### 缓存策略建议

```typescript
// 使用 React Query 或 SWR 缓存
const { data: weekData } = useQuery({
  queryKey: ['calendar-range', startDate, endDate],
  queryFn: () => loadCalendarRange(startDate, endDate),
  staleTime: 60000, // 1 分钟缓存
  refetchOnWindowFocus: true,
})
```

## 技术决策记录

### 决策 1: 复用现有 native 函数 ✅

**原因**：
- `gd_eventkit_snapshot` 已经支持任意日期范围
- 减少 Objective-C 层改动
- 降低引入 bug 的风险

**权衡**：
- 返回的是完整 `SystemAgendaSnapshot`（包含 integration_status）
- Rust 层手动提取 events 和 reminders
- 代码略显冗余，但更安全

### 决策 2: 日期格式使用 ISO 8601 字符串 ✅

**原因**：
- 前端易于构造（`format(date, 'yyyy-MM-dd')`）
- 跨语言标准格式
- 避免时区歧义

**权衡**：
- Rust 层需要手动解析
- 增加了验证逻辑
- 但提高了 API 清晰度

### 决策 3: 不修改 EventKitBridge.h ✅

**原因**：
- 现有函数签名足够通用
- 避免重新编译 native bridge
- 保持 API 稳定性

## 已知限制

1. **时区处理**：
   - 所有日期时间使用本地时区 `DateTime<Local>`
   - 跨时区使用场景未测试

2. **重复事件**：
   - macOS EventKit 会展开重复事件
   - 大量重复事件可能影响性能

3. **全天事件**：
   - 全天事件的时间表示依赖 EventKit 默认行为
   - 可能需要前端特殊处理

## 相关文件清单

### 已修改文件
- `src/lib/desktopApi.ts` - 新增 `loadCalendarRange` 函数
- `src/lib/desktopApi.timeline.test.ts` - 新增测试
- `src-tauri/src/eventkit.rs` - 新增类型和方法
- `src-tauri/src/lib.rs` - 新增 command 和注册

### 未修改文件（复用）
- `src-tauri/native/EventKitBridge.h` - 无需修改
- `src-tauri/native/EventKitBridge.m` - 复用现有函数

## 后续工作

1. **前端集成**（切片 11）：
   - 在 WeekView 组件中调用 `loadCalendarRange`
   - 实现周导航时的数据重新加载
   - 添加加载状态和错误处理

2. **缓存优化**（切片 12）：
   - 实现 React Query 或 SWR 缓存
   - 避免重复加载相同范围数据
   - 实现后台自动刷新

3. **性能优化**（如有需要）：
   - 如果 HITL 验证发现性能问题
   - 考虑在 Rust 层添加缓存
   - 或优化 native 查询逻辑

## 总结

✅ **自动化测试部分已完成**：
- TypeScript 单元测试：3/3 通过
- Rust 单元测试：6/6 通过
- 编译检查：成功

✋ **需要人工验证部分**：
- macOS EventKit 权限流程
- 真实系统数据准确性
- 性能和内存占用
- 边界情况处理

**下一步行动**：在 macOS 环境运行 `npm run tauri:dev`，按照上述手动验证步骤进行 HITL 测试。
