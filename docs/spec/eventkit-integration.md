# EventKit 集成系统 Spec

**文档版本**: v1.0  
**创建日期**: 2026-06-14  
**状态**: 已实现 ✅

---

## 一、概述

### 1.1 系统定位

EventKit 集成系统桥接 macOS 原生 EventKit 框架，读取日历事件（Calendar Events）和提醒事项（Reminders），合并到 Goal Desk 的 Today 时间轴，实现跨应用统一时间管理。

**设计原则**：
- **只读外部源**：日历事件和提醒事项均只读导入；提醒完成状态在系统提醒事项 App 中修改后由 Goal Desk 刷新读取
- **权限透明**：清晰展示日历/提醒权限状态，引导用户授权
- **原生桥接**：通过 Objective-C 调用 EventKit，Rust FFI 封装
- **跨平台兼容**：非 macOS 平台返回空数据，不影响核心功能

---

## 二、架构设计

### 2.1 技术栈

| 层级 | 技术 | 职责 |
|------|-----|------|
| **Objective-C** | EventKit.framework | 调用系统 API，获取日历/提醒数据 |
| **Rust FFI** | `extern "C"` | 接收 Objective-C JSON 结果，反序列化 |
| **Rust Service** | `EventKitService` | 封装业务逻辑，提供统一接口 |
| **Tauri Command** | `#[tauri::command]` | 暴露给前端调用 |
| **TypeScript API** | `desktopApi.ts` | 前端封装，处理 camelCase 转换 |

### 2.2 数据流

```
macOS EventKit
     ↓
Objective-C (native/eventkit.m)
  - gd_eventkit_snapshot()
  - gd_eventkit_request_calendar_access_async()
  - gd_eventkit_request_reminders_access_async()
     ↓ JSON string
Rust FFI (src-tauri/src/eventkit.rs)
  - read_native_result<T>()
  - serde_json::from_str()
     ↓ Rust struct
EventKitService
  - snapshot()
     ↓
Tauri Command (src-tauri/src/lib.rs)
  - load_desktop_snapshot()
  - open_system_reminder()
     ↓ invoke('load_desktop_snapshot')
TypeScript (src/lib/desktopApi.ts)
  - loadDesktopSnapshot()
  - openSystemReminder()
     ↓
React Store (src/store/appStore.ts)
  - hydrateApp()
  - openDrawer()
```

---

## 三、核心数据结构

### 3.1 IntegrationStatus

```typescript
// src/types/app.ts
export type AccessStatus = 
  | 'granted'
  | 'denied'
  | 'restricted'
  | 'not_determined'
  | 'error'

export interface IntegrationStatus {
  calendar: AccessStatus
  reminders: AccessStatus
}
```

```rust
// src-tauri/src/eventkit.rs
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AccessStatus {
    Granted,
    Denied,
    Restricted,
    NotDetermined,
    Error,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IntegrationStatus {
    pub calendar: AccessStatus,
    pub reminders: AccessStatus,
}
```

**状态语义**：
- `granted` - 已授权
- `denied` - 用户拒绝
- `restricted` - 系统限制（家长控制等）
- `not_determined` - 尚未请求权限
- `error` - 获取权限状态失败

### 3.2 SystemCalendarEvent

```typescript
// src/types/app.ts
export interface SystemCalendarEvent {
  id: string
  title: string
  startsAt: Date
  endsAt: Date
  calendarTitle?: string
}
```

```rust
// src-tauri/src/eventkit.rs
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemCalendarEvent {
    pub id: String,
    pub title: String,
    pub starts_at: DateTime<Local>,
    pub ends_at: DateTime<Local>,
    pub calendar_title: Option<String>,
}
```

### 3.3 SystemReminder

```typescript
// src/types/app.ts
export interface ReminderItem {
  id: string
  title: string
  dueAt?: Date
  done: boolean
  listTitle?: string
  source: 'system'
}
```

```rust
// src-tauri/src/eventkit.rs
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemReminder {
    pub id: String,
    pub title: String,
    pub due_at: Option<DateTime<Local>>,
    pub done: bool,
    pub list_title: Option<String>,
}
```

### 3.4 SystemAgendaSnapshot

```rust
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemAgendaSnapshot {
    pub integration_status: IntegrationStatus,
    pub calendar_events: Vec<SystemCalendarEvent>,
    pub reminders: Vec<SystemReminder>,
}
```

---

## 四、Objective-C 原生层

### 4.1 文件结构

