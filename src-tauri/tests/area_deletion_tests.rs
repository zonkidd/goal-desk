use goal_desk_tauri::{create_area_record, create_goal_record, delete_area_record, domain::{GoalStatus, UNCATEGORIZED_AREA_ID}, repository::SqliteRepository};
use std::path::PathBuf;
use tempfile::TempDir;
use uuid::Uuid;

fn setup_test_db() -> (TempDir, PathBuf) {
    let temp_dir = TempDir::new().unwrap();
    let db_path = temp_dir.path().join("test.db");

    // 使用 SqliteRepository 初始化数据库
    let repo = SqliteRepository::new(db_path.clone());
    repo.initialize().unwrap();

    (temp_dir, db_path)
}

#[test]
fn test_cannot_delete_system_area() {
    let (_temp_dir, db_path) = setup_test_db();

    // 尝试删除"未分类" area
    let result = delete_area_record(&db_path, UNCATEGORIZED_AREA_ID.to_string(), false);

    assert!(result.is_ok());
    let delete_result = result.unwrap();
    assert!(!delete_result.success);
    assert_eq!(delete_result.message, "系统领域无法删除");
    assert_eq!(delete_result.affected_goal_count, 0);
    assert!(delete_result.reassigned_to_area_id.is_none());
}

#[test]
fn test_cannot_delete_system_area_with_force() {
    let (_temp_dir, db_path) = setup_test_db();

    // 即使 force=true 也不能删除系统 area
    let result = delete_area_record(&db_path, UNCATEGORIZED_AREA_ID.to_string(), true);

    assert!(result.is_ok());
    let delete_result = result.unwrap();
    assert!(!delete_result.success);
    assert_eq!(delete_result.message, "系统领域无法删除");
}

#[test]
fn test_delete_area_without_force_fails_when_goals_exist() {
    let (_temp_dir, db_path) = setup_test_db();

    // 创建一个 area
    let area = create_area_record(&db_path, "工作".to_string()).unwrap();

    // 创建一个关联到该 area 的 goal
    create_goal_record(&db_path, "完成项目".to_string(), "工作".to_string(), "".to_string(), GoalStatus::Active).unwrap();

    // 尝试删除 area，force=false
    let result = delete_area_record(&db_path, area.id.to_string(), false);

    assert!(result.is_ok());
    let delete_result = result.unwrap();
    assert!(!delete_result.success);
    assert!(delete_result.message.contains("个关联目标"));
    assert_eq!(delete_result.affected_goal_count, 1);
    assert!(delete_result.reassigned_to_area_id.is_none());

    // 验证 area 仍然存在
    let repo = SqliteRepository::new(db_path);
    let snapshot = repo.load_workspace().unwrap();
    assert!(snapshot.areas.iter().any(|a| a.id == area.id));
}

#[test]
fn test_delete_area_with_force_reassigns_goals() {
    let (_temp_dir, db_path) = setup_test_db();

    // 创建一个 area
    let area = create_area_record(&db_path, "工作".to_string()).unwrap();

    // 创建两个关联到该 area 的 goals
    let goal1 = create_goal_record(&db_path, "完成项目A".to_string(), "工作".to_string(), "".to_string(), GoalStatus::Active).unwrap();
    let goal2 = create_goal_record(&db_path, "完成项目B".to_string(), "工作".to_string(), "".to_string(), GoalStatus::Active).unwrap();

    // 删除 area，force=true
    let result = delete_area_record(&db_path, area.id.to_string(), true);

    assert!(result.is_ok());
    let delete_result = result.unwrap();
    assert!(delete_result.success);
    assert_eq!(delete_result.message, "领域已删除");
    assert_eq!(delete_result.affected_goal_count, 2);

    let uncategorized_id = Uuid::parse_str(UNCATEGORIZED_AREA_ID).unwrap();
    assert_eq!(delete_result.reassigned_to_area_id, Some(uncategorized_id));

    // 验证 area 已删除，goals 被重新分配到"未分类"
    let repo = SqliteRepository::new(db_path);
    let snapshot = repo.load_workspace().unwrap();

    assert!(!snapshot.areas.iter().any(|a| a.id == area.id), "area 应该被删除");

    let goal1_loaded = snapshot.goals.iter().find(|g| g.id == goal1.id).unwrap();
    assert_eq!(goal1_loaded.area_id, Some(uncategorized_id), "goal1 应该被重新分配到未分类");

    let goal2_loaded = snapshot.goals.iter().find(|g| g.id == goal2.id).unwrap();
    assert_eq!(goal2_loaded.area_id, Some(uncategorized_id), "goal2 应该被重新分配到未分类");
}

#[test]
fn test_delete_area_without_goals_succeeds() {
    let (_temp_dir, db_path) = setup_test_db();

    // 创建一个没有关联 goals 的 area
    let area = create_area_record(&db_path, "学习".to_string()).unwrap();

    // 删除 area
    let result = delete_area_record(&db_path, area.id.to_string(), false);

    assert!(result.is_ok());
    let delete_result = result.unwrap();
    assert!(delete_result.success);
    assert_eq!(delete_result.message, "领域已删除");
    assert_eq!(delete_result.affected_goal_count, 0);
    assert!(delete_result.reassigned_to_area_id.is_none());

    // 验证 area 已删除
    let repo = SqliteRepository::new(db_path);
    let snapshot = repo.load_workspace().unwrap();
    assert!(!snapshot.areas.iter().any(|a| a.id == area.id));
}

#[test]
fn test_delete_nonexistent_area_fails() {
    let (_temp_dir, db_path) = setup_test_db();

    let fake_id = Uuid::new_v4().to_string();
    let result = delete_area_record(&db_path, fake_id, false);

    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Area not found"));
}

