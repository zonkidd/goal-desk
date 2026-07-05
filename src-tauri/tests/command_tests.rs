use goal_desk_tauri::domain::GoalStatus;
use goal_desk_tauri::repository::{SqliteRepository, TaskRepository};
use goal_desk_tauri::service::{GoalService, NullableFieldPatch, TaskService};
use goal_desk_tauri::{NullablePatch, TaskFieldPatchCommand};
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
        .create_goal(
            "Release Beta Version",
            "Product",
            "Complete content, acceptance, and release checklist for Beta.",
            GoalStatus::Active,
        )
        .unwrap();

    let summaries = service.goal_summaries().unwrap();
    assert!(summaries
        .iter()
        .any(|g| g.title == "Release Beta Version" && g.area == "Product"));
}

#[test]
fn update_goal_command_persists_edited_fields_for_future_snapshot_loads() {
    let repo = temp_repo("cmd-update");
    let service = GoalService::new(repo);

    let created = service
        .create_goal(
            "Release Beta Version",
            "Product",
            "Complete content, acceptance, and release checklist for Beta.",
            GoalStatus::Active,
        )
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
    assert_eq!(
        updated.description,
        "Complete pricing, migration guide, and announcement schedule for GA release."
    );
    assert!(summaries
        .iter()
        .any(|g| g.title == "Release GA Version" && g.area == "Commercialization"));
}

#[test]
fn update_goal_status_command_persists_status_for_future_snapshot_loads() {
    let repo = temp_repo("cmd-status");
    let service = GoalService::new(repo);

    let created = service
        .create_goal(
            "Finalize workspace",
            "Independent Development",
            "Connect state machine, goal drawer, and data persistence.",
            GoalStatus::Active,
        )
        .unwrap();

    let updated = service
        .update_goal_status(&created.id.to_string(), GoalStatus::Completed)
        .unwrap();
    let summaries = service.goal_summaries().unwrap();

    assert_eq!(updated.status, GoalStatus::Completed);
    assert!(summaries
        .iter()
        .any(|g| g.title == "Finalize workspace" && g.status == GoalStatus::Completed));
}

#[test]
fn create_task_for_goal_persists_goal_linkage() {
    let repo = temp_repo("cmd-task-link");
    let goal_service = GoalService::new(repo.clone());
    let task_service = TaskService::new(repo.clone());

    let goal = goal_service
        .create_goal(
            "Ship goal-linked tasks",
            "Product",
            "Tasks created from a goal drawer must remain linked after persistence.",
            GoalStatus::Active,
        )
        .unwrap();

    let task = task_service
        .create_task_for_goal(&goal.id.to_string(), "Write linked task persistence test")
        .unwrap();

    assert_eq!(task.title, "Write linked task persistence test");
    assert_eq!(task.linked_goal_id, Some(goal.id));
    assert_eq!(
        task.linked_goal_label.as_deref(),
        Some("Ship goal-linked tasks")
    );

    let tasks = TaskRepository::list(&repo).unwrap();
    assert!(tasks.iter().any(|saved| {
        saved.id == task.id
            && saved.linked_goal_id == Some(goal.id)
            && saved.linked_goal_label.as_deref() == Some("Ship goal-linked tasks")
    }));
}

#[test]
fn task_field_command_patch_maps_omitted_and_null_values() {
    let goal_id = Uuid::new_v4();
    let patch = TaskFieldPatchCommand {
        title: "Patch title".to_string(),
        planned_start_at: Some(NullablePatch::clear()),
        due_at: Some(NullablePatch::set("2026-06-20T18:00:00+08:00".to_string())),
        linked_goal_id: Some(NullablePatch::set(goal_id.to_string())),
        linked_goal_label: Some(NullablePatch::set("Linked goal".to_string())),
        show_in_timeline: None,
        system_reminder_id: None,
    }
    .into_task_field_patch()
    .unwrap();

    assert!(matches!(
        patch.planned_start_at,
        NullableFieldPatch::Set(None)
    ));
    assert!(matches!(patch.due_at, NullableFieldPatch::Set(Some(_))));
    let linked_goal = match patch.linked_goal {
        NullableFieldPatch::Set(Some(goal)) => goal,
        other => panic!("expected linked goal set patch, got {other:?}"),
    };
    assert_eq!(linked_goal.id, goal_id);
    assert_eq!(linked_goal.label.as_deref(), Some("Linked goal"));
    assert_eq!(patch.system_reminder_id, NullableFieldPatch::preserve());

    let preserved = TaskFieldPatchCommand {
        title: "Patch title".to_string(),
        planned_start_at: None,
        due_at: None,
        linked_goal_id: None,
        linked_goal_label: None,
        show_in_timeline: None,
        system_reminder_id: Some(NullablePatch::clear()),
    }
    .into_task_field_patch()
    .unwrap();

    assert_eq!(preserved.planned_start_at, NullableFieldPatch::preserve());
    assert_eq!(preserved.due_at, NullableFieldPatch::preserve());
    assert_eq!(preserved.linked_goal, NullableFieldPatch::preserve());
    assert_eq!(preserved.system_reminder_id, NullableFieldPatch::clear());

    let cleared_goal = TaskFieldPatchCommand {
        title: "Patch title".to_string(),
        planned_start_at: None,
        due_at: None,
        linked_goal_id: Some(NullablePatch::clear()),
        linked_goal_label: Some(NullablePatch::clear()),
        show_in_timeline: None,
        system_reminder_id: None,
    }
    .into_task_field_patch()
    .unwrap();

    assert_eq!(cleared_goal.linked_goal, NullableFieldPatch::clear());

    let id_without_label = TaskFieldPatchCommand {
        title: "Patch title".to_string(),
        planned_start_at: None,
        due_at: None,
        linked_goal_id: Some(NullablePatch::set(goal_id.to_string())),
        linked_goal_label: Some(NullablePatch::clear()),
        show_in_timeline: None,
        system_reminder_id: None,
    }
    .into_task_field_patch()
    .unwrap();

    let linked_goal = match id_without_label.linked_goal {
        NullableFieldPatch::Set(Some(goal)) => goal,
        other => panic!("expected linked goal set patch, got {other:?}"),
    };
    assert_eq!(linked_goal.id, goal_id);
    assert_eq!(linked_goal.label, None);

    let label_only_clear = TaskFieldPatchCommand {
        title: "Patch title".to_string(),
        planned_start_at: None,
        due_at: None,
        linked_goal_id: None,
        linked_goal_label: Some(NullablePatch::clear()),
        show_in_timeline: None,
        system_reminder_id: None,
    }
    .into_task_field_patch()
    .unwrap();

    assert_eq!(label_only_clear.linked_goal, NullableFieldPatch::preserve());
}