```
src-tauri/native/
  ├── eventkit.h         # C 函数声明
  └── eventkit.m         # Objective-C 实现
```

### 4.2 C 函数签名

```c
// src-tauri/native/eventkit.h
typedef struct {
    char *json;
    char *error;
} GDEventKitResult;

GDEventKitResult gd_eventkit_snapshot(const char *start_iso, const char *end_iso);
void gd_eventkit_request_calendar_access_async(void *context, void (*callback)(void *, const char *));
void gd_eventkit_request_reminders_access_async(void *context, void (*callback)(void *, const char *));
void gd_eventkit_free_string(char *string);
```

### 4.3 权限请求

```objective-c
// src-tauri/native/eventkit.m
EKAuthorizationStatus calendarStatus = [EKEventStore authorizationStatusForEntityType:EKEntityTypeEvent];
EKAuthorizationStatus reminderStatus = [EKEventStore authorizationStatusForEntityType:EKEntityTypeReminder];

if (calendarStatus == EKAuthorizationStatusNotDetermined) {
    [eventStore requestAccessToEntityType:EKEntityTypeEvent completion:^(BOOL granted, NSError *error) {
        // 权限回调
    }];
}
```

**权限映射**：
| EKAuthorizationStatus | AccessStatus |
|----------------------|--------------|
| `EKAuthorizationStatusAuthorized` | `granted` |
| `EKAuthorizationStatusDenied` | `denied` |
| `EKAuthorizationStatusRestricted` | `restricted` |
| `EKAuthorizationStatusNotDetermined` | `not_determined` |

### 4.4 日历事件查询

```objective-c
NSPredicate *predicate = [eventStore predicateForEventsWithStartDate:startDate 
                                                              endDate:endDate 
                                                            calendars:nil];
NSArray<EKEvent *> *events = [eventStore eventsMatchingPredicate:predicate];

NSMutableArray *eventArray = [NSMutableArray array];
for (EKEvent *event in events) {
    [eventArray addObject:@{
        @"id": event.eventIdentifier,
        @"title": event.title ?: @"",
        @"startsAt": [event.startDate ISO8601String],
        @"endsAt": [event.endDate ISO8601String],
        @"calendarTitle": event.calendar.title ?: [NSNull null]
    }];
}
```

### 4.5 提醒事项查询

```objective-c
NSPredicate *predicate = [eventStore predicateForRemindersInCalendars:nil];
[eventStore fetchRemindersMatchingPredicate:predicate completion:^(NSArray<EKReminder *> *reminders) {
    NSMutableArray *reminderArray = [NSMutableArray array];
    for (EKReminder *reminder in reminders) {
        NSString *dueAtISO = reminder.dueDateComponents 
            ? [[NSCalendar currentCalendar] dateFromComponents:reminder.dueDateComponents].ISO8601String
            : nil;
        
        [reminderArray addObject:@{
            @"id": reminder.calendarItemIdentifier,
            @"title": reminder.title ?: @"",
            @"dueAt": dueAtISO ?: [NSNull null],
            @"done": @(reminder.completed),
            @"listTitle": reminder.calendar.title ?: [NSNull null]
        }];
    }
    
    // 序列化 JSON
}];
```

### 4.6 提醒只读导入

```objective-c
// 当前策略：不保存 EKReminder。
// Goal Desk 只读取提醒事项并可打开系统提醒事项 App。
```

---

## 五、Rust FFI 层

### 5.1 extern "C" 声明

```rust
// src-tauri/src/eventkit.rs
#[cfg(target_os = "macos")]
#[repr(C)]
struct NativeEventKitResult {
    json: *mut c_char,
    error: *mut c_char,
}

#[cfg(target_os = "macos")]
unsafe extern "C" {
    fn gd_eventkit_snapshot(
        start_iso: *const c_char, 
        end_iso: *const c_char
    ) -> NativeEventKitResult;
    fn gd_eventkit_request_calendar_access_async(
        context: *mut std::ffi::c_void,
        callback: unsafe extern "C" fn(*mut std::ffi::c_void, *const c_char),
    );

    fn gd_eventkit_request_reminders_access_async(
        context: *mut std::ffi::c_void,
        callback: unsafe extern "C" fn(*mut std::ffi::c_void, *const c_char),
    );
    
    fn gd_eventkit_free_string(string: *mut c_char);
}
```

### 5.2 结果解析

