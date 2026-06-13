# Repository 层架构 Spec

**文档版本**: v1.0  
**创建日期**: 2026-06-14  
**状态**: 已实现 ✅

---

## 一、概述

### 1.1 系统定位

Repository 层是后端数据访问层，封装 SQLite 数据库的所有读写操作，提供类型安全的 Rust API，支持单实体精细操作和全量快照加载。

**设计原则**：
- **单一数据源**：SQLite 是唯一持久化存储
- **精细粒度**：提供单实体 CRUD，避免全量读写
- **类型安全**：Rust 类型系统保证数据一致性
- **向后兼容**：自动添加缺失列，支持 schema 演进

---

## 二、架构设计

### 2.1 分层结构

```
┌─────────────────────────────────────────┐
│          Tauri Commands                 │
│  (create_desk_task, update_task_status) │
└───────────────┬─────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│       Repository Trait / Impl           │ ← 本层
│  - GoalRepository                        │
│  - TaskRepository                        │
│  - AreaRepository                        │
└───────────────┬─────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│          SQLite Database                │
│  - areas, goals, desk_tasks 表          │
│  - desk_task_activity_logs 表           │
└─────────────────────────────────────────┘
```

### 2.2 文件路径

- **主文件**: `src-tauri/src/repository.rs` (~1200 行)
- **领域类型**: `src-tauri/src/domain.rs` - DeskTask, Goal, Area 等
- **错误类型**: `RepositoryError` 枚举

---

## 三、核心类型

### 3.1 SqliteRepository

```rust
#[derive(Debug, Clone)]
pub struct SqliteRepository {
    path: PathBuf,
}

impl SqliteRepository {
    pub fn new(path: PathBuf) -> Self
    pub fn path(&self) -> &Path
    pub fn initialize(&self) -> Result<(), RepositoryError>
    
    // Goal 操作
    pub fn create_goal(&self, goal: &Goal) -> Result<(), RepositoryError>
    pub fn read_goal(&self, id: &str) -> Result<Goal, RepositoryError>
    pub fn update_goal(&self, goal: &Goal) -> Result<(), RepositoryError>
    pub fn delete_goal(&self, id: &str) -> Result<(), RepositoryError>
    pub fn list_goals(&self) -> Result<Vec<Goal>, RepositoryError>
    pub fn update_goal_status(&self, id: &str, status: GoalStatus) -> Result<Goal, RepositoryError>
    
    // Task 操作
    pub fn create_desk_task(&self, task: &DeskTask) -> Result<(), RepositoryError>
    pub fn read_desk_task(&self, id: &str) -> Result<DeskTask, RepositoryError>
    pub fn update_desk_task(&self, task: &DeskTask) -> Result<(), RepositoryError>
    pub fn delete_desk_task(&self, id: &str) -> Result<(), RepositoryError>
    pub fn list_desk_tasks(&self) -> Result<Vec<DeskTask>, RepositoryError>
    pub fn update_task_status(&self, id: &str, status: TaskStatus, note: Option<String>) -> Result<DeskTask, RepositoryError>
    
    // Area 操作
    pub fn create_area(&self, area: &Area) -> Result<(), RepositoryError>
    pub fn read_area(&self, id: &str) -> Result<Area, RepositoryError>
    pub fn update_area(&self, area: &Area) -> Result<(), RepositoryError>
    pub fn delete_area(&self, id: &str) -> Result<(), RepositoryError>
    pub fn list_areas(&self) -> Result<Vec<Area>, RepositoryError>
    
    // 全量快照
    pub fn load_workspace_snapshot(&self) -> Result<WorkspaceSnapshot, RepositoryError>
}
```

### 3.2 RepositoryError

```rust
#[derive(Debug)]
pub enum RepositoryError {
    Sqlite(rusqlite::Error),     // SQLite 错误
    Io(std::io::Error),           // 文件 I/O 错误
    Uuid(uuid::Error),            // UUID 解析错误
    Chrono(chrono::ParseError),   // 时间解析错误
    Data(String),                 // 业务数据错误
}

impl std::error::Error for RepositoryError {}
impl fmt::Display for RepositoryError { /* ... */ }
```

**错误转换**：
- 自动实现 `From<rusqlite::Error>` 等 trait
- 支持 `?` 操作符传播错误

---

## 四、数据库 Schema

### 4.1 表结构

#### areas 表

```sql
CREATE TABLE IF NOT EXISTS areas (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL
);
```

#### goals 表

