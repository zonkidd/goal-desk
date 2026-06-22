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
    let result = service.create_goal("", "Work", "desc", GoalStatus::Active);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("empty"));
}

#[test]
fn goal_service_create_validates_whitespace_title() {
    let repo = temp_repo("goal_whitespace_title");
    let service = GoalService::new(repo);
    let result = service.create_goal("   ", "Work", "desc", GoalStatus::Active);
    assert!(result.is_err());
}

#[test]
fn goal_service_creates_goal_with_area() {
    let repo = temp_repo("goal_create_area");
    let service = GoalService::new(repo);
    let goal = service.create_goal("My Goal", "Work", "Description", GoalStatus::Active).unwrap();
    assert_eq!(goal.title, "My Goal");
    assert_eq!(goal.status, GoalStatus::Active);
    assert!(goal.area_id.is_some());
}

#[test]
fn goal_service_creates_goal_defaults_to_uncategorized() {
    let repo = temp_repo("goal_default_area");
    let service = GoalService::new(repo);
    let goal = service.create_goal("My Goal", "", "", GoalStatus::Active).unwrap();
    assert!(goal.area_id.is_some());
}

#[test]
fn goal_service_reuses_existing_area() {
    let repo = temp_repo("goal_reuse_area");
    let service = GoalService::new(repo);
    let g1 = service.create_goal("Goal 1", "Work", "", GoalStatus::Active).unwrap();
    let g2 = service.create_goal("Goal 2", "Work", "", GoalStatus::Active).unwrap();
    assert_eq!(g1.area_id, g2.area_id);
}

#[test]
fn goal_service_update_fields() {
    let repo = temp_repo("goal_update");
    let service = GoalService::new(repo);
    let goal = service.create_goal("Original", "Work", "desc", GoalStatus::Active).unwrap();
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
    let goal = service.create_goal("Goal", "Work", "", GoalStatus::Active).unwrap();
    let updated = service
        .update_goal_status(&goal.id.to_string(), GoalStatus::Paused)
        .unwrap();
    assert_eq!(updated.status, GoalStatus::Paused);
}

