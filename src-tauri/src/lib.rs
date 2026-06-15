pub mod domain;
pub mod eventkit;
pub mod repository;
pub mod time_parser;
pub mod workspace_session;

use chrono::Local;
use domain::{
    goal_progress, parse_quick_capture, today_timeline, Area, CalendarEvent, DeskTask, Goal,
    GoalStatus, GoalSummary, TaskActivityAction, TaskActivityLog, TaskStatus, TimelineItem,
    WorkspaceSnapshot, UNCATEGORIZED_AREA_ID,
};
use eventkit::{SystemAgendaSnapshot, SystemReminder};
use repository::SqliteRepository;
use tauri::{AppHandle, Manager, TitleBarStyle, WebviewUrl, WebviewWindowBuilder};
use uuid::Uuid;
#[cfg(desktop)]
use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};

pub fn today_snapshot_data(path: &std::path::Path) -> Result<Vec<TimelineItem>, String> {
    let repository = SqliteRepository::new(path.to_path_buf());
    let snapshot = repository.load_workspace().map_err(|error| error.to_string())?;
    Ok(timeline_from_workspace(&snapshot))
}

pub fn goal_snapshot_data(path: &std::path::Path) -> Result<Vec<GoalSummary>, String> {
    let repository = SqliteRepository::new(path.to_path_buf());
    let snapshot = repository.load_workspace().map_err(|error| error.to_string())?;
    Ok(goal_summaries(&snapshot))
}

pub fn create_goal_record(
    path: &std::path::Path,
    title: String,
    area: String,
    description: String,
    status: GoalStatus,
) -> Result<Goal, String> {
    use repository::GoalRepository;
    use workspace_session::WorkspaceSession;

    let trimmed_title = title.trim();
    if trimmed_title.is_empty() {
        return Err("Goal title cannot be empty".to_string());
    }

    let trimmed_area = area.trim();
    let area_title = if trimmed_area.is_empty() {
        "未分类"
    } else {
        trimmed_area
    };

    let repository = SqliteRepository::new(path.to_path_buf());
    let mut session = WorkspaceSession::load(&repository)?;
    let goal = session.create_goal(
        trimmed_title.to_string(),
        area_title.to_string(),
        description,
        status,
    )?;

    // 提交 snapshot 变更
    session.commit()?;

    // 持久化 goal 到独立表
    GoalRepository::create(&repository, &goal)
        .map_err(|error| error.to_string())?;
    Ok(goal)
}

pub fn update_goal_record(
    path: &std::path::Path,
    goal_id: String,
    title: String,
    area: String,
    description: String,
    status: GoalStatus,
) -> Result<Goal, String> {
    use repository::GoalRepository;
    use workspace_session::WorkspaceSession;

    let trimmed_title = title.trim();
    if trimmed_title.is_empty() {
        return Err("Goal title cannot be empty".to_string());
    }

    let trimmed_area = area.trim();
    let area_title = if trimmed_area.is_empty() {
        "未分类"
    } else {
        trimmed_area
    };

    let goal_id = Uuid::parse_str(&goal_id).map_err(|error| error.to_string())?;
    let repository = SqliteRepository::new(path.to_path_buf());

    // 加载 session 并确保 area 存在
    let mut session = WorkspaceSession::load(&repository)?;
    let area_id = session.ensure_area(area_title);

    // 读取并更新 goal
    let mut goal = GoalRepository::find(&repository, goal_id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| format!("Goal not found: {goal_id}"))?;

    goal.title = trimmed_title.to_string();
    goal.area_id = Some(area_id);
    goal.description = description;
    goal.status = status;

    // 提交 snapshot 变更（如果创建了新 area）
    session.commit()?;

    // 持久化 goal 更新
    GoalRepository::update(&repository, &goal)
        .map_err(|error| error.to_string())?;
    Ok(goal)
}

