use chrono::{DateTime, Datelike, Local, NaiveDate, TimeZone};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TimelineSource {
    Todo,
    Reminder,
    Calendar,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TaskStatus {
    Todo,
    InProgress,
    Paused,
    Done,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TaskActivityAction {
    Created,
    Paused,
    Resumed,
    Completed,
    NoteAdded,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum GoalStatus {
    Active,
    Paused,
    ReadyToComplete,
    Completed,
    Archived,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Area {
    pub id: Uuid,
    pub title: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Goal {
    pub id: Uuid,
    pub area_id: Option<Uuid>,
    pub title: String,
    pub description: String,
    pub status: GoalStatus,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct GoalSummary {
    pub id: String,
    pub title: String,
    pub area: String,
    pub description: String,
    pub status: GoalStatus,
    pub progress: u8,
    pub task_count: usize,
    pub next_todo: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Project {
    pub id: Uuid,
    pub area_id: Option<Uuid>,
    pub goal_id: Option<Uuid>,
    pub title: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Todo {
    pub id: Uuid,
    pub goal_id: Option<Uuid>,
    pub project_id: Option<Uuid>,
    pub title: String,
    pub scheduled_at: Option<DateTime<Local>>,
    pub completed: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Reminder {
    pub id: Uuid,
    pub title: String,
    pub due_at: DateTime<Local>,
    pub done: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CalendarEvent {
    pub id: String,
    pub title: String,
    pub starts_at: DateTime<Local>,
    pub ends_at: DateTime<Local>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Milestone {
    pub id: Uuid,
    pub goal_id: Uuid,
    pub title: String,
    pub completed: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TimelineItem {
    pub id: String,
    pub title: String,
    pub starts_at: DateTime<Local>,
    pub source: TimelineSource,
    pub read_only: bool,
    pub completed: bool,
    pub source_label: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TaskActivityLog {
    pub action: TaskActivityAction,
    pub note: Option<String>,
    pub timestamp: DateTime<Local>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DeskTask {
    pub id: Uuid,
    pub title: String,
    pub content: String,
    pub status: TaskStatus,
    pub due_at: Option<DateTime<Local>>,
    pub linked_goal_id: Option<Uuid>,
    pub linked_goal_label: Option<String>,
    pub bear_note_id: Option<String>,
    pub system_reminder_id: Option<String>,
    pub is_ongoing: bool,
    pub activity_logs: Vec<TaskActivityLog>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct GoalProgress {
    pub completed_units: usize,
    pub total_units: usize,
    pub percent: u8,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct QuickCaptureDraft {
    pub title: String,
    pub scheduled_at: Option<DateTime<Local>>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct WorkspaceSnapshot {
    pub areas: Vec<Area>,
    pub projects: Vec<Project>,
    pub goals: Vec<Goal>,
    pub todos: Vec<Todo>,
    pub reminders: Vec<Reminder>,
    pub milestones: Vec<Milestone>,
}

pub fn today_timeline(
    day: NaiveDate,
    todos: &[Todo],
    reminders: &[Reminder],
    events: &[CalendarEvent],
) -> Vec<TimelineItem> {
    let mut items = Vec::new();

    for todo in todos {
        if let Some(scheduled_at) = todo.scheduled_at {
            if scheduled_at.date_naive() == day {
                items.push(TimelineItem {
                    id: todo.id.to_string(),
                    title: todo.title.clone(),
                    starts_at: scheduled_at,
                    source: TimelineSource::Todo,
                    read_only: false,
                    completed: todo.completed,
                    source_label: None,
                });
            }
        }
    }

    for reminder in reminders {
        if reminder.due_at.date_naive() == day {
            items.push(TimelineItem {
                id: reminder.id.to_string(),
                title: reminder.title.clone(),
                starts_at: reminder.due_at,
                source: TimelineSource::Reminder,
                read_only: false,
                completed: reminder.done,
                source_label: None,
            });
        }
    }

    for event in events {
        if event.starts_at.date_naive() == day {
            items.push(TimelineItem {
                id: event.id.clone(),
                title: event.title.clone(),
                starts_at: event.starts_at,
                source: TimelineSource::Calendar,
                read_only: true,
                completed: false,
                source_label: None,
            });
        }
    }

    items.sort_by_key(|item| item.starts_at);
    items
}

pub fn goal_progress(goal_id: Uuid, todos: &[Todo], milestones: &[Milestone]) -> GoalProgress {
    let linked_todos = todos.iter().filter(|todo| todo.goal_id == Some(goal_id));
    let linked_milestones = milestones.iter().filter(|milestone| milestone.goal_id == goal_id);

    let mut completed_units = 0;
    let mut total_units = 0;

    for todo in linked_todos {
        total_units += 1;
        if todo.completed {
            completed_units += 1;
        }
    }

    for milestone in linked_milestones {
        total_units += 1;
        if milestone.completed {
            completed_units += 1;
        }
    }

    let percent = if total_units == 0 {
        0
    } else {
        ((completed_units * 100) / total_units) as u8
    };

    GoalProgress {
        completed_units,
        total_units,
        percent,
    }
}

pub fn parse_quick_capture(input: &str, now: DateTime<Local>) -> QuickCaptureDraft {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return QuickCaptureDraft {
            title: String::new(),
            scheduled_at: None,
        };
    }

    let mut scheduled_at = None;
    let mut title = trimmed.to_string();

    if title.contains("明天下午三点") {
        title = title.replace("明天下午三点", "").trim().to_string();
        scheduled_at = Some(relative_day_time(now, 1, 15, 0));
    } else if title.contains("明天三点") {
        title = title.replace("明天三点", "").trim().to_string();
        scheduled_at = Some(relative_day_time(now, 1, 15, 0));
    } else if title.contains("明天") {
        title = title.replace("明天", "").trim().to_string();
        scheduled_at = Some(relative_day_time(now, 1, 9, 0));
    } else if title.contains("今晚") {
        title = title.replace("今晚", "").trim().to_string();
        scheduled_at = Some(relative_day_time(now, 0, 20, 0));
    }

    QuickCaptureDraft {
        title,
        scheduled_at,
    }
}

fn relative_day_time(now: DateTime<Local>, day_offset: i64, hour: u32, minute: u32) -> DateTime<Local> {
    let target_day = now + chrono::Duration::days(day_offset);
    Local
        .with_ymd_and_hms(
            target_day.year(),
            target_day.month(),
            target_day.day(),
            hour,
            minute,
            0,
        )
        .single()
        .unwrap_or(target_day)
}