```sql
CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    area_id TEXT NULL,                     -- 关联的领域 ID
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'ACTIVE'  -- ACTIVE/PAUSED/COMPLETED/ARCHIVED
);
```

#### desk_tasks 表

```sql
CREATE TABLE IF NOT EXISTS desk_tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,                 -- Markdown 内容
    status TEXT NOT NULL,                  -- TODO/IN_PROGRESS/PAUSED/DONE
    due_at TEXT NULL,                      -- ISO 8601 时间
    planned_start_at TEXT NULL,            -- ISO 8601 时间
    linked_goal_id TEXT NULL,              -- 关联的目标 ID
    linked_goal_label TEXT NULL,           -- 关联的目标标题（冗余）
    bear_note_id TEXT NULL,                -- Bear 笔记 ID
    system_reminder_id TEXT NULL,          -- 系统提醒 ID
    show_in_timeline INTEGER NOT NULL DEFAULT 0  -- 是否显示在时间轴
);
```

#### desk_task_activity_logs 表

```sql
CREATE TABLE IF NOT EXISTS desk_task_activity_logs (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,                 -- 关联的任务 ID
    action TEXT NOT NULL,                  -- CREATED/STARTED/PAUSED/RESUMED/COMPLETED/NOTE_ADDED
    note TEXT NULL,                        -- 备注内容
    timestamp TEXT NOT NULL                -- ISO 8601 时间
);
```

### 4.2 Schema 演进

```rust
Self::ensure_column_exists(&connection, "goals", "description", "TEXT NOT NULL DEFAULT ''")?;
Self::ensure_column_exists(&connection, "goals", "status", "TEXT NOT NULL DEFAULT 'ACTIVE'")?;
Self::ensure_column_exists(&connection, "desk_tasks", "bear_note_id", "TEXT NULL")?;
Self::ensure_column_exists(&connection, "desk_tasks", "system_reminder_id", "TEXT NULL")?;
Self::ensure_column_exists(&connection, "desk_tasks", "show_in_timeline", "INTEGER NOT NULL DEFAULT 0")?;
Self::ensure_column_exists(&connection, "desk_tasks", "planned_start_at", "TEXT NULL")?;
```

**ensure_column_exists 实现**：
```rust
fn ensure_column_exists(
    connection: &Connection,
    table: &str,
    column: &str,
    column_def: &str,
) -> Result<(), RepositoryError> {
    let query = format!("SELECT {column} FROM {table} LIMIT 0");
    let result = connection.execute(&query, []);
    
    if result.is_err() {
        // 列不存在，添加列
        let alter = format!("ALTER TABLE {table} ADD COLUMN {column} {column_def}");
        connection.execute(&alter, [])?;
    }
    
    Ok(())
}
```

**向后兼容策略**：
- 旧数据库打开时自动添加缺失列
- 新列使用 DEFAULT 值填充现有行
- 不删除旧列（保留向后兼容性）

---

## 五、核心操作实现

### 5.1 create_desk_task

```rust
pub fn create_desk_task(&self, task: &DeskTask) -> Result<(), RepositoryError> {
    let connection = Connection::open(&self.path)?;
    
    connection.execute(
        "INSERT INTO desk_tasks (
            id, title, content, status, due_at, planned_start_at,
            linked_goal_id, linked_goal_label, bear_note_id,
            system_reminder_id, show_in_timeline
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            task.id,
            task.title,
            task.content,
            task.status.to_string(),
            task.due_at.as_ref().map(|dt| dt.to_rfc3339()),
            task.planned_start_at.as_ref().map(|dt| dt.to_rfc3339()),
            task.linked_goal_id,
            task.linked_goal_label,
            task.bear_note_id,
            task.system_reminder_id,
            if task.show_in_timeline { 1 } else { 0 },
        ],
    )?;
    
    // 插入初始活动日志（CREATED）
    let log = TaskActivityLog {
        id: Uuid::new_v4().to_string(),
        action: TaskActivityAction::CREATED,
        note: None,
        timestamp: Local::now().into(),
    };
    
    connection.execute(
        "INSERT INTO desk_task_activity_logs (id, task_id, action, note, timestamp)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            log.id,
            task.id,
            log.action.to_string(),
            log.note,
            log.timestamp.to_rfc3339(),
        ],
    )?;
    
    Ok(())
}
```

