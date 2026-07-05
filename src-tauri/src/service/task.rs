use crate::domain::{DeskTask, TaskStatus};
use crate::repository::{GoalRepository, SqliteRepository, TaskRepository};
use chrono::{DateTime, Local};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum NullableFieldPatch<T> {
    Preserve,
    Set(Option<T>),
}

impl<T> NullableFieldPatch<T> {
    pub fn preserve() -> Self {
        Self::Preserve
    }

    pub fn set(value: T) -> Self {
        Self::Set(Some(value))
    }

    pub fn clear() -> Self {
        Self::Set(None)
    }

    pub(crate) fn from_optional_patch(value: Option<Option<T>>) -> Self {
        match value {
            Some(next_value) => Self::Set(next_value),
            None => Self::Preserve,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GoalLink {
    pub id: Uuid,
    pub label: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TaskFieldPatch {
    pub title: String,
    pub planned_start_at: NullableFieldPatch<DateTime<Local>>,
    pub due_at: NullableFieldPatch<DateTime<Local>>,
    pub linked_goal: NullableFieldPatch<GoalLink>,
    pub show_in_timeline: Option<bool>,
    pub system_reminder_id: NullableFieldPatch<String>,
}

impl TaskFieldPatch {
    pub fn apply_to(self, task: &mut DeskTask) -> Result<(), String> {
        let trimmed_title = self.title.trim();
        if trimmed_title.is_empty() {
            return Err("Task title cannot be empty".to_string());
        }

        task.title = trimmed_title.to_string();
        if let NullableFieldPatch::Set(next_planned_start_at) = self.planned_start_at {
            task.planned_start_at = next_planned_start_at;
        }
        if let NullableFieldPatch::Set(next_due_at) = self.due_at {
            task.due_at = next_due_at;
        }
        if let NullableFieldPatch::Set(next_linked_goal) = self.linked_goal {
            match next_linked_goal {
                Some(goal_link) => {
                    task.linked_goal_id = Some(goal_link.id);
                    task.linked_goal_label = goal_link.label.and_then(|v| {
                        let trimmed = v.trim().to_string();
                        if trimmed.is_empty() {
                            None
                        } else {
                            Some(trimmed)
                        }
                    });
                }
                None => {
                    task.linked_goal_id = None;
                    task.linked_goal_label = None;
                }
            }
        }
        task.show_in_timeline = self.show_in_timeline.unwrap_or(task.show_in_timeline);
        if let NullableFieldPatch::Set(next_system_reminder_id) = self.system_reminder_id {
            task.system_reminder_id = next_system_reminder_id;
        }

        Ok(())
    }
}

pub struct TaskService {
    pub(crate) repo: SqliteRepository,
}

impl TaskService {
    pub fn new(repo: SqliteRepository) -> Self {
        Self { repo }
    }

    pub fn capture_task(&self, input: &str) -> Result<DeskTask, String> {
        let trimmed = input.trim();
        if trimmed.is_empty() {
            return Err("Task title cannot be empty".to_string());
        }

        let now = chrono::Local::now();
        let parsed = crate::time_parser::parse_time_expression(trimmed, now);

        let task = DeskTask {
            id: uuid::Uuid::new_v4(),
            title: parsed.title,
            content: String::new(),
            status: TaskStatus::Todo,
            planned_start_at: parsed.planned_start_at,
            due_at: parsed.due_at,
            linked_goal_id: None,
            linked_goal_label: None,
            bear_note_id: None,
            system_reminder_id: None,
            show_in_timeline: parsed.planned_start_at.is_some(),
            activity_logs: vec![crate::domain::TaskActivityLog {
                id: uuid::Uuid::new_v4(),
                action: crate::domain::TaskActivityAction::Created,
                note: None,
                timestamp: now,
            }],
            deleted_at: None,
        };

        TaskRepository::create(&self.repo, &task).map_err(|e| e.to_string())?;
        Ok(task)
    }

    pub fn create_task_for_goal(&self, goal_id: &str, title: &str) -> Result<DeskTask, String> {
        let trimmed_title = title.trim();
        if trimmed_title.is_empty() {
            return Err("Task title cannot be empty".to_string());
        }

        let goal_uuid = Uuid::parse_str(goal_id).map_err(|e| e.to_string())?;

        let goal = GoalRepository::find(&self.repo, goal_uuid)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Goal not found: {goal_id}"))?;

        let task = goal.create_task(trimmed_title.to_string());
        TaskRepository::create(&self.repo, &task).map_err(|e| e.to_string())?;
        Ok(task)
    }

    pub fn update_task_content(&self, task_id: &str, content: &str) -> Result<DeskTask, String> {
        let task_uuid = Uuid::parse_str(task_id).map_err(|e| e.to_string())?;

        let mut task = TaskRepository::find(&self.repo, task_uuid)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Task not found: {task_id}"))?;

        task.content = content.to_string();
        TaskRepository::update(&self.repo, &task).map_err(|e| e.to_string())?;
        Ok(task)
    }

    pub fn update_task_status(
        &self,
        task_id: &str,
        status: TaskStatus,
        note: Option<String>,
    ) -> Result<DeskTask, String> {
        let task_uuid = Uuid::parse_str(task_id).map_err(|e| e.to_string())?;

        let mut task = TaskRepository::find(&self.repo, task_uuid)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Task not found: {task_id}"))?;

        if task.status == status {
            return Ok(task);
        }

        if !task.can_transition_to(status) {
            return Err(format!(
                "Invalid status transition from {:?} to {:?}",
                task.status, status
            ));
        }

        let previous_status = task.status;
        task.status = status;
        task.activity_logs.insert(
            0,
            crate::domain::TaskActivityLog {
                id: Uuid::new_v4(),
                action: crate::domain::task_activity_action_for_transition(previous_status, status),
                note: note.and_then(|n| {
                    let trimmed = n.trim().to_string();
                    if trimmed.is_empty() {
                        None
                    } else {
                        Some(trimmed)
                    }
                }),
                timestamp: chrono::Local::now(),
            },
        );

        TaskRepository::update(&self.repo, &task).map_err(|e| e.to_string())?;
        Ok(task)
    }

    pub fn add_task_note(&self, task_id: &str, note: &str) -> Result<DeskTask, String> {
        let trimmed = note.trim();
        if trimmed.is_empty() {
            return Err("Task note cannot be empty".to_string());
        }

        let task_uuid = Uuid::parse_str(task_id).map_err(|e| e.to_string())?;

        let mut task = TaskRepository::find(&self.repo, task_uuid)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Task not found: {task_id}"))?;

        task.activity_logs.insert(
            0,
            crate::domain::TaskActivityLog {
                id: Uuid::new_v4(),
                action: crate::domain::TaskActivityAction::NoteAdded,
                note: Some(trimmed.to_string()),
                timestamp: chrono::Local::now(),
            },
        );

        TaskRepository::update(&self.repo, &task).map_err(|e| e.to_string())?;
        Ok(task)
    }

    pub fn update_task_fields_with_patch(
        &self,
        task_id: &str,
        patch: TaskFieldPatch,
    ) -> Result<DeskTask, String> {
        let task_uuid = Uuid::parse_str(task_id).map_err(|e| e.to_string())?;

        let mut task = TaskRepository::find(&self.repo, task_uuid)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Task not found: {task_id}"))?;

        patch.apply_to(&mut task)?;

        TaskRepository::update(&self.repo, &task).map_err(|e| e.to_string())?;
        Ok(task)
    }

    pub fn list_tasks(&self) -> Result<Vec<DeskTask>, String> {
        TaskRepository::list(&self.repo).map_err(|e| e.to_string())
    }

    pub fn find_task(&self, task_id: &str) -> Result<Option<DeskTask>, String> {
        let task_uuid = Uuid::parse_str(task_id).map_err(|e| e.to_string())?;

        TaskRepository::find(&self.repo, task_uuid).map_err(|e| e.to_string())
    }

    pub fn update_task_system_reminder_id(
        &self,
        task_id: &str,
        reminder_id: Option<String>,
    ) -> Result<DeskTask, String> {
        let task_uuid = Uuid::parse_str(task_id).map_err(|e| e.to_string())?;

        let mut task = TaskRepository::find(&self.repo, task_uuid)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Task not found: {task_id}"))?;

        task.system_reminder_id = reminder_id;
        TaskRepository::update(&self.repo, &task).map_err(|e| e.to_string())?;
        Ok(task)
    }

    pub fn capture_task_with_system_reminder(
        &self,
        task_id: &str,
        reminder_id: String,
    ) -> Result<DeskTask, String> {
        self.update_task_system_reminder_id(task_id, Some(reminder_id))
    }

    pub fn soft_delete_task(&self, task_id: &str) -> Result<(), String> {
        let task_uuid = Uuid::parse_str(task_id).map_err(|e| e.to_string())?;
        TaskRepository::soft_delete(&self.repo, task_uuid).map_err(|e| e.to_string())
    }

    pub fn restore_task(&self, task_id: &str) -> Result<DeskTask, String> {
        let task_uuid = Uuid::parse_str(task_id).map_err(|e| e.to_string())?;
        TaskRepository::restore(&self.repo, task_uuid).map_err(|e| e.to_string())?;
        TaskRepository::find(&self.repo, task_uuid)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Task not found after restore: {task_id}"))
    }

    pub fn list_deleted_tasks(&self) -> Result<Vec<DeskTask>, String> {
        TaskRepository::list_deleted(&self.repo).map_err(|e| e.to_string())
    }
}
