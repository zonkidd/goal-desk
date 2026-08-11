pub mod backup;
pub mod bear;
pub mod domain;
pub mod eventkit;
pub mod repository;
pub mod service;
pub mod time_parser;

use chrono::Local;
use domain::{
    today_timeline, CalendarEvent, DeskTask, GoalStatus, GoalSummary, TaskStatus, TimelineItem,
    WorkspaceSnapshot,
};
use eventkit::SystemAgendaSnapshot;
use repository::SqliteRepository;
use serde::{Deserialize, Serialize};
use service::AppService;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};
#[cfg(desktop)]
use tauri_plugin_deep_link::DeepLinkExt;
#[cfg(desktop)]
use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct NullablePatch<T> {
    value: Option<T>,
}

impl<T> NullablePatch<T> {
    pub fn set(value: T) -> Self {
        Self { value: Some(value) }
    }

    pub fn clear() -> Self {
        Self { value: None }
    }
}

pub struct TaskFieldPatchCommand {
    pub title: String,
    pub planned_start_at: Option<NullablePatch<String>>,
    pub due_at: Option<NullablePatch<String>>,
    pub linked_goal_id: Option<NullablePatch<String>>,
    pub linked_goal_label: Option<NullablePatch<String>>,
    pub show_in_timeline: Option<bool>,
    pub system_reminder_id: Option<NullablePatch<String>>,
}

#[derive(Clone, Default)]
pub struct BearRequestState {
    pending: Arc<Mutex<bear::PendingBearRequests>>,
}

impl BearRequestState {
    fn insert(&self, task_id: Uuid, kind: bear::BearCallbackRequestKind) -> Result<String, String> {
        self.pending
            .lock()
            .map_err(|error| error.to_string())
            .map(|mut pending| pending.insert(task_id, kind))
    }

    fn consume_success_url(&self, raw_url: &str) -> Result<bear::AcceptedBearCallback, String> {
        self.pending
            .lock()
            .map_err(|error| error.to_string())?
            .consume_success_url(raw_url)
    }