#[test]
fn goal_service_update_status_invalid_transition() {
    let repo = temp_repo("goal_status_invalid");
    let service = GoalService::new(repo);
    let goal = service.create_goal("Goal", "Work", "", GoalStatus::Active).unwrap();
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
fn area_service_list_areas_with_stats() {
    let repo = temp_repo("goal_areas_stats");
    let goal_service = GoalService::new(repo.clone());
    goal_service.create_goal("G1", "Work", "", GoalStatus::Active).unwrap();
    goal_service.create_goal("G2", "Work", "", GoalStatus::Active).unwrap();
    goal_service.create_goal("G3", "Personal", "", GoalStatus::Active).unwrap();

    let area_service = AreaService::new(repo);
    let areas = area_service.list_areas_with_stats().unwrap();
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

    let goal = goal_service.create_goal("Goal", "Work", "", GoalStatus::Active).unwrap();
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

    let goal = goal_service.create_goal("G", "ToDelete", "", GoalStatus::Active).unwrap();
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

    let goal = goal_service.create_goal("G", "ToDelete", "", GoalStatus::Active).unwrap();
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
    let goal = service.create_goal("Goal", "Work", "", GoalStatus::Active).unwrap();
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

    let goal = goal_service.create_goal("Goal", "Work", "", GoalStatus::Active).unwrap();
    let t1 = task_service.create_task_for_goal(&goal.id.to_string(), "Task 1").unwrap();
    let _t2 = task_service.create_task_for_goal(&goal.id.to_string(), "Task 2").unwrap();

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

    let goal = goal_service.create_goal("Goal", "Work", "", GoalStatus::Active).unwrap();
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

    let goal = app.goal.create_goal("Shared Goal", "Work", "", GoalStatus::Active).unwrap();
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

// ============================================================================
// GoalService.goal_summaries() Optimization Tests
// ============================================================================

#[test]
fn goal_summaries_returns_correct_progress() {
    let repo = temp_repo("summaries_progress");
    let goal_service = GoalService::new(repo.clone());
    let task_service = TaskService::new(repo);

    let g1 = goal_service.create_goal("G1", "Work", "", GoalStatus::Active).unwrap();
    let g2 = goal_service.create_goal("G2", "Work", "", GoalStatus::Active).unwrap();

    let t1 = task_service.create_task_for_goal(&g1.id.to_string(), "T1").unwrap();
    let _t2 = task_service.create_task_for_goal(&g1.id.to_string(), "T2").unwrap();
    let _t3 = task_service.create_task_for_goal(&g2.id.to_string(), "T3").unwrap();

    task_service.update_task_status(&t1.id.to_string(), TaskStatus::Done, None).unwrap();

    let summaries = goal_service.goal_summaries().unwrap();
    let s1 = summaries.iter().find(|g| g.id == g1.id.to_string()).unwrap();
    let s2 = summaries.iter().find(|g| g.id == g2.id.to_string()).unwrap();

    assert_eq!(s1.task_count, 2);
    assert_eq!(s1.progress, 50);
    assert_eq!(s2.task_count, 1);
    assert_eq!(s2.progress, 0);
}

#[test]
fn goal_summaries_includes_area_title() {
    let repo = temp_repo("summaries_area");
    let service = GoalService::new(repo);
    let goal = service.create_goal("Goal", "Work Area", "", GoalStatus::Active).unwrap();
    let summaries = service.goal_summaries().unwrap();
    let s = summaries.iter().find(|g| g.id == goal.id.to_string()).unwrap();
    assert_eq!(s.area, "Work Area");
}

#[test]
fn goal_summaries_next_todo_picks_first_incomplete() {
    let repo = temp_repo("summaries_next_todo");
    let goal_service = GoalService::new(repo.clone());
    let task_service = TaskService::new(repo);

    let goal = goal_service.create_goal("Goal", "Work", "", GoalStatus::Active).unwrap();
    let t1 = task_service.create_task_for_goal(&goal.id.to_string(), "First").unwrap();
    let _t2 = task_service.create_task_for_goal(&goal.id.to_string(), "Second").unwrap();

    task_service.update_task_status(&t1.id.to_string(), TaskStatus::Done, None).unwrap();

    let summaries = goal_service.goal_summaries().unwrap();
    let s = summaries.iter().find(|g| g.id == goal.id.to_string()).unwrap();
    assert_eq!(s.next_todo, "Second");
}

#[test]
fn task_service_update_status_with_sync_calls_callback() {
    let repo = temp_repo("task_status_sync");
    let service = TaskService::new(repo);
    let task = service.capture_task("Task").unwrap();

    // Set a system_reminder_id so the sync callback gets called
    let task_with_reminder = service
        .update_task_system_reminder_id(&task.id.to_string(), Some("reminder-1".to_string()))
        .unwrap();
    assert_eq!(task_with_reminder.system_reminder_id.as_deref(), Some("reminder-1"));

    // Track sync callback invocations
    let sync_called = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    let sync_flag = sync_called.clone();

    let updated = service
        .update_task_status_with_sync(
            &task.id.to_string(),
            TaskStatus::InProgress,
            None,
            Some(Box::new(move |reminder_id: &str, done: bool| {
                sync_flag.store(true, std::sync::atomic::Ordering::SeqCst);
                assert_eq!(reminder_id, "reminder-1");
                assert!(!done);
                Ok(())
            })),
        )
        .unwrap();

    assert_eq!(updated.status, TaskStatus::InProgress);
    assert!(sync_called.load(std::sync::atomic::Ordering::SeqCst));
}

#[test]
fn task_service_update_status_with_sync_skips_when_no_reminder() {
    let repo = temp_repo("task_status_no_sync");
    let service = TaskService::new(repo);
    let task = service.capture_task("Task").unwrap();

    let sync_called = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    let sync_flag = sync_called.clone();

    let updated = service
        .update_task_status_with_sync(
            &task.id.to_string(),
            TaskStatus::InProgress,
            None,
            Some(Box::new(move |_reminder_id: &str, _done: bool| {
                sync_flag.store(true, std::sync::atomic::Ordering::SeqCst);
                Ok(())
            })),
        )
        .unwrap();

    assert_eq!(updated.status, TaskStatus::InProgress);
    assert!(!sync_called.load(std::sync::atomic::Ordering::SeqCst));
}

#[test]
fn task_service_find_task_returns_existing_task() {
    let repo = temp_repo("task_find_existing");
    let service = TaskService::new(repo);
    let task = service.capture_task("Findable Task").unwrap();
    let found = service.find_task(&task.id.to_string()).unwrap();
    assert!(found.is_some());
    assert_eq!(found.unwrap().title, "Findable Task");
}

#[test]
fn task_service_find_task_returns_none_for_missing() {
    let repo = temp_repo("task_find_missing");
    let service = TaskService::new(repo);
    let fake_id = Uuid::new_v4().to_string();
    let found = service.find_task(&fake_id).unwrap();
    assert!(found.is_none());
}

// ============================================================================
// build_goal_summary Helper Tests
// ============================================================================

#[test]
fn build_goal_summary_zero_tasks() {
    use goal_desk_tauri::service::goal::build_goal_summary;
    use goal_desk_tauri::domain::{Goal, GoalStatus};

    let goal = Goal {
        id: Uuid::new_v4(),
        area_id: None,
        title: "Empty Goal".to_string(),
        description: "desc".to_string(),
        status: GoalStatus::Active,
    };
    let goal_tasks: Vec<&goal_desk_tauri::domain::DeskTask> = vec![];
    let all_tasks: Vec<goal_desk_tauri::domain::DeskTask> = vec![];

    let summary = build_goal_summary(&goal, "Unsorted", &goal_tasks, goal.compute_derived_status(&all_tasks));
    assert_eq!(summary.progress, 0);
    assert_eq!(summary.task_count, 0);
    assert_eq!(summary.next_todo, "");
    assert_eq!(summary.title, "Empty Goal");
    assert_eq!(summary.area, "Unsorted");
}

#[test]
fn build_goal_summary_half_done() {
    use goal_desk_tauri::service::goal::build_goal_summary;
    use goal_desk_tauri::domain::{Goal, GoalStatus, DeskTask, TaskStatus};

    let goal = Goal {
        id: Uuid::new_v4(),
        area_id: None,
        title: "Half Goal".to_string(),
        description: "".to_string(),
        status: GoalStatus::Active,
    };

    let mut t1 = DeskTask::new_todo("Task 1".to_string());
    t1.status = TaskStatus::Done;
    let t2 = DeskTask::new_todo("Task 2".to_string());

    let goal_tasks: Vec<&DeskTask> = vec![&t1, &t2];
    let all_tasks: Vec<DeskTask> = vec![t1.clone(), t2.clone()];
    let summary = build_goal_summary(&goal, "Work", &goal_tasks, goal.compute_derived_status(&all_tasks));

    assert_eq!(summary.progress, 50);
    assert_eq!(summary.task_count, 2);
    assert_eq!(summary.next_todo, "Task 2");
}

#[test]
fn build_goal_summary_all_done() {
    use goal_desk_tauri::service::goal::build_goal_summary;
    use goal_desk_tauri::domain::{Goal, GoalStatus, DeskTask, TaskStatus};

    let goal = Goal {
        id: Uuid::new_v4(),
        area_id: None,
        title: "Done Goal".to_string(),
        description: "".to_string(),
        status: GoalStatus::Completed,
    };

    let mut t1 = DeskTask::new_todo("Task 1".to_string());
    t1.status = TaskStatus::Done;
    let mut t2 = DeskTask::new_todo("Task 2".to_string());
    t2.status = TaskStatus::Done;

    let goal_tasks: Vec<&DeskTask> = vec![&t1, &t2];
    let all_tasks: Vec<DeskTask> = vec![t1.clone(), t2.clone()];
    let summary = build_goal_summary(&goal, "Personal", &goal_tasks, goal.compute_derived_status(&all_tasks));

    assert_eq!(summary.progress, 100);
    assert_eq!(summary.task_count, 2);
    assert_eq!(summary.next_todo, "");
}

#[test]
fn task_service_update_status_with_sync_none_callback() {
    let repo = temp_repo("task_status_no_callback");
    let service = TaskService::new(repo);
    let task = service.capture_task("Task").unwrap();

    let _task_with_reminder = service
        .update_task_system_reminder_id(&task.id.to_string(), Some("reminder-1".to_string()))
        .unwrap();

    // No callback provided - should not panic
    let updated = service
        .update_task_status_with_sync(
            &task.id.to_string(),
            TaskStatus::InProgress,
            None,
            None,
        )
        .unwrap();

    assert_eq!(updated.status, TaskStatus::InProgress);
}

// ============================================================================
// TaskService - EventKit encapsulation tests
// ============================================================================

#[test]
fn task_service_capture_task_with_reminder_links_reminder_id() {
    let repo = temp_repo("task_capture_with_reminder");
    let service = TaskService::new(repo);
    let task = service.capture_task("Buy milk at 3pm").unwrap();

    // Simulate EventKit creating a system reminder
    let updated = service
        .capture_task_with_system_reminder(&task.id.to_string(), "reminder-evt-1".to_string())
        .unwrap();

    assert_eq!(updated.system_reminder_id, Some("reminder-evt-1".to_string()));
}

#[test]
fn task_service_update_status_syncs_reminder_done() {
    let repo = temp_repo("task_status_sync_reminder");
    let service = TaskService::new(repo);
    let task = service.capture_task("Task with reminder").unwrap();
    let _ = service
        .update_task_system_reminder_id(&task.id.to_string(), Some("reminder-sync-1".to_string()))
        .unwrap();

    // New method: sync system reminder status
    let updated = service
        .sync_task_system_reminder(&task.id.to_string(), true)
        .unwrap();

    assert_eq!(updated.status, TaskStatus::Done);
}

#[test]
fn task_service_update_status_syncs_reminder_undone() {
    let repo = temp_repo("task_status_sync_reminder_undone");
    let service = TaskService::new(repo);
    let task = service.capture_task("Task with reminder").unwrap();
    let _ = service
        .update_task_system_reminder_id(&task.id.to_string(), Some("reminder-sync-2".to_string()))
        .unwrap();
    let _ = service
        .update_task_status(&task.id.to_string(), TaskStatus::Done, None)
        .unwrap();

    // Sync back to not done
    let updated = service
        .sync_task_system_reminder(&task.id.to_string(), false)
        .unwrap();

    assert_eq!(updated.status, TaskStatus::Todo);
}

#[test]
fn task_service_update_status_with_reminder_sync_calls_callback() {
    let repo = temp_repo("task_status_reminder_sync_callback");
    let service = TaskService::new(repo);
    let task = service.capture_task("Task with reminder").unwrap();
    let _ = service
        .update_task_system_reminder_id(&task.id.to_string(), Some("reminder-cb-1".to_string()))
        .unwrap();

    let callback_called = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    let flag = callback_called.clone();

    let updated = service
        .update_task_status_with_reminder_sync(
            &task.id.to_string(),
            TaskStatus::Done,
            None,
            Some(Box::new(move |reminder_id, done| {
                assert_eq!(reminder_id, "reminder-cb-1");
                assert!(done);
                flag.store(true, std::sync::atomic::Ordering::Relaxed);
                Ok(())
            })),
        )
        .unwrap();

    assert!(callback_called.load(std::sync::atomic::Ordering::Relaxed));
    assert_eq!(updated.status, TaskStatus::Done);
}

#[test]
fn task_service_update_status_with_reminder_sync_skips_callback_on_invalid_transition() {
    let repo = temp_repo("task_status_reminder_sync_invalid");
    let service = TaskService::new(repo);
    let task = service.capture_task("Task with reminder").unwrap();
    let _ = service
        .update_task_system_reminder_id(&task.id.to_string(), Some("reminder-invalid-1".to_string()))
        .unwrap();

    let callback_called = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    let flag = callback_called.clone();

    // IN_PROGRESS is not a valid transition from TODO (TODO can only go to IN_PROGRESS or DONE)
    // Actually, TODO -> IN_PROGRESS IS valid. Let's use PAUSED which is NOT valid from TODO.
    let result = service.update_task_status_with_reminder_sync(
        &task.id.to_string(),
        TaskStatus::Paused,
        None,
        Some(Box::new(move |_reminder_id, _done| {
            flag.store(true, std::sync::atomic::Ordering::Relaxed);
            Ok(())
        })),
    );

    assert!(result.is_err());
    assert!(!callback_called.load(std::sync::atomic::Ordering::Relaxed), "callback should not be called for invalid transition");
}

#[test]
fn task_service_update_fields_sets_system_reminder_id() {
    let repo = temp_repo("task_fields_system_reminder");
    let service = TaskService::new(repo);

    let task = service.capture_task("Reminder task").unwrap();
    assert!(task.system_reminder_id.is_none(), "new task should have no system_reminder_id");

    let updated = service.update_task_fields(
        &task.id.to_string(),
        "Reminder task",
        None, None, None, None,
        None,
        Some("reminder-123".to_string()),
    ).unwrap();
    assert_eq!(updated.system_reminder_id.as_deref(), Some("reminder-123"));
}

#[test]
fn task_service_update_fields_clears_system_reminder_id() {
    let repo = temp_repo("task_fields_clear_reminder");
    let service = TaskService::new(repo);

    let task = service.capture_task("Reminder task").unwrap();
    let with_reminder = service.update_task_fields(
        &task.id.to_string(),
        "Reminder task",
        None, None, None, None,
        None,
        Some("reminder-123".to_string()),
    ).unwrap();
    assert_eq!(with_reminder.system_reminder_id.as_deref(), Some("reminder-123"));

    let cleared = service.update_task_fields(
        &task.id.to_string(),
        "Reminder task",
        None, None, None, None,
        None,
        None,
    ).unwrap();
    assert!(cleared.system_reminder_id.is_none(), "system_reminder_id should be cleared when None is passed");
}

#[test]
fn task_service_update_fields_preserves_show_in_timeline_when_none() {
    let repo = temp_repo("task_fields_preserve_timeline");
    let service = TaskService::new(repo);

    let task = service.capture_task("Timeline task").unwrap();
    assert!(!task.show_in_timeline, "new task should default to false");

    // Explicitly set show_in_timeline to true
    let updated = service.update_task_fields(
        &task.id.to_string(),
        "Timeline task",
        None, None, None, None,
        Some(true),
        None,
    ).unwrap();
    assert!(updated.show_in_timeline, "should be true after explicit set");

    // Update title without passing show_in_timeline (None) — should preserve true
    let updated2 = service.update_task_fields(
        &task.id.to_string(),
        "Updated title",
        None, None, None, None,
        None,
        None,
    ).unwrap();
    assert!(updated2.show_in_timeline, "should preserve true when show_in_timeline is None");
    assert_eq!(updated2.title, "Updated title");
}

#[test]
fn task_sync_linked_tasks_respects_state_machine_paused_cannot_go_to_done() {
    let repo = temp_repo("sync_respects_state_machine");
    let service = TaskService::new(repo.clone());

    // Create a task, pause it, set a system_reminder_id
    let task = service.capture_task("Synced task").unwrap();
    service.update_task_status(&task.id.to_string(), TaskStatus::InProgress, None).unwrap();
    service.update_task_status(&task.id.to_string(), TaskStatus::Paused, None).unwrap();

    // Set system_reminder_id via repository directly (not exposed in service API)
    use goal_desk_tauri::repository::TaskRepository;
    let mut task_ref = TaskRepository::find(&repo, task.id).unwrap().unwrap();
    let reminder_id = uuid::Uuid::new_v4().to_string();
    task_ref.system_reminder_id = Some(reminder_id.clone());
    TaskRepository::update(&repo, &task_ref).unwrap();

    // Now try to sync as done — PAUSED → DONE is invalid per state machine
    service.sync_linked_tasks_for_system_reminder(&reminder_id, true).unwrap();

    // The task should remain PAUSED since the transition is invalid
    let task_after = service.find_task(&task.id.to_string()).unwrap().unwrap();
    assert_eq!(task_after.status, TaskStatus::Paused,
        "PAUSED task should not be set to DONE by sync — bypasses state machine");
}

#[test]
fn task_sync_task_system_reminder_does_not_double_write_activity_log() {
    let repo = temp_repo("sync_no_double_log");
    let service = TaskService::new(repo.clone());

    // Create a task and set system_reminder_id
    let task = service.capture_task("Double log test").unwrap();
    let reminder_id = uuid::Uuid::new_v4().to_string();
    use goal_desk_tauri::repository::TaskRepository;
    let mut task_ref = TaskRepository::find(&repo, task.id).unwrap().unwrap();
    task_ref.system_reminder_id = Some(reminder_id.clone());
    TaskRepository::update(&repo, &task_ref).unwrap();

    // Sync as done
    let updated = service.sync_task_system_reminder(&task.id.to_string(), true).unwrap();

    // Should have exactly ONE Completed activity log (plus the initial Created)
    let completed_logs: Vec<_> = updated.activity_logs.iter()
        .filter(|log| log.action == goal_desk_tauri::domain::TaskActivityAction::Completed)
        .collect();
    assert_eq!(completed_logs.len(), 1,
        "sync_task_system_reminder should produce exactly one Completed log, got {}",
        completed_logs.len());
}

#[test]
fn goal_summaries_shows_derived_status_when_all_tasks_done() {
    let repo = temp_repo("goal_summaries_derived_status");
    let goal_service = GoalService::new(repo.clone());
    let task_service = TaskService::new(repo);

    let goal = goal_service.create_goal("Goal", "Work", "", GoalStatus::Active).unwrap();
    let t1 = task_service.create_task_for_goal(&goal.id.to_string(), "Task 1").unwrap();
    let t2 = task_service.create_task_for_goal(&goal.id.to_string(), "Task 2").unwrap();

    // Complete all tasks
    task_service.update_task_status(&t1.id.to_string(), TaskStatus::Done, None).unwrap();
    task_service.update_task_status(&t2.id.to_string(), TaskStatus::Done, None).unwrap();

    // Goal status in DB is still ACTIVE, but summary should show READY_TO_COMPLETE
    let summaries = goal_service.goal_summaries().unwrap();
    let s = summaries.iter().find(|g| g.id == goal.id.to_string()).unwrap();
    assert_eq!(s.progress, 100);
    assert_eq!(s.status, goal_desk_tauri::domain::GoalStatus::ReadyToComplete,
        "goal_summaries should return derived status ReadyToComplete when all tasks are done");
}
