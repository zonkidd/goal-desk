use goal_desk_tauri::domain::{GoalStatus, UNCATEGORIZED_AREA_ID};
use goal_desk_tauri::repository::SqliteRepository;
use goal_desk_tauri::service::{AreaService, GoalService};
use uuid::Uuid;

fn temp_repo(prefix: &str) -> SqliteRepository {
    let path = std::env::temp_dir().join(format!("{prefix}-{}.sqlite", Uuid::new_v4()));
    let repo = SqliteRepository::new(path);
    repo.initialize().unwrap();
    repo
}

#[test]
fn test_cannot_delete_system_area() {
    let repo = temp_repo("area-del-sys");
    let service = AreaService::new(repo);

    let result = service.delete_area(UNCATEGORIZED_AREA_ID, false).unwrap();
    assert!(!result.success);
    assert_eq!(result.message, "系统领域无法删除");
    assert_eq!(result.affected_goal_count, 0);
    assert!(result.reassigned_to_area_id.is_none());
}

#[test]
fn test_cannot_delete_system_area_with_force() {
    let repo = temp_repo("area-del-sys-force");
    let service = AreaService::new(repo);

    let result = service.delete_area(UNCATEGORIZED_AREA_ID, true).unwrap();
    assert!(!result.success);
    assert_eq!(result.message, "系统领域无法删除");
}

#[test]
fn test_delete_area_without_force_fails_when_goals_exist() {
    let repo = temp_repo("area-del-noforce");
    let goal_service = GoalService::new(repo.clone());
    let area_service = AreaService::new(repo);

    let area = area_service.create_area("工作").unwrap();
    goal_service.create_goal("完成项目", "工作", "", GoalStatus::Active).unwrap();

    let result = area_service.delete_area(&area.id.to_string(), false).unwrap();
    assert!(!result.success);
    assert!(result.message.contains("个关联目标"));
    assert_eq!(result.affected_goal_count, 1);
    assert!(result.reassigned_to_area_id.is_none());
}

#[test]
fn test_delete_area_with_force_reassigns_goals() {
    let repo = temp_repo("area-del-force");
    let goal_service = GoalService::new(repo.clone());
    let area_service = AreaService::new(repo);

    let area = area_service.create_area("工作").unwrap();
    let _goal1 = goal_service.create_goal("完成项目A", "工作", "", GoalStatus::Active).unwrap();
    let _goal2 = goal_service.create_goal("完成项目B", "工作", "", GoalStatus::Active).unwrap();

    let result = area_service.delete_area(&area.id.to_string(), true).unwrap();
    assert!(result.success);
    assert_eq!(result.message, "领域已删除");
    assert_eq!(result.affected_goal_count, 2);

    let uncategorized_id = Uuid::parse_str(UNCATEGORIZED_AREA_ID).unwrap();
    assert_eq!(result.reassigned_to_area_id, Some(uncategorized_id));
}

#[test]
fn test_delete_area_without_goals_succeeds() {
    let repo = temp_repo("area-del-empty");
    let area_service = AreaService::new(repo);

    let area = area_service.create_area("学习").unwrap();
    let result = area_service.delete_area(&area.id.to_string(), false).unwrap();

    assert!(result.success);
    assert_eq!(result.message, "领域已删除");
    assert_eq!(result.affected_goal_count, 0);
    assert!(result.reassigned_to_area_id.is_none());
}

#[test]
fn test_delete_nonexistent_area_fails() {
    let repo = temp_repo("area-del-notfound");
    let service = AreaService::new(repo);

    let fake_id = Uuid::new_v4().to_string();
    let result = service.delete_area(&fake_id, false);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("not found"));
}