    fn consume_error_url(&self, raw_url: &str) -> Result<bear::AcceptedBearErrorCallback, String> {
        self.pending
            .lock()
            .map_err(|error| error.to_string())?
            .consume_error_url(raw_url)
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct BearNoteErrorEvent {
    task_id: Option<String>,
    message: String,
}

impl TaskFieldPatchCommand {
    pub fn into_task_field_patch(self) -> Result<service::TaskFieldPatch, String> {
        Ok(service::TaskFieldPatch {
            title: self.title,
            planned_start_at: datetime_field_patch_from_command(self.planned_start_at)?,
            due_at: datetime_field_patch_from_command(self.due_at)?,
            linked_goal: goal_link_patch_from_command(self.linked_goal_id, self.linked_goal_label)?,
            show_in_timeline: self.show_in_timeline,
            system_reminder_id: string_field_patch_from_command(self.system_reminder_id),
        })
    }
}

fn parse_command_datetime(value: String) -> Result<chrono::DateTime<chrono::Local>, String> {
    chrono::DateTime::parse_from_rfc3339(&value)
        .map(|p| p.with_timezone(&chrono::Local))
        .map_err(|e| e.to_string())
}

fn datetime_field_patch_from_command(
    value: Option<NullablePatch<String>>,
) -> Result<service::NullableFieldPatch<chrono::DateTime<chrono::Local>>, String> {
    match value.map(|patch| patch.value) {
        Some(Some(value)) => parse_command_datetime(value).map(service::NullableFieldPatch::set),
        Some(None) => Ok(service::NullableFieldPatch::clear()),
        None => Ok(service::NullableFieldPatch::preserve()),
    }
}

fn goal_link_patch_from_command(
    goal_id: Option<NullablePatch<String>>,
    goal_label: Option<NullablePatch<String>>,
) -> Result<service::NullableFieldPatch<service::GoalLink>, String> {
    match (
        goal_id.map(|patch| patch.value),
        goal_label.map(|patch| patch.value),
    ) {
        (None, None) => Ok(service::NullableFieldPatch::preserve()),
        (Some(None), _) => Ok(service::NullableFieldPatch::clear()),
        (Some(Some(goal_id)), goal_label) if goal_id.trim().is_empty() => {
            let _ = goal_label;
            Ok(service::NullableFieldPatch::clear())
        }
        (Some(Some(goal_id)), goal_label) => Uuid::parse_str(&goal_id)
            .map(|id| {
                service::NullableFieldPatch::set(service::GoalLink {
                    id,
                    label: goal_label.flatten(),
                })
            })
            .map_err(|e| e.to_string()),
        (None, Some(None)) => Ok(service::NullableFieldPatch::preserve()),
        (None, Some(Some(_))) => Ok(service::NullableFieldPatch::preserve()),
    }
}

fn string_field_patch_from_command(
    value: Option<NullablePatch<String>>,
) -> service::NullableFieldPatch<String> {
    service::NullableFieldPatch::from_optional_patch(value.map(|patch| patch.value))
}

pub fn today_snapshot_data(path: &std::path::Path) -> Result<Vec<TimelineItem>, String> {
    let repository = SqliteRepository::new(path.to_path_buf());
    let snapshot = repository
        .load_workspace()
        .map_err(|error| error.to_string())?;
    Ok(timeline_from_workspace(&snapshot))
}

fn timeline_from_workspace(snapshot: &WorkspaceSnapshot) -> Vec<TimelineItem> {
    let now = Local::now();
    today_timeline(
        now.date_naive(),
        &snapshot.reminders,
        &empty_calendar_events(now),
    )
}

fn empty_calendar_events(_now: chrono::DateTime<Local>) -> Vec<CalendarEvent> {
    Vec::new()
}

pub fn reset_all_data_record(path: &std::path::Path) -> Result<(), String> {
    use rusqlite::Connection;

    let connection = Connection::open(path).map_err(|error| error.to_string())?;

    connection
        .execute_batch(
            "
            DELETE FROM desk_task_activity_logs;
            DELETE FROM desk_tasks;
            DELETE FROM todos;
            DELETE FROM projects;
            DELETE FROM goals;
            DELETE FROM areas WHERE id != '00000000-0000-0000-0000-000000000000';
            ",
        )
        .map_err(|error| error.to_string())?;

    Ok(())
}

fn empty_workspace_snapshot() -> WorkspaceSnapshot {
    WorkspaceSnapshot {
        areas: Vec::new(),
        projects: Vec::new(),
        goals: Vec::new(),
        reminders: Vec::new(),
    }
}

fn workspace_repository<R: tauri::Runtime>(app: &AppHandle<R>) -> Result<SqliteRepository, String> {
    let path = app
        .path()
        .app_local_data_dir()
        .map_err(|error| error.to_string())?
        .join("goal-desk.sqlite");
    Ok(SqliteRepository::new(path))
}

fn load_or_seed_workspace<R: tauri::Runtime>(
    app: &AppHandle<R>,
) -> Result<WorkspaceSnapshot, String> {
    let repository = workspace_repository(app)?;
    let snapshot = repository
        .load_workspace()
        .map_err(|error| error.to_string())?;

    if snapshot.areas.is_empty()
        && snapshot.projects.is_empty()
        && snapshot.goals.is_empty()
        && snapshot.reminders.is_empty()
    {
        let empty = empty_workspace_snapshot();
        repository
            .save_workspace(&empty)
            .map_err(|error| error.to_string())?;
        Ok(empty)
    } else {
        Ok(snapshot)
    }
}

fn ensure_quick_capture_window<R: tauri::Runtime>(
    app: &AppHandle<R>,
) -> Result<tauri::WebviewWindow<R>, String> {
    app.get_webview_window("quick-capture")
        .ok_or_else(|| "quick-capture window not found".to_string())
}

fn bear_note_url(note_id: &str) -> String {
    format!("bear://x-callback-url/open-note?id={note_id}")
}

fn open_macos_url(url: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = url;
        Err("URL opening only supported on macOS".to_string())
    }
}

#[cfg(desktop)]
fn handle_bear_deep_link<R: tauri::Runtime>(
    app: &AppHandle<R>,
    pending: &BearRequestState,
    raw_url: &str,
) {
    if raw_url.starts_with("kairos://bear-note-callback") {
        match pending.consume_success_url(raw_url) {
            Ok(accepted) => {
                let service = app.state::<AppService>();
                match service.bear.link_task_to_callback_note(
                    &accepted.request.task_id.to_string(),
                    accepted.note,
                ) {
                    Ok(linked) => {
                        let _ = app.emit("bear-note:linked", linked);
                    }
                    Err(error) => {
                        let _ = app.emit(
                            "bear-note:error",
                            BearNoteErrorEvent {
                                task_id: Some(accepted.request.task_id.to_string()),
                                message: error,
                            },
                        );
                    }
                }
            }
            Err(error) => {
                let _ = app.emit(
                    "bear-note:error",
                    BearNoteErrorEvent {
                        task_id: None,
                        message: error,
                    },
                );
            }
        }
        return;
    }

    if raw_url.starts_with("kairos://bear-note-error") {
        let error_event = match pending.consume_error_url(raw_url) {
            Ok(accepted) => BearNoteErrorEvent {
                task_id: Some(accepted.request.task_id.to_string()),
                message: accepted.message,
            },
            Err(error) => BearNoteErrorEvent {
                task_id: None,
                message: error,
            },
        };
        let _ = app.emit("bear-note:error", error_event);
    }
}

fn show_quick_capture_window_internal<R: tauri::Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let window = ensure_quick_capture_window(app)?;

