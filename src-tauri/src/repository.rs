use crate::domain::{
    Area, DeskTask, Goal, GoalStatus, Project, Reminder, TaskActivityAction, TaskActivityLog,
    TaskStatus, WorkspaceSnapshot, UNCATEGORIZED_AREA_ID,
};
use chrono::{DateTime, Local};
use rusqlite::{params, Connection};
use std::collections::HashMap;
use std::fmt;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, MutexGuard};
use uuid::Uuid;

#[derive(Debug)]
pub enum RepositoryError {
    Sqlite(rusqlite::Error),
    Io(std::io::Error),
    Uuid(uuid::Error),
    Chrono(chrono::ParseError),
    Data(String),
}

impl fmt::Display for RepositoryError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Sqlite(error) => write!(formatter, "sqlite error: {error}"),
            Self::Io(error) => write!(formatter, "i/o error: {error}"),
            Self::Uuid(error) => write!(formatter, "uuid parse error: {error}"),
            Self::Chrono(error) => write!(formatter, "datetime parse error: {error}"),
            Self::Data(error) => write!(formatter, "data error: {error}"),
        }
    }
}

impl std::error::Error for RepositoryError {}

impl From<rusqlite::Error> for RepositoryError {
    fn from(value: rusqlite::Error) -> Self {
        Self::Sqlite(value)
    }
}

impl From<std::io::Error> for RepositoryError {
    fn from(value: std::io::Error) -> Self {
        Self::Io(value)
    }
}

impl From<uuid::Error> for RepositoryError {
    fn from(value: uuid::Error) -> Self {
        Self::Uuid(value)
    }
}

impl From<RepositoryError> for rusqlite::Error {
    fn from(value: RepositoryError) -> Self {
        rusqlite::Error::InvalidParameterName(value.to_string())
    }
}

impl From<chrono::ParseError> for RepositoryError {
    fn from(value: chrono::ParseError) -> Self {
        Self::Chrono(value)
    }
}

#[derive(Debug, Clone)]
pub struct SqliteRepository {
    path: PathBuf,
    conn: Arc<Mutex<Option<Connection>>>,
}

impl SqliteRepository {
    pub fn new(path: PathBuf) -> Self {
        let repo = Self {
            path,
            conn: Arc::new(Mutex::new(None)),
        };
        let _ = repo.initialize();
        repo
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    fn conn(&self) -> Result<MutexGuard<'_, Option<Connection>>, RepositoryError> {
        self.conn
            .lock()
            .map_err(|e| RepositoryError::Data(e.to_string()))
    }

    fn get_connection(
        &self,
    ) -> Result<std::sync::MutexGuard<'_, Option<Connection>>, RepositoryError> {
        let mut guard = self.conn()?;
        if guard.is_none() {
            let connection = Connection::open(&self.path)?;
            *guard = Some(connection);
        }
        Ok(guard)
    }

    /// Returns a reference to the cached connection, opening it if needed.
    /// Prefer this over Connection::open() in new code.
    pub fn cached_connection(
        &self,
    ) -> Result<std::sync::MutexGuard<'_, Option<Connection>>, RepositoryError> {
        self.get_connection()
    }

    pub fn initialize(&self) -> Result<(), RepositoryError> {
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let connection = self.get_connection()?;
        let conn = connection.as_ref().unwrap();
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS areas (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS goals (
                id TEXT PRIMARY KEY,
                area_id TEXT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'ACTIVE'
            );
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                area_id TEXT NULL,
                goal_id TEXT NULL,
                title TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS todos (
                id TEXT PRIMARY KEY,
                goal_id TEXT NULL,
                project_id TEXT NULL,
                title TEXT NOT NULL,
                scheduled_at TEXT NULL,
                completed INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS reminders (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                due_at TEXT NOT NULL,
                done INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS desk_tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                status TEXT NOT NULL,
                due_at TEXT NULL,
                linked_goal_id TEXT NULL,
                linked_goal_label TEXT NULL,
                bear_note_id TEXT NULL,
                system_reminder_id TEXT NULL
            );
            CREATE TABLE IF NOT EXISTS desk_task_activity_logs (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                action TEXT NOT NULL,
                note TEXT NULL,
                timestamp TEXT NOT NULL
            );
            ",
        )?;

        Self::ensure_column_exists(conn, "goals", "description", "TEXT NOT NULL DEFAULT ''")?;
        Self::ensure_column_exists(conn, "goals", "status", "TEXT NOT NULL DEFAULT 'ACTIVE'")?;
        Self::ensure_column_exists(conn, "desk_tasks", "bear_note_id", "TEXT NULL")?;
        Self::ensure_column_exists(conn, "desk_tasks", "system_reminder_id", "TEXT NULL")?;
        Self::ensure_column_exists(
            conn,
            "desk_tasks",
            "show_in_timeline",
            "INTEGER NOT NULL DEFAULT 0",
        )?;
        Self::ensure_column_exists(conn, "desk_tasks", "planned_start_at", "TEXT NULL")?;
        Self::ensure_column_exists(conn, "desk_tasks", "deleted_at", "TEXT NULL")?;
        Self::ensure_column_exists(conn, "goals", "deleted_at", "TEXT NULL")?;

        // 确保"未分类"系统 area 存在
        conn.execute(
            "INSERT OR IGNORE INTO areas (id, title) VALUES (?1, ?2)",
            params![UNCATEGORIZED_AREA_ID, "未分类"],
        )?;

        // 清理孤儿 goals：将 area_id IS NULL 或指向不存在的 area 的 goals 移动到"未分类"
        conn.execute(
            "UPDATE goals SET area_id = ?1 WHERE area_id IS NULL OR area_id NOT IN (SELECT id FROM areas)",
            params![UNCATEGORIZED_AREA_ID],
        )?;

        Ok(())
    }

    pub fn save_workspace(&self, snapshot: &WorkspaceSnapshot) -> Result<(), RepositoryError> {
        self.initialize()?;
        let mut guard = self.get_connection()?;
        let connection = guard.as_mut().unwrap();
        let transaction = connection.transaction()?;

        transaction.execute_batch(
            "
            DELETE FROM areas;
            DELETE FROM goals;
            DELETE FROM projects;
            DELETE FROM todos;
            DELETE FROM reminders;
            ",
        )?;

        for area in &snapshot.areas {
            transaction.execute(
                "INSERT INTO areas (id, title) VALUES (?1, ?2)",
                params![area.id.to_string(), area.title],
            )?;
        }

        for goal in &snapshot.goals {
            transaction.execute(
                "INSERT INTO goals (id, area_id, title, description, status, deleted_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    goal.id.to_string(),
                    option_uuid(goal.area_id),
                    goal.title,
                    goal.description,
                    goal_status_as_str(goal.status),
                    option_datetime(goal.deleted_at),
                ],
            )?;
        }

        for project in &snapshot.projects {
            transaction.execute(
                "INSERT INTO projects (id, area_id, goal_id, title) VALUES (?1, ?2, ?3, ?4)",
                params![
                    project.id.to_string(),
                    option_uuid(project.area_id),
                    option_uuid(project.goal_id),
                    project.title
                ],
            )?;
        }

        for reminder in &snapshot.reminders {
            transaction.execute(
                "INSERT INTO reminders (id, title, due_at, done) VALUES (?1, ?2, ?3, ?4)",
                params![
                    reminder.id.to_string(),
                    reminder.title,
                    reminder.due_at.to_rfc3339(),
                    reminder.done as i64
                ],
            )?;
        }

        transaction.commit()?;
        Ok(())
    }

    pub fn load_workspace(&self) -> Result<WorkspaceSnapshot, RepositoryError> {
        self.initialize()?;
        let guard = self.get_connection()?;
        let connection = guard.as_ref().unwrap();

        let areas = {
            let mut statement = connection.prepare("SELECT id, title FROM areas ORDER BY title")?;
            let mut rows = statement.query([])?;
            let mut items = Vec::new();
            while let Some(row) = rows.next()? {
                let title: String = row.get(1)?;
                items.push(Area {
                    id: parse_uuid(row.get::<_, String>(0)?)?,
                    title: title.clone(),
                    is_system: title == "未分类",
                });
            }
            items
        };

        let goals = {
            let mut statement =
                connection.prepare("SELECT id, area_id, title, description, status, deleted_at FROM goals WHERE deleted_at IS NULL ORDER BY title")?;
            let mut rows = statement.query([])?;
            let mut items = Vec::new();
            while let Some(row) = rows.next()? {
                items.push(Goal {
                    id: parse_uuid(row.get::<_, String>(0)?)?,
                    area_id: parse_optional_uuid(row.get::<_, Option<String>>(1)?)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    status: parse_goal_status(row.get::<_, String>(4)?)?,
                    deleted_at: parse_optional_datetime(row.get::<_, Option<String>>(5)?)?,
                });
            }
            items
        };

        let projects = {
            let mut statement = connection
                .prepare("SELECT id, area_id, goal_id, title FROM projects ORDER BY title")?;
            let mut rows = statement.query([])?;
            let mut items = Vec::new();
            while let Some(row) = rows.next()? {
                items.push(Project {
                    id: parse_uuid(row.get::<_, String>(0)?)?,
                    area_id: parse_optional_uuid(row.get::<_, Option<String>>(1)?)?,
                    goal_id: parse_optional_uuid(row.get::<_, Option<String>>(2)?)?,
                    title: row.get(3)?,
                });
            }
            items
        };

        let reminders = {
            let mut statement = connection
                .prepare("SELECT id, title, due_at, done FROM reminders ORDER BY due_at")?;
            let mut rows = statement.query([])?;
            let mut items = Vec::new();
            while let Some(row) = rows.next()? {
                items.push(Reminder {
                    id: parse_uuid(row.get::<_, String>(0)?)?,
                    title: row.get(1)?,
                    due_at: parse_datetime(row.get::<_, String>(2)?)?,
                    done: row.get::<_, i64>(3)? != 0,
                });
            }
            items
        };

        Ok(WorkspaceSnapshot {
            areas,
            projects,
            goals,
            reminders,
        })
    }

    pub fn save_desk_tasks(&self, tasks: &[DeskTask]) -> Result<(), RepositoryError> {
        self.initialize()?;
        let mut guard = self.get_connection()?;
        let connection = guard.as_mut().unwrap();
        let transaction = connection.transaction()?;

        transaction.execute_batch(
            "
            DELETE FROM desk_task_activity_logs;
            DELETE FROM desk_tasks;
            ",
        )?;

        for task in tasks {
            transaction.execute(
                "INSERT INTO desk_tasks (id, title, content, status, planned_start_at, due_at, linked_goal_id, linked_goal_label, bear_note_id, system_reminder_id, show_in_timeline) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                params![
                    task.id.to_string(),
                    task.title.as_str(),
                    task.content.as_str(),
                    task_status_as_str(task.status),
                    option_datetime(task.planned_start_at.clone()),
                    option_datetime(task.due_at.clone()),
                    option_uuid(task.linked_goal_id.clone()),
                    task.linked_goal_label.as_deref(),
                    task.bear_note_id.as_deref(),
                    task.system_reminder_id.as_deref(),
                    task.show_in_timeline as i64
                ],
            )?;

            for log in &task.activity_logs {
                transaction.execute(
                    "INSERT INTO desk_task_activity_logs (id, task_id, action, note, timestamp) VALUES (?1, ?2, ?3, ?4, ?5)",
                    params![
                        log.id.to_string(),
                        task.id.to_string(),
                        task_activity_action_as_str(log.action),
                        log.note.as_deref(),
                        log.timestamp.to_rfc3339()
                    ],
                )?;
            }
        }

        transaction.commit()?;
        Ok(())
    }

    pub fn load_desk_tasks(&self) -> Result<Vec<DeskTask>, RepositoryError> {
        self.initialize()?;
        let guard = self.get_connection()?;
        let connection = guard.as_ref().unwrap();
        load_tasks_with_filter(connection, "", &[])
    }

    fn ensure_column_exists(
        connection: &Connection,
        table_name: &str,
        column_name: &str,
        column_definition: &str,
    ) -> Result<(), RepositoryError> {
        let pragma = format!("PRAGMA table_info({table_name})");
        let mut statement = connection.prepare(&pragma)?;
        let mut rows = statement.query([])?;
        while let Some(row) = rows.next()? {
            if row.get::<_, String>(1)? == column_name {
                return Ok(());
            }
        }

        let alter =
            format!("ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}");
        connection.execute(&alter, [])?;
        Ok(())
    }
}

