pub mod domain;
pub mod eventkit;
pub mod repository;

use chrono::{Datelike, Local, TimeZone};
use domain::{
    goal_progress, parse_quick_capture, today_timeline, Area, CalendarEvent, DeskTask, Goal,
    GoalStatus, GoalSummary, Milestone, Project, Reminder, TaskActivityAction, TaskActivityLog,
    TaskStatus, TimelineItem, Todo, WorkspaceSnapshot,
};
use eventkit::{SystemAgendaSnapshot, SystemReminder};
use repository::SqliteRepository;
use tauri::{AppHandle, Manager, TitleBarStyle, WebviewUrl, WebviewWindowBuilder};
use uuid::Uuid;
#[cfg(desktop)]
use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};

pub fn today_snapshot_data() -> Vec<TimelineItem> {
    let snapshot = demo_workspace_snapshot(Local::now());
    timeline_from_workspace(&snapshot)
}

pub fn goal_snapshot_data() -> Vec<GoalSummary> {
    let snapshot = demo_workspace_snapshot(Local::now());
    goal_summaries(&snapshot)
}

pub fn goal_snapshot_data_at_path(path: &std::path::Path) -> Result<Vec<GoalSummary>, String> {
    let repository = SqliteRepository::new(path.to_path_buf());
    let snapshot = repository.load_workspace().map_err(|error| error.to_string())?;
    Ok(goal_summaries(&snapshot))
}

pub fn create_goal_record(
    path: &std::path::Path,
    title: String,
    area: Option<String>,
    description: String,
    status: GoalStatus,
) -> Result<Goal, String> {
    let trimmed_title = title.trim();
    if trimmed_title.is_empty() {
        return Err("Goal title cannot be empty".to_string());
    }

    let repository = SqliteRepository::new(path.to_path_buf());
    let mut snapshot = repository.load_workspace().map_err(|error| error.to_string())?;
    let area_id = area.and_then(|area_title| {
        let trimmed = area_title.trim().to_string();
        if trimmed.is_empty() {
            None
        } else if let Some(existing) = snapshot.areas.iter().find(|existing| existing.title == trimmed) {
            Some(existing.id)
        } else {
            let id = Uuid::new_v4();
            snapshot.areas.push(Area { id, title: trimmed });
            Some(id)
        }
    });

    let goal = Goal {
        id: Uuid::new_v4(),
        area_id,
        title: trimmed_title.to_string(),
        description,
        status,
    };

    snapshot.goals.push(goal.clone());
    repository
        .save_workspace(&snapshot)
        .map_err(|error| error.to_string())?;
    Ok(goal)
}

pub fn update_goal_record(
    path: &std::path::Path,
    goal_id: String,
    title: String,
    area: Option<String>,
    description: String,
    status: GoalStatus,
) -> Result<Goal, String> {
    let trimmed_title = title.trim();
    if trimmed_title.is_empty() {
        return Err("Goal title cannot be empty".to_string());
    }

    let goal_id = Uuid::parse_str(&goal_id).map_err(|error| error.to_string())?;
    let repository = SqliteRepository::new(path.to_path_buf());
    let mut snapshot = repository.load_workspace().map_err(|error| error.to_string())?;
    let area_id = area.and_then(|area_title| {
        let trimmed = area_title.trim().to_string();
        if trimmed.is_empty() {
            None
        } else if let Some(existing) = snapshot.areas.iter().find(|existing| existing.title == trimmed) {
            Some(existing.id)
        } else {
            let id = Uuid::new_v4();
            snapshot.areas.push(Area { id, title: trimmed });
            Some(id)
        }
    });

    let goal = snapshot
        .goals
        .iter_mut()
        .find(|goal| goal.id == goal_id)
        .ok_or_else(|| format!("Goal not found: {goal_id}"))?;

    goal.title = trimmed_title.to_string();
    goal.area_id = area_id;
    goal.description = description;
    goal.status = status;

    let updated = goal.clone();
    repository
        .save_workspace(&snapshot)
        .map_err(|error| error.to_string())?;
    Ok(updated)
}

pub fn update_goal_status_record(
    path: &std::path::Path,
    goal_id: String,
    status: GoalStatus,
) -> Result<Goal, String> {
    let goal_id = Uuid::parse_str(&goal_id).map_err(|error| error.to_string())?;
    let repository = SqliteRepository::new(path.to_path_buf());
    let mut snapshot = repository.load_workspace().map_err(|error| error.to_string())?;
    let goal = snapshot
        .goals
        .iter_mut()
        .find(|goal| goal.id == goal_id)
        .ok_or_else(|| format!("Goal not found: {goal_id}"))?;

    goal.status = status;

    let updated = goal.clone();
    repository
        .save_workspace(&snapshot)
        .map_err(|error| error.to_string())?;
    Ok(updated)
}