    // Toggle: if window is already visible, hide it; otherwise show it
    if window.is_visible().unwrap_or(false) {
        window.hide().map_err(|error| error.to_string())
    } else {
        window.center().map_err(|error| error.to_string())?;
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())
    }
}

mod commands {
    use super::{
        bear_note_url, eventkit, load_or_seed_workspace, open_macos_url,
        show_quick_capture_window_internal, timeline_from_workspace, workspace_repository,
        BearRequestState, DeskTask, GoalStatus, GoalSummary, SystemAgendaSnapshot, TaskStatus,
        TimelineItem,
    };
    use crate::bear::{
        build_bear_note_preview_url, build_bear_selected_note_url, BearCallbackRequestKind,
        BearNotePreview,
    };
    use crate::service::AppService;
    use crate::service::BearIntegrationStatus;
    use chrono::{Datelike, Duration, Local, TimeZone};
    use tauri::{AppHandle, Emitter, State};
    use uuid::Uuid;

    #[tauri::command]
    pub fn today_snapshot(app: AppHandle) -> Result<Vec<TimelineItem>, String> {
        let snapshot = load_or_seed_workspace(&app)?;
        Ok(timeline_from_workspace(&snapshot))
    }

    #[tauri::command]
    pub fn goal_snapshot(svc: State<'_, AppService>) -> Result<Vec<GoalSummary>, String> {
        svc.goal.goal_summaries()
    }

    #[tauri::command]
    pub fn create_goal(
        svc: State<'_, AppService>,
        title: String,
        area: String,
        description: String,
        status: GoalStatus,
    ) -> Result<GoalSummary, String> {
        let goal = svc.goal.create_goal(&title, &area, &description, status)?;
        svc.goal.get_goal_summary_by_id(&goal.id.to_string())
    }

    #[tauri::command]
    pub fn update_goal_fields(
        svc: State<'_, AppService>,
        goal_id: String,
        title: String,
        area: String,
        description: String,
    ) -> Result<GoalSummary, String> {
        svc.goal
            .update_goal_fields(&goal_id, &title, &area, &description)?;
        svc.goal.get_goal_summary_by_id(&goal_id)
    }

