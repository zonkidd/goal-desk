# Areas 领域重设计 PRD

## 文档信息
- **创建日期**: 2026-06-13
- **版本**: v1.0
- **状态**: Draft

## 1. 背景与问题

### 1.1 当前实现概述

Areas（领域）是 goal-desk 中用于组织和分类目标的核心概念。当前实现包括：

**数据层**：
- SQLite 表 `areas`（id, title）
- 独立实体，通过 `goals.area_id` 外键关联
- Rust domain 类型：`Area`、`AreaWithStats`、`DeleteAreaResult`

**业务逻辑**：
- Tauri commands: `list_areas`、`create_area`、`rename_area`、`delete_area`
- 前端状态管理：`appStore` 中的 `allAreas`、`activeArea`（筛选器）
- 派生逻辑：`deriveAreasFromGoals` 从 goals 反推 areas 统计

**UI 组件**：
- `AreasView.tsx`：领域管理页面（卡片网格布局）
- `AreaSelectWithCreate.tsx`：选择器 + 内联创建

### 1.2 核心问题

#### 问题 1：数据一致性混乱
**现象**：
- `areas` 表是独立实体，但 `goals.area_id` 可以为 NULL 或指向不存在的 area
- 前端通过 `deriveAreasFromGoals` 从 goals 反推 areas，导致 UI 显示的 areas 可能与数据库不一致
- `loadAreas` 逻辑：先调用 `list_areas` 获取数据库 areas，再用 `deriveAreasFromGoals` 混合 goals 中的 area 信息，产生"幽灵领域"

**根因**：
- 没有明确定义 areas 表是"权威来源"还是"派生视图"
- 缺少外键约束或数据迁移逻辑保证一致性

#### 问题 2：概念模糊
**现象**：
- `Goal.area` 在前端是 `string`（`GoalCard.area`），在后端是 `Option<Uuid>`（`Goal.area_id`）
- `activeArea: AreaFilter` 类型是 `'ALL' | string`，混合了特殊值和 area title
- 用户创建 goal 时可以输入任意 area 字符串，不强制选择已存在的 area

**根因**：
- area 同时扮演"标签"和"实体"两种角色，没有统一语义

#### 问题 3：删除逻辑不完整
**现象**：
- `deleteArea` 支持 `force` 参数，但只是简单删除 area 记录
- 关联 goals 的 `area_id` 会变成孤儿引用（dangling reference）
- 前端有提示"这些目标将变为'未分类'"，但后端没有对应处理

**代码证据**：
```rust
// src-tauri/src/lib.rs:322
pub fn delete_area_record(...) -> Result<domain::DeleteAreaResult, String> {
    // 只检查关联 goal 数量，force=true 时直接删除 area
    // 没有清理 goals.area_id
}
```

#### 问题 4：UI 体验问题
- AreasView 卡片网格布局，但编辑/删除交互在同一卡片内展开，视觉割裂
- `AreaSelectWithCreate` 内联创建模式占据整行，破坏表单布局
- 没有"未分类"的显式入口（虽然逻辑支持 `area_id = NULL`）

### 1.3 影响范围
- **用户体验**：无法信任 areas 数据的准确性，删除后遗留孤儿数据
- **数据完整性**：数据库状态不一致，可能导致统计错误
- **可维护性**：前后端 area 概念不统一，增加理解和修改成本

---

## 2. 目标与非目标

### 2.1 目标
1. **数据一致性**：确立 areas 的权威来源，消除派生逻辑带来的不一致
2. **概念统一**：明确 area 是"实体"还是"标签"，前后端保持一致
3. **删除安全**：完善删除逻辑，自动清理孤儿引用或阻止删除
4. **UI 优化**：改进 AreasView 和 AreaSelect 的交互体验

### 2.2 非目标
- 不引入 area 层级结构（如父子关系）
- 不支持 area 的颜色/图标等扩展属性（留待后续迭代）
- 不改变 goals 的核心数据结构

---

## 3. 技术方案

### 3.1 方案选择：Area 作为强实体

**决策**：将 area 确立为**强实体**，禁止自由标签输入。

**理由**：
- 用户需要明确的分类体系，而非随意标签
- 统计功能依赖稳定的 area 定义
- 易于实现数据完整性约束

**对比方案**（已放弃）：
| 方案 | 优点 | 缺点 |
|------|------|------|
| Area 作为派生视图 | 灵活，无需预定义 | 无法保证一致性，统计不可靠 |
| 混合模式（当前实现） | 兼顾灵活和结构 | 逻辑复杂，容易出错 |

### 3.2 数据模型重构