pub fn update_goal_status_record(
    path: &std::path::Path,
    goal_id: String,
    status: GoalStatus,
) -> Result<Goal, String> {
    use repository::GoalRepository;

    let goal_id = Uuid::parse_str(&goal_id).map_err(|error| error.to_string())?;
    let repository = SqliteRepository::new(path.to_path_buf());

    // 使用 GoalRepository trait 读取单个 goal
    let mut goal = GoalRepository::find(&repository, goal_id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| format!("Goal not found: {goal_id}"))?;

    // 使用领域方法验证状态转换
    if !goal.can_transition_to(status) {
        return Err(format!(
            "Invalid status transition from {:?} to {:?}",
            goal.status, status
        ));
    }

    goal.status = status;

    // 使用 GoalRepository trait 更新单个字段
    GoalRepository::update(&repository, &goal)
        .map_err(|error| error.to_string())?;
    Ok(goal)
}

pub fn create_task_for_goal_record(
    path: &std::path::Path,
    goal_id: String,
    title: String,
) -> Result<DeskTask, String> {
    let trimmed_title = title.trim();
    if trimmed_title.is_empty() {
        return Err("Task title cannot be empty".to_string());
    }

    let goal_id = Uuid::parse_str(&goal_id).map_err(|error| error.to_string())?;
    let repository = SqliteRepository::new(path.to_path_buf());
    let snapshot = repository.load_workspace().map_err(|error| error.to_string())?;
    let goal = snapshot
        .goals
        .iter()
        .find(|goal| goal.id == goal_id)
        .ok_or_else(|| format!("Goal not found: {goal_id}"))?;

    let mut tasks = repository.load_desk_tasks().map_err(|error| error.to_string())?;

    // 使用 Goal 的领域方法创建任务
    let task = goal.create_task(trimmed_title.to_string());

    tasks.insert(0, task.clone());
    repository
        .save_desk_tasks(&tasks)
        .map_err(|error| error.to_string())?;
    Ok(task)
}

fn timeline_from_workspace(snapshot: &WorkspaceSnapshot) -> Vec<TimelineItem> {
    let now = Local::now();
    today_timeline(
        now.date_naive(),
        &snapshot.todos,
        &snapshot.reminders,
        &empty_calendar_events(now),
    )
}

fn goal_summaries(snapshot: &WorkspaceSnapshot) -> Vec<GoalSummary> {
    snapshot
        .goals
        .iter()
        .map(|goal| {
            let progress = goal_progress(goal.id, &snapshot.todos, &snapshot.milestones);
            GoalSummary {
                id: goal.id.to_string(),
                title: goal.title.clone(),
                area: goal
                    .area_id
                    .and_then(|area_id| snapshot.areas.iter().find(|area| area.id == area_id))
                    .map(|area| area.title.clone())
                    .unwrap_or_else(|| "Unsorted".to_string()),
                description: goal.description.clone(),
                status: goal.status,
                progress: progress.percent,
                task_count: snapshot
                    .todos
                    .iter()
                    .filter(|todo| todo.goal_id == Some(goal.id))
                    .count(),
                next_todo: snapshot
                    .todos
                    .iter()
                    .find(|todo| todo.goal_id == Some(goal.id) && !todo.completed)
                    .map(|todo| todo.title.clone())
                    .unwrap_or_default(),
            }
        })
        .collect()
}

pub fn list_areas_with_stats(path: &std::path::Path) -> Result<Vec<domain::AreaWithStats>, String> {
    let repository = SqliteRepository::new(path.to_path_buf());
    let snapshot = repository.load_workspace().map_err(|error| error.to_string())?;

    let mut areas_with_stats: Vec<domain::AreaWithStats> = snapshot
        .areas
        .iter()
        .map(|area| {
            let goals_in_area: Vec<&Goal> = snapshot
                .goals
                .iter()
                .filter(|goal| goal.area_id == Some(area.id))
                .collect();

            let goal_count = goals_in_area.len();
            let active_goal_count = goals_in_area
                .iter()
                .filter(|goal| goal.status == GoalStatus::Active)
                .count();

            domain::AreaWithStats {
                id: area.id,
                title: area.title.clone(),
                goal_count,
                active_goal_count,
                is_system: area.is_system,
            }
        })
        .collect();

    areas_with_stats.sort_by(|a, b| a.title.cmp(&b.title));
    Ok(areas_with_stats)
}