    #[tauri::command]
    pub fn update_goal_status(
        svc: State<'_, AppService>,
        goal_id: String,
        status: GoalStatus,
    ) -> Result<GoalSummary, String> {
        svc.goal.update_goal_status(&goal_id, status)?;
        svc.goal.get_goal_summary_by_id(&goal_id)
    }

    #[tauri::command]
    pub fn list_areas(
        svc: State<'_, AppService>,
    ) -> Result<Vec<super::domain::AreaWithStats>, String> {
        svc.area.list_areas_with_stats()
    }

    #[tauri::command]
    pub fn create_area(
        svc: State<'_, AppService>,
        title: String,
    ) -> Result<super::domain::Area, String> {
        svc.area.create_area(&title)
    }

    #[tauri::command]
    pub fn rename_area(
        svc: State<'_, AppService>,
        area_id: String,
        new_title: String,
    ) -> Result<super::domain::Area, String> {
        svc.area.rename_area(&area_id, &new_title)
    }

    #[tauri::command]
    pub fn delete_area(
        svc: State<'_, AppService>,
        area_id: String,
        force: bool,
    ) -> Result<super::domain::DeleteAreaResult, String> {
        svc.area.delete_area(&area_id, force)
    }

    #[tauri::command]
    pub fn reset_all_data(app: AppHandle) -> Result<(), String> {
        let path = workspace_repository(&app)?.path().to_path_buf();
        super::reset_all_data_record(&path)
    }

    #[tauri::command]
    pub fn desk_task_list(svc: State<'_, AppService>) -> Result<Vec<DeskTask>, String> {
        svc.task.list_tasks()
    }

    #[tauri::command]
    pub fn capture_task(
        app: AppHandle,
        svc: State<'_, AppService>,
        input: String,
    ) -> Result<DeskTask, String> {
        let task = svc.task.capture_task(&input)?;
        let _ = app.emit("desk-task-created", &task);
        Ok(task)
    }

    #[tauri::command]
    pub fn create_task_for_goal(
        app: AppHandle,
        svc: State<'_, AppService>,
        goal_id: String,
        title: String,
    ) -> Result<DeskTask, String> {
        let task = svc.task.create_task_for_goal(&goal_id, &title)?;
        let _ = app.emit("desk-task-created", &task);
        Ok(task)
    }

    #[tauri::command]
    pub fn update_task_content(
        svc: State<'_, AppService>,
        task_id: String,
        content: String,
    ) -> Result<DeskTask, String> {
        svc.task.update_task_content(&task_id, &content)
    }

    #[tauri::command]
    pub fn update_task_fields(
        svc: State<'_, AppService>,
        task_id: String,
        title: String,
        planned_start_at: Option<crate::NullablePatch<String>>,
        due_at: Option<crate::NullablePatch<String>>,
        linked_goal_id: Option<crate::NullablePatch<String>>,
        linked_goal_label: Option<crate::NullablePatch<String>>,
        show_in_timeline: Option<bool>,
        system_reminder_id: Option<crate::NullablePatch<String>>,
    ) -> Result<DeskTask, String> {
        let patch = crate::TaskFieldPatchCommand {
            title,
            planned_start_at,
            due_at,
            linked_goal_id,
            linked_goal_label,
            show_in_timeline,
            system_reminder_id,
        }
        .into_task_field_patch()?;
        svc.task.update_task_fields_with_patch(&task_id, patch)
    }

    #[tauri::command]
    pub fn update_task_status(
        svc: State<'_, AppService>,
        task_id: String,
        status: TaskStatus,
        note: Option<String>,
    ) -> Result<DeskTask, String> {
        svc.task.update_task_status(&task_id, status, note)
    }

    #[tauri::command]
    pub fn add_task_note(
        svc: State<'_, AppService>,
        task_id: String,
        note: String,
    ) -> Result<DeskTask, String> {
        svc.task.add_task_note(&task_id, &note)
    }

