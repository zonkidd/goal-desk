use crate::domain::{
    Area, DeskTask, Goal, GoalStatus, Milestone, Project, Reminder, TaskActivityAction,
    TaskActivityLog, TaskStatus, Todo, WorkspaceSnapshot,
};
use chrono::{DateTime, Local};
use rusqlite::{params, Connection};
use std::collections::HashMap;
use std::fmt;
use std::path::{Path, PathBuf};
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

impl From<chrono::ParseError> for RepositoryError {
    fn from(value: chrono::ParseError) -> Self {
        Self::Chrono(value)
    }
}

#[derive(Debug, Clone)]
pub struct SqliteRepository {
    path: PathBuf,
}

impl SqliteRepository {
    pub fn new(path: PathBuf) -> Self {
        Self { path }
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    pub fn initialize(&self) -> Result<(), RepositoryError> {
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let connection = Connection::open(&self.path)?;
        connection.execute_batch(
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
            CREATE TABLE IF NOT EXISTS milestones (
                id TEXT PRIMARY KEY,
                goal_id TEXT NOT NULL,
                title TEXT NOT NULL,
                completed INTEGER NOT NULL
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

        Self::ensure_column_exists(&connection, "goals", "description", "TEXT NOT NULL DEFAULT ''")?;
        Self::ensure_column_exists(&connection, "goals", "status", "TEXT NOT NULL DEFAULT 'ACTIVE'")?;
        Self::ensure_column_exists(&connection, "desk_tasks", "system_reminder_id", "TEXT NULL")?;
        Self::ensure_column_exists(&connection, "desk_tasks", "is_ongoing", "INTEGER NOT NULL DEFAULT 0")?;

        Ok(())
    }

    pub fn save_workspace(&self, snapshot: &WorkspaceSnapshot) -> Result<(), RepositoryError> {
        self.initialize()?;
        let mut connection = Connection::open(&self.path)?;
        let transaction = connection.transaction()?;

        transaction.execute_batch(
            "
            DELETE FROM areas;
            DELETE FROM goals;
            DELETE FROM projects;
            DELETE FROM todos;
            DELETE FROM reminders;
            DELETE FROM milestones;
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
                "INSERT INTO goals (id, area_id, title, description, status) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    goal.id.to_string(),
                    option_uuid(goal.area_id),
                    goal.title,
                    goal.description,
                    goal_status_as_str(goal.status)
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

        for todo in &snapshot.todos {
            transaction.execute(
                "INSERT INTO todos (id, goal_id, project_id, title, scheduled_at, completed) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    todo.id.to_string(),
                    option_uuid(todo.goal_id),
                    option_uuid(todo.project_id),
                    todo.title,
                    option_datetime(todo.scheduled_at),
                    todo.completed as i64
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

        for milestone in &snapshot.milestones {
            transaction.execute(
                "INSERT INTO milestones (id, goal_id, title, completed) VALUES (?1, ?2, ?3, ?4)",
                params![
                    milestone.id.to_string(),
                    milestone.goal_id.to_string(),
                    milestone.title,
                    milestone.completed as i64
                ],
            )?;
        }

        transaction.commit()?;
        Ok(())
    }

    pub fn load_workspace(&self) -> Result<WorkspaceSnapshot, RepositoryError> {
        self.initialize()?;
        let connection = Connection::open(&self.path)?;

        let areas = {
            let mut statement = connection.prepare("SELECT id, title FROM areas ORDER BY title")?;
            let mut rows = statement.query([])?;
            let mut items = Vec::new();
            while let Some(row) = rows.next()? {
                items.push(Area {
                    id: parse_uuid(row.get::<_, String>(0)?)?,
                    title: row.get(1)?,
                });
            }
            items
        };

        let goals = {
            let mut statement =
                connection.prepare("SELECT id, area_id, title, description, status FROM goals ORDER BY title")?;
            let mut rows = statement.query([])?;
            let mut items = Vec::new();
            while let Some(row) = rows.next()? {
                items.push(Goal {
                    id: parse_uuid(row.get::<_, String>(0)?)?,
                    area_id: parse_optional_uuid(row.get::<_, Option<String>>(1)?)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    status: parse_goal_status(row.get::<_, String>(4)?)?,
                });
            }
            items
        };

        let projects = {
            let mut statement = connection.prepare("SELECT id, area_id, goal_id, title FROM projects ORDER BY title")?;
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

        let todos = {
            let mut statement = connection.prepare(
                "SELECT id, goal_id, project_id, title, scheduled_at, completed FROM todos ORDER BY title",
            )?;
            let mut rows = statement.query([])?;
            let mut items = Vec::new();
            while let Some(row) = rows.next()? {
                items.push(Todo {
                    id: parse_uuid(row.get::<_, String>(0)?)?,
                    goal_id: parse_optional_uuid(row.get::<_, Option<String>>(1)?)?,
                    project_id: parse_optional_uuid(row.get::<_, Option<String>>(2)?)?,
                    title: row.get(3)?,
                    scheduled_at: parse_optional_datetime(row.get::<_, Option<String>>(4)?)?,
                    completed: row.get::<_, i64>(5)? != 0,
                });
            }
            items
        };

        let reminders = {
            let mut statement = connection.prepare("SELECT id, title, due_at, done FROM reminders ORDER BY due_at")?;
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

        let milestones = {
            let mut statement = connection.prepare("SELECT id, goal_id, title, completed FROM milestones ORDER BY title")?;
            let mut rows = statement.query([])?;
            let mut items = Vec::new();
            while let Some(row) = rows.next()? {
                items.push(Milestone {
                    id: parse_uuid(row.get::<_, String>(0)?)?,
                    goal_id: parse_uuid(row.get::<_, String>(1)?)?,
                    title: row.get(2)?,
                    completed: row.get::<_, i64>(3)? != 0,
                });
            }
            items
        };

        Ok(WorkspaceSnapshot {
            areas,
            projects,
            goals,
            todos,
            reminders,
            milestones,
        })
    }

    pub fn save_desk_tasks(&self, tasks: &[DeskTask]) -> Result<(), RepositoryError> {
        self.initialize()?;
        let mut connection = Connection::open(&self.path)?;
        let transaction = connection.transaction()?;

        transaction.execute_batch(
            "
            DELETE FROM desk_task_activity_logs;
            DELETE FROM desk_tasks;
            ",
        )?;

        for task in tasks {
            transaction.execute(
                "INSERT INTO desk_tasks (id, title, content, status, due_at, linked_goal_id, linked_goal_label, bear_note_id, system_reminder_id, is_ongoing) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    task.id.to_string(),
                    task.title.as_str(),
                    task.content.as_str(),
                    task_status_as_str(task.status),
                    option_datetime(task.due_at.clone()),
                    option_uuid(task.linked_goal_id.clone()),
                    task.linked_goal_label.as_deref(),
                    task.bear_note_id.as_deref(),
                    task.system_reminder_id.as_deref(),
                    task.is_ongoing as i64
                ],
            )?;

            for log in &task.activity_logs {
                transaction.execute(
                    "INSERT INTO desk_task_activity_logs (id, task_id, action, note, timestamp) VALUES (?1, ?2, ?3, ?4, ?5)",
                    params![
                        Uuid::new_v4().to_string(),
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
        let connection = Connection::open(&self.path)?;

        let mut logs_by_task_id: HashMap<String, Vec<TaskActivityLog>> = HashMap::new();
        {
            let mut statement = connection.prepare(
                "SELECT task_id, action, note, timestamp FROM desk_task_activity_logs ORDER BY timestamp DESC",
            )?;
            let mut rows = statement.query([])?;

            while let Some(row) = rows.next()? {
                let task_id: String = row.get(0)?;
                let log = TaskActivityLog {
                    action: parse_task_activity_action(row.get::<_, String>(1)?)?,
                    note: row.get(2)?,
                    timestamp: parse_datetime(row.get::<_, String>(3)?)?,
                };
                logs_by_task_id.entry(task_id).or_default().push(log);
            }
        }

        let mut statement = connection.prepare(
            "SELECT id, title, content, status, due_at, linked_goal_id, linked_goal_label, bear_note_id, system_reminder_id, is_ongoing FROM desk_tasks ORDER BY title",
        )?;
        let mut rows = statement.query([])?;
        let mut tasks = Vec::new();

        while let Some(row) = rows.next()? {
            let id = row.get::<_, String>(0)?;
            tasks.push(DeskTask {
                id: parse_uuid(id.clone())?,
                title: row.get(1)?,
                content: row.get(2)?,
                status: parse_task_status(row.get::<_, String>(3)?)?,
                due_at: parse_optional_datetime(row.get::<_, Option<String>>(4)?)?,
                linked_goal_id: parse_optional_uuid(row.get::<_, Option<String>>(5)?)?,
                linked_goal_label: row.get(6)?,
                bear_note_id: row.get(7)?,
                system_reminder_id: row.get(8)?,
                is_ongoing: row.get::<_, i64>(9)? != 0,
                activity_logs: logs_by_task_id.remove(&id).unwrap_or_default(),
            });
        }

        Ok(tasks)
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

        let alter = format!("ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}");
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
        _ => Err(RepositoryError::Data(format!("unsupported task status: {value}"))),
    }
}

fn parse_task_activity_action(value: String) -> Result<TaskActivityAction, RepositoryError> {
    match value.as_str() {
        "CREATED" => Ok(TaskActivityAction::Created),
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
        _ => Err(RepositoryError::Data(format!("unsupported goal status: {value}"))),
    }
}

fn parse_datetime(value: String) -> Result<DateTime<Local>, RepositoryError> {
    Ok(DateTime::parse_from_rfc3339(&value)?.with_timezone(&Local))
}

fn parse_optional_datetime(value: Option<String>) -> Result<Option<DateTime<Local>>, RepositoryError> {
    match value {
        Some(inner) => Ok(Some(parse_datetime(inner)?)),
        None => Ok(None),
    }
}
