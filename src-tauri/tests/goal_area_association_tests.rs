use goal_desk_tauri::{create_goal_record, domain::GoalStatus, repository::SqliteRepository};
use std::path::PathBuf;
use tempfile::TempDir;

fn setup_test_db() -> (TempDir, PathBuf) {
    let temp_dir = TempDir::new().unwrap();
    let db_path = temp_dir.path().join("test.db");

    // 使用 SqliteRepository 初始化数据库
    let repo = SqliteRepository::new(db_path.clone());
    repo.initialize().unwrap();

    (temp_dir, db_path)
}

#[test]
fn test_create_goal_with_existing_area() {
    let (_temp_dir, db_path) = setup_test_db();

    // 第一次创建 goal 时自动创建 area
    let goal1 = create_goal_record(
        &db_path,
        "完成项目A".to_string(),
        "工作".to_string(),
        "描述A".to_string(),
        GoalStatus::Active,
    )
    .unwrap();

    // 验证 goal 的 area_id 非空
    assert!(goal1.area_id.is_some(), "goal 的 area_id 应该非空");

    // 第二次创建 goal 使用相同的 area title
    let goal2 = create_goal_record(
        &db_path,
        "完成项目B".to_string(),
        "工作".to_string(),
        "描述B".to_string(),
        GoalStatus::Active,
    )
    .unwrap();

    // 验证两个 goal 关联到同一个 area
    assert_eq!(
        goal1.area_id, goal2.area_id,
        "两个 goal 应该关联到同一个 area"
    );

    // 验证数据库中只有一个"工作" area
    let repo = SqliteRepository::new(db_path);
    let snapshot = repo.load_workspace().unwrap();

    let work_areas: Vec<_> = snapshot
        .areas
        .iter()
        .filter(|area| area.title == "工作")
        .collect();

    assert_eq!(work_areas.len(), 1, "应该只有一个'工作' area");
}

#[test]
fn test_create_goal_with_new_area_auto_creates_area() {
    let (_temp_dir, db_path) = setup_test_db();

    // 创建 goal 时使用新的 area title
    let goal = create_goal_record(
        &db_path,
        "学习 Rust".to_string(),
        "学习".to_string(),
        "深入学习".to_string(),
        GoalStatus::Active,
    )
    .unwrap();

    // 验证 goal 的 area_id 非空
    assert!(goal.area_id.is_some(), "goal 的 area_id 应该非空");

    // 验证"学习" area 被自动创建
    let repo = SqliteRepository::new(db_path);
    let snapshot = repo.load_workspace().unwrap();

    let study_area = snapshot
        .areas
        .iter()
        .find(|area| area.title == "学习");

    assert!(study_area.is_some(), "'学习' area 应该被自动创建");
    assert_eq!(
        goal.area_id,
        Some(study_area.unwrap().id),
        "goal 应该关联到新创建的 area"
    );
    assert!(!study_area.unwrap().is_system, "自动创建的 area 不应该是系统 area");
}

#[test]
fn test_create_goal_with_empty_area_defaults_to_uncategorized() {
    let (_temp_dir, db_path) = setup_test_db();

    // 创建 goal 时 area 为空字符串
    let goal = create_goal_record(
        &db_path,
        "临时任务".to_string(),
        "".to_string(),
        "".to_string(),
        GoalStatus::Active,
    )
    .unwrap();

    // 验证 goal 的 area_id 非空
    assert!(goal.area_id.is_some(), "goal 的 area_id 应该非空");

    // 验证 goal 关联到"未分类" area
    let repo = SqliteRepository::new(db_path);
    let snapshot = repo.load_workspace().unwrap();

    let uncategorized_area = snapshot
        .areas
        .iter()
        .find(|area| area.title == "未分类");

    assert!(uncategorized_area.is_some(), "'未分类' area 应该存在");
    assert_eq!(
        goal.area_id,
        Some(uncategorized_area.unwrap().id),
        "空 area 应该默认关联到'未分类'"
    );
}

#[test]
fn test_create_goal_with_whitespace_area_defaults_to_uncategorized() {
    let (_temp_dir, db_path) = setup_test_db();

    // 创建 goal 时 area 为空白字符
    let goal = create_goal_record(
        &db_path,
        "另一个临时任务".to_string(),
        "   ".to_string(),
        "".to_string(),
        GoalStatus::Active,
    )
    .unwrap();

    // 验证 goal 关联到"未分类" area
    let repo = SqliteRepository::new(db_path);
    let snapshot = repo.load_workspace().unwrap();

    let uncategorized_area = snapshot
        .areas
        .iter()
        .find(|area| area.title == "未分类")
        .unwrap();

    assert_eq!(
        goal.area_id,
        Some(uncategorized_area.id),
        "空白 area 应该默认关联到'未分类'"
    );
}

#[test]
fn test_all_goals_have_non_null_area_id() {
    let (_temp_dir, db_path) = setup_test_db();

    // 创建多个 goal
    create_goal_record(
        &db_path,
        "Goal 1".to_string(),
        "工作".to_string(),
        "".to_string(),
        GoalStatus::Active,
    )
    .unwrap();

    create_goal_record(
        &db_path,
        "Goal 2".to_string(),
        "".to_string(),
        "".to_string(),
        GoalStatus::Active,
    )
    .unwrap();

    create_goal_record(
        &db_path,
        "Goal 3".to_string(),
        "学习".to_string(),
        "".to_string(),
        GoalStatus::Active,
    )
    .unwrap();

    // 验证所有 goal 的 area_id 都非空
    let repo = SqliteRepository::new(db_path);
    let snapshot = repo.load_workspace().unwrap();

    for goal in &snapshot.goals {
        assert!(
            goal.area_id.is_some(),
            "Goal '{}' 的 area_id 应该非空",
            goal.title
        );
    }

    // 验证所有 area_id 都指向存在的 area
    for goal in &snapshot.goals {
        let area_id = goal.area_id.unwrap();
        let area_exists = snapshot.areas.iter().any(|area| area.id == area_id);
        assert!(
            area_exists,
            "Goal '{}' 的 area_id 应该指向存在的 area",
            goal.title
        );
    }
}
