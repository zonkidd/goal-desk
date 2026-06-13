use chrono::{Local, TimeZone};
use goal_desk_tauri::domain::{
    Area, DeskTask, Goal, Milestone, Project, Reminder, TaskActivityAction, TaskActivityLog,
    TaskStatus, Todo, WorkspaceSnapshot,
};
use goal_desk_tauri::repository::SqliteRepository;
use std::path::PathBuf;
use uuid::Uuid;

#[test]
fn sqlite_repository_creates_and_reloads_workspace_snapshot() {
    let file_name = format!("goal-desk-repository-test-{}.sqlite", Uuid::new_v4());
    let path = std::env::temp_dir().join(file_name);
    let repository = SqliteRepository::new(path.clone());

    let area_id = Uuid::new_v4();
    let goal_id = Uuid::new_v4();
    let project_id = Uuid::new_v4();
    let todo_id = Uuid::new_v4();
    let reminder_id = Uuid::new_v4();
    let milestone_id = Uuid::new_v4();

    let snapshot = WorkspaceSnapshot {
        areas: vec![Area {
            id: area_id,
            title: "健康".to_string(),
            is_system: false,
        }],
        projects: vec![Project {
            id: project_id,
            area_id: Some(area_id),
            goal_id: Some(goal_id),
            title: "June training plan".to_string(),
        }],
        goals: vec![Goal {
            id: goal_id,
            area_id: Some(area_id),
            title: "Sample Goal B".to_string(),
            description: "Track progress with consistent training and nutrition logging.".to_string(),
            status: goal_desk_tauri::domain::GoalStatus::Active,
        }],
        todos: vec![Todo {
            id: todo_id,
            goal_id: Some(goal_id),
            project_id: Some(project_id),
            title: "Complete daily activity".to_string(),
            scheduled_at: Some(Local.with_ymd_and_hms(2026, 6, 10, 19, 30, 0).unwrap()),
            completed: false,
        }],
        reminders: vec![Reminder {
            id: reminder_id,
            title: "Review training progress".to_string(),
            due_at: Local.with_ymd_and_hms(2026, 6, 10, 21, 0, 0).unwrap(),
            done: false,
        }],
        milestones: vec![Milestone {
            id: milestone_id,
            goal_id,
            title: "Complete first week training".to_string(),
            completed: true,
        }],
    };

    repository.save_workspace(&snapshot).unwrap();

    let reloaded = repository.load_workspace().unwrap();

    // 注意：load_workspace 会自动包含"未分类"系统 area
    // 我们只验证我们保存的 areas 存在
    assert!(reloaded.areas.iter().any(|a| a.id == area_id && a.title == "健康" && !a.is_system));
    assert_eq!(reloaded.projects, snapshot.projects);
    assert_eq!(reloaded.goals, snapshot.goals);
    assert_eq!(reloaded.todos, snapshot.todos);
    assert_eq!(reloaded.reminders, snapshot.reminders);
    assert_eq!(reloaded.milestones, snapshot.milestones);

    let _ = std::fs::remove_file(path);
}

#[test]
fn sqlite_repository_round_trips_goal_description_and_status() {
    let file_name = format!("goal-desk-goal-repository-test-{}.sqlite", Uuid::new_v4());
    let path = std::env::temp_dir().join(file_name);
    let repository = SqliteRepository::new(path.clone());
    let area_id = Uuid::new_v4();
    let goal_id = Uuid::new_v4();

    let snapshot = WorkspaceSnapshot {
        areas: vec![Area {
            id: area_id,
            title: "Independent Development".to_string(),
            is_system: false,
        }],
        projects: vec![],
        goals: vec![Goal {
            id: goal_id,
            area_id: Some(area_id),
            title: "Prepare July product release".to_string(),
            description: "Prepare content, checklist, and demo for July release.".to_string(),
            status: goal_desk_tauri::domain::GoalStatus::Paused,
        }],
        todos: vec![],
        reminders: vec![],
        milestones: vec![],
    };

    repository.save_workspace(&snapshot).unwrap();

    let reloaded = repository.load_workspace().unwrap();

    assert_eq!(reloaded.goals, snapshot.goals);

    let _ = std::fs::remove_file(path);
}