```rust
fn read_native_result<T>(result: NativeEventKitResult) -> Result<T, String>
where
    T: DeserializeOwned,
{
    // 1. 读取 error 字段
    let error = if result.error.is_null() {
        None
    } else {
        let value = unsafe { CStr::from_ptr(result.error) }
            .to_string_lossy()
            .into_owned();
        unsafe { gd_eventkit_free_string(result.error) };
        Some(value)
    };
    
    // 2. 读取 json 字段
    let json = if result.json.is_null() {
        None
    } else {
        let value = unsafe { CStr::from_ptr(result.json) }
            .to_string_lossy()
            .into_owned();
        unsafe { gd_eventkit_free_string(result.json) };
        Some(value)
    };
    
    // 3. 错误优先返回
    if let Some(error) = error {
        return Err(error);
    }
    
    // 4. 反序列化 JSON
    let payload = json.ok_or_else(|| "EventKit bridge returned no payload".to_string())?;
    serde_json::from_str(&payload)
        .map_err(|e| format!("Unable to decode EventKit bridge response: {e}"))
}
```

### 5.3 SystemAgendaAdapter trait

```rust
pub trait SystemAgendaAdapter {
    fn snapshot(
        &self,
        start: DateTime<Local>,
        end: DateTime<Local>,
    ) -> Result<SystemAgendaSnapshot, String>;
}
```

### 5.4 MacEventKitAdapter 实现

```rust
#[cfg(target_os = "macos")]
struct MacEventKitAdapter;

impl SystemAgendaAdapter for MacEventKitAdapter {
    fn snapshot(
        &self,
        start: DateTime<Local>,
        end: DateTime<Local>,
    ) -> Result<SystemAgendaSnapshot, String> {
        let start_iso = CString::new(start.to_rfc3339())
            .map_err(|e| e.to_string())?;
        let end_iso = CString::new(end.to_rfc3339())
            .map_err(|e| e.to_string())?;
        
        Self::read_native_result(unsafe {
            gd_eventkit_snapshot(start_iso.as_ptr(), end_iso.as_ptr())
        })
    }
}
```

---

## 六、EventKitService

### 6.1 服务封装

```rust
pub struct EventKitService<A> {
    adapter: A,
}

impl<A> EventKitService<A>
where
    A: SystemAgendaAdapter,
{
    pub fn new(adapter: A) -> Self {
        Self { adapter }
    }
    
    pub fn snapshot(
        &self,
        start: DateTime<Local>,
        end: DateTime<Local>,
    ) -> Result<SystemAgendaSnapshot, String> {
        self.adapter.snapshot(start, end)
    }
}
```

### 6.2 平台分发

```rust
#[cfg(target_os = "macos")]
pub fn load_snapshot<R: Runtime>(
    app: &AppHandle<R>,
    start: DateTime<Local>,
    end: DateTime<Local>,
) -> Result<SystemAgendaSnapshot, String> {
    EventKitService::new(MacEventKitAdapter::new(app)?)
        .snapshot(start, end)
}

#[cfg(not(target_os = "macos"))]
pub fn load_snapshot<R: Runtime>(
    _app: &AppHandle<R>,
    _start: DateTime<Local>,
    _end: DateTime<Local>,
) -> Result<SystemAgendaSnapshot, String> {
    Ok(SystemAgendaSnapshot {
        integration_status: IntegrationStatus {
            calendar: AccessStatus::Error,
            reminders: AccessStatus::Error,
        },
        calendar_events: Vec::new(),
        reminders: Vec::new(),
    })
}
```

---

## 七、Tauri Command 层

### 7.1 load_desktop_snapshot

```rust
// src-tauri/src/lib.rs
#[tauri::command]
async fn load_desktop_snapshot(app: AppHandle) -> Result<DesktopSnapshot, String> {
    let repo = SqliteRepository::new(&app).await?;
    
    // 1. 加载 Desk 数据
    let workspace = repo.load_workspace().await?;
    let tasks = workspace.tasks;
    let goals = workspace.goals;
    
    // 2. 加载 EventKit 数据
    let today_start = Local::now().with_hour(0).unwrap();
    let today_end = today_start + Duration::days(1);
    let agenda = eventkit::load_snapshot(&app, today_start, today_end)?;
    
    // 3. 合并时间轴
    let timeline = merge_timeline(
        &tasks,
        &agenda.calendar_events,
        &agenda.reminders
    );
    
    Ok(DesktopSnapshot {
        tasks,
        goals,
        timeline,
        system_reminders: agenda.reminders,
        integration_status: agenda.integration_status,
    })
}
```