fn timeline_from_workspace(snapshot: &WorkspaceSnapshot) -> Vec<TimelineItem> {
    let now = Local::now();
    today_timeline(
        now.date_naive(),
        &snapshot.todos,
        &snapshot.reminders,
        &demo_calendar_events(now),
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
                    .unwrap_or_else(|| "Keep going".to_string()),
            }
        })
        .collect()
}

fn demo_workspace_snapshot(now: chrono::DateTime<Local>) -> WorkspaceSnapshot {
    let health_area_id = Uuid::parse_str("aaaa1111-1111-4111-8111-111111111111").unwrap();
    let product_area_id = Uuid::parse_str("bbbb2222-2222-4222-8222-222222222222").unwrap();
    let learning_area_id = Uuid::parse_str("cccc3333-3333-4333-8333-333333333333").unwrap();
    let health_goal_id = Uuid::parse_str("66666666-6666-4666-8666-666666666666").unwrap();
    let product_goal_id = Uuid::parse_str("22222222-2222-4222-8222-222222222222").unwrap();
    let learning_goal_id = Uuid::parse_str("dddd4444-4444-4444-8444-444444444444").unwrap();
    let health_project_id = Uuid::parse_str("eeee5555-5555-4555-8555-555555555555").unwrap();
    let product_project_id = Uuid::parse_str("ffff6666-6666-4666-8666-666666666666").unwrap();
    let learning_project_id = Uuid::parse_str("99999999-9999-4999-8999-999999999999").unwrap();

    WorkspaceSnapshot {
        areas: vec![
            Area {
                id: health_area_id,
                title: "健康".to_string(),
            },
            Area {
                id: product_area_id,
                title: "产品".to_string(),
            },
            Area {
                id: learning_area_id,
                title: "学习".to_string(),
            },
        ],
        projects: vec![
            Project {
                id: health_project_id,
                area_id: Some(health_area_id),
                goal_id: Some(health_goal_id),
                title: "六月训练计划".to_string(),
            },
            Project {
                id: product_project_id,
                area_id: Some(product_area_id),
                goal_id: Some(product_goal_id),
                title: "Goal Desk Desktop MVP".to_string(),
            },
            Project {
                id: learning_project_id,
                area_id: Some(learning_area_id),
                goal_id: Some(learning_goal_id),
                title: "Rust Native Integration Study".to_string(),
            },
        ],
        goals: vec![
            Goal {
                id: health_goal_id,
                area_id: Some(health_area_id),
                title: "瘦十斤".to_string(),
                description: "通过持续训练和饮食记录推进减脂目标。".to_string(),
                status: GoalStatus::Active,
            },
            Goal {
                id: product_goal_id,
                area_id: Some(product_area_id),
                title: "Goal Desk MVP".to_string(),
                description: "先把本地任务流、目标入口和今日焦点闭环。".to_string(),
                status: GoalStatus::Active,
            },
            Goal {
                id: learning_goal_id,
                area_id: Some(learning_area_id),
                title: "系统学习 Rust 桌面开发".to_string(),
                description: "沉淀 Tauri、SQLite 和 macOS 桥接经验。".to_string(),
                status: GoalStatus::Active,
            },
        ],
        todos: vec![
            Todo {
                id: Uuid::new_v4(),
                goal_id: Some(health_goal_id),
                project_id: Some(health_project_id),
                title: "今晚跑步 3 公里".to_string(),
                scheduled_at: Some(today_at(now, 19, 30)),
                completed: true,
            },
            Todo {
                id: Uuid::new_v4(),
                goal_id: Some(health_goal_id),
                project_id: Some(health_project_id),
                title: "记录饮食".to_string(),
                scheduled_at: Some(today_at(now, 11, 30)),
                completed: false,
            },
            Todo {
                id: Uuid::new_v4(),
                goal_id: Some(product_goal_id),
                project_id: Some(product_project_id),
                title: "完成 Today Timeline core".to_string(),
                scheduled_at: Some(today_at(now, 9, 30)),
                completed: true,
            },
            Todo {
                id: Uuid::new_v4(),
                goal_id: Some(product_goal_id),
                project_id: Some(product_project_id),
                title: "接入 Tauri command".to_string(),
                scheduled_at: None,
                completed: true,
            },
            Todo {
                id: Uuid::new_v4(),
                goal_id: Some(product_goal_id),
                project_id: Some(product_project_id),
                title: "落地 SQLite repository".to_string(),
                scheduled_at: Some(today_at(now, 16, 0)),
                completed: false,
            },
            Todo {
                id: Uuid::new_v4(),
                goal_id: Some(learning_goal_id),
                project_id: Some(learning_project_id),
                title: "整理 EventKit 桥接方案".to_string(),
                scheduled_at: Some(today_at(now, 18, 0)),
                completed: false,
            },
        ],
        reminders: vec![Reminder {
            id: Uuid::new_v4(),
            title: "复盘周目标".to_string(),
            due_at: today_at(now, 14, 30),
            done: false,
        }],
        milestones: vec![
            Milestone {
                id: Uuid::new_v4(),
                goal_id: health_goal_id,
                title: "第一周训练完成".to_string(),
                completed: false,
            },
            Milestone {
                id: Uuid::new_v4(),
                goal_id: product_goal_id,
                title: "原型工作台可运行".to_string(),
                completed: false,
            },
            Milestone {
                id: Uuid::new_v4(),
                goal_id: learning_goal_id,
                title: "理解 EventKit 权限模型".to_string(),
                completed: true,
            },
        ],
    }
}