#[test]
fn sqlite_repository_creates_parent_directories_during_initialize() {
    let base = std::env::temp_dir().join(format!("goal-desk-nested-{}", Uuid::new_v4()));
    let path: PathBuf = base.join("nested").join("goal-desk.sqlite");
    let repository = SqliteRepository::new(path.clone());

    repository.initialize().unwrap();

    assert!(path.exists());

    let _ = std::fs::remove_file(&path);
    let _ = std::fs::remove_dir_all(base);
}

#[test]
fn sqlite_repository_round_trips_desk_tasks_with_activity_logs() {
    let file_name = format!("goal-desk-task-repository-test-{}.sqlite", Uuid::new_v4());
    let path = std::env::temp_dir().join(file_name);
    let repository = SqliteRepository::new(path.clone());
    let goal_id = Uuid::new_v4();
    let task_id = Uuid::new_v4();

    let tasks = vec![DeskTask {
        id: task_id,
        title: "研究 EventKit 桥接".to_string(),
        content: "# Notes\n\n- 验证 Swift bridge".to_string(),
        status: TaskStatus::InProgress,
        planned_start_at: None,
        due_at: Some(Local.with_ymd_and_hms(2026, 6, 12, 15, 0, 0).unwrap()),
        linked_goal_id: Some(goal_id),
        linked_goal_label: Some("Goal Desk MVP".to_string()),
        bear_note_id: Some("F37D308A-B4D1-4B65-9F2D-5C8BE1A12345".to_string()),
        system_reminder_id: Some("eventkit-reminder-id".to_string()),
        show_in_timeline: true,
        activity_logs: vec![
            TaskActivityLog {
                action: TaskActivityAction::Resumed,
                note: Some("继续处理权限申请".to_string()),
                timestamp: Local.with_ymd_and_hms(2026, 6, 10, 9, 0, 0).unwrap(),
            },
            TaskActivityLog {
                action: TaskActivityAction::Created,
                note: None,
                timestamp: Local.with_ymd_and_hms(2026, 6, 9, 20, 0, 0).unwrap(),
            },
        ],
    }];

    repository.save_desk_tasks(&tasks).unwrap();

    let reloaded = repository.load_desk_tasks().unwrap();

    assert_eq!(reloaded, tasks);

    let _ = std::fs::remove_file(path);
}

#[test]
fn sqlite_repository_round_trips_desk_task_planned_start_at() {
    let file_name = format!("goal-desk-task-start-time-test-{}.sqlite", Uuid::new_v4());
    let path = std::env::temp_dir().join(file_name);
    let repository = SqliteRepository::new(path.clone());
    let task_id = Uuid::new_v4();

    let tasks = vec![DeskTask {
        id: task_id,
        title: "计划开始时间测试".to_string(),
        content: "".to_string(),
        status: TaskStatus::Todo,
        planned_start_at: Some(Local.with_ymd_and_hms(2026, 6, 12, 9, 0, 0).unwrap()),
        due_at: Some(Local.with_ymd_and_hms(2026, 6, 12, 18, 0, 0).unwrap()),
        linked_goal_id: None,
        linked_goal_label: None,
        bear_note_id: None,
        system_reminder_id: None,
        show_in_timeline: false,
        activity_logs: vec![TaskActivityLog {
            action: TaskActivityAction::Created,
            note: None,
            timestamp: Local.with_ymd_and_hms(2026, 6, 11, 10, 0, 0).unwrap(),
        }],
    }];

    repository.save_desk_tasks(&tasks).unwrap();

    let reloaded = repository.load_desk_tasks().unwrap();

    assert_eq!(reloaded.len(), 1);
    assert_eq!(reloaded[0].planned_start_at, tasks[0].planned_start_at);
    assert_eq!(reloaded[0].due_at, tasks[0].due_at);

    let _ = std::fs::remove_file(path);
}
