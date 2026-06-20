use goal_desk_tauri::domain::{GoalStatus, TaskStatus};
use goal_desk_tauri::repository::SqliteRepository;
use goal_desk_tauri::service::{AppService, AreaService, GoalService, TaskService};
use uuid::Uuid;

fn temp_repo(name: &str) -> SqliteRepository {
    let dir = std::env::temp_dir().join(format!("goal_desk_test_{}", name));
    let _ = std::fs::create_dir_all(&dir);
    let path = dir.join("test.sqlite");
    let _ = std::fs::remove_file(&path);
    SqliteRepository::new(path)
}

// ============================================================================
// GoalService Tests
// ============================================================================

#[test]
fn goal_service_create_validates_empty_title() {
    let repo = temp_repo("goal_empty_title");
    let service = GoalService::new(repo);
    let result = service.create_goal("", "Work", "desc");
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("empty"));
}

#[test]
fn goal_service_create_validates_whitespace_title() {
    let repo = temp_repo("goal_whitespace_title");
    let service = GoalService::new(repo);
    let result = service.create_goal("   ", "Work", "desc");
    assert!(result.is_err());
}

#[test]
fn goal_service_creates_goal_with_area() {
    let repo = temp_repo("goal_create_area");
    let service = GoalService::new(repo);
    let goal = service.create_goal("My Goal", "Work", "Description").unwrap();
    assert_eq!(goal.title, "My Goal");
    assert_eq!(goal.status, GoalStatus::Active);
    assert!(goal.area_id.is_some());
}

#[test]
fn goal_service_creates_goal_defaults_to_uncategorized() {
    let repo = temp_repo("goal_default_area");
    let service = GoalService::new(repo);
    let goal = service.create_goal("My Goal", "", "").unwrap();
    assert!(goal.area_id.is_some());
}

#[test]
fn goal_service_reuses_existing_area() {
    let repo = temp_repo("goal_reuse_area");
    let service = GoalService::new(repo);
    let g1 = service.create_goal("Goal 1", "Work", "").unwrap();
    let g2 = service.create_goal("Goal 2", "Work", "").unwrap();
    assert_eq!(g1.area_id, g2.area_id);
}

#[test]
fn goal_service_update_fields() {
    let repo = temp_repo("goal_update");
    let service = GoalService::new(repo);
    let goal = service.create_goal("Original", "Work", "desc").unwrap();
    let updated = service
        .update_goal_fields(&goal.id.to_string(), "Updated", "Personal", "new desc")
        .unwrap();
    assert_eq!(updated.title, "Updated");
    assert_eq!(updated.description, "new desc");
    assert_ne!(updated.area_id, goal.area_id);
}

#[test]
fn goal_service_update_status_valid() {
    let repo = temp_repo("goal_status_valid");
    let service = GoalService::new(repo);
    let goal = service.create_goal("Goal", "Work", "").unwrap();
    let updated = service
        .update_goal_status(&goal.id.to_string(), GoalStatus::Paused)
        .unwrap();
    assert_eq!(updated.status, GoalStatus::Paused);
}

#[test]
fn goal_service_update_status_invalid_transition() {
    let repo = temp_repo("goal_status_invalid");
    let service = GoalService::new(repo);
    let goal = service.create_goal("Goal", "Work", "").unwrap();
    let result = service.update_goal_status(&goal.id.to_string(), GoalStatus::ReadyToComplete);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Invalid"));
}

#[test]
fn goal_service_update_nonexistent_goal() {
    let repo = temp_repo("goal_not_found");
    let service = GoalService::new(repo);
    let fake_id = Uuid::new_v4().to_string();
    let result = service.update_goal_fields(&fake_id, "X", "Y", "Z");
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("not found"));
}

#[test]
fn goal_service_list_areas_with_stats() {
    let repo = temp_repo("goal_areas_stats");
    let service = GoalService::new(repo);
    service.create_goal("G1", "Work", "").unwrap();
    service.create_goal("G2", "Work", "").unwrap();
    service.create_goal("G3", "Personal", "").unwrap();

    let areas = service.list_areas_with_stats().unwrap();
    assert!(areas.len() >= 2);
    let work = areas.iter().find(|a| a.title == "Work").unwrap();
    assert_eq!(work.goal_count, 2);
    assert_eq!(work.active_goal_count, 2);
}

