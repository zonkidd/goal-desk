use goal_desk_tauri::domain::UNCATEGORIZED_AREA_ID;
use goal_desk_tauri::repository::SqliteRepository;
use rusqlite::Connection;
use std::path::PathBuf;
use tempfile::TempDir;

/// 创建旧版数据库（没有 is_system 字段，包含孤儿 goals）
fn create_legacy_database(path: &PathBuf) {
    let connection = Connection::open(path).expect("Failed to open test database");

    // 创建旧版表结构
    connection
        .execute_batch(
            "
        CREATE TABLE areas (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL
        );
        CREATE TABLE goals (
            id TEXT PRIMARY KEY,
            area_id TEXT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'ACTIVE'
        );
        ",
        )
        .expect("Failed to create legacy tables");

    // 插入测试数据
    connection.execute_batch(
        "
        -- 正常 areas
        INSERT INTO areas (id, title) VALUES ('area-work-id', '工作');
        INSERT INTO areas (id, title) VALUES ('area-life-id', '生活');
        INSERT INTO areas (id, title) VALUES ('area-learning-id', '学习');

        -- 孤儿 goals（area_id 为 NULL）
        INSERT INTO goals (id, area_id, title, description, status)
        VALUES ('goal-orphan-null-1', NULL, '孤儿目标-NULL-1', '这个目标的 area_id 是 NULL', 'ACTIVE');

        INSERT INTO goals (id, area_id, title, description, status)
        VALUES ('goal-orphan-null-2', NULL, '孤儿目标-NULL-2', '这个目标也没有关联领域', 'ACTIVE');

        -- 孤儿 goals（area_id 指向不存在的 area）
        INSERT INTO goals (id, area_id, title, description, status)
        VALUES ('goal-orphan-dangling-1', 'nonexistent-area-id-1', '孤儿目标-悬空引用-1', '这个目标的 area_id 指向不存在的领域', 'ACTIVE');

        INSERT INTO goals (id, area_id, title, description, status)
        VALUES ('goal-orphan-dangling-2', 'nonexistent-area-id-2', '孤儿目标-悬空引用-2', '引用的领域已被删除', 'ACTIVE');

        -- 正常关联的 goals
        INSERT INTO goals (id, area_id, title, description, status)
        VALUES ('goal-work-1', 'area-work-id', '工作目标1', '正常关联到工作领域', 'ACTIVE');

        INSERT INTO goals (id, area_id, title, description, status)
        VALUES ('goal-work-2', 'area-work-id', '工作目标2', '也关联到工作领域', 'ACTIVE');

        INSERT INTO goals (id, area_id, title, description, status)
        VALUES ('goal-life-1', 'area-life-id', '生活目标', '关联到生活领域', 'ACTIVE');

        INSERT INTO goals (id, area_id, title, description, status)
        VALUES ('goal-learning-1', 'area-learning-id', '学习目标', '关联到学习领域', 'COMPLETED');
        "
    ).expect("Failed to insert test data");
}

