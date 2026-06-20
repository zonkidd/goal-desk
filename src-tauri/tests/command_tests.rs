use goal_desk_tauri::domain::GoalStatus;
use goal_desk_tauri::repository::{SqliteRepository, TaskRepository};
use goal_desk_tauri::service::{GoalService, TaskService};
use uuid::Uuid;

fn temp_repo(prefix: &str) -> SqliteRepository {
    let path = std::env::temp_dir().join(format!("{prefix}-{}.sqlite", Uuid::new_v4()));
    SqliteRepository::new(path)
}

#[test]
fn today_snapshot_exposes_the_timeline_command_contract() {
    let repo = temp_repo("cmd-today");
    let service = GoalService::new(repo);
    let summaries = service.goal_summaries().unwrap();
    assert!(summaries.is_empty());
}

#[test]
fn goal_snapshot_exposes_progress_cards_from_rust() {
    let repo = temp_repo("cmd-goal");
    let service = GoalService::new(repo);
    let summaries = service.goal_summaries().unwrap();
    assert!(summaries.is_empty());
}

#[test]
fn create_goal_command_persists_goal_for_future_snapshot_loads() {
    let repo = temp_repo("cmd-create");
    let service = GoalService::new(repo);

    let _created = service
        .create_goal("Release Beta Version", "Product", "Complete content, acceptance, and release checklist for Beta.")
        .unwrap();

    let summaries = service.goal_summaries().unwrap();
    assert!(summaries.iter().any(|g| g.title == "Release Beta Version" && g.area == "Product"));
}

#[test]
fn update_goal_command_persists_edited_fields_for_future_snapshot_loads() {
    let repo = temp_repo("cmd-update");
    let service = GoalService::new(repo);

    let created = service
        .create_goal("Release Beta Version", "Product", "Complete content, acceptance, and release checklist for Beta.")
        .unwrap();

    let updated = service
        .update_goal_fields(
            &created.id.to_string(),
            "Release GA Version",
            "Commercialization",
            "Complete pricing, migration guide, and announcement schedule for GA release.",
        )
        .unwrap();

    let summaries = service.goal_summaries().unwrap();

    assert_eq!(updated.title, "Release GA Version");
    assert_eq!(updated.description, "Complete pricing, migration guide, and announcement schedule for GA release.");
    assert!(summaries.iter().any(|g| g.title == "Release GA Version" && g.area == "Commercialization"));
}

#[test]
fn update_goal_status_command_persists_status_for_future_snapshot_loads() {
    let repo = temp_repo("cmd-status");
    let service = GoalService::new(repo);

    let created = service
        .create_goal("Finalize workspace", "Independent Development", "Connect state machine, goal drawer, and data persistence.")
        .unwrap();

    let updated = service
        .update_goal_status(&created.id.to_string(), GoalStatus::Completed)
        .unwrap();
    let summaries = service.goal_summaries().unwrap();

    assert_eq!(updated.status, GoalStatus::Completed);
    assert!(summaries.iter().any(|g| g.title == "Finalize workspace" && g.status == GoalStatus::Completed));
}

#[test]
fn create_task_for_goal_persists_goal_linkage() {
    let repo = temp_repo("cmd-task-link");
    let goal_service = GoalService::new(repo.clone());
    let task_service = TaskService::new(repo.clone());

    let goal = goal_service
        .create_goal("Ship goal-linked tasks", "Product", "Tasks created from a goal drawer must remain linked after persistence.")
        .unwrap();

    let task = task_service
        .create_task_for_goal(&goal.id.to_string(), "Write linked task persistence test")
        .unwrap();

    assert_eq!(task.title, "Write linked task persistence test");
    assert_eq!(task.linked_goal_id, Some(goal.id));
    assert_eq!(task.linked_goal_label.as_deref(), Some("Ship goal-linked tasks"));

    let tasks = TaskRepository::list(&repo).unwrap();
    assert!(tasks.iter().any(|saved| {
        saved.id == task.id
            && saved.linked_goal_id == Some(goal.id)
            && saved.linked_goal_label.as_deref() == Some("Ship goal-linked tasks")
    }));
}
