# Goal 状态机系统 Spec

**文档版本**: v1.0  
**创建日期**: 2026-06-14  
**状态**: 已实现 ✅

---

## 一、概述

### 1.1 系统定位

Goal 状态机系统定义了目标（Goal）在生命周期中的所有可能状态及其转换规则。与 Task 状态机不同，Goal 状态机允许更灵活的双向转换，并引入自动计算状态 `READY_TO_COMPLETE`。

**设计原则**：
- **灵活转换**：目标可以在 ACTIVE ↔ PAUSED ↔ COMPLETED 间自由切换
- **自动计算**：READY_TO_COMPLETE 由系统根据关联任务完成情况自动标记
- **用户决策**：COMPLETED 需要用户主动确认，不自动完成
- **前后端一致**：Rust domain 层和 TypeScript 共享状态机规则

---

## 二、状态定义

### 2.1 状态枚举

```typescript
// src/types/app.ts
export type GoalStatus = 
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'ARCHIVED'
  | 'READY_TO_COMPLETE'
```

```rust
// src-tauri/src/domain.rs
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum GoalStatus {
    Active,
    Paused,
    Completed,
    Archived,
    ReadyToComplete,
}
```

### 2.2 状态语义

| 状态 | 中文 | 语义 | 设置方式 |
|------|------|------|---------|
| `ACTIVE` | 推进中 | 目标正在积极推进 | 用户手动 |
| `PAUSED` | 等待中 | 目标暂时搁置，等待条件成熟 | 用户手动 |
| `COMPLETED` | 已完成 | 目标已达成，不再变更 | 用户手动 |
| `ARCHIVED` | 已归档 | 目标不再活跃，长期存档 | 用户手动 |
| `READY_TO_COMPLETE` | 待收束 | 所有关联任务完成，目标可标记完成 | **系统自动** |

### 2.3 状态颜色编码

| 状态 | 视觉标识 | 颜色 | Tailwind Class |
|------|---------|------|---------------|
| `ACTIVE` | ▶ 播放图标 | 黑色 | `bg-slate-900 text-white` |
| `PAUSED` | ⏸ 暂停图标 | 灰色 | `bg-slate-500 text-white` |
| `COMPLETED` | ✅ 对勾 | 绿色 | `bg-emerald-500 text-white` |
| `ARCHIVED` | 📦 归档图标 | 琥珀 | `bg-amber-500 text-white` |
| `READY_TO_COMPLETE` | 🎯 目标图标 | 靛蓝 | `bg-indigo-600 text-white` |

---

## 三、状态转换规则

### 3.1 转换图（State Diagram）

```
              ┌─────────────────────────────────┐
              │        创建目标                 │
              └──────────────┬──────────────────┘
                             ↓
                        ┌─────────┐
              ┌─────────│ ACTIVE  │─────────┐
              │         └─────────┘         │
              │              │              │
           Pause          (自动)         Complete
              │              ↓              │
              │      ┌──────────────────┐  │
              │      │ READY_TO_COMPLETE│  │
              │      └──────────────────┘  │
              │              │              │
              ↓           Complete          ↓
          ┌────────┐                   ┌───────────┐
          │ PAUSED │◄──────Resume──────│ COMPLETED │
          └────┬───┘                   └─────┬─────┘
               │                             │
            Resume                        Archive
               │                             │
               │         ┌──────────┐        │
               └────────►│ ARCHIVED │◄───────┘
                         └─────┬────┘
                               │
                            Reactive
                               │
                               ↓
                          (回到 ACTIVE)
```

### 3.2 合法转换表

| 当前状态 | 允许转换到 | 转换动作 | 说明 |
|---------|-----------|---------|-----|
| `ACTIVE` | `PAUSED` | Pause | 暂时搁置目标 |
| `ACTIVE` | `COMPLETED` | Complete | 直接标记完成 |
| `ACTIVE` | `ARCHIVED` | Archive | 直接归档（放弃或转移） |
| `ACTIVE` | `READY_TO_COMPLETE` | - | **系统自动**，所有任务完成 |
| `PAUSED` | `ACTIVE` | Resume | 恢复推进 |
| `PAUSED` | `COMPLETED` | Complete | 暂停状态下标记完成 |
| `PAUSED` | `ARCHIVED` | Archive | 暂停后归档 |
| `COMPLETED` | `ACTIVE` | Reopen | 重新开启（罕见） |
| `COMPLETED` | `ARCHIVED` | Archive | 完成后归档 |
| `ARCHIVED` | `ACTIVE` | Reactive | 重新激活 |
| `READY_TO_COMPLETE` | `COMPLETED` | Complete | 确认完成 |
| `READY_TO_COMPLETE` | `ACTIVE` | - | **系统自动**，新增未完成任务 |