    #[tauri::command]
    pub fn open_task_in_bear(svc: State<'_, AppService>, task_id: String) -> Result<(), String> {
        let task = svc
            .task
            .find_task(&task_id)?
            .ok_or_else(|| format!("Task not found: {task_id}"))?;
        let note_id = task
            .bear_note_id
            .as_ref()
            .ok_or_else(|| "This task is not linked to a Bear note".to_string())?;

        std::process::Command::new("open")
            .arg(bear_note_url(note_id))
            .status()
            .map_err(|error| error.to_string())
            .and_then(|status| {
                if status.success() {
                    Ok(())
                } else {
                    Err(format!("open exited with status {status}"))
                }
            })
    }

    #[tauri::command]
    pub fn get_bear_integration_status(
        svc: State<'_, AppService>,
    ) -> Result<BearIntegrationStatus, String> {
        svc.bear.integration_status()
    }

    #[tauri::command]
    pub fn save_bear_api_token(
        svc: State<'_, AppService>,
        token: String,
    ) -> Result<BearIntegrationStatus, String> {
        svc.bear.save_api_token(&token)
    }

    #[tauri::command]
    pub fn clear_bear_api_token(
        svc: State<'_, AppService>,
    ) -> Result<BearIntegrationStatus, String> {
        svc.bear.clear_api_token()
    }

    #[tauri::command]
    pub fn get_bear_note_preview(
        svc: State<'_, AppService>,
        task_id: String,
    ) -> Result<Option<BearNotePreview>, String> {
        svc.bear.get_note_preview(&task_id)
    }

    #[tauri::command]
    pub fn link_selected_bear_note(
        svc: State<'_, AppService>,
        pending: State<'_, BearRequestState>,
        task_id: String,
    ) -> Result<(), String> {
        let task_uuid = Uuid::parse_str(&task_id).map_err(|error| error.to_string())?;
        let _ = svc
            .task
            .find_task(&task_id)?
            .ok_or_else(|| format!("Task not found: {task_id}"))?;
        let token = svc
            .bear
            .bear_api_token()?
            .ok_or_else(|| "Bear API token is not configured".to_string())?;
        let request_id = pending.insert(task_uuid, BearCallbackRequestKind::LinkSelected)?;
        let url = build_bear_selected_note_url(&token, &request_id)?;
        open_macos_url(&url)
    }

    #[tauri::command]
    pub fn refresh_bear_note_preview(
        svc: State<'_, AppService>,
        pending: State<'_, BearRequestState>,
        task_id: String,
    ) -> Result<(), String> {
        let task_uuid = Uuid::parse_str(&task_id).map_err(|error| error.to_string())?;
        let task = svc
            .task
            .find_task(&task_id)?
            .ok_or_else(|| format!("Task not found: {task_id}"))?;
        let note_id = task
            .bear_note_id
            .as_deref()
            .ok_or_else(|| "This task is not linked to a Bear note".to_string())?;
        let request_id = pending.insert(task_uuid, BearCallbackRequestKind::RefreshPreview)?;
        let url = build_bear_note_preview_url(note_id, &request_id)?;
        open_macos_url(&url)
    }

    #[tauri::command]
    pub fn unlink_bear_note(
        app: AppHandle,
        svc: State<'_, AppService>,
        task_id: String,
    ) -> Result<DeskTask, String> {
        let task = svc.bear.unlink_note(&task_id)?;
        let _ = app.emit("bear-note:unlinked", &task);
        Ok(task)
    }

    #[tauri::command]
    pub fn show_quick_capture_window(app: AppHandle) -> Result<(), String> {
        show_quick_capture_window_internal(&app)
    }

    #[tauri::command]
    pub fn eventkit_snapshot(app: AppHandle) -> Result<SystemAgendaSnapshot, String> {
        let now = Local::now();
        let start = Local
            .with_ymd_and_hms(now.year(), now.month(), now.day(), 0, 0, 0)
            .single()
            .unwrap_or(now);
        let end = start + Duration::days(7);
        eventkit::load_snapshot(&app, start, end)
    }

