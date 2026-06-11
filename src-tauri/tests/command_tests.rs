use goal_desk_tauri::domain::{GoalStatus, TimelineSource};
use goal_desk_tauri::{
    create_goal_record, goal_snapshot_data, goal_snapshot_data_at_path, today_snapshot_data,
    update_goal_record, update_goal_status_record,
};
use uuid::Uuid;

#[test]
fn today_snapshot_exposes_the_timeline_command_contract() {
    let snapshot = today_snapshot_data();

    assert_eq!(snapshot.len(), 7);
    assert_eq!(snapshot[0].source, TimelineSource::Todo);
    assert_eq!(snapshot[0].title, "完成 Today Timeline core");
    assert!(snapshot.iter().any(|item| item.source == TimelineSource::Calendar && item.read_only));
    assert!(snapshot.iter().any(|item| item.source == TimelineSource::Todo));
    assert!(snapshot.iter().any(|item| item.source == TimelineSource::Reminder));
}

#[test]
fn goal_snapshot_exposes_progress_cards_from_rust() {
    let snapshot = goal_snapshot_data();

    assert_eq!(snapshot.len(), 3);
    assert!(snapshot.iter().any(|goal| goal.title == "瘦十斤" && goal.area == "健康"));
    assert!(snapshot.iter().any(|goal| goal.title == "Goal Desk MVP" && goal.progress > 0));
    assert!(snapshot.iter().all(|goal| !goal.next_todo.is_empty()));
}

#[test]
fn create_goal_command_persists_goal_for_future_snapshot_loads() {
    let path = std::env::temp_dir().join(format!("goal-desk-command-test-{}.sqlite", Uuid::new_v4()));

    let created = create_goal_record(
        &path,
        "发布 Goal Desk Beta".to_string(),
        Some("产品".to_string()),
        "把 Beta 发布需要的文案、验收和发布检查单推进完。".to_string(),
        GoalStatus::Active,
    )
    .unwrap();

    let snapshot = goal_snapshot_data_at_path(&path).unwrap();

    assert!(snapshot.iter().any(|goal| {
        goal.id == created.id.to_string() && goal.title == "发布 Goal Desk Beta" && goal.area == "产品"
    }));

    let _ = std::fs::remove_file(path);
}

#[test]
fn update_goal_command_persists_edited_fields_for_future_snapshot_loads() {
    let path = std::env::temp_dir().join(format!("goal-desk-command-test-{}.sqlite", Uuid::new_v4()));

    let created = create_goal_record(
        &path,
        "发布 Goal Desk Beta".to_string(),
        Some("产品".to_string()),
        "把 Beta 发布需要的文案、验收和发布检查单推进完。".to_string(),
        GoalStatus::Active,
    )
    .unwrap();

    let updated = update_goal_record(
        &path,
        created.id.to_string(),
        "发布 Goal Desk GA".to_string(),
        Some("商业化".to_string()),
        "补齐正式发布的定价、迁移说明和公告节奏。".to_string(),
        GoalStatus::Paused,
    )
    .unwrap();

    let snapshot = goal_snapshot_data_at_path(&path).unwrap();

    assert_eq!(updated.title, "发布 Goal Desk GA");
    assert_eq!(updated.description, "补齐正式发布的定价、迁移说明和公告节奏。");
    assert_eq!(updated.status, GoalStatus::Paused);
    assert!(snapshot
        .iter()
        .any(|goal| goal.id == created.id.to_string() && goal.title == "发布 Goal Desk GA" && goal.area == "商业化"));

    let _ = std::fs::remove_file(path);
}

#[test]
fn update_goal_status_command_persists_status_for_future_snapshot_loads() {
    let path = std::env::temp_dir().join(format!("goal-desk-command-test-{}.sqlite", Uuid::new_v4()));

    let created = create_goal_record(
        &path,
        "收尾 Goal 工作台".to_string(),
        Some("独立开发".to_string()),
        "把状态机、目标抽屉和数据落库全都接通。".to_string(),
        GoalStatus::Active,
    )
    .unwrap();

    let updated = update_goal_status_record(&path, created.id.to_string(), GoalStatus::ReadyToComplete).unwrap();
    let reloaded = goal_snapshot_data_at_path(&path).unwrap();

    assert_eq!(updated.status, GoalStatus::ReadyToComplete);
    assert!(reloaded.iter().any(|goal| {
        goal.id == created.id.to_string()
            && goal.title == "收尾 Goal 工作台"
            && goal.status == GoalStatus::ReadyToComplete
    }));

    let _ = std::fs::remove_file(path);
}
