use goal_desk_tauri::bear::BearCallbackNote;
use goal_desk_tauri::domain::DeskTask;
use goal_desk_tauri::domain::{GoalStatus, TaskStatus};
use goal_desk_tauri::repository::SqliteRepository;
use goal_desk_tauri::service::{
    AppService, AreaService, GoalLink, GoalService, NullableFieldPatch, TaskFieldPatch, TaskService,
};
use uuid::Uuid;

fn temp_repo(name: &str) -> SqliteRepository {
    let dir = std::env::temp_dir().join(format!("goal_desk_test_{}", name));
    let _ = std::fs::create_dir_all(&dir);
    let path = dir.join("test.sqlite");
    let _ = std::fs::remove_file(&path);
    SqliteRepository::new(path)
}

fn parse_test_datetime(value: &str) -> chrono::DateTime<chrono::Local> {
    chrono::DateTime::parse_from_rfc3339(value)
        .unwrap()
        .with_timezone(&chrono::Local)
}

fn test_task(title: &str) -> DeskTask {
    DeskTask {
        id: Uuid::new_v4(),
        title: title.to_string(),
        content: "Existing content".to_string(),
        status: TaskStatus::Todo,
        planned_start_at: Some(parse_test_datetime("2026-06-15T10:00:00+08:00")),
        due_at: Some(parse_test_datetime("2026-06-20T18:00:00+08:00")),
        linked_goal_id: Some(Uuid::new_v4()),
        linked_goal_label: Some("Existing goal".to_string()),
        bear_note_id: None,
        system_reminder_id: Some("reminder-123".to_string()),
        show_in_timeline: true,
        activity_logs: vec![],
        checklists: vec![],
        deleted_at: None,
    }
}

trait TaskServiceTestPatchExt {
    fn update_task_fields(
        &self,
        task_id: &str,
        title: &str,
        planned_start_at: Option<Option<String>>,
        due_at: Option<Option<String>>,
        linked_goal_id: Option<String>,
        linked_goal_label: Option<String>,
        show_in_timeline: Option<bool>,
        system_reminder_id: Option<Option<String>>,
    ) -> Result<DeskTask, String>;
}

impl TaskServiceTestPatchExt for TaskService {
    fn update_task_fields(
        &self,
        task_id: &str,
        title: &str,
        planned_start_at: Option<Option<String>>,
        due_at: Option<Option<String>>,
        linked_goal_id: Option<String>,
        linked_goal_label: Option<String>,
        show_in_timeline: Option<bool>,
        system_reminder_id: Option<Option<String>>,
    ) -> Result<DeskTask, String> {
        let planned_start_at = match planned_start_at {
            Some(Some(value)) => NullableFieldPatch::set(parse_test_datetime(&value)),
            Some(None) => NullableFieldPatch::clear(),
            None => NullableFieldPatch::preserve(),
        };
        let due_at = match due_at {
            Some(Some(value)) => NullableFieldPatch::set(parse_test_datetime(&value)),
            Some(None) => NullableFieldPatch::clear(),
            None => NullableFieldPatch::preserve(),
        };
        let linked_goal = match (linked_goal_id, linked_goal_label) {
            (None, None) => NullableFieldPatch::preserve(),
            (Some(value), _) if value.trim().is_empty() => NullableFieldPatch::clear(),
            (Some(value), label) => NullableFieldPatch::set(GoalLink {
                id: Uuid::parse_str(&value).unwrap(),
                label,
            }),
            (None, Some(_)) => NullableFieldPatch::preserve(),
        };

        self.update_task_fields_with_patch(
            task_id,
            TaskFieldPatch {
                title: title.to_string(),
                planned_start_at,
                due_at,
                linked_goal,
                show_in_timeline,
                system_reminder_id: match system_reminder_id {
                    Some(Some(value)) => NullableFieldPatch::set(value),
                    Some(None) => NullableFieldPatch::clear(),
                    None => NullableFieldPatch::preserve(),
                },
            },
        )
    }
}

#[test]
fn task_field_patch_applies_field_semantics_to_a_todo() {
    let goal_id = Uuid::new_v4();
    let mut task = test_task("Original title");
    let original_due_at = task.due_at;

    TaskFieldPatch {
        title: "  Updated title  ".to_string(),
        planned_start_at: NullableFieldPatch::clear(),
        due_at: NullableFieldPatch::preserve(),
        linked_goal: NullableFieldPatch::set(GoalLink {
            id: goal_id,
            label: Some("   ".to_string()),
        }),
        show_in_timeline: Some(false),
        system_reminder_id: NullableFieldPatch::clear(),
    }
    .apply_to(&mut task)
    .unwrap();

    assert_eq!(task.title, "Updated title");
    assert!(task.planned_start_at.is_none());
    assert_eq!(task.due_at, original_due_at);
    assert_eq!(task.linked_goal_id, Some(goal_id));
    assert!(task.linked_goal_label.is_none());
    assert!(!task.show_in_timeline);
    assert!(task.system_reminder_id.is_none());
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
    let goal = service
        .create_goal("My Goal", "Work", "Description", GoalStatus::Active)
        .unwrap();
    assert_eq!(goal.title, "My Goal");
    assert_eq!(goal.status, GoalStatus::Active);
    assert!(goal.area_id.is_some());
}

