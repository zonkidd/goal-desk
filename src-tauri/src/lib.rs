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
use service::AppService;
use tauri::{AppHandle, Manager};
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

fn ensure_quick_capture_window<R: tauri::Runtime>(app: &AppHandle<R>) -> Result<tauri::WebviewWindow<R>, String> {
    app.get_webview_window("quick-capture")
        .ok_or_else(|| "quick-capture window not found".to_string())
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
        bear_note_url, eventkit, load_or_seed_workspace,
        show_quick_capture_window_internal,
        timeline_from_workspace, workspace_repository, DeskTask, GoalStatus,
        GoalSummary, SystemAgendaSnapshot, SystemReminder, TaskStatus, TimelineItem,
    };
    use crate::domain;
    use crate::service::AppService;
    use chrono::{Datelike, Duration, Local, TimeZone};
    use tauri::{AppHandle, Emitter, State};

    fn maybe_create_task_system_reminder(
        app: &AppHandle,
        title: &str,
        due_at: Option<chrono::DateTime<Local>>,
    ) -> Option<String> {
        eventkit::create_system_reminder(app, title, due_at)
            .ok()
            .map(|reminder| reminder.id)
    }

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
        svc.goal.update_goal_fields(&goal_id, &title, &area, &description)?;
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
    pub fn list_areas(svc: State<'_, AppService>) -> Result<Vec<super::domain::AreaWithStats>, String> {
        svc.area.list_areas_with_stats()
    }

    #[tauri::command]
    pub fn create_area(svc: State<'_, AppService>, title: String) -> Result<super::domain::Area, String> {
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
    pub fn capture_task(app: AppHandle, svc: State<'_, AppService>, input: String) -> Result<DeskTask, String> {
        let task = svc.task.capture_task(&input)?;

        let reminder_time = task.planned_start_at.or(task.due_at);
        let final_task = if let Some(reminder_id) = maybe_create_task_system_reminder(&app, &task.title, reminder_time) {
            svc.task.capture_task_with_system_reminder(&task.id.to_string(), reminder_id)?
        } else {
            task
        };

        let _ = app.emit("desk-task-created", &final_task);
        Ok(final_task)
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
        planned_start_at: Option<String>,
        due_at: Option<String>,
        linked_goal_id: Option<String>,
        linked_goal_label: Option<String>,
        show_in_timeline: Option<bool>,
        system_reminder_id: Option<String>,
    ) -> Result<DeskTask, String> {
        svc.task.update_task_fields(
            &task_id,
            &title,
            planned_start_at,
            due_at,
            linked_goal_id,
            linked_goal_label,
            show_in_timeline,
            system_reminder_id,
        )
    }

    #[tauri::command]
    pub fn update_task_status(
        app: AppHandle,
        svc: State<'_, AppService>,
        task_id: String,
        status: TaskStatus,
        note: Option<String>,
    ) -> Result<DeskTask, String> {
        let app_handle = app.clone();

        svc.task.update_task_status_with_effects(
            &task_id,
            status,
            note,
            domain::SideEffect::ReminderSync(Box::new(move |reminder_id: &str, done: bool| {
                eventkit::set_system_reminder_completed(&app_handle, reminder_id, done).map(|_| ())
            })),
        )
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
        let task = svc.task
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
        svc: State<'_, AppService>,
        reminder_id: String,
        done: bool,
    ) -> Result<SystemReminder, String> {
        let reminder = eventkit::set_system_reminder_completed(&app, &reminder_id, done)?;
        svc.task.sync_task_system_reminder_by_reminder_id(&reminder_id, done)?;
        Ok(reminder)
    }

    #[tauri::command]
    pub fn create_system_reminder(
        app: AppHandle,
        title: String,
        due_at: Option<String>,
    ) -> Result<SystemReminder, String> {
        let due = due_at
            .map(|s| chrono::DateTime::parse_from_rfc3339(&s).map(|dt| dt.with_timezone(&chrono::Local)))
            .transpose()
            .map_err(|e| format!("Invalid due_at format: {e}"))?;
        eventkit::create_system_reminder(&app, &title, due)
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

    #[tauri::command]
    pub fn soft_delete_task(
        svc: State<'_, AppService>,
        task_id: String,
    ) -> Result<(), String> {
        svc.task.soft_delete_task(&task_id)
    }

    #[tauri::command]
    pub fn restore_task(
        svc: State<'_, AppService>,
        task_id: String,
    ) -> Result<DeskTask, String> {
        svc.task.restore_task(&task_id)
    }

    #[tauri::command]
    pub fn list_deleted_tasks(
        svc: State<'_, AppService>,
    ) -> Result<Vec<DeskTask>, String> {
        svc.task.list_deleted_tasks()
    }

    #[tauri::command]
    pub fn soft_delete_goal(
        svc: State<'_, AppService>,
        goal_id: String,
    ) -> Result<(), String> {
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
    pub fn list_deleted_goals(
        svc: State<'_, AppService>,
    ) -> Result<Vec<GoalSummary>, String> {
        svc.goal.list_deleted_goals()
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let path = app
                .handle()
                .path()
                .app_local_data_dir()
                .map_err(|error| error.to_string())?
                .join("goal-desk.sqlite");
            let repo = SqliteRepository::new(path);
            let app_service = AppService::new(repo);
            app_service.initialize().map_err(|e| e.to_string())?;
            app.handle().manage(app_service);

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
            commands::create_system_reminder,
            commands::open_url,
            commands::soft_delete_task,
            commands::restore_task,
            commands::list_deleted_tasks,
            commands::soft_delete_goal,
            commands::restore_goal,
            commands::list_deleted_goals
        ])
        .run(tauri::generate_context!())
        .expect("error while running Goal Desk");
}
