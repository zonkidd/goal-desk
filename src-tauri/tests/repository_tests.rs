use chrono::{Local, TimeZone};
use goal_desk_tauri::domain::{
    Area, DeskTask, Goal, Project, Reminder, TaskActivityAction, TaskActivityLog,
    TaskStatus, WorkspaceSnapshot,
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
    let reminder_id = Uuid::new_v4();

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
        reminders: vec![Reminder {
            id: reminder_id,
            title: "Review training progress".to_string(),
            due_at: Local.with_ymd_and_hms(2026, 6, 10, 21, 0, 0).unwrap(),
            done: false,
        }],
    };

    repository.save_workspace(&snapshot).unwrap();

    let reloaded = repository.load_workspace().unwrap();

    assert!(reloaded.areas.iter().any(|a| a.id == area_id && a.title == "健康" && !a.is_system));
    assert_eq!(reloaded.projects, snapshot.projects);
    assert_eq!(reloaded.goals, snapshot.goals);
    assert_eq!(reloaded.reminders, snapshot.reminders);

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
        reminders: vec![],
    };

    repository.save_workspace(&snapshot).unwrap();

    let reloaded = repository.load_workspace().unwrap();

    assert!(reloaded.areas.iter().any(|a| a.id == area_id));
    let reloaded_goal = reloaded.goals.iter().find(|g| g.id == goal_id).unwrap();
    assert_eq!(reloaded_goal.title, "Prepare July product release");
    assert_eq!(reloaded_goal.description, "Prepare content, checklist, and demo for July release.");
    assert_eq!(reloaded_goal.status, goal_desk_tauri::domain::GoalStatus::Paused);

    let _ = std::fs::remove_file(path);
}

#[test]
fn sqlite_repository_saves_and_loads_desk_tasks() {
    let file_name = format!("goal-desk-desk-task-test-{}.sqlite", Uuid::new_v4());
    let path = std::env::temp_dir().join(file_name);
    let repository = SqliteRepository::new(path.clone());
    repository.initialize().unwrap();

    let task = DeskTask {
        id: Uuid::new_v4(),
        title: "Test Task".to_string(),
        content: "Some content".to_string(),
        status: TaskStatus::Todo,
        planned_start_at: None,
        due_at: None,
        linked_goal_id: None,
        linked_goal_label: None,
        bear_note_id: None,
        system_reminder_id: None,
        show_in_timeline: false,
        activity_logs: vec![TaskActivityLog {
            id: Uuid::new_v4(),
            action: TaskActivityAction::Created,
            note: None,
            timestamp: Local::now(),
        }],
    };

    repository.save_desk_tasks(&[task.clone()]).unwrap();
    let loaded = repository.load_desk_tasks().unwrap();

    assert_eq!(loaded.len(), 1);
    assert_eq!(loaded[0].title, "Test Task");
    assert_eq!(loaded[0].status, TaskStatus::Todo);

    let _ = std::fs::remove_file(path);
}