### 7.2 open_system_reminder

```rust
#[tauri::command]
async fn open_system_reminder(reminder_id: String) -> Result<(), String> {
    eventkit::open_system_reminder(&reminder_id)
}
```

---

## 八、前端集成

### 8.1 desktopApi.ts 封装

```typescript
// src/lib/desktopApi.ts
export async function loadDesktopSnapshot() {
  if (!isTauriRuntime()) {
    throw new Error('Desktop API only available in Tauri runtime')
  }
  
  const snapshot = await invoke<DesktopSnapshot>('load_desktop_snapshot')
  
  // snake_case → camelCase 转换
  return {
    tasks: snapshot.tasks.map(normalizeTask),
    goals: snapshot.goals.map(normalizeGoal),
    timeline: snapshot.timeline.map(normalizeTimelineItem),
    systemReminders: snapshot.system_reminders.map(normalizeReminder),
    integrationStatus: snapshot.integration_status,
  }
}

export async function openSystemReminder(reminderId: string) {
  await invoke('open_system_reminder', { reminderId })
}
```

### 8.2 时间轴合并

```typescript
// src/lib/desktopApi.ts
function mergeTimeline(
  deskTasks: Task[],
  calendarEvents: SystemCalendarEvent[],
  systemReminders: ReminderItem[]
): TimelineItem[] {
  const items: TimelineItem[] = []
  
  // 1. Calendar Events (只读)
  items.push(...calendarEvents.map(event => ({
    id: event.id,
    title: event.title,
    timeLabel: formatTime(event.startsAt),
    source: 'calendar' as const,
    readonly: true,
    done: false,
    sourceLabel: event.calendarTitle || 'Calendar Event',
  })))
  
  // 2. System Reminders (只读)
  items.push(...systemReminders
    .filter(r => r.dueAt)
    .map(reminder => ({
      id: reminder.id,
      title: reminder.title,
      timeLabel: formatTime(reminder.dueAt!),
      source: 'reminder' as const,
      readonly: true,
      done: reminder.done,
      sourceLabel: reminder.listTitle || 'Apple Reminders',
    }))
  )
  
  // 3. Desk Tasks (plannedStartAt 驱动时间轴)
  items.push(...deskTasks
    .filter(task => task.plannedStartAt && task.status !== 'DONE')
    .map(task => ({
      id: task.id,
      title: task.title,
      timeLabel: formatTime(task.plannedStartAt!),
      source: 'todo' as const,
      readonly: false,
      done: task.status === 'DONE',
      sourceLabel: 'Desk Task',
    }))
  )
  
  // 4. 按时间排序
  return items.sort((a, b) => 
    parseTime(a.timeLabel) - parseTime(b.timeLabel)
  )
}
```

---

## 九、权限处理

### 9.1 权限状态展示

```typescript
// src/components/views/TodayView.tsx
{integrationStatus.calendar === 'not_determined' && (
  <PermissionBanner
    title="日历权限未授权"
    description="授权后可在时间轴查看日历事件"
    onRequest={() => void loadDesktopSnapshot()}
  />
)}

{integrationStatus.reminders === 'denied' && (
  <PermissionBanner
    title="提醒事项权限被拒绝"
    description="请在系统设置中手动授权"
    action="打开系统设置"
    onAction={() => void openSystemPreferences()}
  />
)}
```

### 9.2 权限请求流程

```
1. 首次启动 Goal Desk
   ↓
2. 调用 loadDesktopSnapshot()
   ↓
3. Rust 调用 EventKit.requestAccess()
   ↓
4. 系统弹窗请求权限
   ↓
5. 用户同意/拒绝
   ↓
6. 返回 IntegrationStatus
   ↓
7. 前端根据状态显示提示/数据
```

---

## 十、设计决策（ADR）

### ADR-001: 日历事件只读

**决策**: Calendar Events 不支持创建/编辑/删除

**理由**:
- ✅ 避免双向同步冲突（Goal Desk ↔ 系统日历）
- ✅ 降低实现复杂度
- ✅ 用户已有成熟的日历应用

**代价**:
- ❌ 无法在 Goal Desk 中管理日历
- 接受: 定位为"查看日历"而非"管理日历"

### ADR-002: 提醒事项只读导入

**决策**: System Reminders 不支持在 Goal Desk 中创建、编辑或标记完成；Goal Desk 只展示导入数据并打开系统提醒事项 App

