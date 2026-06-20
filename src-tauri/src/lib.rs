pub mod domain;
pub mod eventkit;
pub mod repository;
pub mod service;
pub mod time_parser;

use chrono::Local;
use domain::{
    today_timeline, CalendarEvent, DeskTask,
    GoalStatus, GoalSummary, TaskStatus, TimelineItem,
    WorkspaceSnapshot,
};
use eventkit::{SystemAgendaSnapshot, SystemReminder};
use repository::SqliteRepository;
use tauri::{AppHandle, Manager, TitleBarStyle, WebviewUrl, WebviewWindowBuilder};
#[cfg(desktop)]
use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};

pub fn today_snapshot_data(path: &std::path::Path) -> Result<Vec<TimelineItem>, String> {
    let repository = SqliteRepository::new(path.to_path_buf());
    let snapshot = repository.load_workspace().map_err(|error| error.to_string())?;
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

fn load_or_seed_workspace<R: tauri::Runtime>(app: &AppHandle<R>) -> Result<WorkspaceSnapshot, String> {
    let repository = workspace_repository(app)?;
    let snapshot = repository.load_workspace().map_err(|error| error.to_string())?;

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

fn load_or_seed_desk_tasks<R: tauri::Runtime>(app: &AppHandle<R>) -> Result<Vec<DeskTask>, String> {
    let repository = workspace_repository(app)?;
    let tasks = repository.load_desk_tasks().map_err(|error| error.to_string())?;

    if tasks.is_empty() {
        Ok(tasks)
    } else {
        Ok(tasks)
    }
}

fn ensure_quick_capture_window<R: tauri::Runtime>(app: &AppHandle<R>) -> Result<tauri::WebviewWindow<R>, String> {
    if let Some(window) = app.get_webview_window("quick-capture") {
        return Ok(window);
    }

    WebviewWindowBuilder::new(app, "quick-capture", WebviewUrl::App("index.html?view=quick-capture".into()))
        .title("Quick Capture")
        .inner_size(520.0, 240.0)
        .resizable(false)
        .maximizable(false)
        .minimizable(false)
        .closable(true)
        .always_on_top(true)
        .visible(false)
        .focused(true)
        .skip_taskbar(true)
        .decorations(false)
        .title_bar_style(TitleBarStyle::Overlay)
        .build()
        .map_err(|error| error.to_string())
}

fn bear_note_url(note_id: &str) -> String {
    format!("bear://x-callback-url/open-note?id={note_id}")
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
        bear_note_url, eventkit, load_or_seed_desk_tasks,
        load_or_seed_workspace, show_quick_capture_window_internal,
        timeline_from_workspace, workspace_repository, DeskTask, GoalStatus,
        GoalSummary, SystemAgendaSnapshot, SystemReminder, TaskStatus, TimelineItem,
    };
    use crate::service::{AreaService, GoalService, TaskService};
    use chrono::{Datelike, Duration, Local, TimeZone};
    use tauri::{AppHandle, Emitter};
    use uuid::Uuid;

    fn goal_service(app: &AppHandle) -> Result<GoalService, String> {
        Ok(GoalService::new(workspace_repository(app)?))
    }

    fn task_service(app: &AppHandle) -> Result<TaskService, String> {
        Ok(TaskService::new(workspace_repository(app)?))
    }

    fn area_service(app: &AppHandle) -> Result<AreaService, String> {
        Ok(AreaService::new(workspace_repository(app)?))
    }

    fn maybe_create_task_system_reminder(
        app: &AppHandle,
        title: &str,
        due_at: Option<chrono::DateTime<Local>>,
    ) -> Option<String> {
        eventkit::create_system_reminder(app, title, due_at)
            .ok()
            .map(|reminder| reminder.id)
    }

    fn sync_linked_tasks_for_system_reminder(
        app: &AppHandle,
        reminder_id: &str,
        done: bool,
    ) -> Result<(), String> {
        let service = task_service(app)?;
        service.sync_linked_tasks_for_system_reminder(reminder_id, done)
    }

    fn goal_summary_by_id(app: &AppHandle, goal_id: &str) -> Result<GoalSummary, String> {
        let service = goal_service(app)?;
        service.get_goal_summary_by_id(goal_id)
    }

    #[tauri::command]
    pub fn today_snapshot(app: AppHandle) -> Result<Vec<TimelineItem>, String> {
        let snapshot = load_or_seed_workspace(&app)?;
        Ok(timeline_from_workspace(&snapshot))
    }

    #[tauri::command]
    pub fn goal_snapshot(app: AppHandle) -> Result<Vec<GoalSummary>, String> {
        let service = goal_service(&app)?;
        service.goal_summaries()
    }

    #[tauri::command]
    pub fn create_goal(
        app: AppHandle,
        title: String,
        area: String,
        description: String,
        _status: GoalStatus,
    ) -> Result<GoalSummary, String> {
        let service = goal_service(&app)?;
        let goal = service.create_goal(&title, &area, &description)?;
        goal_summary_by_id(&app, &goal.id.to_string())
    }

    #[tauri::command]
    pub fn update_goal_fields(
        app: AppHandle,
        goal_id: String,
        title: String,
        area: String,
        description: String,
    ) -> Result<GoalSummary, String> {
        let service = goal_service(&app)?;
        service.update_goal_fields(&goal_id, &title, &area, &description)?;
        goal_summary_by_id(&app, &goal_id)
    }

    #[tauri::command]
    pub fn update_goal_status(
        app: AppHandle,
        goal_id: String,
        status: GoalStatus,
    ) -> Result<GoalSummary, String> {
        let service = goal_service(&app)?;
        service.update_goal_status(&goal_id, status)?;
        goal_summary_by_id(&app, &goal_id)
    }

    #[tauri::command]
    pub fn list_areas(app: AppHandle) -> Result<Vec<super::domain::AreaWithStats>, String> {
        let service = goal_service(&app)?;
        service.list_areas_with_stats()
    }

    #[tauri::command]
    pub fn create_area(app: AppHandle, title: String) -> Result<super::domain::Area, String> {
        let service = area_service(&app)?;
        service.create_area(&title)
    }

    #[tauri::command]
    pub fn rename_area(
        app: AppHandle,
        area_id: String,
        new_title: String,
    ) -> Result<super::domain::Area, String> {
        let service = area_service(&app)?;
        service.rename_area(&area_id, &new_title)
    }

    #[tauri::command]
    pub fn delete_area(
        app: AppHandle,
        area_id: String,
        force: bool,
    ) -> Result<super::domain::DeleteAreaResult, String> {
        let service = area_service(&app)?;
        service.delete_area(&area_id, force)
    }

    #[tauri::command]
    pub fn reset_all_data(app: AppHandle) -> Result<(), String> {
        let path = workspace_repository(&app)?.path().to_path_buf();
        super::reset_all_data_record(&path)
    }

    #[tauri::command]
    pub fn desk_task_list(app: AppHandle) -> Result<Vec<DeskTask>, String> {
        let service = task_service(&app)?;
        service.list_tasks()
    }

    #[tauri::command]
    pub fn capture_task(app: AppHandle, input: String) -> Result<DeskTask, String> {
        let service = task_service(&app)?;
        let task = service.capture_task(&input)?;

        // EventKit: create system reminder if time was parsed
        let reminder_time = task.planned_start_at.or(task.due_at);
        if let Some(reminder_id) = maybe_create_task_system_reminder(&app, &task.title, reminder_time) {
            let updated = service.update_task_system_reminder_id(&task.id.to_string(), Some(reminder_id))?;
            let _ = app.emit("desk-task-created", &updated);
            return Ok(updated);
        }

        let _ = app.emit("desk-task-created", &task);
        Ok(task)
    }

    #[tauri::command]
    pub fn create_task_for_goal(
        app: AppHandle,
        goal_id: String,
        title: String,
    ) -> Result<DeskTask, String> {
        let service = task_service(&app)?;
        let task = service.create_task_for_goal(&goal_id, &title)?;
        let _ = app.emit("desk-task-created", &task);
        Ok(task)
    }

    #[tauri::command]
    pub fn update_task_content(
        app: AppHandle,
        task_id: String,
        content: String,
    ) -> Result<DeskTask, String> {
        let service = task_service(&app)?;
        service.update_task_content(&task_id, &content)
    }

    #[tauri::command]
    pub fn update_task_fields(
        app: AppHandle,
        task_id: String,
        title: String,
        planned_start_at: Option<String>,
        due_at: Option<String>,
        linked_goal_id: Option<String>,
        linked_goal_label: Option<String>,
        show_in_timeline: Option<bool>,
    ) -> Result<DeskTask, String> {
        let service = task_service(&app)?;
        service.update_task_fields(
            &task_id,
            &title,
            planned_start_at,
            due_at,
            linked_goal_id,
            linked_goal_label,
            show_in_timeline,
        )
    }

    #[tauri::command]
    pub fn update_task_status(
        app: AppHandle,
        task_id: String,
        status: TaskStatus,
        note: Option<String>,
    ) -> Result<DeskTask, String> {
        let service = task_service(&app)?;
        let app_handle = app.clone();

        service.update_task_status_with_sync(
            &task_id,
            status,
            note,
            Some(Box::new(move |reminder_id: &str, done: bool| {
                eventkit::set_system_reminder_completed(&app_handle, reminder_id, done).map(|_| ())
            })),
        )
    }

    #[tauri::command]
    pub fn add_task_note(
        app: AppHandle,
        task_id: String,
        note: String,
    ) -> Result<DeskTask, String> {
        let service = task_service(&app)?;
        service.add_task_note(&task_id, &note)
    }

    #[tauri::command]
    pub fn open_task_in_bear(app: AppHandle, task_id: String) -> Result<(), String> {
        let service = task_service(&app)?;
        let task = service
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
        start_date: String,  // ISO 8601 format: "2026-06-09"
        end_date: String,     // ISO 8601 format: "2026-06-29"
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
    pub fn set_system_reminder_completed(
        app: AppHandle,
        reminder_id: String,
        done: bool,
    ) -> Result<SystemReminder, String> {
        let reminder = eventkit::set_system_reminder_completed(&app, &reminder_id, done)?;
        sync_linked_tasks_for_system_reminder(&app, &reminder_id, done)?;
        Ok(reminder)
    }

    #[tauri::command]
    pub fn open_url(url: String) -> Result<(), String> {
        #[cfg(target_os = "macos")]
        {
            std::process::Command::new("open")
                .arg(&url)
                .spawn()
                .map_err(|e| format!("Failed to open URL: {}", e))?;
            Ok(())
        }

        #[cfg(not(target_os = "macos"))]
        {
            Err("URL opening only supported on macOS".to_string())
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(desktop)]
            {
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
            commands::show_quick_capture_window,
            commands::eventkit_snapshot,
            commands::load_calendar_range,
            commands::request_calendar_access,
            commands::request_reminders_access,
            commands::set_system_reminder_completed,
            commands::open_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running Goal Desk");
}