fn option_uuid(value: Option<Uuid>) -> Option<String> {
    value.map(|id| id.to_string())
}

fn option_datetime(value: Option<DateTime<Local>>) -> Option<String> {
    value.map(|date| date.to_rfc3339())
}

fn task_status_as_str(value: TaskStatus) -> &'static str {
    match value {
        TaskStatus::Todo => "TODO",
        TaskStatus::InProgress => "IN_PROGRESS",
        TaskStatus::Paused => "PAUSED",
        TaskStatus::Done => "DONE",
    }
}

fn task_activity_action_as_str(value: TaskActivityAction) -> &'static str {
    match value {
        TaskActivityAction::Created => "CREATED",
        TaskActivityAction::Started => "STARTED",
        TaskActivityAction::Paused => "PAUSED",
        TaskActivityAction::Resumed => "RESUMED",
        TaskActivityAction::Completed => "COMPLETED",
        TaskActivityAction::NoteAdded => "NOTE_ADDED",
    }
}

fn goal_status_as_str(value: GoalStatus) -> &'static str {
    match value {
        GoalStatus::Active => "ACTIVE",
        GoalStatus::Paused => "PAUSED",
        GoalStatus::ReadyToComplete => "READY_TO_COMPLETE",
        GoalStatus::Completed => "COMPLETED",
        GoalStatus::Archived => "ARCHIVED",
    }
}

fn parse_uuid(value: String) -> Result<Uuid, RepositoryError> {
    Ok(Uuid::parse_str(&value)?)
}

fn parse_optional_uuid(value: Option<String>) -> Result<Option<Uuid>, RepositoryError> {
    match value {
        Some(inner) => Ok(Some(Uuid::parse_str(&inner)?)),
        None => Ok(None),
    }
}

fn parse_task_status(value: String) -> Result<TaskStatus, RepositoryError> {
    match value.as_str() {
        "TODO" => Ok(TaskStatus::Todo),
        "IN_PROGRESS" => Ok(TaskStatus::InProgress),
        "PAUSED" => Ok(TaskStatus::Paused),
        "DONE" => Ok(TaskStatus::Done),
        _ => Err(RepositoryError::Data(format!(
            "unsupported task status: {value}"
        ))),
    }
}

fn parse_task_activity_action(value: String) -> Result<TaskActivityAction, RepositoryError> {
    match value.as_str() {
        "CREATED" => Ok(TaskActivityAction::Created),
        "STARTED" => Ok(TaskActivityAction::Started),
        "PAUSED" => Ok(TaskActivityAction::Paused),
        "RESUMED" => Ok(TaskActivityAction::Resumed),
        "COMPLETED" => Ok(TaskActivityAction::Completed),
        "NOTE_ADDED" => Ok(TaskActivityAction::NoteAdded),
        _ => Err(RepositoryError::Data(format!(
            "unsupported task activity action: {value}"
        ))),
    }
}