#[test]
fn goal_service_rejects_manual_ready_to_complete_creation() {
    let repo = temp_repo("goal_reject_ready_to_complete_create");
    let service = GoalService::new(repo);
    let result = service.create_goal(
        "My Goal",
        "Work",
        "Description",
        GoalStatus::ReadyToComplete,
    );
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("READY_TO_COMPLETE"));
}

#[test]
fn goal_service_creates_goal_defaults_to_uncategorized() {
    let repo = temp_repo("goal_default_area");
    let service = GoalService::new(repo);
    let goal = service
        .create_goal("My Goal", "", "", GoalStatus::Active)
        .unwrap();
    assert!(goal.area_id.is_some());
}

#[test]
fn goal_service_reuses_existing_area() {
    let repo = temp_repo("goal_reuse_area");
    let service = GoalService::new(repo);
    let g1 = service
        .create_goal("Goal 1", "Work", "", GoalStatus::Active)
        .unwrap();
    let g2 = service
        .create_goal("Goal 2", "Work", "", GoalStatus::Active)
        .unwrap();
    assert_eq!(g1.area_id, g2.area_id);
}

#[test]
fn goal_service_update_fields() {
    let repo = temp_repo("goal_update");
    let service = GoalService::new(repo);
    let goal = service
        .create_goal("Original", "Work", "desc", GoalStatus::Active)
        .unwrap();
    let updated = service
        .update_goal_fields(&goal.id.to_string(), "Updated", "Personal", "new desc")
        .unwrap();
    assert_eq!(updated.title, "Updated");
    assert_eq!(updated.description, "new desc");
    assert_ne!(updated.area_id, goal.area_id);
}

#[test]
fn goal_service_update_fields_refreshes_linked_task_labels() {
    let repo = temp_repo("goal_update_task_labels");
    let goal_service = GoalService::new(repo.clone());
    let task_service = TaskService::new(repo);
    let goal = goal_service
        .create_goal("Original", "Work", "desc", GoalStatus::Active)
        .unwrap();
    let task = task_service
        .create_task_for_goal(&goal.id.to_string(), "Linked task")
        .unwrap();
    assert_eq!(task.linked_goal_label.as_deref(), Some("Original"));

    goal_service
        .update_goal_fields(&goal.id.to_string(), "Updated", "Work", "desc")
        .unwrap();

    let reloaded = task_service
        .find_task(&task.id.to_string())
        .unwrap()
        .unwrap();
    assert_eq!(reloaded.linked_goal_label.as_deref(), Some("Updated"));
}

#[test]
fn bear_note_link_persists_task_link_and_preview() {
    let repo = temp_repo("bear_note_link");
    let app_service = AppService::new(repo);
    let task = app_service.task.capture_task("Review Bear note").unwrap();
    let note = BearCallbackNote {
        identifier: "bear-note-123".to_string(),
        title: "Launch Plan".to_string(),
        note: "# Launch\n\nHello Bear".to_string(),
        tags: vec!["work".to_string()],
        is_trashed: false,
        modification_date: Some(parse_test_datetime("2026-07-07T09:00:00+08:00")),
        creation_date: Some(parse_test_datetime("2026-07-06T09:00:00+08:00")),
    };

    let linked = app_service
        .bear
        .link_task_to_callback_note(&task.id.to_string(), note)
        .unwrap();

    assert_eq!(linked.task.bear_note_id.as_deref(), Some("bear-note-123"));
    assert_eq!(linked.preview.title, "Launch Plan");
    assert_eq!(linked.preview.note, "# Launch\n\nHello Bear");
    assert_eq!(linked.preview.tags, vec!["work"]);

    let reloaded_task = app_service
        .task
        .find_task(&task.id.to_string())
        .unwrap()
        .unwrap();
    let reloaded_preview = app_service
        .bear
        .get_note_preview(&task.id.to_string())
        .unwrap()
        .unwrap();

    assert_eq!(reloaded_task.bear_note_id.as_deref(), Some("bear-note-123"));
    assert_eq!(reloaded_preview.bear_note_id, "bear-note-123");
    assert_eq!(reloaded_preview.title, "Launch Plan");
    assert_eq!(reloaded_preview.note, "# Launch\n\nHello Bear");
}

#[test]
fn goal_service_update_status_valid() {
    let repo = temp_repo("goal_status_valid");
    let service = GoalService::new(repo);
    let goal = service
        .create_goal("Goal", "Work", "", GoalStatus::Active)
        .unwrap();
    let updated = service
        .update_goal_status(&goal.id.to_string(), GoalStatus::Paused)
        .unwrap();
    assert_eq!(updated.status, GoalStatus::Paused);
}

#[test]
fn goal_service_update_status_invalid_transition() {
    let repo = temp_repo("goal_status_invalid");
    let service = GoalService::new(repo);
    let goal = service
        .create_goal("Goal", "Work", "", GoalStatus::Active)
        .unwrap();
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
    goal_service
        .create_goal("G1", "Work", "", GoalStatus::Active)
        .unwrap();
    goal_service
        .create_goal("G2", "Work", "", GoalStatus::Active)
        .unwrap();
    goal_service
        .create_goal("G3", "Personal", "", GoalStatus::Active)
        .unwrap();

    let area_service = AreaService::new(repo);
    let areas = area_service.list_areas_with_stats().unwrap();
    assert!(areas.len() >= 2);
    let work = areas.iter().find(|a| a.title == "Work").unwrap();
    assert_eq!(work.goal_count, 2);
    assert_eq!(work.active_goal_count, 2);
}

