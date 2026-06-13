use goal_desk_tauri::domain::GoalStatus;
use goal_desk_tauri::{
    create_goal_record, create_task_for_goal_record, goal_snapshot_data, today_snapshot_data,
    update_goal_record, update_goal_status_record,
};
use uuid::Uuid;

#[test]
fn today_snapshot_exposes_the_timeline_command_contract() {
    let path = std::env::temp_dir().join(format!("goal-desk-command-test-{}.sqlite", Uuid::new_v4()));
    let snapshot = today_snapshot_data(&path).unwrap();

    assert!(snapshot.is_empty());

    let _ = std::fs::remove_file(path);
}

#[test]
fn goal_snapshot_exposes_progress_cards_from_rust() {
    let path = std::env::temp_dir().join(format!("goal-desk-command-test-{}.sqlite", Uuid::new_v4()));
    let snapshot = goal_snapshot_data(&path).unwrap();

    assert!(snapshot.is_empty());

    let _ = std::fs::remove_file(path);
}

#[test]
fn create_goal_command_persists_goal_for_future_snapshot_loads() {
    let path = std::env::temp_dir().join(format!("goal-desk-command-test-{}.sqlite", Uuid::new_v4()));

    let _created = create_goal_record(
        &path,
        "Release Beta Version".to_string(),
        "Product".to_string(),
        "Complete content, acceptance, and release checklist for Beta.".to_string(),
        GoalStatus::Active,
    )
    .unwrap();

    let snapshot = goal_snapshot_data(&path).unwrap();

    assert!(snapshot.iter().any(|goal| goal.title == "Release Beta Version" && goal.area == "Product"));

    let _ = std::fs::remove_file(path);
}

#[test]
fn update_goal_command_persists_edited_fields_for_future_snapshot_loads() {
    let path = std::env::temp_dir().join(format!("goal-desk-command-test-{}.sqlite", Uuid::new_v4()));

    let created = create_goal_record(
        &path,
        "Release Beta Version".to_string(),
        "Product".to_string(),
        "Complete content, acceptance, and release checklist for Beta.".to_string(),
        GoalStatus::Active,
    )
    .unwrap();

    let updated = update_goal_record(
        &path,
        created.id.to_string(),
        "Release GA Version".to_string(),
        "Commercialization".to_string(),
        "Complete pricing, migration guide, and announcement schedule for GA release.".to_string(),
        GoalStatus::Paused,
    )
    .unwrap();

    let snapshot = goal_snapshot_data(&path).unwrap();

    assert_eq!(updated.title, "Release GA Version");
    assert_eq!(updated.description, "Complete pricing, migration guide, and announcement schedule for GA release.");
    assert_eq!(updated.status, GoalStatus::Paused);
    assert!(snapshot.iter().any(|goal| goal.title == "Release GA Version" && goal.area == "Commercialization"));

    let _ = std::fs::remove_file(path);
}

#[test]
fn update_goal_status_command_persists_status_for_future_snapshot_loads() {
    let path = std::env::temp_dir().join(format!("goal-desk-command-test-{}.sqlite", Uuid::new_v4()));

    let created = create_goal_record(
        &path,
        "Finalize workspace".to_string(),
        "Independent Development".to_string(),
        "Connect state machine, goal drawer, and data persistence.".to_string(),
        GoalStatus::Active,
    )
    .unwrap();

    let updated = update_goal_status_record(&path, created.id.to_string(), GoalStatus::Completed).unwrap();
    let reloaded = goal_snapshot_data(&path).unwrap();

    assert_eq!(updated.status, GoalStatus::Completed);
    assert!(reloaded.iter().any(|goal| goal.title == "Finalize workspace" && goal.status == GoalStatus::Completed));

    let _ = std::fs::remove_file(path);
}

#[test]
fn create_task_for_goal_persists_goal_linkage() {
    let path = std::env::temp_dir().join(format!("goal-desk-command-test-{}.sqlite", Uuid::new_v4()));

    let goal = create_goal_record(
        &path,
        "Ship goal-linked tasks".to_string(),
        "Product".to_string(),
        "Tasks created from a goal drawer must remain linked after persistence.".to_string(),
        GoalStatus::Active,
    )
    .unwrap();

    let task = create_task_for_goal_record(
        &path,
        goal.id.to_string(),
        "Write linked task persistence test".to_string(),
    )
    .unwrap();

    assert_eq!(task.title, "Write linked task persistence test");
    assert_eq!(task.linked_goal_id, Some(goal.id));
    assert_eq!(task.linked_goal_label.as_deref(), Some("Ship goal-linked tasks"));

    let reloaded_tasks = goal_desk_tauri::repository::SqliteRepository::new(path.clone())
        .load_desk_tasks()
        .unwrap();
    assert!(reloaded_tasks.iter().any(|saved| {
        saved.id == task.id
            && saved.linked_goal_id == Some(goal.id)
            && saved.linked_goal_label.as_deref() == Some("Ship goal-linked tasks")
    }));

    let _ = std::fs::remove_file(path);
}