#### 3.2.1 数据库变更
```sql
-- 1. 添加 "未分类" 系统 area
INSERT INTO areas (id, title) VALUES ('00000000-0000-0000-0000-000000000000', '未分类');

-- 2. 修复孤儿 goals（指向不存在的 area_id 或 area_id=NULL）
UPDATE goals 
SET area_id = '00000000-0000-0000-0000-000000000000'
WHERE area_id IS NULL 
   OR area_id NOT IN (SELECT id FROM areas);

-- 3. 添加外键约束（需要重建表）
-- SQLite 不支持 ADD CONSTRAINT，需要通过重建表实现
```

#### 3.2.2 Rust 类型调整
```rust
// domain.rs
pub struct Area {
    pub id: Uuid,
    pub title: String,
    pub is_system: bool,  // 新增：标记系统 area（如"未分类"）
}

// 删除结果增加详细信息
pub struct DeleteAreaResult {
    pub success: bool,
    pub message: String,
    pub affected_goal_count: usize,
    pub reassigned_to_area_id: Option<Uuid>,  // 新增：目标被重新分配到的 area
}
```

#### 3.2.3 前端类型调整
```typescript
// types/app.ts
export interface AreaWithStats {
  id: string
  title: string
  goalCount: number
  activeGoalCount: number
  isSystem: boolean  // 新增：系统 area 不可删除/重命名
}

// activeArea 改为明确的类型
export type AreaFilter = { type: 'all' } | { type: 'area'; areaId: string }
```

### 3.3 业务逻辑调整

#### 3.3.1 初始化逻辑
```rust
// repository.rs - initialize()
pub fn initialize(&self) -> Result<(), RepositoryError> {
    // ... 创建表后
    
    // 确保"未分类" area 存在
    connection.execute(
        "INSERT OR IGNORE INTO areas (id, title) VALUES (?1, ?2)",
        params![UNCATEGORIZED_AREA_ID, "未分类"]
    )?;
    
    // 清理孤儿 goals
    connection.execute(
        "UPDATE goals SET area_id = ?1 WHERE area_id IS NULL OR area_id NOT IN (SELECT id FROM areas)",
        params![UNCATEGORIZED_AREA_ID]
    )?;
}
```

#### 3.3.2 创建 Goal 时强制关联 Area
```rust
// lib.rs
pub fn create_goal_record(..., area_title: String, ...) -> Result<Goal, String> {
    // 1. 查找 area_id（如果不存在则报错或自动创建）
    let area_id = find_or_create_area(&repo, &area_title)?;
    
    // 2. 插入 goal 时保证 area_id 非空
    repo.execute("INSERT INTO goals (..., area_id) VALUES (..., ?)", params![area_id])?;
}
```

#### 3.3.3 删除 Area 时的级联处理
```rust
// lib.rs - delete_area_record
pub fn delete_area_record(path: &Path, area_id: String, force: bool) -> Result<DeleteAreaResult, String> {
    let connection = Connection::open(path)?;
    
    // 1. 禁止删除系统 area
    let is_system: bool = connection.query_row(
        "SELECT 1 FROM areas WHERE id = ?1 AND title = '未分类'",
        params![&area_id],
        |_| Ok(true)
    ).unwrap_or(false);
    
    if is_system {
        return Ok(DeleteAreaResult {
            success: false,
            message: "系统领域无法删除".to_string(),
            affected_goal_count: 0,
            reassigned_to_area_id: None,
        });
    }
    
    // 2. 统计关联 goals
    let affected_count: usize = connection.query_row(
        "SELECT COUNT(*) FROM goals WHERE area_id = ?1",
        params![&area_id],
        |row| row.get(0)
    )?;
    
    // 3. force=false 且有关联 goals 时拒绝删除
    if !force && affected_count > 0 {
        return Ok(DeleteAreaResult {
            success: false,
            message: format!("该领域有 {} 个关联目标，请先处理或使用强制删除", affected_count),
            affected_goal_count: affected_count,
            reassigned_to_area_id: None,
        });
    }
    
    // 4. force=true 时将 goals 移动到"未分类"
    if force && affected_count > 0 {
        connection.execute(
            "UPDATE goals SET area_id = ?1 WHERE area_id = ?2",
            params![UNCATEGORIZED_AREA_ID, &area_id]
        )?;
    }
    
    // 5. 删除 area
    connection.execute("DELETE FROM areas WHERE id = ?1", params![&area_id])?;
    
    Ok(DeleteAreaResult {
        success: true,
        message: "领域已删除".to_string(),
        affected_goal_count: affected_count,
        reassigned_to_area_id: if affected_count > 0 { Some(UNCATEGORIZED_AREA_ID) } else { None },
    })
}
```

#### 3.3.4 前端状态管理简化
```typescript
// appStore.ts
// 移除 deriveAreasFromGoals，直接使用后端返回的 areas
loadAreas: async () => {
  const adapter = createWorkspaceMutationAdapter()
  const { areas, statusMessage } = await adapter.listAreas()
  
  set({
    allAreas: areas,  // 不再混合 goals 数据
    statusMessage: statusMessage || '',
  })
}

// activeArea 改为使用 area id 而非 title
setActiveArea: (areaId: string | 'ALL') => {
  set((state) => ({
    activeArea: areaId,
    ...buildDerivedStateForArea(state.baseTimeline, state.baseGoals, state.tasks, areaId, state.showCompletedTodos),
  }))
}
```

