use chrono::{Local, TimeZone};
use goal_desk_tauri::domain::{
    Area, DeskTask, Goal, Project, Reminder, TaskActivityAction, TaskActivityLog, TaskStatus,
    WorkspaceSnapshot,
};
use goal_desk_tauri::repository::SqliteRepository;
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
            description: "Track progress with consistent training and nutrition logging."
                .to_string(),
            status: goal_desk_tauri::domain::GoalStatus::Active,
            deleted_at: None,
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

    assert!(reloaded
        .areas
        .iter()
        .any(|a| a.id == area_id && a.title == "健康" && !a.is_system));
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
            deleted_at: None,
        }],
        reminders: vec![],
    };

    repository.save_workspace(&snapshot).unwrap();

    let reloaded = repository.load_workspace().unwrap();

    assert!(reloaded.areas.iter().any(|a| a.id == area_id));
    let reloaded_goal = reloaded.goals.iter().find(|g| g.id == goal_id).unwrap();
    assert_eq!(reloaded_goal.title, "Prepare July product release");
    assert_eq!(
        reloaded_goal.description,
        "Prepare content, checklist, and demo for July release."
    );
    assert_eq!(
        reloaded_goal.status,
        goal_desk_tauri::domain::GoalStatus::Paused
    );

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
        checklists: vec![],
        deleted_at: None,
    };

    repository.save_desk_tasks(&[task.clone()]).unwrap();
    let loaded = repository.load_desk_tasks().unwrap();

    assert_eq!(loaded.len(), 1);
    assert_eq!(loaded[0].title, "Test Task");
    assert_eq!(loaded[0].status, TaskStatus::Todo);

    let _ = std::fs::remove_file(path);
}

#[test]
fn task_repository_loads_task_with_empty_activity_logs() {
    let file_name = format!("goal-desk-empty-logs-test-{}.sqlite", Uuid::new_v4());
    let path = std::env::temp_dir().join(file_name);
    let repository = SqliteRepository::new(path.clone());
    repository.initialize().unwrap();

    use goal_desk_tauri::repository::TaskRepository;

    let task = DeskTask {
        id: Uuid::new_v4(),
        title: "No Logs Task".to_string(),
        content: String::new(),
        status: TaskStatus::Todo,
        planned_start_at: None,
        due_at: None,
        linked_goal_id: None,
        linked_goal_label: None,
        bear_note_id: None,
        system_reminder_id: None,
        show_in_timeline: false,
        activity_logs: vec![],
        checklists: vec![],
        deleted_at: None,
    };

    TaskRepository::create(&repository, &task).unwrap();
    let loaded = TaskRepository::find(&repository, task.id).unwrap().unwrap();

    assert_eq!(loaded.title, "No Logs Task");
    assert!(
        loaded.activity_logs.is_empty(),
        "Task with no logs should load with empty activity_logs"
    );

    let all_tasks = TaskRepository::list(&repository).unwrap();
    assert_eq!(all_tasks.len(), 1);
    assert!(all_tasks[0].activity_logs.is_empty());

    let _ = std::fs::remove_file(path);
}

#[test]
fn task_repository_filters_by_goal_and_status() {
    let file_name = format!("goal-desk-filter-test-{}.sqlite", Uuid::new_v4());
    let path = std::env::temp_dir().join(file_name);
    let repository = SqliteRepository::new(path.clone());
    repository.initialize().unwrap();

    use goal_desk_tauri::repository::TaskRepository;

    let goal_a = Uuid::new_v4();
    let goal_b = Uuid::new_v4();

    let tasks = vec![
        DeskTask {
            id: Uuid::new_v4(),
            title: "Task A1".to_string(),
            content: String::new(),
            status: TaskStatus::InProgress,
            planned_start_at: None,
            due_at: None,
            linked_goal_id: Some(goal_a),
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
            checklists: vec![],
            deleted_at: None,
        },
        DeskTask {
            id: Uuid::new_v4(),
            title: "Task A2".to_string(),
            content: String::new(),
            status: TaskStatus::Done,
            planned_start_at: None,
            due_at: None,
            linked_goal_id: Some(goal_a),
            linked_goal_label: None,
            bear_note_id: None,
            system_reminder_id: None,
            show_in_timeline: false,
            activity_logs: vec![],
            checklists: vec![],
            deleted_at: None,
        },
        DeskTask {
            id: Uuid::new_v4(),
            title: "Task B1".to_string(),
            content: String::new(),
            status: TaskStatus::InProgress,
            planned_start_at: None,
            due_at: None,
            linked_goal_id: Some(goal_b),
            linked_goal_label: None,
            bear_note_id: None,
            system_reminder_id: None,
            show_in_timeline: false,
            activity_logs: vec![],
            checklists: vec![],
            deleted_at: None,
        },
    ];

    for task in &tasks {
        TaskRepository::create(&repository, task).unwrap();
    }

    let by_goal_a = TaskRepository::list_by_goal(&repository, goal_a).unwrap();
    assert_eq!(by_goal_a.len(), 2, "Goal A should have 2 tasks");
    assert!(by_goal_a.iter().all(|t| t.linked_goal_id == Some(goal_a)));

    let by_goal_b = TaskRepository::list_by_goal(&repository, goal_b).unwrap();
    assert_eq!(by_goal_b.len(), 1, "Goal B should have 1 task");

    let in_progress = TaskRepository::list_by_status(&repository, TaskStatus::InProgress).unwrap();
    assert_eq!(in_progress.len(), 2, "Should have 2 InProgress tasks");
    assert!(in_progress
        .iter()
        .all(|t| t.status == TaskStatus::InProgress));

    let done_tasks = TaskRepository::list_by_status(&repository, TaskStatus::Done).unwrap();
    assert_eq!(done_tasks.len(), 1);
    assert_eq!(done_tasks[0].title, "Task A2");

    let _ = std::fs::remove_file(path);
}

