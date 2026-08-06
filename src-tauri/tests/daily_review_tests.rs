use chrono::Local;
use goal_desk_tauri::domain::{DailyReviewItem, DailyReviewBlock};
use goal_desk_tauri::repository::{DailyReviewRepository, SqliteRepository};
use tempfile::TempDir;
use uuid::Uuid;

fn setup_test_repo() -> (SqliteRepository, TempDir) {
    let temp_dir = TempDir::new().unwrap();
    let db_path = temp_dir.path().join("test.db");
    let repo = SqliteRepository::new(db_path);
    repo.initialize().unwrap();
    (repo, temp_dir)
}

fn create_blocks(content: &str) -> Vec<DailyReviewBlock> {
    vec![DailyReviewBlock {
        id: Uuid::new_v4().to_string(),
        content: content.to_string(),
    }]
}

#[test]
fn test_daily_review_crud() {
    let (repo, _temp) = setup_test_repo();

    let item_id = Uuid::new_v4();
    let item = DailyReviewItem {
        id: item_id,
        date: "2026-08-05".to_string(),
        blocks: create_blocks("Completed task A"),
        created_at: Local::now(),
        updated_at: Local::now(),
    };

    // Create
    repo.create(&item).expect("Failed to create review item");

    // Read timeline
    let timeline = repo.get_timeline(10, 0).expect("Failed to get timeline");
    assert_eq!(timeline.len(), 1);
    assert_eq!(timeline[0].blocks[0].content, "Completed task A");

    // Update
    let mut updated_item = item.clone();
    updated_item.blocks = create_blocks("Completed task A and B");
    repo.update(&updated_item).expect("Failed to update item");

    let timeline = repo.get_timeline(10, 0).unwrap();
    assert_eq!(timeline[0].blocks[0].content, "Completed task A and B");

    // Delete
    repo.delete(item_id).expect("Failed to delete item");
    let timeline = repo.get_timeline(10, 0).unwrap();
    assert_eq!(timeline.len(), 0);
}

#[test]
fn test_daily_review_timeline_ordering() {
    let (repo, _temp) = setup_test_repo();

    let now = Local::now();
    
    // Day 1, first
    let item1 = DailyReviewItem {
        id: Uuid::new_v4(),
        date: "2026-08-01".to_string(),
        blocks: create_blocks("Day 1 - 1"),
        created_at: now,
        updated_at: now,
    };
    
    // Day 2
    let item2 = DailyReviewItem {
        id: Uuid::new_v4(),
        date: "2026-08-02".to_string(),
        blocks: create_blocks("Day 2"),
        created_at: now,
        updated_at: now,
    };
    
    // Day 1, second (created after Day 1 - 1)
    let item3 = DailyReviewItem {
        id: Uuid::new_v4(),
        date: "2026-08-01".to_string(),
        blocks: create_blocks("Day 1 - 2"),
        created_at: now + chrono::Duration::hours(1),
        updated_at: now + chrono::Duration::hours(1),
    };

    repo.create(&item1).unwrap();
    repo.create(&item2).unwrap();
    repo.create(&item3).unwrap();

    let timeline = repo.get_timeline(10, 0).unwrap();
    assert_eq!(timeline.len(), 3);
    
    // Ordering should be: Date DESC (Day 2 first), then Created ASC (Day 1 - 1, then Day 1 - 2)
    assert_eq!(timeline[0].date, "2026-08-02");
    assert_eq!(timeline[1].date, "2026-08-01");
    assert_eq!(timeline[1].blocks[0].content, "Day 1 - 1");
    assert_eq!(timeline[2].date, "2026-08-01");
    assert_eq!(timeline[2].blocks[0].content, "Day 1 - 2");
}

#[test]
fn test_daily_review_service() {
    use goal_desk_tauri::service::DailyReviewService;
    
    let (repo, _temp) = setup_test_repo();
    let service = DailyReviewService::new(repo);

    let item = service.create_item("2026-08-05", create_blocks("Test content")).unwrap();
    assert_eq!(item.date, "2026-08-05");
    assert_eq!(item.blocks[0].content, "Test content");

    let err = service.create_item("2026-08-05", vec![]).unwrap_err();
    assert_eq!(err, "Blocks cannot be empty");

    let updated = service.update_item(item.id, create_blocks("Updated")).unwrap();
    assert_eq!(updated.blocks[0].content, "Updated");

    let timeline = service.get_timeline(10, 0).unwrap();
    assert_eq!(timeline.len(), 1);
    assert_eq!(timeline[0].blocks[0].content, "Updated");

    service.delete_item(item.id).unwrap();
    let timeline = service.get_timeline(10, 0).unwrap();
    assert_eq!(timeline.len(), 0);
}
