use goal_desk_tauri::domain::GoalStatus;
use goal_desk_tauri::repository::SqliteRepository;
use goal_desk_tauri::service::GoalService;

fn temp_repo(prefix: &str) -> SqliteRepository {
    let path = std::env::temp_dir().join(format!("{prefix}-{}.sqlite", uuid::Uuid::new_v4()));
    let repo = SqliteRepository::new(path);
    repo.initialize().unwrap();
    repo
}

#[test]
fn test_create_goal_with_existing_area() {
    let repo = temp_repo("goal-area-existing");
    let service = GoalService::new(repo.clone());

    let goal1 = service.create_goal("完成项目A", "工作", "描述A").unwrap();
    assert!(goal1.area_id.is_some());

    let goal2 = service.create_goal("完成项目B", "工作", "描述B").unwrap();
    assert_eq!(goal1.area_id, goal2.area_id, "两个 goal 应该关联到同一个 area");

    let areas = service.list_areas_with_stats().unwrap();
    let work_areas: Vec<_> = areas.iter().filter(|a| a.title == "工作").collect();
    assert_eq!(work_areas.len(), 1, "应该只有一个'工作' area");
}

#[test]
fn test_create_goal_with_new_area_auto_creates_area() {
    let repo = temp_repo("goal-area-new");
    let service = GoalService::new(repo);

    let goal = service.create_goal("学习 Rust", "学习", "深入学习").unwrap();
    assert!(goal.area_id.is_some());

    let areas = service.list_areas_with_stats().unwrap();
    let study_area = areas.iter().find(|a| a.title == "学习");
    assert!(study_area.is_some(), "'学习' area 应该被自动创建");
    assert!(!study_area.unwrap().is_system);
}

#[test]
fn test_create_goal_with_empty_area_defaults_to_uncategorized() {
    let repo = temp_repo("goal-area-empty");
    let service = GoalService::new(repo);

    let goal = service.create_goal("临时任务", "", "").unwrap();
    assert!(goal.area_id.is_some());

    let areas = service.list_areas_with_stats().unwrap();
    let uncategorized = areas.iter().find(|a| a.title == "未分类");
    assert!(uncategorized.is_some(), "'未分类' area 应该存在");
    assert_eq!(goal.area_id, Some(uncategorized.unwrap().id));
}

#[test]
fn test_create_goal_with_whitespace_area_defaults_to_uncategorized() {
    let repo = temp_repo("goal-area-whitespace");
    let service = GoalService::new(repo);

    let goal = service.create_goal("另一个临时任务", "   ", "").unwrap();

    let areas = service.list_areas_with_stats().unwrap();
    let uncategorized = areas.iter().find(|a| a.title == "未分类").unwrap();
    assert_eq!(goal.area_id, Some(uncategorized.id));
}

#[test]
fn test_all_goals_have_non_null_area_id() {
    let repo = temp_repo("goal-areanonnull");
    let service = GoalService::new(repo);

    service.create_goal("Goal 1", "工作", "").unwrap();
    service.create_goal("Goal 2", "", "").unwrap();
    service.create_goal("Goal 3", "学习", "").unwrap();

    let summaries = service.goal_summaries().unwrap();
    let areas = service.list_areas_with_stats().unwrap();

    for summary in &summaries {
        // Each summary should have a non-empty area string
        assert!(!summary.area.is_empty(), "Goal '{}' should have an area", summary.title);
    }
}