#[test]
fn task_repository_active_queries_exclude_soft_deleted_tasks() {
    let file_name = format!(
        "goal-desk-soft-delete-filter-test-{}.sqlite",
        Uuid::new_v4()
    );
    let path = std::env::temp_dir().join(file_name);
    let repository = SqliteRepository::new(path.clone());
    repository.initialize().unwrap();

    use goal_desk_tauri::repository::TaskRepository;

    let goal_id = Uuid::new_v4();
    let mut task = DeskTask::new_todo("Deleted Task".to_string());
    task.status = TaskStatus::InProgress;
    task.linked_goal_id = Some(goal_id);

    TaskRepository::create(&repository, &task).unwrap();
    TaskRepository::soft_delete(&repository, task.id).unwrap();

    assert!(TaskRepository::find(&repository, task.id)
        .unwrap()
        .is_none());
    assert!(TaskRepository::list_by_goal(&repository, goal_id)
        .unwrap()
        .is_empty());
    assert!(
        TaskRepository::list_by_status(&repository, TaskStatus::InProgress)
            .unwrap()
            .is_empty()
    );

    let _ = std::fs::remove_file(path);
}

#[test]
fn task_repository_filtered_load_ignores_unrelated_malformed_activity_logs() {
    let file_name = format!(
        "goal-desk-filtered-log-scope-test-{}.sqlite",
        Uuid::new_v4()
    );
    let path = std::env::temp_dir().join(file_name);
    let repository = SqliteRepository::new(path.clone());
    repository.initialize().unwrap();

    use goal_desk_tauri::repository::TaskRepository;

    let target_goal = Uuid::new_v4();
    let other_goal = Uuid::new_v4();
    let target_task = DeskTask {
        id: Uuid::new_v4(),
        title: "Target Task".to_string(),
        content: String::new(),
        status: TaskStatus::Todo,
        planned_start_at: None,
        due_at: None,
        linked_goal_id: Some(target_goal),
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
        checklists: vec![],
        deleted_at: None,
    };
    let unrelated_task = DeskTask {
        id: Uuid::new_v4(),
        title: "Unrelated Task".to_string(),
        content: String::new(),
        status: TaskStatus::Todo,
        planned_start_at: None,
        due_at: None,
        linked_goal_id: Some(other_goal),
        linked_goal_label: None,
        bear_note_id: None,
        system_reminder_id: None,
        show_in_timeline: false,
        activity_logs: vec![],
        checklists: vec![],
        deleted_at: None,
    };

    TaskRepository::create(&repository, &target_task).unwrap();
    TaskRepository::create(&repository, &unrelated_task).unwrap();

    {
        let guard = repository.cached_connection().unwrap();
        let connection = guard.as_ref().unwrap();
        connection
            .execute(
                "INSERT INTO desk_task_activity_logs (id, task_id, action, note, timestamp) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![
                    Uuid::new_v4().to_string(),
                    unrelated_task.id.to_string(),
                    "UNKNOWN_ACTION",
                    Option::<String>::None,
                    Local::now().to_rfc3339(),
                ],
            )
            .unwrap();
    }

    let loaded = TaskRepository::list_by_goal(&repository, target_goal).unwrap();

    assert_eq!(loaded.len(), 1);
    assert_eq!(loaded[0].id, target_task.id);
    assert_eq!(loaded[0].activity_logs.len(), 1);

    let _ = std::fs::remove_file(path);
}

#[test]
fn task_repository_update_rejects_missing_task_without_persisting_activity_logs() {
    let file_name = format!(
        "goal-desk-missing-task-update-test-{}.sqlite",
        Uuid::new_v4()
    );
    let path = std::env::temp_dir().join(file_name);
    let repository = SqliteRepository::new(path.clone());
    repository.initialize().unwrap();

    use goal_desk_tauri::repository::TaskRepository;

    let missing_task = DeskTask {
        id: Uuid::new_v4(),
        title: "Missing Task".to_string(),
        content: String::new(),
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
        checklists: vec![],
        deleted_at: None,
    };

    let result = TaskRepository::update(&repository, &missing_task);

    assert!(
        result.is_err(),
        "updating a missing Todo should fail instead of writing orphan activity logs"
    );
    assert!(TaskRepository::list(&repository).unwrap().is_empty());
    {
        let guard = repository.cached_connection().unwrap();
        let connection = guard.as_ref().unwrap();
        let log_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM desk_task_activity_logs", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(log_count, 0);
    }

    let _ = std::fs::remove_file(path);
}