**注意**：
- `READY_TO_COMPLETE` 不在 GoalDrawer 状态按钮组中（用户不可手动设置）
- 用户尝试设置 `READY_TO_COMPLETE` 时，系统拒绝并提示错误

---

## 四、自动状态计算

### 4.1 READY_TO_COMPLETE 触发条件

```typescript
// src/lib/workspaceDerivation.ts
export function deriveGoalStatus(
  goal: GoalCard,
  tasks: Task[]
): GoalStatus {
  // 1. 筛选关联任务
  const linkedTasks = tasks.filter(task => task.linkedGoalId === goal.id)
  
  // 2. 没有任务，保持原状态
  if (linkedTasks.length === 0) {
    return goal.status
  }
  
  // 3. 所有任务完成 + 目标是 ACTIVE → READY_TO_COMPLETE
  const allDone = linkedTasks.every(task => task.status === 'DONE')
  if (allDone && goal.status === 'ACTIVE') {
    return 'READY_TO_COMPLETE'
  }
  
  // 4. 有未完成任务 + 目标是 READY_TO_COMPLETE → 恢复 ACTIVE
  if (!allDone && goal.status === 'READY_TO_COMPLETE') {
    return 'ACTIVE'
  }
  
  // 5. 其它情况保持原状态
  return goal.status
}
```

**触发时机**：
- 任务状态变更时（Task 完成/重开）
- 任务关联目标变更时（linkedGoalId 改变）
- 加载 workspace 时（初始化）

### 4.2 前端实现

```typescript
// src/lib/DerivedStateManager.ts
private computeGoals(): GoalCard[] {
  return this.baseGoals.map(goal => {
    const linkedTasks = this.tasks.filter(task => task.linkedGoalId === goal.id)
    const completedCount = linkedTasks.filter(task => task.status === 'DONE').length
    const progress = linkedTasks.length === 0 
      ? 0 
      : Math.round((completedCount / linkedTasks.length) * 100)
    
    // 自动计算状态
    const status = deriveGoalStatus(goal, this.tasks)
    
    return {
      ...goal,
      status,
      progress,
      taskCount: linkedTasks.length,
      // ...
    }
  })
}
```

### 4.3 后端实现

```rust
// src-tauri/src/domain.rs
impl Goal {
    pub fn derive_status(&self, tasks: &[DeskTask]) -> GoalStatus {
        let linked_tasks: Vec<_> = tasks
            .iter()
            .filter(|task| task.linked_goal_id.as_ref() == Some(&self.id))
            .collect();
        
        if linked_tasks.is_empty() {
            return self.status.clone();
        }
        
        let all_done = linked_tasks.iter().all(|task| task.status == TaskStatus::Done);
        
        if all_done && self.status == GoalStatus::Active {
            return GoalStatus::ReadyToComplete;
        }
        
        if !all_done && self.status == GoalStatus::ReadyToComplete {
            return GoalStatus::Active;
        }
        
        self.status.clone()
    }
}
```

---

## 五、状态转换实现

### 5.1 TypeScript 实现

```typescript
// src/store/appStore.ts
updateGoalStatus: async (goalId, status) => {
  // 1. 拦截非法操作
  if (status === 'READY_TO_COMPLETE') {
    set({ 
      statusMessage: 'READY_TO_COMPLETE is auto-computed and cannot be set manually' 
    })
    return
  }
  
  // 2. 调用 Tauri command 或浏览器 mock
  const adapter = createWorkspaceMutationAdapter()
  const { goal: updatedGoal, statusMessage } = await adapter.updateGoalStatus(goalId, status)
  
  // 3. 更新 store 和派生状态
  set(state => {
    const nextGoal = updatedGoal as GoalCard
    return {
      ...replaceGoalState(state, nextGoal),
      statusMessage: statusMessage || BROWSER_PREVIEW_STATUS,
    }
  })
}
```