fn parse_goal_status(value: String) -> Result<GoalStatus, RepositoryError> {
    match value.as_str() {
        "ACTIVE" => Ok(GoalStatus::Active),
        "PAUSED" => Ok(GoalStatus::Paused),
        "READY_TO_COMPLETE" => Ok(GoalStatus::ReadyToComplete),
        "COMPLETED" => Ok(GoalStatus::Completed),
        "ARCHIVED" => Ok(GoalStatus::Archived),
        _ => Err(RepositoryError::Data(format!(
            "unsupported goal status: {value}"
        ))),
    }
}

fn parse_datetime(value: String) -> Result<DateTime<Local>, RepositoryError> {
    Ok(DateTime::parse_from_rfc3339(&value)?.with_timezone(&Local))
}

fn parse_optional_datetime(
    value: Option<String>,
) -> Result<Option<DateTime<Local>>, RepositoryError> {
    match value {
        Some(inner) => Ok(Some(parse_datetime(inner)?)),
        None => Ok(None),
    }
}

// ============================================================================
// Repository Traits - 分层抽象
// ============================================================================

/// GoalRepository - 单个 Goal 的增删改查
pub trait GoalRepository {
    fn find(&self, id: Uuid) -> Result<Option<Goal>, RepositoryError>;
    fn find_any(&self, id: Uuid) -> Result<Option<Goal>, RepositoryError>;
    fn list(&self) -> Result<Vec<Goal>, RepositoryError>;
    fn list_by_area(&self, area_id: Uuid) -> Result<Vec<Goal>, RepositoryError>;
    fn create(&self, goal: &Goal) -> Result<(), RepositoryError>;
    fn update(&self, goal: &Goal) -> Result<(), RepositoryError>;
    fn update_status(&self, id: Uuid, status: GoalStatus) -> Result<(), RepositoryError>;
    fn delete(&self, id: Uuid) -> Result<(), RepositoryError>;
    fn soft_delete(&self, id: Uuid) -> Result<(), RepositoryError>;
    fn restore(&self, id: Uuid) -> Result<(), RepositoryError>;
    fn list_deleted(&self) -> Result<Vec<Goal>, RepositoryError>;
}

