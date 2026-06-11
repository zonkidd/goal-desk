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
        }],
        projects: vec![Project {
            id: project_id,
            area_id: Some(area_id),
            goal_id: Some(goal_id),
            title: "六月训练计划".to_string(),
        }],
        goals: vec![Goal {
            id: goal_id,
            area_id: Some(area_id),
            title: "瘦十斤".to_string(),
            description: "用持续训练和饮食记录推动减脂目标。".to_string(),
            status: goal_desk_tauri::domain::GoalStatus::Active,
        }],
        todos: vec![Todo {
            id: todo_id,
            goal_id: Some(goal_id),
            project_id: Some(project_id),
            title: "今晚跑步 3 公里".to_string(),
            scheduled_at: Some(Local.with_ymd_and_hms(2026, 6, 10, 19, 30, 0).unwrap()),
            completed: false,
        }],
        reminders: vec![Reminder {
            id: reminder_id,
            title: "复盘训练".to_string(),
            due_at: Local.with_ymd_and_hms(2026, 6, 10, 21, 0, 0).unwrap(),
            done: false,
        }],
        milestones: vec![Milestone {
            id: milestone_id,
            goal_id,
            title: "第一周训练完成".to_string(),
            completed: true,
        }],
    };

    repository.save_workspace(&snapshot).unwrap();

    let reloaded = repository.load_workspace().unwrap();

    assert_eq!(reloaded.areas, snapshot.areas);
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
            title: "独立开发".to_string(),
        }],
        projects: vec![],
        goals: vec![Goal {
            id: goal_id,
            area_id: Some(area_id),
            title: "整理 7 月产品发布".to_string(),
            description: "为 7 月发布准备文案、检查单和演示路径。".to_string(),
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
        due_at: Some(Local.with_ymd_and_hms(2026, 6, 12, 15, 0, 0).unwrap()),
        linked_goal_id: Some(goal_id),
        linked_goal_label: Some("Goal Desk MVP".to_string()),
        bear_note_id: Some("F37D308A-B4D1-4B65-9F2D-5C8BE1A12345".to_string()),
        system_reminder_id: Some("eventkit-reminder-id".to_string()),
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