### 5.2 Rust 实现

```rust
// src-tauri/src/repository.rs
impl GoalRepository for SqliteGoalRepository {
    async fn update_status(&self, goal_id: &str, status: GoalStatus) -> Result<Goal, String> {
        // 1. 校验非法状态
        if status == GoalStatus::ReadyToComplete {
            return Err("READY_TO_COMPLETE cannot be set manually".to_string());
        }
        
        // 2. 更新数据库
        sqlx::query("UPDATE goals SET status = ?, updated_at = ? WHERE id = ?")
            .bind(serde_json::to_string(&status).unwrap())
            .bind(Utc::now())
            .bind(goal_id)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;
        
        // 3. 查询更新后的 Goal
        self.get_by_id(goal_id).await
    }
}
```

---

## 六、Goals View 看板分组

### 6.1 领域看板三列布局

**列定义**（领域模式）：
```typescript
const columns = [
  { 
    title: '推进中', 
    statuses: ['ACTIVE', 'READY_TO_COMPLETE'], 
    bg: 'bg-[#F4E8CA]'  // 琥珀
  },
  { 
    title: '等待中', 
    statuses: ['PAUSED'], 
    bg: 'bg-[#DDEEE8]'  // 绿色
  },
  { 
    title: '已收束', 
    statuses: ['COMPLETED', 'ARCHIVED'], 
    bg: 'bg-[#DAE7F3]'  // 蓝色
  },
]
```

**分组逻辑**：
```typescript
const columnGoals = columns.map(column => ({
  ...column,
  goals: goals.filter(goal => 
    column.statuses.includes(goal.status) &&
    goal.area === activeArea
  )
}))
```

### 6.2 全部目标模式筛选

```typescript
// 按状态筛选
const filteredGoals = goals.filter(goal => {
  if (statusFilter === 'ALL') return true
  if (statusFilter === 'ACTIVE') return goal.status === 'ACTIVE' || goal.status === 'READY_TO_COMPLETE'
  return goal.status === statusFilter
})
```

**筛选器选项**：
- ALL - 所有目标
- ACTIVE - 推进中（包含 READY_TO_COMPLETE）
- PAUSED - 等待中
- COMPLETED - 已完成
- ARCHIVED - 已归档

---

## 七、设计决策（ADR）

### ADR-001: READY_TO_COMPLETE 系统自动计算

**决策**: 所有任务完成时自动标记为 `READY_TO_COMPLETE`，用户不可手动设置

**理由**:
- ✅ 提示用户"目标可以收束了"，避免遗忘
- ✅ 区分"任务完成"和"目标达成"（需要用户确认）
- ✅ 避免用户误操作（手动设置该状态无意义）

**代价**:
- ❌ 增加状态机复杂度（需要自动计算逻辑）
- 接受: 计算逻辑简单，性能影响可忽略

### ADR-002: 允许 COMPLETED → ACTIVE 转换

**决策**: 已完成的目标可以重新开启

**理由**:
- ✅ 支持"目标重启"场景（如季度目标延续）
- ✅ 纠正误操作（误标记完成）
- ✅ 更灵活的目标管理

**代价**:
- ❌ 与 Task 状态机不一致（Task DONE 是终态）
- 接受: Goal 和 Task 语义不同，Goal 更偏向长期规划

### ADR-003: PAUSED ↔ ACTIVE 双向转换

**决策**: 目标可以在 ACTIVE 和 PAUSED 间自由切换

**理由**:
- ✅ 反映真实工作场景（目标暂停-恢复循环）
- ✅ 不丢失目标进度和历史
- ✅ 与 Task PAUSED ↔ IN_PROGRESS 对称

**代价**:
- ❌ 无法追踪暂停/恢复历史（Goal 没有 activityLogs）
- 接受: Goal 关注结果而非过程，不需要详细日志

### ADR-004: ARCHIVED 状态可恢复

**决策**: 归档的目标可以重新激活（Reactive）

**理由**:
- ✅ 归档不是"删除"，而是"收纳"
- ✅ 支持"目标复盘"场景
- ✅ 避免误归档导致数据丢失