// ============================================================================
// TaskService Tests
// ============================================================================

#[test]
fn task_service_capture_validates_empty_title() {
    let repo = temp_repo("task_empty_title");
    let service = TaskService::new(repo);
    let result = service.capture_task("");
    assert!(result.is_err());
}

#[test]
fn task_service_capture_creates_task() {
    let repo = temp_repo("task_capture");
    let service = TaskService::new(repo);
    let task = service.capture_task("Buy milk").unwrap();
    assert_eq!(task.title, "Buy milk");
    assert_eq!(task.status, TaskStatus::Todo);
}

#[test]
fn task_service_create_for_goal() {
    let repo = temp_repo("task_for_goal");
    let goal_service = GoalService::new(repo.clone());
    let task_service = TaskService::new(repo);

    let goal = goal_service.create_goal("Goal", "Work", "").unwrap();
    let task = task_service
        .create_task_for_goal(&goal.id.to_string(), "Subtask")
        .unwrap();
    assert_eq!(task.linked_goal_id, Some(goal.id));
    assert_eq!(task.title, "Subtask");
}

#[test]
fn task_service_create_for_nonexistent_goal() {
    let repo = temp_repo("task_goal_not_found");
    let service = TaskService::new(repo);
    let fake_id = Uuid::new_v4().to_string();
    let result = service.create_task_for_goal(&fake_id, "Task");
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("not found"));
}

#[test]
fn task_service_update_content() {
    let repo = temp_repo("task_content");
    let service = TaskService::new(repo);
    let task = service.capture_task("Task").unwrap();
    let updated = service
        .update_task_content(&task.id.to_string(), "New content")
        .unwrap();
    assert_eq!(updated.content, "New content");
}

#[test]
fn task_service_update_status_valid() {
    let repo = temp_repo("task_status");
    let service = TaskService::new(repo);
    let task = service.capture_task("Task").unwrap();
    let updated = service
        .update_task_status(&task.id.to_string(), TaskStatus::InProgress, None)
        .unwrap();
    assert_eq!(updated.status, TaskStatus::InProgress);
    assert!(!updated.activity_logs.is_empty());
}

#[test]
fn task_service_update_status_invalid() {
    let repo = temp_repo("task_status_invalid");
    let service = TaskService::new(repo);
    let task = service.capture_task("Task").unwrap();
    let result = service.update_task_status(&task.id.to_string(), TaskStatus::Paused, None);
    assert!(result.is_err());
}

#[test]
fn task_service_add_note() {
    let repo = temp_repo("task_note");
    let service = TaskService::new(repo);
    let task = service.capture_task("Task").unwrap();
    let updated = service
        .add_task_note(&task.id.to_string(), "Important note")
        .unwrap();
    assert!(updated.activity_logs.iter().any(|l| l.note.as_deref() == Some("Important note")));
}

#[test]
fn task_service_add_note_empty() {
    let repo = temp_repo("task_note_empty");
    let service = TaskService::new(repo);
    let task = service.capture_task("Task").unwrap();
    let result = service.add_task_note(&task.id.to_string(), "  ");
    assert!(result.is_err());
}

// ============================================================================
// AreaService Tests
// ============================================================================

#[test]
fn area_service_create_validates_empty() {
    let repo = temp_repo("area_empty");
    let service = AreaService::new(repo);
    let result = service.create_area("");
    assert!(result.is_err());
}

#[test]
fn area_service_create_duplicate() {
    let repo = temp_repo("area_dup");
    let service = AreaService::new(repo);
    service.create_area("Work").unwrap();
    let result = service.create_area("Work");
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("already exists"));
}

#[test]
fn area_service_rename() {
    let repo = temp_repo("area_rename");
    let service = AreaService::new(repo);
    let area = service.create_area("Old Name").unwrap();
    let renamed = service.rename_area(&area.id.to_string(), "New Name").unwrap();
    assert_eq!(renamed.title, "New Name");
}

#[test]
fn area_service_delete_with_goals_force() {
    let repo = temp_repo("area_delete_force");
    let goal_service = GoalService::new(repo.clone());
    let area_service = AreaService::new(repo);

    let goal = goal_service.create_goal("G", "ToDelete", "").unwrap();
    let area_id = goal.area_id.unwrap();
    let result = area_service.delete_area(&area_id.to_string(), true).unwrap();
    assert!(result.success);
    assert_eq!(result.affected_goal_count, 1);
}