    #[tauri::command]
    pub fn load_calendar_range(
        app: AppHandle,
        start_date: String, // ISO 8601 format: "2026-06-09"
        end_date: String,   // ISO 8601 format: "2026-06-29"
    ) -> Result<eventkit::CalendarRangeData, String> {
        use chrono::NaiveDate;

        // Parse date strings
        let start_parsed = NaiveDate::parse_from_str(&start_date, "%Y-%m-%d")
            .map_err(|e| format!("Invalid start_date format: {}", e))?;
        let end_parsed = NaiveDate::parse_from_str(&end_date, "%Y-%m-%d")
            .map_err(|e| format!("Invalid end_date format: {}", e))?;

        // Convert to DateTime<Local> at start of day
        let start = Local
            .from_local_datetime(&start_parsed.and_hms_opt(0, 0, 0).unwrap())
            .single()
            .ok_or_else(|| "Failed to convert start_date to local time".to_string())?;

        let end = Local
            .from_local_datetime(&end_parsed.and_hms_opt(23, 59, 59).unwrap())
            .single()
            .ok_or_else(|| "Failed to convert end_date to local time".to_string())?;

        eventkit::load_calendar_range(&app, start, end)
    }

    #[tauri::command]
    pub async fn request_calendar_access() -> Result<eventkit::AccessStatus, String> {
        eventkit::request_calendar_access_async().await
    }

    #[tauri::command]
    pub async fn request_reminders_access() -> Result<eventkit::AccessStatus, String> {
        eventkit::request_reminders_access_async().await
    }

    #[tauri::command]
    pub fn open_url(url: String) -> Result<(), String> {
        open_macos_url(&url)
    }

    #[tauri::command]
    pub fn open_system_reminder(reminder_id: String) -> Result<(), String> {
        open_url(format!("x-apple-reminder://{reminder_id}"))
    }

    #[tauri::command]
    pub fn soft_delete_task(svc: State<'_, AppService>, task_id: String) -> Result<(), String> {
        svc.task.soft_delete_task(&task_id)
    }

    #[tauri::command]
    pub fn restore_task(svc: State<'_, AppService>, task_id: String) -> Result<DeskTask, String> {
        svc.task.restore_task(&task_id)
    }

    #[tauri::command]
    pub fn list_deleted_tasks(svc: State<'_, AppService>) -> Result<Vec<DeskTask>, String> {
        svc.task.list_deleted_tasks()
    }

    #[tauri::command]
    pub fn soft_delete_goal(svc: State<'_, AppService>, goal_id: String) -> Result<(), String> {
        svc.goal.soft_delete_goal(&goal_id)
    }

    #[tauri::command]
    pub fn restore_goal(
        svc: State<'_, AppService>,
        goal_id: String,
    ) -> Result<GoalSummary, String> {
        svc.goal.restore_goal(&goal_id)
    }

    #[tauri::command]
    pub fn list_deleted_goals(svc: State<'_, AppService>) -> Result<Vec<GoalSummary>, String> {
        svc.goal.list_deleted_goals()
    }

    #[tauri::command]
    pub fn create_daily_review_item(
        svc: State<'_, AppService>,
        date: String,
        blocks: Vec<crate::domain::DailyReviewBlock>,
    ) -> Result<crate::domain::DailyReviewItem, String> {
        svc.daily_review.create_item(&date, blocks)
    }

    #[tauri::command]
    pub fn update_daily_review_item(
        svc: State<'_, AppService>,
        id: String,
        blocks: Vec<crate::domain::DailyReviewBlock>,
    ) -> Result<crate::domain::DailyReviewItem, String> {
        let parsed_id = uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?;
        svc.daily_review.update_item(parsed_id, blocks)
    }

    #[tauri::command]
    pub fn delete_daily_review_item(
        svc: State<'_, AppService>,
        id: String,
    ) -> Result<(), String> {
        let parsed_id = uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?;
        svc.daily_review.delete_item(parsed_id)
    }

    #[tauri::command]
    pub fn get_daily_review_timeline(
        svc: State<'_, AppService>,
        limit: u32,
        offset: u32,
    ) -> Result<Vec<crate::domain::DailyReviewItem>, String> {
        svc.daily_review.get_timeline(limit, offset)
    }

