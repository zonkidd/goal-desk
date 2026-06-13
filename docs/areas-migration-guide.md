# Areas 领域数据迁移指南

## 背景

Areas 重设计引入了"未分类"系统领域，并修复了数据一致性问题。本指南说明自动迁移的行为、备份建议和常见问题。

## 自动迁移

应用启动时会自动执行以下迁移（`repository.initialize()` 方法）：

### 1. 创建"未分类"系统领域

- **ID**: `00000000-0000-0000-0000-000000000000`
- **标题**: "未分类"
- **属性**: `is_system = true`（系统领域）

如果"未分类"领域已存在，则跳过创建（幂等操作）。

### 2. 修复孤儿 Goals

将以下两类"孤儿 goals"自动移动到"未分类"领域：

- **类型 1**：`area_id` 为 `NULL` 的 goals
- **类型 2**：`area_id` 指向不存在的 area 的 goals（悬空引用）

迁移 SQL：
```sql
UPDATE goals 
SET area_id = '00000000-0000-0000-0000-000000000000'
WHERE area_id IS NULL 
   OR area_id NOT IN (SELECT id FROM areas);
```

### 3. 添加数据完整性字段

为 `Area` 实体添加 `is_system` 字段：

- **系统领域**（如"未分类"）：`is_system = true`，不可删除、不可重命名
- **普通领域**：`is_system = false`，可正常编辑和删除

## 迁移特性

### 幂等性

迁移逻辑是**幂等**的，多次执行不会产生重复数据：

- `INSERT OR IGNORE` 确保"未分类"领域只创建一次
- `UPDATE` 操作只影响符合条件的 goals，已迁移的不会重复处理

### 非破坏性

迁移**不会删除**任何数据：

- 所有 goals 都会被保留
- 所有 areas 都会被保留
- 只修改孤儿 goals 的 `area_id` 指向有效的"未分类"领域

## 数据备份（建议）

虽然迁移是安全且经过测试的，但建议在首次运行新版本前备份数据库：

### macOS

```bash
cp ~/Library/Application\ Support/com.example.goal-desk/goal-desk.db ~/Desktop/goal-desk-backup-$(date +%Y%m%d).db
```

### Windows

```powershell
copy "%APPDATA%\com.example.goal-desk\goal-desk.db" "%USERPROFILE%\Desktop\goal-desk-backup-%date:~0,4%%date:~5,2%%date:~8,2%.db"
```

### Linux

```bash
cp ~/.local/share/com.example.goal-desk/goal-desk.db ~/goal-desk-backup-$(date +%Y%m%d).db
```

## 回滚方案

如果需要回滚到旧版本：

1. **关闭应用**
2. **恢复备份的数据库文件**（覆盖到原路径）
3. **降级到旧版本应用**（从安装包重新安装）

**注意**：回滚后，在新版本中创建的 areas 和 goals 将丢失。

## 验证迁移成功

启动应用后，检查以下内容确认迁移成功：

### 1. "未分类"领域存在

- 打开 **Areas 视图**（侧边栏 → 领域）
- 应该看到"未分类"领域卡片，位于列表顶部
- 卡片应该有**系统领域**标识（如边框样式或徽章）

### 2. 无孤儿数据

- 所有 goals 都关联到有效的 area（包括"未分类"）
- 不再出现"未关联领域"的 goals

### 3. 数据完整性

- 原有 goals 的 area 关联未改变（除非原本是孤儿）
- Goals 数量与迁移前一致
- Areas 数量 = 原有数量 + 1（"未分类"）

### 4. 系统领域限制

- "未分类"领域的**删除按钮**应该被禁用
- "未分类"领域的**重命名按钮**应该被禁用

## 常见问题

### Q: "未分类"领域可以删除吗？

**A**: 不可以。"未分类"是系统领域，不可删除或重命名。它用于容纳暂未分类的 goals，确保数据完整性。

### Q: 迁移会丢失数据吗？

**A**: 不会。迁移只会修复数据关联（将孤儿 goals 移到"未分类"），不会删除任何 goal 或 area。

### Q: 如果我删除了某个 area，关联的 goals 会怎样？

**A**: 删除 area 时，如果选择强制删除，关联的 goals 会自动移动到"未分类"领域。详见删除确认对话框的提示。

### Q: 我可以重命名"未分类"领域吗？

**A**: 不可以。系统领域的名称是固定的，以保证应用行为的一致性。

### Q: 迁移需要多长时间？

**A**: 迁移在应用启动时自动执行，通常在几毫秒内完成。即使有数千个 goals，迁移也应该在 1 秒内完成。

### Q: 我的数据库已经很旧了，迁移安全吗？

**A**: 是的。迁移逻辑经过充分测试，包括：
- 旧版数据库（没有 `is_system` 字段）
- 包含大量孤儿 goals 的数据库
- 全新的空数据库
- 重复执行迁移的幂等性

所有测试用例都通过，确保迁移的安全性。

### Q: 如果迁移失败会怎样？

**A**: 应用会在启动时显示错误信息。此时：
1. 不要继续使用应用
2. 检查日志文件（macOS: `~/Library/Logs/goal-desk/`）
3. 恢复备份数据库
4. 联系支持或提交 Issue

### Q: 迁移后可以继续使用旧版本吗？

**A**: 不建议。迁移会添加新字段（`is_system`）和新数据（"未分类"领域）。旧版本可能无法正确识别这些变更，导致行为异常。

## 技术细节

### 数据库 Schema 变更

```sql
-- 添加"未分类"系统领域
INSERT OR IGNORE INTO areas (id, title) 
VALUES ('00000000-0000-0000-0000-000000000000', '未分类');

-- 清理孤儿 goals
UPDATE goals 
SET area_id = '00000000-0000-0000-0000-000000000000'
WHERE area_id IS NULL 
   OR area_id NOT IN (SELECT id FROM areas);
```

### Area 类型变更

```rust
pub struct Area {
    pub id: Uuid,
    pub title: String,
    pub is_system: bool,  // 新增字段
}

pub const UNCATEGORIZED_AREA_ID: &str = "00000000-0000-0000-0000-000000000000";
```

### 迁移执行时机

迁移在以下时机执行：

1. **应用首次启动**：`repository.initialize()` 创建表并执行迁移
2. **每次启动**：`initialize()` 是幂等的，重复执行不会产生副作用
3. **数据恢复后**：从备份恢复数据库后，下次启动时自动迁移

## 相关文档

- [Areas 重设计 PRD](./areas-redesign-prd.md) - 完整的设计文档和技术方案
- [Areas 测试清单](./areas-testing-checklist.md) - 手动测试指南

## 支持

如果遇到迁移问题，请：

1. 查看应用日志文件
2. 在 GitHub 提交 Issue，包含：
   - 操作系统和版本
   - 应用版本
   - 错误信息或日志
   - 数据库备份（如果可以分享）