**关键点**：
- 时间转换：`DateTime<Local>` → ISO 8601 字符串
- 布尔转换：`bool` → `INTEGER` (0/1)
- 枚举转换：`TaskStatus` → `TEXT` (通过 `to_string()`)
- 自动创建 CREATED 日志

### 5.2 read_desk_task

```rust
pub fn read_desk_task(&self, id: &str) -> Result<DeskTask, RepositoryError> {
    let connection = Connection::open(&self.path)?;
    
    let mut stmt = connection.prepare(
        "SELECT id, title, content, status, due_at, planned_start_at,
                linked_goal_id, linked_goal_label, bear_note_id,
                system_reminder_id, show_in_timeline
         FROM desk_tasks WHERE id = ?1"
    )?;
    
    let task = stmt.query_row(params![id], |row| {
        Ok(DeskTask {
            id: row.get(0)?,
            title: row.get(1)?,
            content: row.get(2)?,
            status: row.get::<_, String>(3)?.parse().unwrap(),
            due_at: row.get::<_, Option<String>>(4)?
                .map(|s| DateTime::parse_from_rfc3339(&s).unwrap().with_timezone(&Local)),
            planned_start_at: row.get::<_, Option<String>>(5)?
                .map(|s| DateTime::parse_from_rfc3339(&s).unwrap().with_timezone(&Local)),
            linked_goal_id: row.get(6)?,
            linked_goal_label: row.get(7)?,
            bear_note_id: row.get(8)?,
            system_reminder_id: row.get(9)?,
            show_in_timeline: row.get::<_, i32>(10)? != 0,
            activity_logs: vec![],  // 稍后加载
        })
    })?;
    
    // 加载活动日志
    let mut logs_stmt = connection.prepare(
        "SELECT id, action, note, timestamp
         FROM desk_task_activity_logs
         WHERE task_id = ?1
         ORDER BY timestamp DESC"
    )?;
    
    let logs = logs_stmt.query_map(params![id], |row| {
        Ok(TaskActivityLog {
            id: row.get(0)?,
            action: row.get::<_, String>(1)?.parse().unwrap(),
            note: row.get(2)?,
            timestamp: DateTime::parse_from_rfc3339(&row.get::<_, String>(3)?)
                .unwrap()
                .with_timezone(&Local),
        })
    })?
    .collect::<Result<Vec<_>, _>>()?;
    
    Ok(DeskTask {
        activity_logs: logs,
        ..task
    })
}
```

**关键点**：
- 字符串 → 枚举：`"TODO".parse::<TaskStatus>()`
- ISO 8601 → DateTime：`DateTime::parse_from_rfc3339()`
- 分两次查询：先查任务，再查活动日志
- 活动日志按时间倒序（最新在前）

### 5.3 update_task_status

```rust
pub fn update_task_status(
    &self,
    id: &str,
    status: TaskStatus,
    note: Option<String>,
) -> Result<DeskTask, RepositoryError> {
    let connection = Connection::open(&self.path)?;
    
    // 读取当前状态
    let task = self.read_desk_task(id)?;
    
    // 校验状态转换合法性
    if !task.can_transition_to(&status) {
        return Err(RepositoryError::Data(format!(
            "Invalid transition from {:?} to {:?}",
            task.status, status
        )));
    }
    
    // 更新状态
    connection.execute(
        "UPDATE desk_tasks SET status = ?1 WHERE id = ?2",
        params![status.to_string(), id],
    )?;
    
    // 插入活动日志
    let action = Self::log_action_for_transition(&task.status, &status);
    let log = TaskActivityLog {
        id: Uuid::new_v4().to_string(),
        action,
        note,
        timestamp: Local::now().into(),
    };
    
    connection.execute(
        "INSERT INTO desk_task_activity_logs (id, task_id, action, note, timestamp)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            log.id,
            id,
            log.action.to_string(),
            log.note,
            log.timestamp.to_rfc3339(),
        ],
    )?;
    
    // 返回更新后的任务
    self.read_desk_task(id)
}

fn log_action_for_transition(from: &TaskStatus, to: &TaskStatus) -> TaskActivityAction {
    match (from, to) {
        (TaskStatus::TODO, TaskStatus::IN_PROGRESS) => TaskActivityAction::STARTED,
        (TaskStatus::PAUSED, TaskStatus::IN_PROGRESS) => TaskActivityAction::RESUMED,
        (TaskStatus::IN_PROGRESS, TaskStatus::PAUSED) => TaskActivityAction::PAUSED,
        (_, TaskStatus::DONE) => TaskActivityAction::COMPLETED,
        _ => TaskActivityAction::NOTE_ADDED,
    }
}
```