pub fn create_area_record(path: &std::path::Path, title: String) -> Result<Area, String> {
    use repository::AreaRepository;

    let trimmed_title = title.trim();
    if trimmed_title.is_empty() {
        return Err("Area title cannot be empty".to_string());
    }

    let repository = SqliteRepository::new(path.to_path_buf());

    // 检查是否已存在
    let existing_areas = AreaRepository::list(&repository).map_err(|error| error.to_string())?;
    if existing_areas.iter().any(|area| area.title.to_lowercase() == trimmed_title.to_lowercase()) {
        return Err(format!("Area '{}' already exists", trimmed_title));
    }

    let area = Area {
        id: Uuid::new_v4(),
        title: trimmed_title.to_string(),
        is_system: false,
    };

    AreaRepository::create(&repository, &area)
        .map_err(|error| error.to_string())?;
    Ok(area)
}

pub fn rename_area_record(path: &std::path::Path, area_id: String, new_title: String) -> Result<Area, String> {
    use repository::AreaRepository;

    let trimmed_title = new_title.trim();
    if trimmed_title.is_empty() {
        return Err("Area title cannot be empty".to_string());
    }

    let area_id = Uuid::parse_str(&area_id).map_err(|error| error.to_string())?;
    let repository = SqliteRepository::new(path.to_path_buf());

    // 检查是否已存在同名 area
    let existing_areas = AreaRepository::list(&repository).map_err(|error| error.to_string())?;
    if existing_areas.iter().any(|area| area.id != area_id && area.title.to_lowercase() == trimmed_title.to_lowercase()) {
        return Err(format!("Area '{}' already exists", trimmed_title));
    }

    let mut area = AreaRepository::find(&repository, area_id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| format!("Area not found: {}", area_id))?;

    area.title = trimmed_title.to_string();

    AreaRepository::update(&repository, &area)
        .map_err(|error| error.to_string())?;
    Ok(area)
}

pub fn delete_area_record(path: &std::path::Path, area_id: String, force: bool) -> Result<domain::DeleteAreaResult, String> {
    use repository::{AreaRepository, GoalRepository};

    let area_id = Uuid::parse_str(&area_id).map_err(|error| error.to_string())?;
    let repository = SqliteRepository::new(path.to_path_buf());

    // 1. 检查 area 是否存在且不是系统 area
    let area = AreaRepository::find(&repository, area_id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| format!("Area not found: {}", area_id))?;

    if area.is_system {
        return Ok(domain::DeleteAreaResult {
            success: false,
            message: "系统领域无法删除".to_string(),
            affected_goal_count: 0,
            reassigned_to_area_id: None,
        });
    }

    // 2. 统计关联 goals
    let affected_goals = GoalRepository::list_by_area(&repository, area_id)
        .map_err(|error| error.to_string())?;
    let affected_goal_count = affected_goals.len();

    // 3. force=false 且有关联 goals 时拒绝删除
    if affected_goal_count > 0 && !force {
        return Ok(domain::DeleteAreaResult {
            success: false,
            message: format!("该领域有 {} 个关联目标，请先处理或使用强制删除", affected_goal_count),
            affected_goal_count,
            reassigned_to_area_id: None,
        });
    }

    // 4. force=true 时将 goals 移动到"未分类"
    let uncategorized_id = Uuid::parse_str(UNCATEGORIZED_AREA_ID).unwrap();
    if force && affected_goal_count > 0 {
        for mut goal in affected_goals {
            goal.area_id = Some(uncategorized_id);
            GoalRepository::update(&repository, &goal)
                .map_err(|error| error.to_string())?;
        }
    }

    // 5. 删除 area
    AreaRepository::delete(&repository, area_id)
        .map_err(|error| error.to_string())?;

    Ok(domain::DeleteAreaResult {
        success: true,
        message: "领域已删除".to_string(),
        affected_goal_count,
        reassigned_to_area_id: if affected_goal_count > 0 {
            Some(uncategorized_id)
        } else {
            None
        },
    })
}

fn empty_workspace_snapshot() -> WorkspaceSnapshot {
    WorkspaceSnapshot {
        areas: Vec::new(),
        projects: Vec::new(),
        goals: Vec::new(),
        todos: Vec::new(),
        reminders: Vec::new(),
        milestones: Vec::new(),
    }
}