#[test]
fn test_migration_from_legacy_database() {
    // 1. 创建临时目录和旧版数据库
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let db_path = temp_dir.path().join("test_legacy.db");
    create_legacy_database(&db_path);

    // 验证迁移前的状态
    let connection = Connection::open(&db_path).expect("Failed to open database");

    // 应该有 3 个 areas
    let area_count: i64 = connection
        .query_row("SELECT COUNT(*) FROM areas", [], |row| row.get(0))
        .expect("Failed to count areas");
    assert_eq!(area_count, 3, "应该有 3 个原始 areas");

    // 应该有 8 个 goals
    let goal_count: i64 = connection
        .query_row("SELECT COUNT(*) FROM goals", [], |row| row.get(0))
        .expect("Failed to count goals");
    assert_eq!(goal_count, 8, "应该有 8 个 goals");

    // 应该有 4 个孤儿 goals（2个 NULL + 2个悬空引用）
    let orphan_count: i64 = connection.query_row(
        "SELECT COUNT(*) FROM goals WHERE area_id IS NULL OR area_id NOT IN (SELECT id FROM areas)",
        [],
        |row| row.get(0)
    ).expect("Failed to count orphan goals");
    assert_eq!(orphan_count, 4, "应该有 4 个孤儿 goals");

    drop(connection);

    // 2. 调用 repository.initialize() 执行迁移
    let repository = SqliteRepository::new(db_path.clone());
    repository.initialize().expect("Migration should succeed");

    // 3. 验证迁移后的状态
    let connection = Connection::open(&db_path).expect("Failed to open database");

    // 应该有 4 个 areas（原有3个 + "未分类"）
    let area_count_after: i64 = connection
        .query_row("SELECT COUNT(*) FROM areas", [], |row| row.get(0))
        .expect("Failed to count areas after migration");
    assert_eq!(
        area_count_after, 4,
        "迁移后应该有 4 个 areas（包括'未分类'）"
    );

    // "未分类" area 应该存在
    let uncategorized_exists: bool = connection
        .query_row(
            "SELECT 1 FROM areas WHERE id = ?1",
            [UNCATEGORIZED_AREA_ID],
            |_| Ok(true),
        )
        .unwrap_or(false);
    assert!(uncategorized_exists, "'未分类' area 应该已创建");

    // 所有 goals 的 area_id 都应该有效（不再有孤儿）
    let orphan_count_after: i64 = connection.query_row(
        "SELECT COUNT(*) FROM goals WHERE area_id IS NULL OR area_id NOT IN (SELECT id FROM areas)",
        [],
        |row| row.get(0)
    ).expect("Failed to count orphan goals after migration");
    assert_eq!(orphan_count_after, 0, "迁移后不应该有孤儿 goals");

    // 原本的 4 个孤儿 goals 应该都被移到"未分类"
    let uncategorized_goal_count: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM goals WHERE area_id = ?1",
            [UNCATEGORIZED_AREA_ID],
            |row| row.get(0),
        )
        .expect("Failed to count uncategorized goals");
    assert_eq!(
        uncategorized_goal_count, 4,
        "'未分类'领域应该有 4 个 goals（原孤儿 goals）"
    );

    // 正常关联的 goals 的 area_id 不应该改变
    let work_goal_count: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM goals WHERE area_id = 'area-work-id'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to count work goals");
    assert_eq!(work_goal_count, 2, "'工作'领域应该仍有 2 个 goals");

    let life_goal_count: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM goals WHERE area_id = 'area-life-id'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to count life goals");
    assert_eq!(life_goal_count, 1, "'生活'领域应该仍有 1 个 goal");

    let learning_goal_count: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM goals WHERE area_id = 'area-learning-id'",
            [],
            |row| row.get(0),
        )
        .expect("Failed to count learning goals");
    assert_eq!(learning_goal_count, 1, "'学习'领域应该仍有 1 个 goal");
}

#[test]
fn test_migration_idempotency() {
    // 验证重复调用 initialize() 的幂等性
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let db_path = temp_dir.path().join("test_idempotency.db");
    create_legacy_database(&db_path);

    let repository = SqliteRepository::new(db_path.clone());

    // 第一次迁移
    repository
        .initialize()
        .expect("First migration should succeed");

    let connection = Connection::open(&db_path).expect("Failed to open database");
    let area_count_first: i64 = connection
        .query_row("SELECT COUNT(*) FROM areas", [], |row| row.get(0))
        .expect("Failed to count areas");
    let goal_count_first: i64 = connection
        .query_row("SELECT COUNT(*) FROM goals", [], |row| row.get(0))
        .expect("Failed to count goals");
    let uncategorized_goal_count_first: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM goals WHERE area_id = ?1",
            [UNCATEGORIZED_AREA_ID],
            |row| row.get(0),
        )
        .expect("Failed to count uncategorized goals");
    drop(connection);

    // 第二次迁移
    repository
        .initialize()
        .expect("Second migration should succeed");

    let connection = Connection::open(&db_path).expect("Failed to open database");
    let area_count_second: i64 = connection
        .query_row("SELECT COUNT(*) FROM areas", [], |row| row.get(0))
        .expect("Failed to count areas");
    let goal_count_second: i64 = connection
        .query_row("SELECT COUNT(*) FROM goals", [], |row| row.get(0))
        .expect("Failed to count goals");
    let uncategorized_goal_count_second: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM goals WHERE area_id = ?1",
            [UNCATEGORIZED_AREA_ID],
            |row| row.get(0),
        )
        .expect("Failed to count uncategorized goals");
    drop(connection);

    // 验证数据没有重复
    assert_eq!(
        area_count_first, area_count_second,
        "重复迁移不应该创建重复的 areas"
    );
    assert_eq!(
        goal_count_first, goal_count_second,
        "重复迁移不应该改变 goals 数量"
    );
    assert_eq!(
        uncategorized_goal_count_first, uncategorized_goal_count_second,
        "重复迁移不应该重复移动 goals"
    );

    // "未分类" area 应该只有一个
    let connection = Connection::open(&db_path).expect("Failed to open database");
    let uncategorized_count: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM areas WHERE id = ?1",
            [UNCATEGORIZED_AREA_ID],
            |row| row.get(0),
        )
        .expect("Failed to count uncategorized area");
    assert_eq!(uncategorized_count, 1, "'未分类' area 应该只有一个");

    // 第三次迁移，确保完全幂等
    drop(connection);
    repository
        .initialize()
        .expect("Third migration should succeed");

    let connection = Connection::open(&db_path).expect("Failed to open database");
    let area_count_third: i64 = connection
        .query_row("SELECT COUNT(*) FROM areas", [], |row| row.get(0))
        .expect("Failed to count areas");
    assert_eq!(area_count_first, area_count_third, "多次迁移应该完全幂等");
}