**关键点**：
- 先校验状态转换合法性（`task.can_transition_to()`）
- 根据状态转换类型选择活动日志 action
- 返回更新后的完整任务（包括新日志）

### 5.4 load_workspace_snapshot

```rust
pub fn load_workspace_snapshot(&self) -> Result<WorkspaceSnapshot, RepositoryError> {
    Ok(WorkspaceSnapshot {
        areas: self.list_areas()?,
        goals: self.list_goals()?,
        projects: self.list_projects()?,
        todos: self.list_todos()?,
        reminders: self.list_reminders()?,
        desk_tasks: self.list_desk_tasks()?,
    })
}
```

**用途**：
- 应用启动时加载全部数据
- 前端调用 `load_workspace` Tauri command
- 返回 `WorkspaceSnapshot` 包含所有表的全量数据

---

## 六、事务支持

### 6.1 当前实现

**无显式事务**：
- 每个操作独立打开/关闭连接
- SQLite 默认 autocommit 模式
- 单个 SQL 语句是原子的

### 6.2 未来改进

```rust
pub fn update_task_with_transaction(
    &self,
    task: &DeskTask,
) -> Result<(), RepositoryError> {
    let mut connection = Connection::open(&self.path)?;
    let tx = connection.transaction()?;
    
    // 更新任务
    tx.execute(
        "UPDATE desk_tasks SET title = ?1, content = ?2 WHERE id = ?3",
        params![task.title, task.content, task.id],
    )?;
    
    // 插入日志
    tx.execute(
        "INSERT INTO desk_task_activity_logs (...) VALUES (...)",
        params![...],
    )?;
    
    tx.commit()?;
    Ok(())
}
```

**优点**：
- 保证多步操作原子性
- 失败自动回滚

---

## 七、设计决策（ADR）

### ADR-001: SQLite 而非 JSON 文件

**决策**: 使用 SQLite 作为持久化存储

**理由**：
- ✅ 支持 SQL 查询（筛选、排序、关联）
- ✅ 事务支持，保证数据一致性
- ✅ 跨平台，嵌入式，无需额外服务
- ✅ Rust 生态成熟（rusqlite crate）

**代价**：
- ❌ 无法直接手动编辑（JSON 可以）
- 接受：提供 SQL 工具查看/编辑（如 DB Browser）

### ADR-002: 精细粒度操作而非全量读写

**决策**: 提供 `update_task_status()` 等单实体操作

**理由**：
- ✅ 性能优化（不需要全量加载）
- ✅ 减少前后端数据传输
- ✅ 支持并发操作（不同实体互不干扰）

**代价**：
- ❌ Repository API 数量多（20+ 方法）
- 接受：接口清晰，易于维护

### ADR-003: 活动日志单独表

**决策**: `desk_task_activity_logs` 独立表，而非 JSON 列

**理由**：
- ✅ 支持查询（如"最近 7 天的活动"）
- ✅ 支持索引（按 task_id, timestamp）
- ✅ 易于扩展（添加新字段）

**代价**：
- ❌ 多一次 SQL 查询（JOIN 或分两次查）
- 接受：性能影响小（日志数量有限）

### ADR-004: 时间存储为 ISO 8601 字符串

**决策**: `due_at` 等时间字段存储为 TEXT (ISO 8601)

**理由**：
- ✅ SQLite 无原生 DateTime 类型
- ✅ ISO 8601 字符串可排序（字典序 = 时间序）
- ✅ 可读性好（人类可直接阅读）

**代价**：
- ❌ 字符串解析开销
- 接受：解析耗时 < 1μs，可忽略

### ADR-005: 冗余 linked_goal_label

**决策**: `desk_tasks` 表冗余存储 `linked_goal_label`

**理由**：
- ✅ 避免 JOIN goals 表（性能优化）
- ✅ 目标删除后任务仍可显示目标名称
- ✅ 前端展示直接使用，无需二次查询

**代价**：
- ❌ 数据冗余，目标重命名时需同步更新
- 接受：重命名不频繁，同步更新逻辑简单

---

## 八、测试策略

### 8.1 集成测试