fn demo_desk_tasks() -> Vec<DeskTask> {
    vec![
        DeskTask {
            id: Uuid::parse_str("11111111-1111-4111-8111-111111111111").unwrap(),
            title: "研究 Tauri 与 EventKit 的通信机制".to_string(),
            content: [
                "# EventKit 接入路线",
                "",
                "这是一个需要在 Mac 上原生的功能。初步查阅了 Apple 的 `EventKit` 文档：",
                "",
                "- 需要向用户申请 `NSRemindersUsageDescription` 权限。",
                "- Tauri 官方没有现成插件，必须自己写 Rust FFI 或嵌入一段 Swift 代码。",
                "",
                "`let eventStore = EKEventStore()`",
                "",
                "**待验证清单：**",
                "",
                "- [x] 写一个最简单的 Swift 脚本拉取提醒",
                "- [ ] 尝试在 Rust 侧通过 `std::process::Command` 调用",
            ]
            .join("\n"),
            status: TaskStatus::InProgress,
            due_at: Local.with_ymd_and_hms(2026, 6, 11, 15, 0, 0).single(),
            linked_goal_id: Some(Uuid::parse_str("22222222-2222-4222-8222-222222222222").unwrap()),
            linked_goal_label: Some("目标管理软件 MVP 开发".to_string()),
            bear_note_id: None,
            system_reminder_id: None,
            activity_logs: vec![
                TaskActivityLog {
                    action: TaskActivityAction::Resumed,
                    note: Some("找到一个 GitHub 参考实现，继续推进。".to_string()),
                    timestamp: Local.with_ymd_and_hms(2026, 6, 10, 9, 0, 0).unwrap(),
                },
                TaskActivityLog {
                    action: TaskActivityAction::Paused,
                    note: Some("卡在 Swift 编译阶段，先去找 Tauri 社区示例。".to_string()),
                    timestamp: Local.with_ymd_and_hms(2026, 6, 9, 16, 30, 0).unwrap(),
                },
                TaskActivityLog {
                    action: TaskActivityAction::Created,
                    note: Some("从原型需求拆出第一条技术验证。".to_string()),
                    timestamp: Local.with_ymd_and_hms(2026, 6, 9, 20, 30, 0).unwrap(),
                },
            ],
        },
        DeskTask {
            id: Uuid::parse_str("33333333-3333-4333-8333-333333333333").unwrap(),
            title: "给新员工发入职邮件并附加上周会议记录".to_string(),
            content: "把欢迎说明、账号列表和会议记录一起发出。".to_string(),
            status: TaskStatus::Todo,
            due_at: Local.with_ymd_and_hms(2026, 6, 10, 18, 0, 0).single(),
            linked_goal_id: None,
            linked_goal_label: None,
            bear_note_id: None,
            system_reminder_id: None,
            activity_logs: vec![TaskActivityLog {
                action: TaskActivityAction::Created,
                note: None,
                timestamp: Local.with_ymd_and_hms(2026, 6, 10, 8, 0, 0).unwrap(),
            }],
        },
        DeskTask {
            id: Uuid::parse_str("44444444-4444-4444-8444-444444444444").unwrap(),
            title: "集成 Bear App URL Scheme".to_string(),
            content: "等待 Bear 官方文档确认跨端参数细节。".to_string(),
            status: TaskStatus::Paused,
            due_at: None,
            linked_goal_id: None,
            linked_goal_label: None,
            bear_note_id: Some("F37D308A-B4D1-4B65-9F2D-5C8BE1A12345".to_string()),
            system_reminder_id: None,
            activity_logs: vec![
                TaskActivityLog {
                    action: TaskActivityAction::Paused,
                    note: Some("等待 Bear 官方 API 更新文档。".to_string()),
                    timestamp: Local.with_ymd_and_hms(2026, 6, 10, 11, 0, 0).unwrap(),
                },
                TaskActivityLog {
                    action: TaskActivityAction::Created,
                    note: None,
                    timestamp: Local.with_ymd_and_hms(2026, 6, 9, 10, 0, 0).unwrap(),
                },
            ],
        },
        DeskTask {
            id: Uuid::parse_str("55555555-5555-4555-8555-555555555555").unwrap(),
            title: "今晚跑步 3 公里".to_string(),
            content: "完成后记录配速和体感。".to_string(),
            status: TaskStatus::Done,
            due_at: Local.with_ymd_and_hms(2026, 6, 10, 20, 0, 0).single(),
            linked_goal_id: Some(Uuid::parse_str("66666666-6666-4666-8666-666666666666").unwrap()),
            linked_goal_label: Some("瘦十斤".to_string()),
            bear_note_id: None,
            system_reminder_id: None,
            activity_logs: vec![
                TaskActivityLog {
                    action: TaskActivityAction::Completed,
                    note: Some("配速稳定，状态不错。".to_string()),
                    timestamp: Local.with_ymd_and_hms(2026, 6, 10, 21, 5, 0).unwrap(),
                },
                TaskActivityLog {
                    action: TaskActivityAction::Created,
                    note: None,
                    timestamp: Local.with_ymd_and_hms(2026, 6, 10, 7, 30, 0).unwrap(),
                },
            ],
        },
    ]
}