fn empty_calendar_events(_now: chrono::DateTime<Local>) -> Vec<CalendarEvent> {
    Vec::new()
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
        && snapshot.todos.is_empty()
        && snapshot.reminders.is_empty()
        && snapshot.milestones.is_empty()
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

fn persist_desk_tasks<R: tauri::Runtime>(app: &AppHandle<R>, tasks: &[DeskTask]) -> Result<(), String> {
    workspace_repository(app)?
        .save_desk_tasks(tasks)
        .map_err(|error| error.to_string())
}

fn ensure_quick_capture_window<R: tauri::Runtime>(app: &AppHandle<R>) -> Result<tauri::WebviewWindow<R>, String> {
    if let Some(window) = app.get_webview_window("quick-capture") {
        return Ok(window);
    }

    WebviewWindowBuilder::new(app, "quick-capture", WebviewUrl::App("index.html?view=quick-capture".into()))
        .title("Quick Capture")
        .inner_size(520.0, 320.0)
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
    window.center().map_err(|error| error.to_string())?;
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())
}

mod commands {
    use super::{
        bear_note_url, create_goal_record, create_task_for_goal_record, eventkit, goal_summaries,
        load_or_seed_desk_tasks, load_or_seed_workspace, parse_quick_capture, persist_desk_tasks,
        show_quick_capture_window_internal, timeline_from_workspace, update_goal_record,
        update_goal_status_record, workspace_repository, DeskTask, GoalStatus, GoalSummary,
        SystemAgendaSnapshot, SystemReminder, TaskActivityAction, TaskActivityLog, TaskStatus, TimelineItem,
    };
    use chrono::{Datelike, Duration, Local, TimeZone};
    use tauri::{AppHandle, Emitter};
    use uuid::Uuid;

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
        let mut tasks = load_or_seed_desk_tasks(app)?;
        let mut changed = false;

        for task in &mut tasks {
            if task.system_reminder_id.as_deref() != Some(reminder_id) {
                continue;
            }

            let next_status = if done { TaskStatus::Done } else { TaskStatus::Todo };
            if task.status == next_status {
                continue;
            }

            task.status = next_status;
            task.activity_logs.insert(
                0,
                TaskActivityLog {
                    action: if done {
                        TaskActivityAction::Completed
                    } else {
                        TaskActivityAction::Resumed
                    },
                    note: Some("Synced from Apple Reminders.".to_string()),
                    timestamp: Local::now(),
                },
            );
            changed = true;
        }

        if changed {
            persist_desk_tasks(app, &tasks)?;
        }