```rust
// src-tauri/tests/repository_tests.rs
#[test]
fn test_create_and_read_task() {
    let temp_dir = tempfile::tempdir().unwrap();
    let db_path = temp_dir.path().join("test.db");
    let repo = SqliteRepository::new(db_path);
    repo.initialize().unwrap();
    
    let task = DeskTask {
        id: "task-1".to_string(),
        title: "Test task".to_string(),
        status: TaskStatus::TODO,
        // ...
    };
    
    repo.create_desk_task(&task).unwrap();
    let loaded = repo.read_desk_task("task-1").unwrap();
    
    assert_eq!(loaded.title, "Test task");
    assert_eq!(loaded.status, TaskStatus::TODO);
}

#[test]
fn test_update_task_status_with_activity_log() {
    let repo = setup_test_repo();
    
    let task = create_test_task(&repo, TaskStatus::TODO);
    
    repo.update_task_status(&task.id, TaskStatus::IN_PROGRESS, Some("开始工作".to_string())).unwrap();
    
    let updated = repo.read_desk_task(&task.id).unwrap();
    
    assert_eq!(updated.status, TaskStatus::IN_PROGRESS);
    assert_eq!(updated.activity_logs.len(), 2);  // CREATED + STARTED
    assert_eq!(updated.activity_logs[0].action, TaskActivityAction::STARTED);
    assert_eq!(updated.activity_logs[0].note, Some("开始工作".to_string()));
}

#[test]
fn test_invalid_status_transition() {
    let repo = setup_test_repo();
    
    let task = create_test_task(&repo, TaskStatus::TODO);
    
    let result = repo.update_task_status(&task.id, TaskStatus::PAUSED, None);
    
    assert!(result.is_err());
}
```

### 8.2 Schema 演进测试

```rust
#[test]
fn test_schema_migration() {
    let temp_dir = tempfile::tempdir().unwrap();
    let db_path = temp_dir.path().join("old.db");
    
    // 创建旧 schema（无 planned_start_at 列）
    let connection = Connection::open(&db_path).unwrap();
    connection.execute_batch(
        "CREATE TABLE desk_tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            status TEXT NOT NULL
        )"
    ).unwrap();
    drop(connection);
    
    // 初始化 Repository（自动添加缺失列）
    let repo = SqliteRepository::new(db_path);
    repo.initialize().unwrap();
    
    // 验证列存在
    let connection = Connection::open(repo.path()).unwrap();
    let result = connection.execute("SELECT planned_start_at FROM desk_tasks LIMIT 0", []);
    assert!(result.is_ok());
}
```

---

## 九、性能优化

### 9.1 索引策略

```sql
-- 建议添加索引
CREATE INDEX IF NOT EXISTS idx_desk_tasks_status ON desk_tasks(status);
CREATE INDEX IF NOT EXISTS idx_desk_tasks_linked_goal_id ON desk_tasks(linked_goal_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_task_id ON desk_task_activity_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_goals_area_id ON goals(area_id);
```

**优化查询**：
- 按状态筛选任务（Inbox 分组）
- 按目标查找关联任务
- 加载任务活动日志

### 9.2 连接池（未实现）

**当前问题**：
- 每次操作打开/关闭连接（开销 ~1ms）
- 高频操作（如批量更新）性能瓶颈

**改进方案**：
```rust
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;

pub struct SqliteRepository {
    pool: Pool<SqliteConnectionManager>,
}

impl SqliteRepository {
    pub fn new(path: PathBuf) -> Self {
        let manager = SqliteConnectionManager::file(path);
        let pool = Pool::new(manager).unwrap();
        Self { pool }
    }
    
    pub fn create_desk_task(&self, task: &DeskTask) -> Result<(), RepositoryError> {
        let connection = self.pool.get()?;
        // 使用连接池中的连接
    }
}
```

---

## 十、相关资源

### 文档
- [架构重构总结](../architecture-refactor-summary.md) - 第 3 节
- [Task 状态机 Spec](./task-state-machine.md)
- [Goal 状态机 Spec](./goal-state-machine.md)

### 代码
- [`src-tauri/src/repository.rs`](../../src-tauri/src/repository.rs)
- [`src-tauri/src/domain.rs`](../../src-tauri/src/domain.rs)
- [`src-tauri/tests/repository_tests.rs`](../../src-tauri/tests/repository_tests.rs)

### 依赖库
- [rusqlite](https://github.com/rusqlite/rusqlite) - SQLite 绑定
- [uuid](https://github.com/uuid-rs/uuid) - UUID 生成
- [chrono](https://github.com/chronotope/chrono) - 时间处理

---

**文档维护者**: Goal Desk 开发团队  
**最后更新**: 2026-06-14