### 3.4 UI 改进

#### 3.4.1 AreasView 优化
```tsx
// AreasView.tsx 改进点
// 1. 编辑模式改为 Modal/Drawer，避免卡片内展开
// 2. 系统 area 禁用删除/重命名按钮
// 3. 删除确认对话框显示详细信息（受影响目标列表）
// 4. "未分类" area 置顶且标记为系统领域
```

#### 3.4.2 AreaSelectWithCreate 优化
```tsx
// 1. 移除内联创建模式，改为弹出 Modal
// 2. 创建成功后自动选中新 area
// 3. 添加"管理领域"快捷入口（跳转到 AreasView）
```

---

## 4. 实施计划

### Phase 1: 数据层修复（必须先行）
- [ ] 添加数据库迁移逻辑（`initialize` 中自动执行）
- [ ] 创建"未分类"系统 area
- [ ] 清理现有孤儿 goals
- [ ] 添加 `Area.is_system` 字段
- [ ] 编写 Rust 单元测试验证迁移逻辑

### Phase 2: 后端逻辑重构
- [ ] 修改 `create_goal` 强制关联 area
- [ ] 完善 `delete_area` 级联处理
- [ ] 移除 `deriveAreasFromGoals` 的前端依赖
- [ ] 更新 Tauri command 返回类型

### Phase 3: 前端重构
- [ ] 更新 TypeScript 类型定义
- [ ] 简化 `appStore.loadAreas` 逻辑
- [ ] 修改 `activeArea` 为基于 ID 的筛选
- [ ] 更新所有使用 `area.title` 的地方改为 `area.id`

### Phase 4: UI 改进
- [ ] 重构 AreasView 编辑/删除交互
- [ ] 优化 AreaSelectWithCreate 为 Modal 模式
- [ ] 添加"未分类"的视觉标识
- [ ] 编写 Playwright E2E 测试覆盖主流程

### Phase 5: 测试与发布
- [ ] 手动测试完整 area 生命周期
- [ ] 验证数据迁移在旧数据库上的表现
- [ ] 更新用户文档
- [ ] 发布更新

---

## 5. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 数据迁移失败导致用户数据丢失 | 高 | 迁移前自动备份数据库，提供回滚方案 |
| "未分类" area 的语义用户不理解 | 中 | 在 UI 显著位置说明其用途 |
| 强制关联 area 限制了灵活性 | 低 | 提供快速创建 area 的入口，降低操作成本 |
| 前端类型变更影响现有代码 | 中 | 渐进式重构，保留临时兼容层 |

---

## 6. 成功指标

- **数据完整性**：100% 的 goals 关联到有效的 area，无孤儿记录
- **用户体验**：删除 area 时明确反馈受影响目标，无数据意外丢失
- **代码质量**：移除 `deriveAreasFromGoals` 后，area 相关逻辑减少 30% 代码量
- **测试覆盖**：E2E 测试覆盖创建/编辑/删除/筛选完整流程

---

## 7. 未来考虑

以下功能留待后续迭代：
1. Area 颜色/图标自定义
2. Area 的归档功能（隐藏但不删除）
3. Area 之间的层级关系（如"工作"→"项目A"）
4. 批量移动 goals 到其他 area
5. Area 的访问统计（最常使用的领域）

---

## 附录：当前实现问题代码示例

### A1. 数据一致性问题
```typescript
// appStore.ts:665
loadAreas: async () => {
  const { areas } = await adapter.listAreas()
  set((state) => ({
    // 问题：混合了数据库 areas 和从 goals 派生的 areas
    allAreas: deriveAreasFromGoals(state.baseGoals, areas),
  }))
}

// 导致：如果 goal.area 是 "工作" 但数据库 areas 表没有这条记录，
// UI 会显示 "工作" area，但实际无法编辑/删除它
```

### A2. 删除逻辑不完整
```rust
// lib.rs:322
pub fn delete_area_record(...) -> Result<DeleteAreaResult, String> {
    // ... 检查关联 goals
    connection.execute("DELETE FROM areas WHERE id = ?1", params![&area_id])?;
    // 问题：没有处理 goals.area_id，导致孤儿引用
}
```

### A3. 类型不一致
```typescript
// 前端：Goal.area 是 string
interface GoalCard {
  area: string  // area 的 title
}

// 后端：Goal.area_id 是 Option<Uuid>
pub struct Goal {
    pub area_id: Option<Uuid>,  // area 的 id
}

// 问题：前端使用 title 做筛选，后端使用 id 做关联，容易出错
```