impl GoalRepository for SqliteRepository {
    fn find(&self, id: Uuid) -> Result<Option<Goal>, RepositoryError> {
        let guard = self.cached_connection()?;
        let connection = guard.as_ref().unwrap();
        let result = connection.query_row(
            "SELECT id, area_id, title, description, status, deleted_at FROM goals WHERE id = ?1 AND deleted_at IS NULL",
            params![id.to_string()],
            |row| {
                Ok(Goal {
                    id: parse_uuid(row.get::<_, String>(0)?)?,
                    area_id: parse_optional_uuid(row.get::<_, Option<String>>(1)?)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    status: parse_goal_status(row.get::<_, String>(4)?)?,
                    deleted_at: parse_optional_datetime(row.get::<_, Option<String>>(5)?)?,
                })
            },
        );

        match result {
            Ok(goal) => Ok(Some(goal)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    fn find_any(&self, id: Uuid) -> Result<Option<Goal>, RepositoryError> {
        let guard = self.cached_connection()?;
        let connection = guard.as_ref().unwrap();
        let result = connection.query_row(
            "SELECT id, area_id, title, description, status, deleted_at FROM goals WHERE id = ?1",
            params![id.to_string()],
            |row| {
                Ok(Goal {
                    id: parse_uuid(row.get::<_, String>(0)?)?,
                    area_id: parse_optional_uuid(row.get::<_, Option<String>>(1)?)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    status: parse_goal_status(row.get::<_, String>(4)?)?,
                    deleted_at: parse_optional_datetime(row.get::<_, Option<String>>(5)?)?,
                })
            },
        );

        match result {
            Ok(goal) => Ok(Some(goal)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    fn list(&self) -> Result<Vec<Goal>, RepositoryError> {
        let guard = self.cached_connection()?;
        let connection = guard.as_ref().unwrap();
        let mut statement = connection.prepare(
            "SELECT id, area_id, title, description, status, deleted_at FROM goals WHERE deleted_at IS NULL ORDER BY title"
        )?;
        let mut rows = statement.query([])?;
        let mut goals = Vec::new();

        while let Some(row) = rows.next()? {
            goals.push(Goal {
                id: parse_uuid(row.get::<_, String>(0)?)?,
                area_id: parse_optional_uuid(row.get::<_, Option<String>>(1)?)?,
                title: row.get(2)?,
                description: row.get(3)?,
                status: parse_goal_status(row.get::<_, String>(4)?)?,
                deleted_at: parse_optional_datetime(row.get::<_, Option<String>>(5)?)?,
            });
        }

        Ok(goals)
    }

    fn list_by_area(&self, area_id: Uuid) -> Result<Vec<Goal>, RepositoryError> {
        let guard = self.cached_connection()?;
        let connection = guard.as_ref().unwrap();
        let mut statement = connection.prepare(
            "SELECT id, area_id, title, description, status, deleted_at FROM goals WHERE area_id = ?1 AND deleted_at IS NULL ORDER BY title"
        )?;
        let mut rows = statement.query(params![area_id.to_string()])?;
        let mut goals = Vec::new();

        while let Some(row) = rows.next()? {
            goals.push(Goal {
                id: parse_uuid(row.get::<_, String>(0)?)?,
                area_id: parse_optional_uuid(row.get::<_, Option<String>>(1)?)?,
                title: row.get(2)?,
                description: row.get(3)?,
                status: parse_goal_status(row.get::<_, String>(4)?)?,
                deleted_at: parse_optional_datetime(row.get::<_, Option<String>>(5)?)?,
            });
        }

        Ok(goals)
    }

    fn create(&self, goal: &Goal) -> Result<(), RepositoryError> {
        let guard = self.cached_connection()?;
        let connection = guard.as_ref().unwrap();
        connection.execute(
            "INSERT INTO goals (id, area_id, title, description, status, deleted_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                goal.id.to_string(),
                option_uuid(goal.area_id),
                &goal.title,
                &goal.description,
                goal_status_as_str(goal.status),
                option_datetime(goal.deleted_at),
            ],
        )?;
        Ok(())
    }

    fn update(&self, goal: &Goal) -> Result<(), RepositoryError> {
        let guard = self.cached_connection()?;
        let connection = guard.as_ref().unwrap();
        connection.execute(
            "UPDATE goals SET area_id = ?1, title = ?2, description = ?3, status = ?4, deleted_at = ?6 WHERE id = ?5",
            params![
                option_uuid(goal.area_id),
                &goal.title,
                &goal.description,
                goal_status_as_str(goal.status),
                goal.id.to_string(),
                option_datetime(goal.deleted_at),
            ],
        )?;
        Ok(())
    }

    fn update_status(&self, id: Uuid, status: GoalStatus) -> Result<(), RepositoryError> {
        let guard = self.cached_connection()?;
        let connection = guard.as_ref().unwrap();
        connection.execute(
            "UPDATE goals SET status = ?1 WHERE id = ?2",
            params![goal_status_as_str(status), id.to_string()],
        )?;
        Ok(())
    }

    fn delete(&self, id: Uuid) -> Result<(), RepositoryError> {
        let guard = self.cached_connection()?;
        let connection = guard.as_ref().unwrap();
        connection.execute("DELETE FROM goals WHERE id = ?1", params![id.to_string()])?;
        Ok(())
    }

    fn soft_delete(&self, id: Uuid) -> Result<(), RepositoryError> {
        let guard = self.cached_connection()?;
        let connection = guard.as_ref().unwrap();
        let now = chrono::Local::now().to_rfc3339();
        connection.execute(
            "UPDATE goals SET deleted_at = ?1 WHERE id = ?2",
            params![now, id.to_string()],
        )?;
        Ok(())
    }

    fn restore(&self, id: Uuid) -> Result<(), RepositoryError> {
        let guard = self.cached_connection()?;
        let connection = guard.as_ref().unwrap();
        connection.execute(
            "UPDATE goals SET deleted_at = NULL WHERE id = ?1",
            params![id.to_string()],
        )?;
        Ok(())
    }

    fn list_deleted(&self) -> Result<Vec<Goal>, RepositoryError> {
        let guard = self.cached_connection()?;
        let connection = guard.as_ref().unwrap();
        let mut statement = connection.prepare(
            "SELECT id, area_id, title, description, status, deleted_at FROM goals WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC"
        )?;
        let mut rows = statement.query([])?;
        let mut goals = Vec::new();

        while let Some(row) = rows.next()? {
            goals.push(Goal {
                id: parse_uuid(row.get::<_, String>(0)?)?,
                area_id: parse_optional_uuid(row.get::<_, Option<String>>(1)?)?,
                title: row.get(2)?,
                description: row.get(3)?,
                status: parse_goal_status(row.get::<_, String>(4)?)?,
                deleted_at: parse_optional_datetime(row.get::<_, Option<String>>(5)?)?,
            });
        }

        Ok(goals)
    }
}

/// TaskRepository - 单个 Task 的增删改查
pub trait TaskRepository {
    fn find(&self, id: Uuid) -> Result<Option<DeskTask>, RepositoryError>;
    fn list(&self) -> Result<Vec<DeskTask>, RepositoryError>;
    fn list_by_goal(&self, goal_id: Uuid) -> Result<Vec<DeskTask>, RepositoryError>;
    fn list_by_status(&self, status: TaskStatus) -> Result<Vec<DeskTask>, RepositoryError>;
    fn create(&self, task: &DeskTask) -> Result<(), RepositoryError>;
    fn update(&self, task: &DeskTask) -> Result<(), RepositoryError>;
    fn update_status(&self, id: Uuid, status: TaskStatus) -> Result<(), RepositoryError>;
    fn delete(&self, id: Uuid) -> Result<(), RepositoryError>;
    fn soft_delete(&self, id: Uuid) -> Result<(), RepositoryError>;
    fn restore(&self, id: Uuid) -> Result<(), RepositoryError>;
    fn list_deleted(&self) -> Result<Vec<DeskTask>, RepositoryError>;
}

struct TaskAggregateWriter<'transaction, 'connection> {
    transaction: &'transaction rusqlite::Transaction<'connection>,
}

impl<'transaction, 'connection> TaskAggregateWriter<'transaction, 'connection> {
    fn new(transaction: &'transaction rusqlite::Transaction<'connection>) -> Self {
        Self { transaction }
    }

    fn insert(&self, task: &DeskTask) -> Result<(), RepositoryError> {
        self.insert_task_row(task)?;
        self.insert_activity_logs(task)?;
        Ok(())
    }

    fn replace(&self, task: &DeskTask) -> Result<(), RepositoryError> {
        let updated_rows = self.update_task_row(task)?;
        if updated_rows == 0 {
            return Err(RepositoryError::Data(format!(
                "task not found: {}",
                task.id
            )));
        }

        self.delete_activity_logs(task.id)?;
        self.insert_activity_logs(task)?;
        Ok(())
    }

    fn insert_task_row(&self, task: &DeskTask) -> Result<(), RepositoryError> {
        self.transaction.execute(
            "INSERT INTO desk_tasks (id, title, content, status, planned_start_at, due_at, linked_goal_id, linked_goal_label, bear_note_id, system_reminder_id, show_in_timeline, deleted_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                task.id.to_string(),
                &task.title,
                &task.content,
                task_status_as_str(task.status),
                option_datetime(task.planned_start_at),
                option_datetime(task.due_at),
                option_uuid(task.linked_goal_id),
                task.linked_goal_label.as_deref(),
                task.bear_note_id.as_deref(),
                task.system_reminder_id.as_deref(),
                task.show_in_timeline as i64,
                option_datetime(task.deleted_at),
            ],
        )?;
        Ok(())
    }

    fn update_task_row(&self, task: &DeskTask) -> Result<usize, RepositoryError> {
        let updated_rows = self.transaction.execute(
            "UPDATE desk_tasks SET title = ?1, content = ?2, status = ?3, planned_start_at = ?4, due_at = ?5, linked_goal_id = ?6, linked_goal_label = ?7, bear_note_id = ?8, system_reminder_id = ?9, show_in_timeline = ?10, deleted_at = ?12 WHERE id = ?11",
            params![
                &task.title,
                &task.content,
                task_status_as_str(task.status),
                option_datetime(task.planned_start_at),
                option_datetime(task.due_at),
                option_uuid(task.linked_goal_id),
                task.linked_goal_label.as_deref(),
                task.bear_note_id.as_deref(),
                task.system_reminder_id.as_deref(),
                task.show_in_timeline as i64,
                task.id.to_string(),
                option_datetime(task.deleted_at),
            ],
        )?;
        Ok(updated_rows)
    }

    fn delete_activity_logs(&self, task_id: Uuid) -> Result<(), RepositoryError> {
        self.transaction.execute(
            "DELETE FROM desk_task_activity_logs WHERE task_id = ?1",
            params![task_id.to_string()],
        )?;
        Ok(())
    }

    fn insert_activity_logs(&self, task: &DeskTask) -> Result<(), RepositoryError> {
        for log in &task.activity_logs {
            self.transaction.execute(
                "INSERT INTO desk_task_activity_logs (id, task_id, action, note, timestamp) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    log.id.to_string(),
                    task.id.to_string(),
                    task_activity_action_as_str(log.action),
                    log.note.as_deref(),
                    log.timestamp.to_rfc3339()
                ],
            )?;
        }
        Ok(())
    }
}

impl TaskRepository for SqliteRepository {
    fn find(&self, id: Uuid) -> Result<Option<DeskTask>, RepositoryError> {
        let guard = self.cached_connection()?;
        let connection = guard.as_ref().unwrap();
        let mut tasks = load_tasks_with_filter(
            &connection,
            "WHERE id = ?1",
            &[&id.to_string() as &dyn rusqlite::types::ToSql],
        )?;
        Ok(tasks.pop())
    }

    fn list(&self) -> Result<Vec<DeskTask>, RepositoryError> {
        self.load_desk_tasks()
    }

    fn list_by_goal(&self, goal_id: Uuid) -> Result<Vec<DeskTask>, RepositoryError> {
        let guard = self.cached_connection()?;
        let connection = guard.as_ref().unwrap();
        load_tasks_with_filter(
            &connection,
            "WHERE linked_goal_id = ?1",
            &[&goal_id.to_string() as &dyn rusqlite::types::ToSql],
        )
    }

    fn list_by_status(&self, status: TaskStatus) -> Result<Vec<DeskTask>, RepositoryError> {
        let guard = self.cached_connection()?;
        let connection = guard.as_ref().unwrap();
        load_tasks_with_filter(
            &connection,
            "WHERE status = ?1",
            &[&task_status_as_str(status) as &dyn rusqlite::types::ToSql],
        )
    }

    fn create(&self, task: &DeskTask) -> Result<(), RepositoryError> {
        let mut guard = self.cached_connection()?;
        let connection = guard.as_mut().unwrap();
        let transaction = connection.transaction()?;
        TaskAggregateWriter::new(&transaction).insert(task)?;
        transaction.commit()?;
        Ok(())
    }

    fn update(&self, task: &DeskTask) -> Result<(), RepositoryError> {
        let mut guard = self.cached_connection()?;
        let connection = guard.as_mut().unwrap();
        let transaction = connection.transaction()?;
        TaskAggregateWriter::new(&transaction).replace(task)?;
        transaction.commit()?;
        Ok(())
    }

    fn update_status(&self, id: Uuid, status: TaskStatus) -> Result<(), RepositoryError> {
        let guard = self.cached_connection()?;
        let connection = guard.as_ref().unwrap();
        connection.execute(
            "UPDATE desk_tasks SET status = ?1 WHERE id = ?2",
            params![task_status_as_str(status), id.to_string()],
        )?;
        Ok(())
    }

    fn delete(&self, id: Uuid) -> Result<(), RepositoryError> {
        let mut guard = self.cached_connection()?;
        let connection = guard.as_mut().unwrap();
        let transaction = connection.transaction()?;

        transaction.execute(
            "DELETE FROM desk_task_activity_logs WHERE task_id = ?1",
            params![id.to_string()],
        )?;

        transaction.execute(
            "DELETE FROM desk_tasks WHERE id = ?1",
            params![id.to_string()],
        )?;

        transaction.commit()?;
        Ok(())
    }

    fn soft_delete(&self, id: Uuid) -> Result<(), RepositoryError> {
        let guard = self.cached_connection()?;
        let connection = guard.as_ref().unwrap();
        let now = chrono::Local::now().to_rfc3339();
        connection.execute(
            "UPDATE desk_tasks SET deleted_at = ?1 WHERE id = ?2",
            params![now, id.to_string()],
        )?;
        Ok(())
    }

    fn restore(&self, id: Uuid) -> Result<(), RepositoryError> {
        let guard = self.cached_connection()?;
        let connection = guard.as_ref().unwrap();
        connection.execute(
            "UPDATE desk_tasks SET deleted_at = NULL WHERE id = ?1",
            params![id.to_string()],
        )?;
        Ok(())
    }

    fn list_deleted(&self) -> Result<Vec<DeskTask>, RepositoryError> {
        let guard = self.cached_connection()?;
        let connection = guard.as_ref().unwrap();
        load_tasks_with_filter(
            &connection,
            "WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC",
            &[],
        )
    }
}

/// AreaRepository - 单个 Area 的增删改查
pub trait AreaRepository {
    fn find(&self, id: Uuid) -> Result<Option<Area>, RepositoryError>;
    fn list(&self) -> Result<Vec<Area>, RepositoryError>;
    fn create(&self, area: &Area) -> Result<(), RepositoryError>;
    fn update(&self, area: &Area) -> Result<(), RepositoryError>;
    fn delete(&self, id: Uuid) -> Result<(), RepositoryError>;
}

impl AreaRepository for SqliteRepository {
    fn find(&self, id: Uuid) -> Result<Option<Area>, RepositoryError> {
        let guard = self.cached_connection()?;
        let connection = guard.as_ref().unwrap();
        let result = connection.query_row(
            "SELECT id, title FROM areas WHERE id = ?1",
            params![id.to_string()],
            |row| {
                let title: String = row.get(1)?;
                let id_str: String = row.get(0)?;
                Ok(Area {
                    id: Uuid::parse_str(&id_str).map_err(|e| {
                        rusqlite::Error::FromSqlConversionFailure(
                            0,
                            rusqlite::types::Type::Text,
                            Box::new(e),
                        )
                    })?,
                    title: title.clone(),
                    is_system: title == "未分类",
                })
            },
        );

        match result {
            Ok(area) => Ok(Some(area)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    fn list(&self) -> Result<Vec<Area>, RepositoryError> {
        let guard = self.cached_connection()?;
        let connection = guard.as_ref().unwrap();
        let mut statement = connection.prepare("SELECT id, title FROM areas ORDER BY title")?;
        let mut rows = statement.query([])?;
        let mut areas = Vec::new();

        while let Some(row) = rows.next()? {
            let title: String = row.get(1)?;
            areas.push(Area {
                id: parse_uuid(row.get::<_, String>(0)?)?,
                title: title.clone(),
                is_system: title == "未分类",
            });
        }

        Ok(areas)
    }

    fn create(&self, area: &Area) -> Result<(), RepositoryError> {
        let guard = self.cached_connection()?;
        let connection = guard.as_ref().unwrap();
        connection.execute(
            "INSERT INTO areas (id, title) VALUES (?1, ?2)",
            params![area.id.to_string(), &area.title],
        )?;
        Ok(())
    }

    fn update(&self, area: &Area) -> Result<(), RepositoryError> {
        let guard = self.cached_connection()?;
        let connection = guard.as_ref().unwrap();
        connection.execute(
            "UPDATE areas SET title = ?1 WHERE id = ?2",
            params![&area.title, area.id.to_string()],
        )?;
        Ok(())
    }

    fn delete(&self, id: Uuid) -> Result<(), RepositoryError> {
        let guard = self.cached_connection()?;
        let connection = guard.as_ref().unwrap();
        connection.execute("DELETE FROM areas WHERE id = ?1", params![id.to_string()])?;
        Ok(())
    }
}

// ============================================================================
// Task loading helpers — eliminates duplication across list/find/filter methods
// ============================================================================

fn load_activity_logs_for_tasks(
    connection: &Connection,
    task_ids: &[String],
) -> Result<HashMap<String, Vec<TaskActivityLog>>, RepositoryError> {
    let mut logs_by_task_id: HashMap<String, Vec<TaskActivityLog>> = HashMap::new();
    if task_ids.is_empty() {
        return Ok(logs_by_task_id);
    }

    for chunk in task_ids.chunks(900) {
        let placeholders = std::iter::repeat("?")
            .take(chunk.len())
            .collect::<Vec<_>>()
            .join(", ");
        let sql = format!(
            "SELECT id, task_id, action, note, timestamp FROM desk_task_activity_logs WHERE task_id IN ({placeholders}) ORDER BY timestamp DESC"
        );
        let mut statement = connection.prepare(&sql)?;
        let params = chunk
            .iter()
            .map(|id| id as &dyn rusqlite::types::ToSql)
            .collect::<Vec<_>>();
        let mut rows = statement.query(params.as_slice())?;

        while let Some(row) = rows.next()? {
            let log_id: String = row.get(0)?;
            let task_id: String = row.get(1)?;
            let log = TaskActivityLog {
                id: parse_uuid(log_id)?,
                action: parse_task_activity_action(row.get::<_, String>(2)?)?,
                note: row.get(3)?,
                timestamp: parse_datetime(row.get::<_, String>(4)?)?,
            };
            logs_by_task_id.entry(task_id).or_default().push(log);
        }
    }

    Ok(logs_by_task_id)
}

const TASK_COLUMNS: &str = "id, title, content, status, planned_start_at, due_at, linked_goal_id, linked_goal_label, bear_note_id, system_reminder_id, show_in_timeline, deleted_at";

struct TaskRow {
    id: String,
    title: String,
    content: String,
    status: String,
    planned_start_at: Option<String>,
    due_at: Option<String>,
    linked_goal_id: Option<String>,
    linked_goal_label: Option<String>,
    bear_note_id: Option<String>,
    system_reminder_id: Option<String>,
    show_in_timeline: i64,
    deleted_at: Option<String>,
}

impl TaskRow {
    fn from_row(row: &rusqlite::Row) -> Result<Self, RepositoryError> {
        Ok(Self {
            id: row.get(0)?,
            title: row.get(1)?,
            content: row.get(2)?,
            status: row.get(3)?,
            planned_start_at: row.get(4)?,
            due_at: row.get(5)?,
            linked_goal_id: row.get(6)?,
            linked_goal_label: row.get(7)?,
            bear_note_id: row.get(8)?,
            system_reminder_id: row.get(9)?,
            show_in_timeline: row.get(10)?,
            deleted_at: row.get(11)?,
        })
    }

    fn into_task(
        self,
        logs_by_task_id: &mut HashMap<String, Vec<TaskActivityLog>>,
    ) -> Result<DeskTask, RepositoryError> {
        Ok(DeskTask {
            id: parse_uuid(self.id.clone())?,
            title: self.title,
            content: self.content,
            status: parse_task_status(self.status)?,
            planned_start_at: parse_optional_datetime(self.planned_start_at)?,
            due_at: parse_optional_datetime(self.due_at)?,
            linked_goal_id: parse_optional_uuid(self.linked_goal_id)?,
            linked_goal_label: self.linked_goal_label,
            bear_note_id: self.bear_note_id,
            system_reminder_id: self.system_reminder_id,
            show_in_timeline: self.show_in_timeline != 0,
            activity_logs: logs_by_task_id.remove(&self.id).unwrap_or_default(),
            deleted_at: parse_optional_datetime(self.deleted_at)?,
        })
    }
}

fn load_tasks_with_filter(
    connection: &Connection,
    where_clause: &str,
    params: &[&dyn rusqlite::types::ToSql],
) -> Result<Vec<DeskTask>, RepositoryError> {
    let sql = if where_clause.is_empty() {
        format!("SELECT {TASK_COLUMNS} FROM desk_tasks WHERE deleted_at IS NULL ORDER BY title")
    } else {
        format!("SELECT {TASK_COLUMNS} FROM desk_tasks {where_clause}")
    };

    let mut statement = connection.prepare(&sql)?;
    let mut rows = statement.query(params)?;
    let mut task_rows = Vec::new();

    while let Some(row) = rows.next()? {
        task_rows.push(TaskRow::from_row(row)?);
    }

    let task_ids = task_rows
        .iter()
        .map(|task| task.id.clone())
        .collect::<Vec<_>>();
    let mut logs_by_task_id = load_activity_logs_for_tasks(connection, &task_ids)?;

    task_rows
        .into_iter()
        .map(|task| task.into_task(&mut logs_by_task_id))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::{Area, UNCATEGORIZED_AREA_ID};
    use tempfile::TempDir;

    fn create_test_repository() -> (SqliteRepository, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test.sqlite");
        let repo = SqliteRepository::new(db_path);
        (repo, temp_dir)
    }

    #[test]
    fn test_initialize_creates_uncategorized_area() {
        let (repo, _temp_dir) = create_test_repository();

        // 执行初始化
        repo.initialize().unwrap();

        // 加载 workspace 验证"未分类" area 存在
        let snapshot = repo.load_workspace().unwrap();

        let uncategorized = snapshot
            .areas
            .iter()
            .find(|area| area.id.to_string() == UNCATEGORIZED_AREA_ID);

        assert!(uncategorized.is_some(), "未分类 area 应该存在");
        let uncategorized = uncategorized.unwrap();
        assert_eq!(uncategorized.title, "未分类");
        assert!(uncategorized.is_system, "未分类 area 应该标记为系统 area");
    }

    #[test]
    fn test_initialize_cleans_orphan_goals() {
        let (repo, _temp_dir) = create_test_repository();

        // 先初始化创建表
        repo.initialize().unwrap();

        // 创建一些孤儿 goals（area_id 为 NULL 或指向不存在的 area）
        let connection = Connection::open(repo.path()).unwrap();
        let orphan_goal_id_1 = Uuid::new_v4().to_string();
        let orphan_goal_id_2 = Uuid::new_v4().to_string();
        let non_existent_area_id = Uuid::new_v4().to_string();

        connection.execute(
            "INSERT INTO goals (id, area_id, title, description, status) VALUES (?1, NULL, ?2, ?3, ?4)",
            params![orphan_goal_id_1, "Orphan Goal 1", "", "ACTIVE"],
        ).unwrap();

        connection.execute(
            "INSERT INTO goals (id, area_id, title, description, status) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![orphan_goal_id_2, non_existent_area_id, "Orphan Goal 2", "", "ACTIVE"],
        ).unwrap();

        drop(connection);

        // 再次执行初始化，应该清理孤儿 goals
        repo.initialize().unwrap();

        // 验证孤儿 goals 的 area_id 被更新为"未分类"
        let connection = Connection::open(repo.path()).unwrap();

        let area_id_1: String = connection
            .query_row(
                "SELECT area_id FROM goals WHERE id = ?1",
                params![orphan_goal_id_1],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(area_id_1, UNCATEGORIZED_AREA_ID);

        let area_id_2: String = connection
            .query_row(
                "SELECT area_id FROM goals WHERE id = ?1",
                params![orphan_goal_id_2],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(area_id_2, UNCATEGORIZED_AREA_ID);
    }

    #[test]
    fn test_initialize_idempotent() {
        let (repo, _temp_dir) = create_test_repository();

        // 第一次初始化
        repo.initialize().unwrap();
        let snapshot1 = repo.load_workspace().unwrap();
        let uncategorized_count_1 = snapshot1
            .areas
            .iter()
            .filter(|area| area.id.to_string() == UNCATEGORIZED_AREA_ID)
            .count();

        assert_eq!(uncategorized_count_1, 1, "应该只有一个未分类 area");

        // 第二次初始化
        repo.initialize().unwrap();
        let snapshot2 = repo.load_workspace().unwrap();
        let uncategorized_count_2 = snapshot2
            .areas
            .iter()
            .filter(|area| area.id.to_string() == UNCATEGORIZED_AREA_ID)
            .count();

        assert_eq!(
            uncategorized_count_2, 1,
            "重复初始化不应该创建重复的未分类 area"
        );
    }

    #[test]
    fn test_load_workspace_marks_uncategorized_as_system() {
        let (repo, _temp_dir) = create_test_repository();

        repo.initialize().unwrap();

        // 创建一个普通 area
        let mut snapshot = repo.load_workspace().unwrap();
        let normal_area = Area {
            id: Uuid::new_v4(),
            title: "工作".to_string(),
            is_system: false,
        };
        snapshot.areas.push(normal_area.clone());
        repo.save_workspace(&snapshot).unwrap();

        // 重新加载并验证
        let loaded_snapshot = repo.load_workspace().unwrap();

        let uncategorized = loaded_snapshot
            .areas
            .iter()
            .find(|area| area.title == "未分类")
            .expect("未分类 area 应该存在");
        assert!(uncategorized.is_system, "未分类 area 应该标记为系统 area");

        let work_area = loaded_snapshot
            .areas
            .iter()
            .find(|area| area.title == "工作")
            .expect("工作 area 应该存在");
        assert!(!work_area.is_system, "普通 area 不应该标记为系统 area");
    }

    // ============================================================================
    // GoalRepository Trait Tests
    // ============================================================================

    #[test]
    fn test_goal_repository_crud() {
        let (repo, _temp_dir) = create_test_repository();
        repo.initialize().unwrap();

        // Create
        let goal = Goal {
            id: Uuid::new_v4(),
            area_id: None,
            title: "Test Goal".to_string(),
            description: "Test Description".to_string(),
            status: GoalStatus::Active,
            deleted_at: None,
        };
        GoalRepository::create(&repo, &goal).unwrap();

        // Read - find
        let found = GoalRepository::find(&repo, goal.id)
            .unwrap()
            .expect("Goal should exist");
        assert_eq!(found.title, "Test Goal");
        assert_eq!(found.description, "Test Description");
        assert_eq!(found.status, GoalStatus::Active);

        // Update
        let mut updated = found;
        updated.title = "Updated Goal".to_string();
        updated.description = "Updated Description".to_string();
        GoalRepository::update(&repo, &updated).unwrap();

        let found = GoalRepository::find(&repo, goal.id)
            .unwrap()
            .expect("Goal should exist");
        assert_eq!(found.title, "Updated Goal");
        assert_eq!(found.description, "Updated Description");

        // Delete
        GoalRepository::delete(&repo, goal.id).unwrap();
        assert!(
            GoalRepository::find(&repo, goal.id).unwrap().is_none(),
            "Goal should be deleted"
        );
    }

    #[test]
    fn test_goal_repository_list() {
        let (repo, _temp_dir) = create_test_repository();
        repo.initialize().unwrap();

        // Create multiple goals
        let goal1 = Goal {
            id: Uuid::new_v4(),
            area_id: None,
            title: "Alpha Goal".to_string(),
            description: String::new(),
            status: GoalStatus::Active,
            deleted_at: None,
        };
        let goal2 = Goal {
            id: Uuid::new_v4(),
            area_id: None,
            title: "Beta Goal".to_string(),
            description: String::new(),
            status: GoalStatus::Active,
            deleted_at: None,
        };

        GoalRepository::create(&repo, &goal1).unwrap();
        GoalRepository::create(&repo, &goal2).unwrap();

        // List all
        let goals = GoalRepository::list(&repo).unwrap();
        assert_eq!(goals.len(), 2);
        // 验证排序（按 title）
        assert_eq!(goals[0].title, "Alpha Goal");
        assert_eq!(goals[1].title, "Beta Goal");
    }

    #[test]
    fn test_goal_repository_list_by_area() {
        let (repo, _temp_dir) = create_test_repository();
        repo.initialize().unwrap();

        let area_id = Uuid::new_v4();
        let other_area_id = Uuid::new_v4();

        // Create goals in different areas
        let goal1 = Goal {
            id: Uuid::new_v4(),
            area_id: Some(area_id),
            title: "Goal in Area 1".to_string(),
            description: String::new(),
            status: GoalStatus::Active,
            deleted_at: None,
        };
        let goal2 = Goal {
            id: Uuid::new_v4(),
            area_id: Some(area_id),
            title: "Another Goal in Area 1".to_string(),
            description: String::new(),
            status: GoalStatus::Active,
            deleted_at: None,
        };
        let goal3 = Goal {
            id: Uuid::new_v4(),
            area_id: Some(other_area_id),
            title: "Goal in Area 2".to_string(),
            description: String::new(),
            status: GoalStatus::Active,
            deleted_at: None,
        };

        GoalRepository::create(&repo, &goal1).unwrap();
        GoalRepository::create(&repo, &goal2).unwrap();
        GoalRepository::create(&repo, &goal3).unwrap();

        // List by area
        let goals_in_area1 = GoalRepository::list_by_area(&repo, area_id).unwrap();
        assert_eq!(goals_in_area1.len(), 2);
        assert!(goals_in_area1.iter().all(|g| g.area_id == Some(area_id)));
    }

    #[test]
    fn test_goal_repository_update_status_only() {
        let (repo, _temp_dir) = create_test_repository();
        repo.initialize().unwrap();

        let goal = Goal {
            id: Uuid::new_v4(),
            area_id: None,
            title: "Test Goal".to_string(),
            description: "Original Description".to_string(),
            status: GoalStatus::Active,
            deleted_at: None,
        };
        GoalRepository::create(&repo, &goal).unwrap();

        // Update only status
        GoalRepository::update_status(&repo, goal.id, GoalStatus::Paused).unwrap();

        let updated = GoalRepository::find(&repo, goal.id)
            .unwrap()
            .expect("Goal should exist");
        assert_eq!(updated.status, GoalStatus::Paused);
        assert_eq!(updated.title, "Test Goal", "Title should not change");
        assert_eq!(
            updated.description, "Original Description",
            "Description should not change"
        );
    }

    // ============================================================================
    // TaskRepository Trait Tests
    // ============================================================================

    #[test]
    fn test_task_repository_crud() {
        use crate::domain::{TaskActivityAction, TaskActivityLog, TaskStatus};

        let (repo, _temp_dir) = create_test_repository();
        repo.initialize().unwrap();

        // Create
        let task = DeskTask {
            id: Uuid::new_v4(),
            title: "Test Task".to_string(),
            content: "Test Content".to_string(),
            status: TaskStatus::Todo,
            planned_start_at: None,
            due_at: None,
            linked_goal_id: None,
            linked_goal_label: None,
            bear_note_id: None,
            system_reminder_id: None,
            show_in_timeline: false,
            activity_logs: vec![TaskActivityLog {
                id: Uuid::new_v4(),
                action: TaskActivityAction::Created,
                note: None,
                timestamp: chrono::Local::now(),
            }],
            deleted_at: None,
        };
        TaskRepository::create(&repo, &task).unwrap();

        // Read
        let found = TaskRepository::find(&repo, task.id)
            .unwrap()
            .expect("Task should exist");
        assert_eq!(found.title, "Test Task");
        assert_eq!(found.content, "Test Content");
        assert_eq!(found.status, TaskStatus::Todo);
        assert_eq!(found.activity_logs.len(), 1);

        // Update
        let mut updated = found;
        updated.title = "Updated Task".to_string();
        updated.status = TaskStatus::InProgress;
        TaskRepository::update(&repo, &updated).unwrap();

        let found = TaskRepository::find(&repo, task.id)
            .unwrap()
            .expect("Task should exist");
        assert_eq!(found.title, "Updated Task");
        assert_eq!(found.status, TaskStatus::InProgress);

        // Delete
        TaskRepository::delete(&repo, task.id).unwrap();
        assert!(
            TaskRepository::find(&repo, task.id).unwrap().is_none(),
            "Task should be deleted"
        );
    }

    #[test]
    fn test_task_repository_list_by_goal() {
        use crate::domain::TaskStatus;

        let (repo, _temp_dir) = create_test_repository();
        repo.initialize().unwrap();

        let goal_id = Uuid::new_v4();
        let other_goal_id = Uuid::new_v4();

        let task1 = DeskTask {
            id: Uuid::new_v4(),
            title: "Task 1".to_string(),
            content: String::new(),
            status: TaskStatus::Todo,
            planned_start_at: None,
            due_at: None,
            linked_goal_id: Some(goal_id),
            linked_goal_label: None,
            bear_note_id: None,
            system_reminder_id: None,
            show_in_timeline: false,
            activity_logs: vec![],
            deleted_at: None,
        };

        let task2 = DeskTask {
            id: Uuid::new_v4(),
            title: "Task 2".to_string(),
            content: String::new(),
            status: TaskStatus::Todo,
            planned_start_at: None,
            due_at: None,
            linked_goal_id: Some(goal_id),
            linked_goal_label: None,
            bear_note_id: None,
            system_reminder_id: None,
            show_in_timeline: false,
            activity_logs: vec![],
            deleted_at: None,
        };

        let task3 = DeskTask {
            id: Uuid::new_v4(),
            title: "Task 3".to_string(),
            content: String::new(),
            status: TaskStatus::Todo,
            planned_start_at: None,
            due_at: None,
            linked_goal_id: Some(other_goal_id),
            linked_goal_label: None,
            bear_note_id: None,
            system_reminder_id: None,
            show_in_timeline: false,
            activity_logs: vec![],
            deleted_at: None,
        };

        TaskRepository::create(&repo, &task1).unwrap();
        TaskRepository::create(&repo, &task2).unwrap();
        TaskRepository::create(&repo, &task3).unwrap();

        let tasks = TaskRepository::list_by_goal(&repo, goal_id).unwrap();
        assert_eq!(tasks.len(), 2);
        assert!(tasks.iter().all(|t| t.linked_goal_id == Some(goal_id)));
    }

    #[test]
    fn test_task_repository_list_by_status() {
        use crate::domain::TaskStatus;

        let (repo, _temp_dir) = create_test_repository();
        repo.initialize().unwrap();

        let task1 = DeskTask {
            id: Uuid::new_v4(),
            title: "Todo Task".to_string(),
            content: String::new(),
            status: TaskStatus::Todo,
            planned_start_at: None,
            due_at: None,
            linked_goal_id: None,
            linked_goal_label: None,
            bear_note_id: None,
            system_reminder_id: None,
            show_in_timeline: false,
            activity_logs: vec![],
            deleted_at: None,
        };

        let task2 = DeskTask {
            id: Uuid::new_v4(),
            title: "Done Task".to_string(),
            content: String::new(),
            status: TaskStatus::Done,
            planned_start_at: None,
            due_at: None,
            linked_goal_id: None,
            linked_goal_label: None,
            bear_note_id: None,
            system_reminder_id: None,
            show_in_timeline: false,
            activity_logs: vec![],
            deleted_at: None,
        };

        TaskRepository::create(&repo, &task1).unwrap();
        TaskRepository::create(&repo, &task2).unwrap();

        let todo_tasks = TaskRepository::list_by_status(&repo, TaskStatus::Todo).unwrap();
        assert_eq!(todo_tasks.len(), 1);
        assert_eq!(todo_tasks[0].title, "Todo Task");

        let done_tasks = TaskRepository::list_by_status(&repo, TaskStatus::Done).unwrap();
        assert_eq!(done_tasks.len(), 1);
        assert_eq!(done_tasks[0].title, "Done Task");
    }

    #[test]
    fn test_task_repository_update_status_only() {
        use crate::domain::TaskStatus;

        let (repo, _temp_dir) = create_test_repository();
        repo.initialize().unwrap();

        let task = DeskTask {
            id: Uuid::new_v4(),
            title: "Test Task".to_string(),
            content: "Original Content".to_string(),
            status: TaskStatus::Todo,
            planned_start_at: None,
            due_at: None,
            linked_goal_id: None,
            linked_goal_label: None,
            bear_note_id: None,
            system_reminder_id: None,
            show_in_timeline: false,
            activity_logs: vec![],
            deleted_at: None,
        };
        TaskRepository::create(&repo, &task).unwrap();

        // Update only status
        TaskRepository::update_status(&repo, task.id, TaskStatus::InProgress).unwrap();

        let updated = TaskRepository::find(&repo, task.id)
            .unwrap()
            .expect("Task should exist");
        assert_eq!(updated.status, TaskStatus::InProgress);
        assert_eq!(updated.title, "Test Task", "Title should not change");
        assert_eq!(
            updated.content, "Original Content",
            "Content should not change"
        );
    }

    #[test]
    fn test_task_soft_delete_and_restore() {
        let (repo, _temp_dir) = create_test_repository();
        repo.initialize().unwrap();

        let task = DeskTask {
            id: Uuid::new_v4(),
            title: "Delete Me".to_string(),
            content: String::new(),
            status: TaskStatus::Todo,
            planned_start_at: None,
            due_at: None,
            linked_goal_id: None,
            linked_goal_label: None,
            bear_note_id: None,
            system_reminder_id: None,
            show_in_timeline: false,
            activity_logs: vec![],
            deleted_at: None,
        };
        TaskRepository::create(&repo, &task).unwrap();

        // Soft delete
        TaskRepository::soft_delete(&repo, task.id).unwrap();

        // Should not appear in normal list
        let all = TaskRepository::list(&repo).unwrap();
        assert!(
            all.iter().all(|t| t.id != task.id),
            "Soft-deleted task should not appear in list"
        );

        // Should appear in deleted list
        let deleted = TaskRepository::list_deleted(&repo).unwrap();
        assert_eq!(deleted.len(), 1);
        assert_eq!(deleted[0].id, task.id);
        assert!(deleted[0].deleted_at.is_some(), "deleted_at should be set");

        // Restore
        TaskRepository::restore(&repo, task.id).unwrap();

        // Should appear in normal list again
        let all = TaskRepository::list(&repo).unwrap();
        assert!(
            all.iter().any(|t| t.id == task.id),
            "Restored task should appear in list"
        );

        // Should not appear in deleted list
        let deleted = TaskRepository::list_deleted(&repo).unwrap();
        assert!(
            deleted.is_empty(),
            "Restored task should not be in deleted list"
        );
    }

    #[test]
    fn test_goal_soft_delete_and_restore() {
        let (repo, _temp_dir) = create_test_repository();
        repo.initialize().unwrap();

        let goal = Goal {
            id: Uuid::new_v4(),
            area_id: None,
            title: "Delete Me Goal".to_string(),
            description: String::new(),
            status: GoalStatus::Active,
            deleted_at: None,
        };
        GoalRepository::create(&repo, &goal).unwrap();

        // Soft delete
        GoalRepository::soft_delete(&repo, goal.id).unwrap();

        // Should not appear in normal list
        let all = GoalRepository::list(&repo).unwrap();
        assert!(
            all.iter().all(|g| g.id != goal.id),
            "Soft-deleted goal should not appear in list"
        );

        // Should appear in deleted list
        let deleted = GoalRepository::list_deleted(&repo).unwrap();
        assert_eq!(deleted.len(), 1);
        assert_eq!(deleted[0].id, goal.id);
        assert!(deleted[0].deleted_at.is_some(), "deleted_at should be set");

        // find should not find it
        let found = GoalRepository::find(&repo, goal.id).unwrap();
        assert!(found.is_none(), "find should not return soft-deleted goal");

        // find_any should find it
        let found_any = GoalRepository::find_any(&repo, goal.id).unwrap();
        assert!(
            found_any.is_some(),
            "find_any should return soft-deleted goal"
        );

        // Restore
        GoalRepository::restore(&repo, goal.id).unwrap();

        // Should appear in normal list again
        let all = GoalRepository::list(&repo).unwrap();
        assert!(
            all.iter().any(|g| g.id == goal.id),
            "Restored goal should appear in list"
        );

        // Should not appear in deleted list
        let deleted = GoalRepository::list_deleted(&repo).unwrap();
        assert!(
            deleted.is_empty(),
            "Restored goal should not be in deleted list"
        );
    }

    // ============================================================================
    // AreaRepository Trait Tests
    // ============================================================================

    #[test]
    fn test_area_repository_crud() {
        let (repo, _temp_dir) = create_test_repository();
        repo.initialize().unwrap();

        // Create
        let area = Area {
            id: Uuid::new_v4(),
            title: "Test Area".to_string(),
            is_system: false,
        };
        AreaRepository::create(&repo, &area).unwrap();

        // Read
        let found = AreaRepository::find(&repo, area.id)
            .unwrap()
            .expect("Area should exist");
        assert_eq!(found.title, "Test Area");
        assert!(!found.is_system);

        // Update
        let mut updated = found;
        updated.title = "Updated Area".to_string();
        AreaRepository::update(&repo, &updated).unwrap();

        let found = AreaRepository::find(&repo, area.id)
            .unwrap()
            .expect("Area should exist");
        assert_eq!(found.title, "Updated Area");

        // Delete
        AreaRepository::delete(&repo, area.id).unwrap();
        assert!(
            AreaRepository::find(&repo, area.id).unwrap().is_none(),
            "Area should be deleted"
        );
    }

    #[test]
    fn test_area_repository_list() {
        let (repo, _temp_dir) = create_test_repository();
        repo.initialize().unwrap();

        // Create areas
        let area1 = Area {
            id: Uuid::new_v4(),
            title: "Work".to_string(),
            is_system: false,
        };
        let area2 = Area {
            id: Uuid::new_v4(),
            title: "Personal".to_string(),
            is_system: false,
        };

        AreaRepository::create(&repo, &area1).unwrap();
        AreaRepository::create(&repo, &area2).unwrap();

        // List all (including system "未分类")
        let areas = AreaRepository::list(&repo).unwrap();
        assert!(areas.len() >= 3); // At least 2 created + 1 system

        let uncategorized = areas.iter().find(|a| a.title == "未分类");
        assert!(uncategorized.is_some());
        assert!(uncategorized.unwrap().is_system);
    }
}