#[test]
fn area_service_counts_ready_to_complete_goals_as_active() {
    let repo = temp_repo("goal_areas_ready_counts_as_active");
    let goal_service = GoalService::new(repo.clone());
    goal_service
        .create_goal("G1", "Work", "", GoalStatus::Active)
        .unwrap();
    goal_service
        .create_goal("G2", "Work", "", GoalStatus::Paused)
        .unwrap();

    use goal_desk_tauri::repository::GoalRepository;
    let mut goals = GoalRepository::list(&repo).unwrap();
    let ready_goal = goals.iter_mut().find(|goal| goal.title == "G1").unwrap();
    ready_goal.status = GoalStatus::ReadyToComplete;
    GoalRepository::update(&repo, ready_goal).unwrap();

    let area_service = AreaService::new(repo);
    let areas = area_service.list_areas_with_stats().unwrap();
    let work = areas.iter().find(|a| a.title == "Work").unwrap();
    assert_eq!(work.goal_count, 2);
    assert_eq!(work.active_goal_count, 1);
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

    let goal = goal_service
        .create_goal("Goal", "Work", "", GoalStatus::Active)
        .unwrap();
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
fn task_service_update_status_same_status_is_idempotent() {
    let repo = temp_repo("task_status_same_status");
    let service = TaskService::new(repo);
    let task = service.capture_task("Task").unwrap();

    let updated = service
        .update_task_status(
            &task.id.to_string(),
            TaskStatus::Todo,
            Some("Already there".to_string()),
        )
        .unwrap();

    assert_eq!(updated.status, TaskStatus::Todo);
    assert_eq!(updated.activity_logs, task.activity_logs);
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
    assert!(updated
        .activity_logs
        .iter()
        .any(|l| l.note.as_deref() == Some("Important note")));
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
fn area_service_find_or_create_area_is_case_insensitive() {
    let repo = temp_repo("area_case_insensitive");
    let goal_service = GoalService::new(repo.clone());

    // Create goals with different casing of the same area name
    let g1 = goal_service
        .create_goal("Goal 1", "Work", "", GoalStatus::Active)
        .unwrap();
    let g2 = goal_service
        .create_goal("Goal 2", "work", "", GoalStatus::Active)
        .unwrap();
    let g3 = goal_service
        .create_goal("Goal 3", "WORK", "", GoalStatus::Active)
        .unwrap();

    // All goals should share the same area (first created)
    assert_eq!(g1.area_id, g2.area_id);
    assert_eq!(g2.area_id, g3.area_id);

    // Should only have one area (not three separate ones)
    let areas = goal_desk_tauri::repository::AreaRepository::list(&repo).unwrap();
    let work_areas: Vec<_> = areas
        .iter()
        .filter(|a| a.title.to_lowercase() == "work")
        .collect();
    assert_eq!(
        work_areas.len(),
        1,
        "should have exactly one 'work' area, got {}",
        work_areas.len()
    );
}

#[test]
fn area_service_create_duplicate_case_insensitive() {
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
    let renamed = service
        .rename_area(&area.id.to_string(), "New Name")
        .unwrap();
    assert_eq!(renamed.title, "New Name");
}

#[test]
fn area_service_delete_with_goals_force() {
    let repo = temp_repo("area_delete_force");
    let goal_service = GoalService::new(repo.clone());
    let area_service = AreaService::new(repo);

    let goal = goal_service
        .create_goal("G", "ToDelete", "", GoalStatus::Active)
        .unwrap();
    let area_id = goal.area_id.unwrap();
    let result = area_service
        .delete_area(&area_id.to_string(), true)
        .unwrap();
    assert!(result.success);
    assert_eq!(result.affected_goal_count, 1);
}

#[test]
fn area_service_delete_without_force_fails() {
    let repo = temp_repo("area_delete_noforce");
    let goal_service = GoalService::new(repo.clone());
    let area_service = AreaService::new(repo);

    let goal = goal_service
        .create_goal("G", "ToDelete", "", GoalStatus::Active)
        .unwrap();
    let area_id = goal.area_id.unwrap();
    let result = area_service
        .delete_area(&area_id.to_string(), false)
        .unwrap();
    assert!(!result.success);
}

// ============================================================================
// Progress Calculation Tests
// ============================================================================

#[test]
fn goal_service_progress_zero_when_no_tasks() {
    let repo = temp_repo("progress_no_tasks");
    let service = GoalService::new(repo);
    let goal = service
        .create_goal("Goal", "Work", "", GoalStatus::Active)
        .unwrap();
    let summaries = service.goal_summaries().unwrap();
    let s = summaries
        .iter()
        .find(|g| g.id == goal.id.to_string())
        .unwrap();
    assert_eq!(s.progress, 0);
    assert_eq!(s.task_count, 0);
}

#[test]
fn goal_service_progress_50_percent() {
    let repo = temp_repo("progress_50");
    let goal_service = GoalService::new(repo.clone());
    let task_service = TaskService::new(repo);

    let goal = goal_service
        .create_goal("Goal", "Work", "", GoalStatus::Active)
        .unwrap();
    let t1 = task_service
        .create_task_for_goal(&goal.id.to_string(), "Task 1")
        .unwrap();
    let _t2 = task_service
        .create_task_for_goal(&goal.id.to_string(), "Task 2")
        .unwrap();

    task_service
        .update_task_status(&t1.id.to_string(), TaskStatus::Done, None)
        .unwrap();

    let summaries = goal_service.goal_summaries().unwrap();
    let s = summaries
        .iter()
        .find(|g| g.id == goal.id.to_string())
        .unwrap();
    assert_eq!(s.progress, 50);
    assert_eq!(s.task_count, 2);
}

#[test]
fn goal_service_progress_100_percent() {
    let repo = temp_repo("progress_100");
    let goal_service = GoalService::new(repo.clone());
    let task_service = TaskService::new(repo);

    let goal = goal_service
        .create_goal("Goal", "Work", "", GoalStatus::Active)
        .unwrap();
    let t1 = task_service
        .create_task_for_goal(&goal.id.to_string(), "Task 1")
        .unwrap();
    let t2 = task_service
        .create_task_for_goal(&goal.id.to_string(), "Task 2")
        .unwrap();

    task_service
        .update_task_status(&t1.id.to_string(), TaskStatus::Done, None)
        .unwrap();
    task_service
        .update_task_status(&t2.id.to_string(), TaskStatus::Done, None)
        .unwrap();

    let summaries = goal_service.goal_summaries().unwrap();
    let s = summaries
        .iter()
        .find(|g| g.id == goal.id.to_string())
        .unwrap();
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

    let goal = app
        .goal
        .create_goal("Shared Goal", "Work", "", GoalStatus::Active)
        .unwrap();
    let task = app
        .task
        .create_task_for_goal(&goal.id.to_string(), "Shared Task")
        .unwrap();

    let summaries = app.goal.goal_summaries().unwrap();
    let s = summaries
        .iter()
        .find(|g| g.id == goal.id.to_string())
        .unwrap();
    assert_eq!(s.task_count, 1);
    assert_eq!(s.progress, 0);

    app.task
        .update_task_status(&task.id.to_string(), TaskStatus::Done, None)
        .unwrap();

    let summaries = app.goal.goal_summaries().unwrap();
    let s = summaries
        .iter()
        .find(|g| g.id == goal.id.to_string())
        .unwrap();
    assert_eq!(s.progress, 100);
}

#[test]
fn task_service_update_task_status_keeps_system_reminder_read_only() {
    let repo = temp_repo("app_service_task_status_read_only");
    let app = AppService::new(repo);
    let task = app
        .task
        .capture_task("Task with external reminder")
        .unwrap();
    let linked_task = app
        .task
        .update_task_system_reminder_id(&task.id.to_string(), Some("reminder-1".to_string()))
        .unwrap();

    let updated = app
        .task
        .update_task_status(&linked_task.id.to_string(), TaskStatus::Done, None)
        .unwrap();

    assert_eq!(updated.status, TaskStatus::Done);
    assert_eq!(updated.system_reminder_id.as_deref(), Some("reminder-1"));
}

// ============================================================================
// GoalService.goal_summaries() Optimization Tests
// ============================================================================

#[test]
fn goal_summaries_returns_correct_progress() {
    let repo = temp_repo("summaries_progress");
    let goal_service = GoalService::new(repo.clone());
    let task_service = TaskService::new(repo);

    let g1 = goal_service
        .create_goal("G1", "Work", "", GoalStatus::Active)
        .unwrap();
    let g2 = goal_service
        .create_goal("G2", "Work", "", GoalStatus::Active)
        .unwrap();

    let t1 = task_service
        .create_task_for_goal(&g1.id.to_string(), "T1")
        .unwrap();
    let _t2 = task_service
        .create_task_for_goal(&g1.id.to_string(), "T2")
        .unwrap();
    let _t3 = task_service
        .create_task_for_goal(&g2.id.to_string(), "T3")
        .unwrap();

    task_service
        .update_task_status(&t1.id.to_string(), TaskStatus::Done, None)
        .unwrap();

    let summaries = goal_service.goal_summaries().unwrap();
    let s1 = summaries
        .iter()
        .find(|g| g.id == g1.id.to_string())
        .unwrap();
    let s2 = summaries
        .iter()
        .find(|g| g.id == g2.id.to_string())
        .unwrap();

    assert_eq!(s1.task_count, 2);
    assert_eq!(s1.progress, 50);
    assert_eq!(s2.task_count, 1);
    assert_eq!(s2.progress, 0);
}

#[test]
fn goal_summaries_includes_area_title() {
    let repo = temp_repo("summaries_area");
    let service = GoalService::new(repo);
    let goal = service
        .create_goal("Goal", "Work Area", "", GoalStatus::Active)
        .unwrap();
    let summaries = service.goal_summaries().unwrap();
    let s = summaries
        .iter()
        .find(|g| g.id == goal.id.to_string())
        .unwrap();
    assert_eq!(s.area, "Work Area");
}

#[test]
fn goal_summaries_next_todo_picks_first_incomplete() {
    let repo = temp_repo("summaries_next_todo");
    let goal_service = GoalService::new(repo.clone());
    let task_service = TaskService::new(repo);

    let goal = goal_service
        .create_goal("Goal", "Work", "", GoalStatus::Active)
        .unwrap();
    let t1 = task_service
        .create_task_for_goal(&goal.id.to_string(), "First")
        .unwrap();
    let _t2 = task_service
        .create_task_for_goal(&goal.id.to_string(), "Second")
        .unwrap();

    task_service
        .update_task_status(&t1.id.to_string(), TaskStatus::Done, None)
        .unwrap();

    let summaries = goal_service.goal_summaries().unwrap();
    let s = summaries
        .iter()
        .find(|g| g.id == goal.id.to_string())
        .unwrap();
    assert_eq!(s.next_todo, "Second");
}

#[test]
fn task_service_update_status_keeps_system_reminder_link_read_only() {
    let repo = temp_repo("task_status_sync");
    let service = TaskService::new(repo);
    let task = service.capture_task("Task").unwrap();

    // Set a system_reminder_id so status updates preserve the read-only external link.
    let task_with_reminder = service
        .update_task_system_reminder_id(&task.id.to_string(), Some("reminder-1".to_string()))
        .unwrap();
    assert_eq!(
        task_with_reminder.system_reminder_id.as_deref(),
        Some("reminder-1")
    );

    let updated = service
        .update_task_status(&task.id.to_string(), TaskStatus::InProgress, None)
        .unwrap();

    assert_eq!(updated.status, TaskStatus::InProgress);
    assert_eq!(updated.system_reminder_id.as_deref(), Some("reminder-1"));
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
    use goal_desk_tauri::domain::{Goal, GoalStatus};
    use goal_desk_tauri::service::goal::build_goal_summary;

    let goal = Goal {
        id: Uuid::new_v4(),
        area_id: None,
        title: "Empty Goal".to_string(),
        description: "desc".to_string(),
        status: GoalStatus::Active,
        deleted_at: None,
    };
    let goal_tasks: Vec<&goal_desk_tauri::domain::DeskTask> = vec![];
    let all_tasks: Vec<goal_desk_tauri::domain::DeskTask> = vec![];

    let summary = build_goal_summary(
        &goal,
        "Unsorted",
        &goal_tasks,
        goal.compute_derived_status(&all_tasks),
    );
    assert_eq!(summary.progress, 0);
    assert_eq!(summary.task_count, 0);
    assert_eq!(summary.next_todo, "");
    assert_eq!(summary.title, "Empty Goal");
    assert_eq!(summary.area, "Unsorted");
}

#[test]
fn build_goal_summary_half_done() {
    use goal_desk_tauri::domain::{DeskTask, Goal, GoalStatus, TaskStatus};
    use goal_desk_tauri::service::goal::build_goal_summary;

    let goal = Goal {
        id: Uuid::new_v4(),
        area_id: None,
        title: "Half Goal".to_string(),
        description: "".to_string(),
        status: GoalStatus::Active,
        deleted_at: None,
    };

    let mut t1 = DeskTask::new_todo("Task 1".to_string());
    t1.status = TaskStatus::Done;
    let t2 = DeskTask::new_todo("Task 2".to_string());

    let goal_tasks: Vec<&DeskTask> = vec![&t1, &t2];
    let all_tasks: Vec<DeskTask> = vec![t1.clone(), t2.clone()];
    let summary = build_goal_summary(
        &goal,
        "Work",
        &goal_tasks,
        goal.compute_derived_status(&all_tasks),
    );

    assert_eq!(summary.progress, 50);
    assert_eq!(summary.task_count, 2);
    assert_eq!(summary.next_todo, "Task 2");
}

#[test]
fn build_goal_summary_all_done() {
    use goal_desk_tauri::domain::{DeskTask, Goal, GoalStatus, TaskStatus};
    use goal_desk_tauri::service::goal::build_goal_summary;

    let goal = Goal {
        id: Uuid::new_v4(),
        area_id: None,
        title: "Done Goal".to_string(),
        description: "".to_string(),
        status: GoalStatus::Completed,
        deleted_at: None,
    };

    let mut t1 = DeskTask::new_todo("Task 1".to_string());
    t1.status = TaskStatus::Done;
    let mut t2 = DeskTask::new_todo("Task 2".to_string());
    t2.status = TaskStatus::Done;

    let goal_tasks: Vec<&DeskTask> = vec![&t1, &t2];
    let all_tasks: Vec<DeskTask> = vec![t1.clone(), t2.clone()];
    let summary = build_goal_summary(
        &goal,
        "Personal",
        &goal_tasks,
        goal.compute_derived_status(&all_tasks),
    );

    assert_eq!(summary.progress, 100);
    assert_eq!(summary.task_count, 2);
    assert_eq!(summary.next_todo, "");
}

#[test]
fn goal_summary_assembler_summarizes_goals_from_one_workspace_context() {
    use goal_desk_tauri::domain::{Area, Goal};
    use goal_desk_tauri::service::goal::GoalSummaryAssembler;

    let work_area = Area {
        id: Uuid::new_v4(),
        title: "Work".to_string(),
        is_system: false,
    };
    let goal = Goal {
        id: Uuid::new_v4(),
        area_id: Some(work_area.id),
        title: "Ship feature".to_string(),
        description: "Important".to_string(),
        status: GoalStatus::Active,
        deleted_at: None,
    };
    let done_task = DeskTask {
        id: Uuid::new_v4(),
        title: "Done task".to_string(),
        content: String::new(),
        status: TaskStatus::Done,
        planned_start_at: None,
        due_at: None,
        linked_goal_id: Some(goal.id),
        linked_goal_label: Some(goal.title.clone()),
        bear_note_id: None,
        system_reminder_id: None,
        show_in_timeline: false,
        activity_logs: vec![],
        checklists: vec![],
        deleted_at: None,
    };
    let next_task = DeskTask {
        id: Uuid::new_v4(),
        title: "Next task".to_string(),
        content: String::new(),
        status: TaskStatus::Todo,
        planned_start_at: None,
        due_at: None,
        linked_goal_id: Some(goal.id),
        linked_goal_label: Some(goal.title.clone()),
        bear_note_id: None,
        system_reminder_id: None,
        show_in_timeline: false,
        activity_logs: vec![],
        checklists: vec![],
        deleted_at: None,
    };

    let areas = vec![work_area];
    let tasks = vec![done_task, next_task];
    let assembler = GoalSummaryAssembler::new(&areas, &tasks);
    let summary = assembler.summarize(&goal);

    assert_eq!(summary.area, "Work");
    assert_eq!(summary.progress, 50);
    assert_eq!(summary.task_count, 2);
    assert_eq!(summary.next_todo, "Next task");
    assert_eq!(summary.status, GoalStatus::Active);
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

    assert_eq!(
        updated.system_reminder_id,
        Some("reminder-evt-1".to_string())
    );
}

#[test]
fn task_service_update_fields_preserves_other_fields_when_not_passed() {
    let repo = temp_repo("task_fields_preserve_all");
    let service = TaskService::new(repo);

    // Create a task with all fields set
    let task = service.capture_task("Full task").unwrap();
    let updated = service
        .update_task_fields(
            &task.id.to_string(),
            "Full task",
            Some(Some("2026-06-15T10:00:00+08:00".to_string())),
            Some(Some("2026-06-20T18:00:00+08:00".to_string())),
            None,
            None,
            Some(true),
            Some(Some("reminder-abc".to_string())),
        )
        .unwrap();

    assert!(
        updated.planned_start_at.is_some(),
        "planned_start_at should be set"
    );
    assert!(updated.due_at.is_some(), "due_at should be set");
    assert!(updated.show_in_timeline, "show_in_timeline should be true");
    assert_eq!(updated.system_reminder_id.as_deref(), Some("reminder-abc"));

    // Now update only title and system_reminder_id — other fields should be preserved
    let updated2 = service
        .update_task_fields(
            &task.id.to_string(),
            "Updated title",
            None,
            None,
            None,
            None,
            None,
            Some(Some("reminder-xyz".to_string())),
        )
        .unwrap();

    assert_eq!(updated2.title, "Updated title");
    assert!(
        updated2.planned_start_at.is_some(),
        "planned_start_at should be preserved when None is passed"
    );
    assert!(
        updated2.due_at.is_some(),
        "due_at should be preserved when None is passed"
    );
    assert!(
        updated2.show_in_timeline,
        "show_in_timeline should be preserved when None is passed"
    );
    assert_eq!(updated2.system_reminder_id.as_deref(), Some("reminder-xyz"));
}

#[test]
fn task_service_update_fields_accepts_a_coherent_patch_object() {
    let repo = temp_repo("task_fields_patch_object");
    let service = TaskService::new(repo.clone());

    let task = service.capture_task("Patch task").unwrap();
    let scheduled = service
        .update_task_fields_with_patch(
            &task.id.to_string(),
            TaskFieldPatch {
                title: "Patch task".to_string(),
                planned_start_at: NullableFieldPatch::set(parse_test_datetime(
                    "2026-06-15T10:00:00+08:00",
                )),
                due_at: NullableFieldPatch::set(parse_test_datetime("2026-06-20T18:00:00+08:00")),
                linked_goal: NullableFieldPatch::preserve(),
                show_in_timeline: Some(true),
                system_reminder_id: NullableFieldPatch::set("reminder-123".to_string()),
            },
        )
        .unwrap();

    assert!(scheduled.planned_start_at.is_some());
    assert!(scheduled.due_at.is_some());
    assert!(scheduled.show_in_timeline);
    assert_eq!(
        scheduled.system_reminder_id.as_deref(),
        Some("reminder-123")
    );

    let goal = GoalService::new(repo)
        .create_goal("Linked goal", "Work", "", GoalStatus::Active)
        .unwrap();
    let linked = service
        .update_task_fields_with_patch(
            &task.id.to_string(),
            TaskFieldPatch {
                title: "Patch task".to_string(),
                planned_start_at: NullableFieldPatch::preserve(),
                due_at: NullableFieldPatch::preserve(),
                linked_goal: NullableFieldPatch::set(GoalLink {
                    id: goal.id,
                    label: Some(goal.title.clone()),
                }),
                show_in_timeline: Some(true),
                system_reminder_id: NullableFieldPatch::set("reminder-123".to_string()),
            },
        )
        .unwrap();

    assert_eq!(linked.linked_goal_id, Some(goal.id));
    assert_eq!(linked.linked_goal_label.as_deref(), Some("Linked goal"));

    let patched = service
        .update_task_fields_with_patch(
            &task.id.to_string(),
            TaskFieldPatch {
                title: "Patched title".to_string(),
                planned_start_at: NullableFieldPatch::clear(),
                due_at: NullableFieldPatch::preserve(),
                linked_goal: NullableFieldPatch::preserve(),
                show_in_timeline: None,
                system_reminder_id: NullableFieldPatch::preserve(),
            },
        )
        .unwrap();

    assert_eq!(patched.title, "Patched title");
    assert!(
        patched.planned_start_at.is_none(),
        "explicit clear should remove planned_start_at"
    );
    assert!(
        patched.due_at.is_some(),
        "omitted due_at should preserve the existing value"
    );
    assert!(
        patched.show_in_timeline,
        "omitted show_in_timeline should preserve the existing value"
    );
    assert_eq!(patched.linked_goal_id, Some(goal.id));
    assert_eq!(patched.linked_goal_label.as_deref(), Some("Linked goal"));
    assert_eq!(patched.system_reminder_id.as_deref(), Some("reminder-123"));

    let cleared = service
        .update_task_fields_with_patch(
            &task.id.to_string(),
            TaskFieldPatch {
                title: "Cleared link".to_string(),
                planned_start_at: NullableFieldPatch::preserve(),
                due_at: NullableFieldPatch::preserve(),
                linked_goal: NullableFieldPatch::clear(),
                show_in_timeline: None,
                system_reminder_id: NullableFieldPatch::clear(),
            },
        )
        .unwrap();

    assert_eq!(cleared.title, "Cleared link");
    assert!(cleared.linked_goal_id.is_none());
    assert!(cleared.linked_goal_label.is_none());
    assert!(cleared.system_reminder_id.is_none());
}

#[test]
fn task_service_update_fields_clears_planned_and_due_times() {
    let repo = temp_repo("task_fields_clear_dates");
    let service = TaskService::new(repo);

    let task = service.capture_task("Scheduled task").unwrap();
    let scheduled = service
        .update_task_fields(
            &task.id.to_string(),
            "Scheduled task",
            Some(Some("2026-06-15T10:00:00+08:00".to_string())),
            Some(Some("2026-06-20T18:00:00+08:00".to_string())),
            None,
            None,
            Some(true),
            None,
        )
        .unwrap();

    assert!(scheduled.planned_start_at.is_some());
    assert!(scheduled.due_at.is_some());

    let cleared = service
        .update_task_fields(
            &task.id.to_string(),
            "Scheduled task",
            Some(None),
            Some(None),
            None,
            None,
            None,
            None,
        )
        .unwrap();

    assert!(
        cleared.planned_start_at.is_none(),
        "planned_start_at should clear when Some(None) is passed"
    );
    assert!(
        cleared.due_at.is_none(),
        "due_at should clear when Some(None) is passed"
    );
}

#[test]
fn task_service_update_fields_sets_system_reminder_id() {
    let repo = temp_repo("task_fields_system_reminder");
    let service = TaskService::new(repo);

    let task = service.capture_task("Reminder task").unwrap();
    assert!(
        task.system_reminder_id.is_none(),
        "new task should have no system_reminder_id"
    );

    let updated = service
        .update_task_fields(
            &task.id.to_string(),
            "Reminder task",
            None,
            None,
            None,
            None,
            None,
            Some(Some("reminder-123".to_string())),
        )
        .unwrap();
    assert_eq!(updated.system_reminder_id.as_deref(), Some("reminder-123"));
}

#[test]
fn task_service_update_fields_preserves_system_reminder_id_when_omitted() {
    let repo = temp_repo("task_fields_preserve_reminder");
    let service = TaskService::new(repo);

    let task = service.capture_task("Reminder task").unwrap();
    let with_reminder = service
        .update_task_fields(
            &task.id.to_string(),
            "Reminder task",
            None,
            None,
            None,
            None,
            None,
            Some(Some("reminder-123".to_string())),
        )
        .unwrap();
    assert_eq!(
        with_reminder.system_reminder_id.as_deref(),
        Some("reminder-123")
    );

    let updated = service
        .update_task_fields(
            &task.id.to_string(),
            "Renamed reminder task",
            None,
            None,
            None,
            None,
            None,
            None,
        )
        .unwrap();

    assert_eq!(updated.system_reminder_id.as_deref(), Some("reminder-123"));
}

#[test]
fn task_service_update_fields_clears_system_reminder_id() {
    let repo = temp_repo("task_fields_clear_reminder");
    let service = TaskService::new(repo);

    let task = service.capture_task("Reminder task").unwrap();
    let with_reminder = service
        .update_task_fields(
            &task.id.to_string(),
            "Reminder task",
            None,
            None,
            None,
            None,
            None,
            Some(Some("reminder-123".to_string())),
        )
        .unwrap();
    assert_eq!(
        with_reminder.system_reminder_id.as_deref(),
        Some("reminder-123")
    );

    let cleared = service
        .update_task_fields(
            &task.id.to_string(),
            "Reminder task",
            None,
            None,
            None,
            None,
            None,
            Some(None),
        )
        .unwrap();
    assert!(
        cleared.system_reminder_id.is_none(),
        "system_reminder_id should be cleared when Some(None) is passed"
    );
}

#[test]
fn task_service_update_fields_preserves_show_in_timeline_when_none() {
    let repo = temp_repo("task_fields_preserve_timeline");
    let service = TaskService::new(repo);

    let task = service.capture_task("Timeline task").unwrap();
    assert!(!task.show_in_timeline, "new task should default to false");

    // Explicitly set show_in_timeline to true
    let updated = service
        .update_task_fields(
            &task.id.to_string(),
            "Timeline task",
            None,
            None,
            None,
            None,
            Some(true),
            None,
        )
        .unwrap();
    assert!(
        updated.show_in_timeline,
        "should be true after explicit set"
    );

    // Update title without passing show_in_timeline (None) — should preserve true
    let updated2 = service
        .update_task_fields(
            &task.id.to_string(),
            "Updated title",
            None,
            None,
            None,
            None,
            None,
            None,
        )
        .unwrap();
    assert!(
        updated2.show_in_timeline,
        "should preserve true when show_in_timeline is None"
    );
    assert_eq!(updated2.title, "Updated title");
}

// ============================================================================
// EventKit Create Reminder Tests
// ============================================================================

#[test]
fn eventkit_system_reminder_payload_exposes_identifier() {
    use goal_desk_tauri::eventkit::SystemReminder;

    let reminder = SystemReminder {
        id: "test-reminder-id".to_string(),
        title: "Test Reminder".to_string(),
        due_at: None,
        done: false,
        list_title: None,
    };

    assert_eq!(reminder.id, "test-reminder-id");
    assert_eq!(reminder.title, "Test Reminder");
    assert!(!reminder.done);
}

// ============================================================================
// SqliteRepository - auto-initialize on construction
// ============================================================================

#[test]
fn repository_auto_initializes_on_construction() {
    let dir = std::env::temp_dir().join("goal_desk_test_auto_init");
    let _ = std::fs::create_dir_all(&dir);
    let path = dir.join("test.sqlite");
    let _ = std::fs::remove_file(&path);
    let repo = SqliteRepository::new(path);

    // Service should work immediately without explicit initialize() call
    let service = TaskService::new(repo);
    let task = service.capture_task("Auto-init task").unwrap();
    assert_eq!(task.title, "Auto-init task");

    let found = service.find_task(&task.id.to_string()).unwrap();
    assert!(found.is_some());
}

#[test]
fn goal_summaries_shows_derived_status_when_all_tasks_done() {
    let repo = temp_repo("goal_summaries_derived_status");
    let goal_service = GoalService::new(repo.clone());
    let task_service = TaskService::new(repo);

    let goal = goal_service
        .create_goal("Goal", "Work", "", GoalStatus::Active)
        .unwrap();
    let t1 = task_service
        .create_task_for_goal(&goal.id.to_string(), "Task 1")
        .unwrap();
    let t2 = task_service
        .create_task_for_goal(&goal.id.to_string(), "Task 2")
        .unwrap();

    // Complete all tasks
    task_service
        .update_task_status(&t1.id.to_string(), TaskStatus::Done, None)
        .unwrap();
    task_service
        .update_task_status(&t2.id.to_string(), TaskStatus::Done, None)
        .unwrap();

    // Goal status in DB is still ACTIVE, but summary should show READY_TO_COMPLETE
    let summaries = goal_service.goal_summaries().unwrap();
    let s = summaries
        .iter()
        .find(|g| g.id == goal.id.to_string())
        .unwrap();
    assert_eq!(s.progress, 100);
    assert_eq!(
        s.status,
        goal_desk_tauri::domain::GoalStatus::ReadyToComplete,
        "goal_summaries should return derived status ReadyToComplete when all tasks are done"
    );
}

#[test]
fn task_service_soft_delete_and_restore() {
    let repo = temp_repo("task_soft_delete");
    let service = TaskService::new(repo);
    let task = service.capture_task("Test Task").unwrap();
    let task_id = task.id.to_string();

    // Soft delete
    service.soft_delete_task(&task_id).unwrap();

    // Should not appear in list
    let all = service.list_tasks().unwrap();
    assert!(all.iter().all(|t| t.id.to_string() != task_id));

    // Should appear in deleted list
    let deleted = service.list_deleted_tasks().unwrap();
    assert_eq!(deleted.len(), 1);

    // Restore
    let restored = service.restore_task(&task_id).unwrap();
    assert_eq!(restored.id.to_string(), task_id);

    // Should appear in list again
    let all = service.list_tasks().unwrap();
    assert!(all.iter().any(|t| t.id.to_string() == task_id));

    // Should not appear in deleted list
    let deleted = service.list_deleted_tasks().unwrap();
    assert!(deleted.is_empty());
}

#[test]
fn goal_service_soft_delete_and_restore() {
    let repo = temp_repo("goal_soft_delete");
    let service = GoalService::new(repo);
    let goal = service
        .create_goal("Test Goal", "Work", "desc", GoalStatus::Active)
        .unwrap();
    let goal_id = goal.id.to_string();

    // Soft delete
    service.soft_delete_goal(&goal_id).unwrap();

    // Should not appear in summaries
    let summaries = service.goal_summaries().unwrap();
    assert!(summaries.iter().all(|g| g.id != goal_id));

    // Should appear in deleted list
    let deleted = service.list_deleted_goals().unwrap();
    assert_eq!(deleted.len(), 1);

    // Restore
    let restored = service.restore_goal(&goal_id).unwrap();
    assert_eq!(restored.id, goal_id);

    // Should appear in summaries again
    let summaries = service.goal_summaries().unwrap();
    assert!(summaries.iter().any(|g| g.id == goal_id));

    // Should not appear in deleted list
    let deleted = service.list_deleted_goals().unwrap();
    assert!(deleted.is_empty());
}