fn demo_calendar_events(now: chrono::DateTime<Local>) -> Vec<CalendarEvent> {
    vec![CalendarEvent {
        id: "calendar-1".to_string(),
        title: "Design review · Work".to_string(),
        starts_at: today_at(now, 10, 0),
        ends_at: today_at(now, 11, 0),
    }]
}

fn today_at(now: chrono::DateTime<Local>, hour: u32, minute: u32) -> chrono::DateTime<Local> {
    Local
        .with_ymd_and_hms(now.year(), now.month(), now.day(), hour, minute, 0)
        .single()
        .unwrap_or(now)
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
        let seeded = demo_workspace_snapshot(Local::now());
        repository
            .save_workspace(&seeded)
            .map_err(|error| error.to_string())?;
        Ok(seeded)
    } else {
        Ok(snapshot)
    }
}

fn load_or_seed_desk_tasks<R: tauri::Runtime>(app: &AppHandle<R>) -> Result<Vec<DeskTask>, String> {
    let repository = workspace_repository(app)?;
    let tasks = repository.load_desk_tasks().map_err(|error| error.to_string())?;

    if tasks.is_empty() {
        let seeded = demo_desk_tasks();
        repository
            .save_desk_tasks(&seeded)
            .map_err(|error| error.to_string())?;
        Ok(seeded)
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
        .inner_size(520.0, 228.0)
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
        bear_note_url, create_goal_record, eventkit, goal_summaries, load_or_seed_desk_tasks,
        load_or_seed_workspace, parse_quick_capture, persist_desk_tasks, show_quick_capture_window_internal,
        timeline_from_workspace, update_goal_record, update_goal_status_record, workspace_repository,
        DeskTask, GoalStatus, GoalSummary, SystemAgendaSnapshot, SystemReminder, TaskActivityAction,
        TaskActivityLog, TaskStatus, TimelineItem,
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
        area: Option<String>,
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
        area: Option<String>,
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
        let system_reminder_id = maybe_create_task_system_reminder(&app, &title, draft.scheduled_at);
        let task = DeskTask {
            id: Uuid::new_v4(),
            title,
            content: String::new(),
            status: TaskStatus::Todo,
            due_at: draft.scheduled_at,
            linked_goal_id: None,
            linked_goal_label: None,
            bear_note_id: None,
            system_reminder_id,
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
        due_at: Option<String>,
        linked_goal_id: Option<String>,
        linked_goal_label: Option<String>,
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

        if let Some(reminder_id) = task.system_reminder_id.as_deref() {
            eventkit::set_system_reminder_completed(&app, reminder_id, matches!(status, TaskStatus::Done))?;
        }

        task.status = status;
        task.activity_logs.insert(
            0,
            TaskActivityLog {
                action: match status {
                    TaskStatus::Paused => TaskActivityAction::Paused,
                    TaskStatus::Done => TaskActivityAction::Completed,
                    TaskStatus::InProgress => TaskActivityAction::Resumed,
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
            commands::desk_task_list,
            commands::capture_task,
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