#[test]
fn test_clean_database_migration() {
    // 验证在全新数据库上的迁移（没有旧数据）
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let db_path = temp_dir.path().join("test_clean.db");

    let repository = SqliteRepository::new(db_path.clone());
    repository
        .initialize()
        .expect("Migration on clean database should succeed");

    let connection = Connection::open(&db_path).expect("Failed to open database");

    // 应该创建了"未分类" area
    let uncategorized_exists: bool = connection
        .query_row(
            "SELECT 1 FROM areas WHERE id = ?1",
            [UNCATEGORIZED_AREA_ID],
            |_| Ok(true),
        )
        .unwrap_or(false);
    assert!(uncategorized_exists, "全新数据库应该创建'未分类' area");

    // 应该只有"未分类"这一个 area
    let area_count: i64 = connection
        .query_row("SELECT COUNT(*) FROM areas", [], |row| row.get(0))
        .expect("Failed to count areas");
    assert_eq!(area_count, 1, "全新数据库应该只有'未分类' area");

    // goals 表应该为空
    let goal_count: i64 = connection
        .query_row("SELECT COUNT(*) FROM goals", [], |row| row.get(0))
        .expect("Failed to count goals");
    assert_eq!(goal_count, 0, "全新数据库不应该有 goals");
}

#[test]
fn test_list_areas_returns_is_system_field() {
    // 验证查询 areas 时正确返回 is_system 字段
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let db_path = temp_dir.path().join("test_is_system.db");

    let repository = SqliteRepository::new(db_path.clone());
    repository.initialize().expect("Migration should succeed");

    // 添加一个普通 area（使用有效的 UUID）
    let test_area_id = "11111111-1111-1111-1111-111111111111";
    let connection = Connection::open(&db_path).expect("Failed to open database");
    connection
        .execute(
            "INSERT INTO areas (id, title) VALUES (?1, ?2)",
            [test_area_id, "测试领域"],
        )
        .expect("Failed to insert test area");
    drop(connection);

    // 加载所有 areas
    let workspace = repository
        .load_workspace()
        .expect("Failed to load workspace");

    // 应该有 2 个 areas
    assert_eq!(
        workspace.areas.len(),
        2,
        "应该有 2 个 areas（'未分类' + '测试领域'）"
    );

    // 找到"未分类" area 并验证 is_system = true
    let uncategorized = workspace
        .areas
        .iter()
        .find(|a| a.id.to_string() == UNCATEGORIZED_AREA_ID)
        .expect("应该找到'未分类' area");
    assert!(
        uncategorized.is_system,
        "'未分类' area 的 is_system 应该为 true"
    );
    assert_eq!(
        uncategorized.title, "未分类",
        "'未分类' area 的标题应该正确"
    );

    // 找到普通 area 并验证 is_system = false
    let normal_area = workspace
        .areas
        .iter()
        .find(|a| a.id.to_string() == test_area_id)
        .expect("应该找到'测试领域' area");
    assert!(
        !normal_area.is_system,
        "普通 area 的 is_system 应该为 false"
    );
    assert_eq!(normal_area.title, "测试领域", "普通 area 的标题应该正确");
}