**代价**:
- ❌ 归档目标可能污染活跃目标列表
- 缓解: Goals View 默认隐藏 ARCHIVED 目标

---

## 八、前后端一致性保证

### 8.1 类型定义同步

| 层级 | 文件 | 类型定义 |
|------|-----|---------|
| TypeScript | `src/types/app.ts` | `GoalStatus` enum |
| Rust | `src-tauri/src/domain.rs` | `GoalStatus` enum |
| serde | serde 配置 | `#[serde(rename_all = "SCREAMING_SNAKE_CASE")]` |

**保证机制**:
- Rust 枚举通过 serde 序列化为 `"ACTIVE"`, `"READY_TO_COMPLETE"` 等字符串
- TypeScript 直接使用字符串字面量类型
- 编译时检查：Rust enum 变更后，TypeScript 类型需同步更新

### 8.2 状态机规则同步

| 实现位置 | 函数 | 职责 |
|---------|-----|------|
| Rust domain | `Goal::derive_status()` | 后端自动计算 READY_TO_COMPLETE |
| TypeScript | `deriveGoalStatus()` | 前端自动计算 READY_TO_COMPLETE |
| Repository | `update_status()` | 后端校验转换合法性 |
| Store | `updateGoalStatus()` | 前端拦截非法操作 |

**保证机制**:
- 前后端都拒绝手动设置 `READY_TO_COMPLETE`
- 自动计算逻辑在前后端同步（相同条件触发）
- 单元测试覆盖自动计算场景

---

## 九、测试用例

### 9.1 自动状态计算测试

| 测试场景 | 初始状态 | 关联任务状态 | 预期状态 |
|---------|---------|-------------|---------|
| 所有任务完成 | ACTIVE | 3 个 DONE | READY_TO_COMPLETE |
| 新增未完成任务 | READY_TO_COMPLETE | 2 个 DONE + 1 个 TODO | ACTIVE |
| 没有任务 | ACTIVE | 无 | ACTIVE |
| 部分完成 | ACTIVE | 1 个 DONE + 2 个 TODO | ACTIVE |
| 已暂停全部完成 | PAUSED | 3 个 DONE | PAUSED（不自动变化） |

### 9.2 状态转换测试

| 测试场景 | 初始状态 | 目标状态 | 预期结果 |
|---------|---------|---------|---------|
| 暂停目标 | ACTIVE | PAUSED | ✅ 成功 |
| 完成目标 | READY_TO_COMPLETE | COMPLETED | ✅ 成功 |
| 重开目标 | COMPLETED | ACTIVE | ✅ 成功 |
| 手动设置 READY_TO_COMPLETE | ACTIVE | READY_TO_COMPLETE | ❌ 拒绝，提示错误 |
| 归档已完成目标 | COMPLETED | ARCHIVED | ✅ 成功 |
| 重新激活归档目标 | ARCHIVED | ACTIVE | ✅ 成功 |

### 9.3 边界测试

| 测试场景 | 操作 | 预期行为 |
|---------|-----|---------|
| 目标无任务完成 | 点击 Complete | 直接变为 COMPLETED |
| 任务从 DONE 改回 TODO | 系统自动 | READY_TO_COMPLETE → ACTIVE |
| 删除关联任务 | 系统自动 | 重新计算进度和状态 |
| 取消任务关联 | 系统自动 | 重新计算进度和状态 |

---

## 十、相关资源

### 文档
- [GoalDrawer Spec](./goal-drawer.md)
- [Goals View PRD](../prd/goals-view.md)
- [Task 状态机 Spec](./task-state-machine.md)

### 代码
- [`src/lib/workspaceDerivation.ts`](../../src/lib/workspaceDerivation.ts) - `deriveGoalStatus()`
- [`src-tauri/src/domain.rs`](../../src-tauri/src/domain.rs) - `Goal::derive_status()`
- [`src/store/appStore.ts`](../../src/store/appStore.ts) - `updateGoalStatus()`

### 测试
- [`src-tauri/src/domain.rs`](../../src-tauri/src/domain.rs) - `#[cfg(test)]` 模块

---

**文档维护者**: Goal Desk 开发团队  
**最后更新**: 2026-06-14