**理由**:
- ✅ 避免复杂的双向同步逻辑
- ✅ 减少权限敏感操作和 EventKit 写入风险

**代价**:
- ❌ 无法在 Goal Desk 中创建提醒
- ❌ 无法在 Goal Desk 中标记系统提醒完成
- 缓解: 用户可以在系统提醒事项 App 中修改，Goal Desk 刷新后只读展示最新状态

### ADR-003: 非 macOS 平台返回空数据

**决策**: Windows/Linux 返回空的 SystemAgendaSnapshot

**理由**:
- ✅ 核心功能不依赖 EventKit（Desk Task 仍可用）
- ✅ 避免跨平台日历 API 差异
- ✅ 简化实现，专注 macOS 体验

**代价**:
- ❌ 非 macOS 用户无法使用时间轴合并功能
- 接受: 目标用户主要是 macOS

### ADR-004: Objective-C 而非 Swift

**决策**: 使用 Objective-C 实现 EventKit 桥接

**理由**:
- ✅ C FFI 兼容性更好（Rust extern "C"）
- ✅ EventKit 是 Objective-C API
- ✅ 避免 Swift ABI 稳定性问题

**代价**:
- ❌ Objective-C 语法较旧
- 接受: EventKit 桥接代码量小，维护成本低

---

## 十一、测试策略

### 11.1 单元测试（Rust）

```rust
// src-tauri/src/eventkit.rs
#[cfg(test)]
mod tests {
    use super::*;
    
    struct FakeAdapter {
        snapshot: Option<SystemAgendaSnapshot>,
        fail_with: Option<String>,
    }
    
    impl SystemAgendaAdapter for FakeAdapter {
        fn snapshot(&self, _start: DateTime<Local>, _end: DateTime<Local>) 
            -> Result<SystemAgendaSnapshot, String> 
        {
            if let Some(error) = &self.fail_with {
                return Err(error.clone());
            }
            self.snapshot.clone().ok_or_else(|| "missing snapshot".to_string())
        }
        // ...
    }
    
    #[test]
    fn eventkit_service_returns_snapshot_from_adapter() {
        let service = EventKitService::new(FakeAdapter {
            snapshot: Some(SystemAgendaSnapshot {
                integration_status: IntegrationStatus {
                    calendar: AccessStatus::Granted,
                    reminders: AccessStatus::Granted,
                },
                calendar_events: vec![],
                reminders: vec![SystemReminder {
                    id: "reminder-1".to_string(),
                    title: "Review timeline merge".to_string(),
                    due_at: Some(Local.with_ymd_and_hms(2026, 6, 10, 14, 0, 0).unwrap()),
                    done: false,
                    list_title: Some("Work".to_string()),
                }],
            }),
            fail_with: None,
        });
        
        let snapshot = service.snapshot(
            Local.with_ymd_and_hms(2026, 6, 10, 0, 0, 0).unwrap(),
            Local.with_ymd_and_hms(2026, 6, 17, 0, 0, 0).unwrap(),
        ).unwrap();
        
        assert_eq!(snapshot.integration_status.calendar, AccessStatus::Granted);
        assert_eq!(snapshot.reminders.len(), 1);
    }
}
```

### 11.2 手动测试（macOS）

**测试场景**：
1. 首次启动 → 权限请求弹窗
2. 同意日历权限 → 时间轴显示今日事件
3. 拒绝提醒权限 → 显示权限拒绝提示
4. 在系统提醒中创建提醒 → Goal Desk 刷新后显示
5. 在 Goal Desk 中打开提醒 → 系统提醒事项 App 被打开

---

## 十二、相关资源

### 文档
- [Today View PRD](../prd/today-view.md)
- [时间轴设计](../design/today-workbench-time-display.md)
- [Apple EventKit 官方文档](https://developer.apple.com/documentation/eventkit)

### 代码
- [`src-tauri/src/eventkit.rs`](../../src-tauri/src/eventkit.rs)
- [`src-tauri/native/eventkit.h`](../../src-tauri/native/eventkit.h)
- [`src-tauri/native/eventkit.m`](../../src-tauri/native/eventkit.m)
- [`src/lib/desktopApi.ts`](../../src/lib/desktopApi.ts)

### 构建配置
- [`src-tauri/build.rs`](../../src-tauri/build.rs) - 编译 Objective-C 代码
- [`src-tauri/Cargo.toml`](../../src-tauri/Cargo.toml) - 依赖声明

---

**文档维护者**: Goal Desk 开发团队  
**最后更新**: 2026-06-14
