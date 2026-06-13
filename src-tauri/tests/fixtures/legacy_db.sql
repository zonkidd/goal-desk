-- 旧版本数据库结构测试数据
-- 用于验证数据迁移逻辑：创建没有 is_system 字段的旧版表结构，包含孤儿 goals

-- 创建旧版本的表结构（没有 is_system 字段，goals.area_id 允许 NULL）
CREATE TABLE areas (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL
);

CREATE TABLE goals (
    id TEXT PRIMARY KEY,
    area_id TEXT NULL,  -- 允许 NULL
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'ACTIVE'
);

-- 插入测试数据

-- 1. 正常 areas
INSERT INTO areas (id, title) VALUES ('area-work-id', '工作');
INSERT INTO areas (id, title) VALUES ('area-life-id', '生活');
INSERT INTO areas (id, title) VALUES ('area-learning-id', '学习');

-- 2. 孤儿 goals（area_id 为 NULL）
INSERT INTO goals (id, area_id, title, description, status)
VALUES ('goal-orphan-null-1', NULL, '孤儿目标-NULL-1', '这个目标的 area_id 是 NULL', 'ACTIVE');

INSERT INTO goals (id, area_id, title, description, status)
VALUES ('goal-orphan-null-2', NULL, '孤儿目标-NULL-2', '这个目标也没有关联领域', 'ACTIVE');

-- 3. 孤儿 goals（area_id 指向不存在的 area）
INSERT INTO goals (id, area_id, title, description, status)
VALUES ('goal-orphan-dangling-1', 'nonexistent-area-id-1', '孤儿目标-悬空引用-1', '这个目标的 area_id 指向不存在的领域', 'ACTIVE');

INSERT INTO goals (id, area_id, title, description, status)
VALUES ('goal-orphan-dangling-2', 'nonexistent-area-id-2', '孤儿目标-悬空引用-2', '引用的领域已被删除', 'ACTIVE');

-- 4. 正常关联的 goals
INSERT INTO goals (id, area_id, title, description, status)
VALUES ('goal-work-1', 'area-work-id', '工作目标1', '正常关联到工作领域', 'ACTIVE');

INSERT INTO goals (id, area_id, title, description, status)
VALUES ('goal-work-2', 'area-work-id', '工作目标2', '也关联到工作领域', 'ACTIVE');

INSERT INTO goals (id, area_id, title, description, status)
VALUES ('goal-life-1', 'area-life-id', '生活目标', '关联到生活领域', 'ACTIVE');

INSERT INTO goals (id, area_id, title, description, status)
VALUES ('goal-learning-1', 'area-learning-id', '学习目标', '关联到学习领域', 'COMPLETED');

-- 测试数据统计：
-- - 3 个正常 areas
-- - 2 个 area_id=NULL 的孤儿 goals
-- - 2 个 area_id 悬空引用的孤儿 goals
-- - 4 个正常关联的 goals
-- 迁移后应该有 4 个 areas（原有3个 + "未分类"），所有 goals 的 area_id 都有效