#[test]
fn area_service_delete_without_force_fails() {
    let repo = temp_repo("area_delete_noforce");
    let goal_service = GoalService::new(repo.clone());
    let area_service = AreaService::new(repo);

    let goal = goal_service.create_goal("G", "ToDelete", "").unwrap();
    let area_id = goal.area_id.unwrap();
    let result = area_service.delete_area(&area_id.to_string(), false).unwrap();
    assert!(!result.success);
}

// ============================================================================
// Progress Calculation Tests
// ============================================================================

#[test]
fn goal_service_progress_zero_when_no_tasks() {
    let repo = temp_repo("progress_no_tasks");
    let service = GoalService::new(repo);
    let goal = service.create_goal("Goal", "Work", "").unwrap();
    let summaries = service.goal_summaries().unwrap();
    let s = summaries.iter().find(|g| g.id == goal.id.to_string()).unwrap();
    assert_eq!(s.progress, 0);
    assert_eq!(s.task_count, 0);
}

#[test]
fn goal_service_progress_50_percent() {
    let repo = temp_repo("progress_50");
    let goal_service = GoalService::new(repo.clone());
    let task_service = TaskService::new(repo);

    let goal = goal_service.create_goal("Goal", "Work", "").unwrap();
    let t1 = task_service.create_task_for_goal(&goal.id.to_string(), "Task 1").unwrap();
    let t2 = task_service.create_task_for_goal(&goal.id.to_string(), "Task 2").unwrap();

    task_service.update_task_status(&t1.id.to_string(), TaskStatus::Done, None).unwrap();

    let summaries = goal_service.goal_summaries().unwrap();
    let s = summaries.iter().find(|g| g.id == goal.id.to_string()).unwrap();
    assert_eq!(s.progress, 50);
    assert_eq!(s.task_count, 2);
}

#[test]
fn goal_service_progress_100_percent() {
    let repo = temp_repo("progress_100");
    let goal_service = GoalService::new(repo.clone());
    let task_service = TaskService::new(repo);

    let goal = goal_service.create_goal("Goal", "Work", "").unwrap();
    let t1 = task_service.create_task_for_goal(&goal.id.to_string(), "Task 1").unwrap();
    let t2 = task_service.create_task_for_goal(&goal.id.to_string(), "Task 2").unwrap();

    task_service.update_task_status(&t1.id.to_string(), TaskStatus::Done, None).unwrap();
    task_service.update_task_status(&t2.id.to_string(), TaskStatus::Done, None).unwrap();

    let summaries = goal_service.goal_summaries().unwrap();
    let s = summaries.iter().find(|g| g.id == goal.id.to_string()).unwrap();
    assert_eq!(s.progress, 100);
}

// ============================================================================
// AppService Tests
// ============================================================================

#[test]
fn app_service_initializes_once() {
    let dir = std::env::temp_dir().join("goal_desk_test_app_init");
    let _ = std::fs::create_dir_all(&dir);
    let path = dir.join("test.sqlite");
    let _ = std::fs::remove_file(&path);
    let repo = SqliteRepository::new(path);
    let app = AppService::new(repo);
    app.initialize().unwrap();
    app.initialize().unwrap();
}

#[test]
fn app_service_shares_repository() {
    let dir = std::env::temp_dir().join("goal_desk_test_app_share");
    let _ = std::fs::create_dir_all(&dir);
    let path = dir.join("test.sqlite");
    let _ = std::fs::remove_file(&path);
    let repo = SqliteRepository::new(path);
    let app = AppService::new(repo);
    app.initialize().unwrap();

    let goal = app.goal.create_goal("Shared Goal", "Work", "").unwrap();
    let task = app.task.create_task_for_goal(&goal.id.to_string(), "Shared Task").unwrap();

    let summaries = app.goal.goal_summaries().unwrap();
    let s = summaries.iter().find(|g| g.id == goal.id.to_string()).unwrap();
    assert_eq!(s.task_count, 1);
    assert_eq!(s.progress, 0);

    app.task.update_task_status(&task.id.to_string(), TaskStatus::Done, None).unwrap();

    let summaries = app.goal.goal_summaries().unwrap();
    let s = summaries.iter().find(|g| g.id == goal.id.to_string()).unwrap();
    assert_eq!(s.progress, 100);
}