    #[tauri::command]
    pub fn export_database(app: AppHandle, target_path: String) -> Result<(), String> {
        let db_path = workspace_repository(&app)?.path().to_path_buf();
        
        if let Some(parent) = std::path::Path::new(&target_path).parent() {
            std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create backup directory: {}", e))?;
        }

        std::fs::copy(&db_path, &target_path).map_err(|e| format!("Failed to export database: {}", e))?;
        Ok(())
    }

    #[tauri::command]
    pub fn import_database(app: AppHandle, source_path: String) -> Result<(), String> {
        let db_path = workspace_repository(&app)?.path().to_path_buf();
        std::fs::copy(&source_path, &db_path).map_err(|e| format!("Failed to import database: {}", e))?;
        Ok(())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_deep_link::init())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .setup(|app| {
            let path = app
                .handle()
                .path()
                .app_local_data_dir()
                .map_err(|error| error.to_string())?
                .join("goal-desk.sqlite");
                
            let backup_app_handle = app.handle().clone();
            let backup_db_path = path.clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    crate::backup::perform_auto_backup(&backup_app_handle, backup_db_path.clone());
                    // Sleep for 1 hour
                    tokio::time::sleep(std::time::Duration::from_secs(3600)).await;
                }
            });

            let repo = SqliteRepository::new(path);
            let app_service = AppService::new(repo);
            app_service.initialize().map_err(|e| e.to_string())?;
            app.handle().manage(app_service);
            let bear_requests = BearRequestState::default();
            let bear_requests_for_events = bear_requests.clone();
            app.handle().manage(bear_requests);

            #[cfg(desktop)]
            {
                let deep_link_handle = app.handle().clone();
                app.deep_link().on_open_url(move |event| {
                    for url in event.urls() {
                        handle_bear_deep_link(
                            &deep_link_handle,
                            &bear_requests_for_events,
                            url.as_str(),
                        );
                    }
                });

                let handle = app.handle().clone();
                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_shortcuts(["alt+space"])?
                        .with_handler(move |_app, shortcut, event| {
                            if event.state == ShortcutState::Pressed
                                && shortcut.matches(Modifiers::ALT, Code::Space)
                            {
                                let _ = show_quick_capture_window_internal(&handle);
                            }
                        })
                        .build(),
                )?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::today_snapshot,
            commands::goal_snapshot,
            commands::create_goal,
            commands::update_goal_fields,
            commands::update_goal_status,
            commands::list_areas,
            commands::create_area,
            commands::rename_area,
            commands::delete_area,
            commands::reset_all_data,
            commands::desk_task_list,
            commands::capture_task,
            commands::create_task_for_goal,
            commands::update_task_content,
            commands::update_task_fields,
            commands::update_task_status,
            commands::add_task_note,
            commands::open_task_in_bear,
            commands::get_bear_integration_status,
            commands::save_bear_api_token,
            commands::clear_bear_api_token,
            commands::link_selected_bear_note,
            commands::refresh_bear_note_preview,
            commands::get_bear_note_preview,
            commands::unlink_bear_note,
            commands::show_quick_capture_window,
            commands::eventkit_snapshot,
            commands::load_calendar_range,
            commands::request_calendar_access,
            commands::request_reminders_access,
            commands::open_url,
            commands::open_system_reminder,
            commands::soft_delete_task,
            commands::restore_task,
            commands::list_deleted_tasks,
            commands::soft_delete_goal,
            commands::restore_goal,
            commands::list_deleted_goals,
            commands::create_daily_review_item,
            commands::update_daily_review_item,
            commands::delete_daily_review_item,
            commands::get_daily_review_timeline,
            commands::export_database,
            commands::import_database
        ])
        .build(tauri::generate_context!())
        .expect("error while running Kairos")
        .run(|app_handle, event| {
            match event {
                tauri::RunEvent::Reopen { .. } => {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                tauri::RunEvent::ExitRequested { .. } => {
                    app_handle.exit(0);
                }
                _ => {}
            }
        });
}