        Ok(())
    }

    fn goal_summary_by_id(app: &AppHandle, goal_id: &str) -> Result<GoalSummary, String> {
        let snapshot = load_or_seed_workspace(app)?;
        goal_summaries(&snapshot)
            .into_iter()
            .find(|goal| goal.id == goal_id)
            .ok_or_else(|| format!("Goal not found: {goal_id}"))
    }

    #[tauri::command]
    pub fn today_snapshot(app: AppHandle) -> Result<Vec<TimelineItem>, String> {
        let snapshot = load_or_seed_workspace(&app)?;
        Ok(timeline_from_workspace(&snapshot))
    }

    #[tauri::command]
    pub fn goal_snapshot(app: AppHandle) -> Result<Vec<GoalSummary>, String> {
        let snapshot = load_or_seed_workspace(&app)?;
        Ok(goal_summaries(&snapshot))
    }

    #[tauri::command]
    pub fn create_goal(
        app: AppHandle,
        title: String,
        area: String,
        description: String,
        status: GoalStatus,
    ) -> Result<GoalSummary, String> {
        let path = workspace_repository(&app)?.path().to_path_buf();
        let goal = create_goal_record(&path, title, area, description, status)?;
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
        update_goal_record(&workspace_repository(&app)?.path().to_path_buf(), goal_id.clone(), title, area, description, goal_summary_by_id(&app, &goal_id)?.status)?;
        goal_summary_by_id(&app, &goal_id)
    }

    #[tauri::command]
    pub fn update_goal_status(
        app: AppHandle,
        goal_id: String,
        status: GoalStatus,
    ) -> Result<GoalSummary, String> {
        update_goal_status_record(&workspace_repository(&app)?.path().to_path_buf(), goal_id.clone(), status)?;
        goal_summary_by_id(&app, &goal_id)
    }

    #[tauri::command]
    pub fn list_areas(app: AppHandle) -> Result<Vec<super::domain::AreaWithStats>, String> {
        let path = workspace_repository(&app)?.path().to_path_buf();
        super::list_areas_with_stats(&path)
    }

    #[tauri::command]
    pub fn create_area(app: AppHandle, title: String) -> Result<super::domain::Area, String> {
        let path = workspace_repository(&app)?.path().to_path_buf();
        super::create_area_record(&path, title)
    }

    #[tauri::command]
    pub fn rename_area(
        app: AppHandle,
        area_id: String,
        new_title: String,
    ) -> Result<super::domain::Area, String> {
        let path = workspace_repository(&app)?.path().to_path_buf();
        super::rename_area_record(&path, area_id, new_title)
    }

    #[tauri::command]
    pub fn delete_area(
        app: AppHandle,
        area_id: String,
        force: bool,
    ) -> Result<super::domain::DeleteAreaResult, String> {
        let path = workspace_repository(&app)?.path().to_path_buf();
        super::delete_area_record(&path, area_id, force)
    }

    #[tauri::command]
    pub fn desk_task_list(app: AppHandle) -> Result<Vec<DeskTask>, String> {
        load_or_seed_desk_tasks(&app)
    }

    #[tauri::command]
    pub fn capture_task(app: AppHandle, input: String) -> Result<DeskTask, String> {
        let now = Local::now();
        let draft = parse_quick_capture(&input, now);
        let title = draft.title.clone();

        if draft.title.trim().is_empty() {
            return Err("Task title cannot be empty".to_string());
        }

        let mut tasks = load_or_seed_desk_tasks(&app)?;

        // 优先使用 planned_start_at，否则用 due_at
        let reminder_time = draft.planned_start_at.or(draft.due_at);
        let system_reminder_id = maybe_create_task_system_reminder(&app, &title, reminder_time);

        let task = DeskTask {
            id: Uuid::new_v4(),
            title,
            content: String::new(),
            status: TaskStatus::Todo,
            planned_start_at: draft.planned_start_at,
            due_at: draft.due_at,
            linked_goal_id: None,
            linked_goal_label: None,
            bear_note_id: None,
            system_reminder_id,
            show_in_timeline: draft.planned_start_at.is_some() || draft.due_at.is_some(),
            activity_logs: vec![TaskActivityLog {
                action: TaskActivityAction::Created,
                note: None,
                timestamp: now,
            }],
        };

        tasks.insert(0, task.clone());
        persist_desk_tasks(&app, &tasks)?;
        let _ = app.emit("desk-task-created", &task);
        Ok(task)
    }

    #[tauri::command]
    pub fn create_task_for_goal(app: AppHandle, goal_id: String, title: String) -> Result<DeskTask, String> {
        let task = create_task_for_goal_record(&workspace_repository(&app)?.path().to_path_buf(), goal_id, title)?;
        let _ = app.emit("desk-task-created", &task);
        Ok(task)
    }

    #[tauri::command]
    pub fn update_task_content(app: AppHandle, task_id: String, content: String) -> Result<DeskTask, String> {
        let mut tasks = load_or_seed_desk_tasks(&app)?;
        let task = tasks
            .iter_mut()
            .find(|task| task.id.to_string() == task_id)
            .ok_or_else(|| format!("Task not found: {task_id}"))?;
        task.content = content;
        let updated = task.clone();
        persist_desk_tasks(&app, &tasks)?;
        Ok(updated)
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
        let trimmed_title = title.trim();
        if trimmed_title.is_empty() {
            return Err("Task title cannot be empty".to_string());
        }

        let mut tasks = load_or_seed_desk_tasks(&app)?;
        let task = tasks
            .iter_mut()
            .find(|task| task.id.to_string() == task_id)
            .ok_or_else(|| format!("Task not found: {task_id}"))?;

        task.title = trimmed_title.to_string();
        task.planned_start_at = planned_start_at
            .map(|value| chrono::DateTime::parse_from_rfc3339(&value).map(|parsed| parsed.with_timezone(&Local)))
            .transpose()
            .map_err(|error| error.to_string())?;
        task.due_at = due_at
            .map(|value| chrono::DateTime::parse_from_rfc3339(&value).map(|parsed| parsed.with_timezone(&Local)))
            .transpose()
            .map_err(|error| error.to_string())?;
        task.linked_goal_id = linked_goal_id
            .as_deref()
            .map(Uuid::parse_str)
            .transpose()
            .map_err(|error| error.to_string())?;
        task.linked_goal_label = linked_goal_label.and_then(|value| {
            let trimmed = value.trim().to_string();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed)
            }
        });
        task.show_in_timeline = show_in_timeline.unwrap_or(task.show_in_timeline);

        let updated = task.clone();
        persist_desk_tasks(&app, &tasks)?;
        Ok(updated)
    }

    #[tauri::command]
    pub fn update_task_status(
        app: AppHandle,
        task_id: String,
        status: TaskStatus,
        note: Option<String>,
    ) -> Result<DeskTask, String> {
        let mut tasks = load_or_seed_desk_tasks(&app)?;
        let task = tasks
            .iter_mut()
            .find(|task| task.id.to_string() == task_id)
            .ok_or_else(|| format!("Task not found: {task_id}"))?;

        // 使用领域方法验证状态转换
        if !task.can_transition_to(status) {
            return Err(format!(
                "Invalid status transition from {:?} to {:?}",
                task.status, status
            ));
        }

        if let Some(reminder_id) = task.system_reminder_id.as_deref() {
            eventkit::set_system_reminder_completed(&app, reminder_id, matches!(status, TaskStatus::Done))?;
        }

        let previous_status = task.status;
        task.status = status;
        task.activity_logs.insert(
            0,
            TaskActivityLog {
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
                    TaskStatus::Todo => TaskActivityAction::NoteAdded,
                },
                note: note.and_then(|value| {
                    let trimmed = value.trim().to_string();
                    if trimmed.is_empty() {
                        None
                    } else {
                        Some(trimmed)
                    }
                }),
                timestamp: Local::now(),
            },
        );

        let updated = task.clone();
        persist_desk_tasks(&app, &tasks)?;
        Ok(updated)
    }

    #[tauri::command]
    pub fn add_task_note(app: AppHandle, task_id: String, note: String) -> Result<DeskTask, String> {
        let trimmed = note.trim();
        if trimmed.is_empty() {
            return Err("Task note cannot be empty".to_string());
        }

        let mut tasks = load_or_seed_desk_tasks(&app)?;
        let task = tasks
            .iter_mut()
            .find(|task| task.id.to_string() == task_id)
            .ok_or_else(|| format!("Task not found: {task_id}"))?;

        task.activity_logs.insert(
            0,
            TaskActivityLog {
                action: TaskActivityAction::NoteAdded,
                note: Some(trimmed.to_string()),
                timestamp: Local::now(),
            },
        );

        let updated = task.clone();
        persist_desk_tasks(&app, &tasks)?;
        Ok(updated)
    }

    #[tauri::command]
    pub fn open_task_in_bear(app: AppHandle, task_id: String) -> Result<(), String> {
        let tasks = load_or_seed_desk_tasks(&app)?;
        let task = tasks
            .iter()
            .find(|task| task.id.to_string() == task_id)
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
    pub fn set_system_reminder_completed(
        app: AppHandle,
        reminder_id: String,
        done: bool,
    ) -> Result<SystemReminder, String> {
        let reminder = eventkit::set_system_reminder_completed(&app, &reminder_id, done)?;
        sync_linked_tasks_for_system_reminder(&app, &reminder_id, done)?;
        Ok(reminder)
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
            commands::set_system_reminder_completed
        ])
        .run(tauri::generate_context!())
        .expect("error while running Goal Desk");
}
