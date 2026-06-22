use crate::domain::{DeskTask, TaskStatus};
use crate::repository::{GoalRepository, SqliteRepository, TaskRepository};
use uuid::Uuid;

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
            show_in_timeline: parsed.planned_start_at.is_some() || parsed.due_at.is_some(),
            activity_logs: vec![crate::domain::TaskActivityLog {
                id: uuid::Uuid::new_v4(),
                action: crate::domain::TaskActivityAction::Created,
                note: None,
                timestamp: now,
            }],
        };

        self.repo.initialize().map_err(|e| e.to_string())?;
        TaskRepository::create(&self.repo, &task).map_err(|e| e.to_string())?;
        Ok(task)
    }

    pub fn create_task_for_goal(
        &self,
        goal_id: &str,
        title: &str,
    ) -> Result<DeskTask, String> {
        let trimmed_title = title.trim();
        if trimmed_title.is_empty() {
            return Err("Task title cannot be empty".to_string());
        }

        let goal_uuid = Uuid::parse_str(goal_id).map_err(|e| e.to_string())?;
        self.repo.initialize().map_err(|e| e.to_string())?;

        let goal = GoalRepository::find(&self.repo, goal_uuid)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Goal not found: {goal_id}"))?;

        let task = goal.create_task(trimmed_title.to_string());
        TaskRepository::create(&self.repo, &task).map_err(|e| e.to_string())?;
        Ok(task)
    }

    pub fn update_task_content(
        &self,
        task_id: &str,
        content: &str,
    ) -> Result<DeskTask, String> {
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

        if !task.can_transition_to(status) {
            return Err(format!(
                "Invalid status transition from {:?} to {:?}",
                task.status, status
            ));
        }

        use crate::domain::TaskActivityAction;
        let previous_status = task.status;
        task.status = status;
        task.activity_logs.insert(
            0,
            crate::domain::TaskActivityLog {
                id: Uuid::new_v4(),
                action: match status {
                    TaskStatus::Paused => TaskActivityAction::Paused,
                    TaskStatus::Done => TaskActivityAction::Completed,
                    TaskStatus::InProgress => {
                        if previous_status == TaskStatus::Paused {
                            TaskActivityAction::Resumed
                        } else {
                            TaskActivityAction::Started
                        }
                    }
                    TaskStatus::Todo => {
                        if previous_status == TaskStatus::Done {
                            TaskActivityAction::Resumed
                        } else {
                            TaskActivityAction::NoteAdded
                        }
                    }
                },
                note: note.and_then(|n| {
                    let trimmed = n.trim().to_string();
                    if trimmed.is_empty() { None } else { Some(trimmed) }
                }),
                timestamp: chrono::Local::now(),
            },
        );

        TaskRepository::update(&self.repo, &task).map_err(|e| e.to_string())?;
        Ok(task)
    }

    pub fn update_task_status_with_sync(
        &self,
        task_id: &str,
        status: TaskStatus,
        note: Option<String>,
        sync_callback: Option<Box<dyn FnOnce(&str, bool) -> Result<(), String>>>,
    ) -> Result<DeskTask, String> {
        let task_uuid = Uuid::parse_str(task_id).map_err(|e| e.to_string())?;

        let task = TaskRepository::find(&self.repo, task_uuid)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Task not found: {task_id}"))?;

        if let Some(callback) = sync_callback {
            if let Some(ref reminder_id) = task.system_reminder_id {
                callback(reminder_id, matches!(status, TaskStatus::Done))?;
            }
        }

        self.update_task_status(task_id, status, note)
    }

    pub fn add_task_note(
        &self,
        task_id: &str,
        note: &str,
    ) -> Result<DeskTask, String> {
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

    pub fn update_task_fields(
        &self,
        task_id: &str,
        title: &str,
        planned_start_at: Option<String>,
        due_at: Option<String>,
        linked_goal_id: Option<String>,
        linked_goal_label: Option<String>,
        show_in_timeline: Option<bool>,
    ) -> Result<DeskTask, String> {
        let trimmed_title = title.trim();
        if trimmed_title.is_empty() {
            return Err("Task title cannot be empty".to_string());
        }

        let task_uuid = Uuid::parse_str(task_id).map_err(|e| e.to_string())?;

        let mut task = TaskRepository::find(&self.repo, task_uuid)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Task not found: {task_id}"))?;

        task.title = trimmed_title.to_string();
        task.planned_start_at = planned_start_at
            .map(|v| chrono::DateTime::parse_from_rfc3339(&v).map(|p| p.with_timezone(&chrono::Local)))
            .transpose()
            .map_err(|e| e.to_string())?;
        task.due_at = due_at
            .map(|v| chrono::DateTime::parse_from_rfc3339(&v).map(|p| p.with_timezone(&chrono::Local)))
            .transpose()
            .map_err(|e| e.to_string())?;
        task.linked_goal_id = linked_goal_id
            .as_deref()
            .map(Uuid::parse_str)
            .transpose()
            .map_err(|e| e.to_string())?;
        task.linked_goal_label = linked_goal_label.and_then(|v| {
            let trimmed = v.trim().to_string();
            if trimmed.is_empty() { None } else { Some(trimmed) }
        });
        task.show_in_timeline = show_in_timeline.unwrap_or(task.show_in_timeline);

        TaskRepository::update(&self.repo, &task).map_err(|e| e.to_string())?;
        Ok(task)
    }

    pub fn list_tasks(&self) -> Result<Vec<DeskTask>, String> {
        self.repo.initialize().map_err(|e| e.to_string())?;
        TaskRepository::list(&self.repo).map_err(|e| e.to_string())
    }

    pub fn find_task(&self, task_id: &str) -> Result<Option<DeskTask>, String> {
        let task_uuid = Uuid::parse_str(task_id).map_err(|e| e.to_string())?;
        self.repo.initialize().map_err(|e| e.to_string())?;
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

    pub fn sync_linked_tasks_for_system_reminder(
        &self,
        reminder_id: &str,
        done: bool,
    ) -> Result<(), String> {
        let tasks = TaskRepository::list(&self.repo).map_err(|e| e.to_string())?;

        for task in tasks
            .iter()
            .filter(|t| t.system_reminder_id.as_deref() == Some(reminder_id))
        {
            let next_status = if done {
                TaskStatus::Done
            } else {
                TaskStatus::Todo
            };
            if task.status == next_status {
                continue;
            }

            let mut updated = task.clone();
            updated.status = next_status;
            updated.activity_logs.insert(
                0,
                crate::domain::TaskActivityLog {
                    id: Uuid::new_v4(),
                    action: if done {
                        crate::domain::TaskActivityAction::Completed
                    } else {
                        crate::domain::TaskActivityAction::Resumed
                    },
                    note: Some("Synced from Apple Reminders.".to_string()),
                    timestamp: chrono::Local::now(),
                },
            );
            TaskRepository::update(&self.repo, &updated).map_err(|e| e.to_string())?;
        }

        Ok(())
    }

    pub fn capture_task_with_system_reminder(
        &self,
        task_id: &str,
        reminder_id: String,
    ) -> Result<DeskTask, String> {
        self.update_task_system_reminder_id(task_id, Some(reminder_id))
    }

    pub fn sync_task_system_reminder(
        &self,
        task_id: &str,
        done: bool,
    ) -> Result<DeskTask, String> {
        let task_uuid = Uuid::parse_str(task_id).map_err(|e| e.to_string())?;
        let task = TaskRepository::find(&self.repo, task_uuid)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Task not found: {task_id}"))?;

        if let Some(ref reminder_id) = task.system_reminder_id {
            self.sync_linked_tasks_for_system_reminder(reminder_id, done)?;
        }

        let next_status = if done { TaskStatus::Done } else { TaskStatus::Todo };
        self.update_task_status(task_id, next_status, None)
    }

    pub fn sync_task_system_reminder_by_reminder_id(
        &self,
        reminder_id: &str,
        done: bool,
    ) -> Result<(), String> {
        self.sync_linked_tasks_for_system_reminder(reminder_id, done)
    }

    pub fn update_task_status_with_reminder_sync(
        &self,
        task_id: &str,
        status: TaskStatus,
        note: Option<String>,
        reminder_sync: Option<Box<dyn FnOnce(&str, bool) -> Result<(), String>>>,
    ) -> Result<DeskTask, String> {
        let task = self.find_task(task_id)?
            .ok_or_else(|| format!("Task not found: {task_id}"))?;

        if let Some(sync) = reminder_sync {
            if let Some(ref reminder_id) = task.system_reminder_id {
                let done = matches!(status, TaskStatus::Done);
                sync(reminder_id, done)?;
            }
        }

        self.update_task_status(task_id, status, note)
    }
}
