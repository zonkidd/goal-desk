# Kairos · 见独 — 设计理念与架构思想

**文档版本**: v1.0  
**更新日期**: 2026-06-14  
**项目状态**: 开发中（未发版）

---

## 一、产品定位

### 核心理念

Kairos · 见独（καιρός / jiàn dú）是一个**本地优先的目标管理桌面应用**，专注于帮助用户在时间流中推进顶层目标。取自《庄子·大宗师》"朝彻而后能见独"——穿越纷扰，看见那个唯一重要的东西。

**设计哲学**：

1. **本地优先**：数据存储在本机 SQLite，无需云同步，保证隐私和速度
2. **目标驱动**：以 Goal 为核心组织任务，避免待办清单的无序堆积
3. **时间可视化**：通过时间轴和持续推进视图，让用户感知进展节奏
4. **原生集成**：深度桥接 macOS EventKit（日历/提醒事项），而非重复造轮轮子

### 与竞品的差异

| 产品      | 定位          | Kairos 的差异                                |
| --------- | ------------- | -------------------------------------------- |
| Things 3  | GTD 待办清单  | 强调 **Goal 进度可视化** 和 **时间跨度管理** |
| OmniFocus | 复杂项目管理  | 专注 **简洁的目标看板** 而非层级项目         |
| Notion    | 知识库 + 任务 | 轻量级桌面应用，**原生性能** 和 **离线优先** |

---

## 二、架构设计原则

### 2.1 深层模块（Deep Modules）

遵循 John Ousterhout《A Philosophy of Software Design》的深层模块原则：

**简单接口 + 强大实现 = 高杠杆率**

#### 案例：DerivedStateManager

```typescript
// 简单接口
manager.compute(ChangeType.TasksOnly);

// 封装 194 行复杂逻辑：
// - 智能缓存判断
// - 7 种派生状态计算
// - 目标进度、今日焦点、时间轴等
```

**效果**：

- 调用者只需 1 行代码
- 性能优化对外透明（记忆化缓存）
- 易于测试和重构

### 2.2 富领域模型（Rich Domain Model）

拒绝贫血模型，将业务逻辑内聚到领域实体：

```rust
// Before（贫血模型）：逻辑分散在多处
pub struct Goal { pub status: String, ... }
fn can_transition(from: &str, to: &str) -> bool { ... }  // 外部函数

// After（富领域模型）：行为封装在实体内
impl Goal {
    pub fn can_transition_to(&self, new_status: GoalStatus) -> bool {
        // 状态机规则内聚
    }

    pub fn calculate_progress(&self, tasks: &[DeskTask]) -> u8 {
        // 进度计算逻辑内聚
    }
}
```

**优势**：

- ✅ 类型安全：编译期检查状态转换
- ✅ 防止重复：前后端共享领域规则
- ✅ 易于测试：8 个单元测试覆盖状态机

### 2.3 分层 Repository

避免浅层抽象，提供精细粒度操作：

```rust
// Before（浅层）：全量读写
load_workspace() -> Workspace   // 读所有数据
save_workspace(workspace)        // 写所有数据

// After（深层）：单实体操作
trait GoalRepository {
    fn find(&self, id: Uuid) -> Result<Goal>
    fn update(&self, goal: &Goal) -> Result<()>
    fn list_by_area(&self, area_id: Uuid) -> Result<Vec<Goal>>
}
```

**性能改善**：

- 更新单个 Goal：从 O(n) 读写降为 O(1) SQL UPDATE
- 按 Area 查询：直接走索引，而非内存过滤

### 2.4 边界清晰的适配器

**desktopApi.ts** 是前端与 Tauri 的唯一边界：

```typescript
// 职责：
// 1. invoke(...) 调用 Rust command
// 2. snake_case → camelCase 转换（现由 serde 完成）
// 3. ISO 8601 字符串 → JavaScript Date
// 4. EventKit 时间线合并

// 其他模块只依赖 desktopApi，不直接接触 Tauri
```

**优势**：

- 易于 Mock 和测试
- 浏览器预览模式与 Tauri 模式分离
- 未来替换 Tauri 框架只需改这一处

---

## 三、UI/UX 设计系统

### 3.1 视觉风格

**玻璃拟态（Glassmorphism）+ 极简主义**

```css
/* GlassCard/GlassPanel 统一样式 */
backdrop-filter: blur(16px);
background: rgba(255, 255, 255, 0.7);
border: 1px solid rgba(255, 255, 255, 0.3);
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
```

**颜色系统**：

- **主色调**：Indigo 600（目标/行动按钮）
- **中性色**：Slate 系列（文本/背景）
- **状态色**：
  - 🔴 Red（紧急/删除）
  - 🟠 Amber（警告/待办）
  - 🟢 Emerald（日历事件）
  - 🔵 Indigo（提醒/进行中）

**圆角规范**：

- 卡片：`rounded-3xl`（24px）
- 按钮/输入框：`rounded-2xl`（16px）
- 标签/徽章：`rounded-full`

### 3.2 动画交互

使用 **Framer Motion** 提供流畅反馈：

```tsx
// 卡片悬停微动效
<motion.div whileHover={{ y: -2 }} />

// 时间轴条目淡入
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
/>
```

**交互原则**：

- 悬停反馈：`-translate-y-0.5` 或 `y: -2`
- 点击反馈：`active:scale-95`
- 过渡时长：150-300ms（Tailwind transition-默认）

### 3.3 信息层级

**字重系统**（严格使用 Bold 以上）：

- `font-black`（900）：数字、重要标签
- `font-extrabold`（800）：页面标题
- `font-bold`（700）：次级标题、按钮文本
- `font-semibold`（600）：正文辅助信息
- `font-medium`（500）：描述文本

**尺寸系统**：

- H1 页面标题：`text-4xl`（36px）
- H2 模块标题：`text-xl`（20px）
- 卡片标题：`text-lg`（18px）
- 正文：`text-sm`（14px）
- 辅助信息：`text-xs`（12px）

---

## 四、核心视图设计

### 4.1 今日焦点（Today View）

**设计目标**：在时间流中推进顶层目标

**布局结构**：

```
┌─────────────────────────────────────────────────────────┐
│  今日焦点                                                │
│  在时间流中推进你的顶层目标。                              │
├──────────────────────────┬───────────────────────────────┤
│                          │                               │
│  今日持续推进  📊        │   今日时间轴  🕐               │
│  - 任务 A (已推进3天)    │   09:00 ○ 晨会                │
│  - 任务 B (还剩2天🔥)     │   14:00 ● 产品讨论 (提醒)     │
│                          │   16:00 ○ 需求评审            │
│  今日目标看点  🎯        │                               │
│  - Q2产品迭代 (65%)     │                               │
│  - 技术架构优化 (40%)    │                               │
│                          │                               │
└──────────────────────────┴───────────────────────────────┘
```

**核心概念**：

1. **今日持续推进**：

   - 筛选条件：`startDay ≤ today ≤ dueDay`，状态为 `IN_PROGRESS`
   - 展示信息：已推进天数、剩余天数、紧急度图标
   - 用户价值：感知任务的时间跨度和紧迫性

2. **今日目标看点**：

   - 由持续推进待办牵引的目标
   - 展示进度条和 Next Todo
   - 用户价值：从待办看到顶层目标的推进

3. **今日时间轴**：
   - 合并 Desk Task、Apple Reminders、Calendar Events
   - 按时间排序，视觉区分来源
   - 用户价值：统一视图避免切换应用

**时间展示策略**（详见 `taskPresentation.ts`）：

```typescript
interface TaskTimeInfo {
  daysElapsed: number; // 已推进天数
  daysRemaining: number | null; // 剩余天数
  urgency: "critical" | "warning" | "normal" | "none";
  // critical: ≤2天 🔥
  // warning: 3-7天 ⏰
  // normal: >7天 ✅
  // none: 无截止 ∞
}
```

### 4.2 目标看板（Goals View）

**设计目标**：专注单一领域的目标进展

**筛选模式**：

- 默认：全部领域（`activeArea = 'ALL'`）
- 领域筛选：点击侧边栏领域名称

**卡片信息层级**：

```
┌────────────────────────────────────┐
│ 【领域标签】              进度 65% │
│                                    │
│ 目标标题                            │
│ 4 个待办 · 最近更新 2 小时前         │
│                                    │
│ ▓▓▓▓▓▓▓░░░░░░░  进度条              │
│                                    │
│ Next: 完成原型设计                  │
└────────────────────────────────────┘
```

### 4.3 领域管理（Areas View）

**重设计目标**（详见 `areas-redesign-prd.md`）：

**核心改进**：

1. ✅ Area 作为强实体，禁止自由标签
2. ✅ 系统 Area "未分类"（不可删除/重命名）
3. ✅ 删除 Area 时自动迁移 Goals 到"未分类"
4. ✅ 前后端统一使用 `area_id`（UUID）而非 `title`

**UI 布局**：

- 卡片网格（3 列）
- 系统 Area 标记紫色徽章
- 编辑/删除操作改为 Modal 而非内联展开

---

## 五、状态管理架构

### 5.1 Zustand Store 结构

```typescript
interface AppStore {
  // 基础数据（来自后端）
  baseTimeline: TimelineItem[]
  baseGoals: GoalCard[]
  tasks: Task[]
  allAreas: AreaWithStats[]

  // 派生状态（由 DerivedStateManager 计算）
  timeline: TimelineItem[]
  todayRelevantGoals: GoalCard[]
  todayAttentionGroups: { ongoing: Task[], ... }

  // UI 状态
  currentView: ViewKey
  activeArea: AreaFilter
  drawerState: { ... }
}
```

### 5.2 派生状态计算策略

**智能缓存**（`DerivedStateManager`）：

```typescript
enum ChangeType {
  Everything, // 全量重算
  TasksOnly, // 只重算 tasks 相关派生状态
  GoalsOnly, // 只重算 goals 相关派生状态
  AreasOnly, // 只重算 areas 相关派生状态
  TimelineOnly, // 只重算 timeline
  FilterOnly, // 只重算筛选结果
}

// 示例：添加任务备注不会重算 Goals 进度
manager.compute(ChangeType.TasksOnly);
```

**性能优化**：

- Goals 未变时，进度计算结果缓存
- 避免 17 处调用点的重复计算

---

## 六、数据模型

### 6.1 核心实体

**Goal（目标）**：

```typescript
interface GoalCard {
  id: string;
  title: string;
  area: string; // 外键指向 Area
  status: GoalStatus; // ACTIVE | PAUSED | READY_TO_COMPLETE | ...
  progress: number; // 0-100，由关联 Tasks 计算
  nextTodo: string; // 最近未完成待办的标题
}
```

**Task（待办）**：

```typescript
interface Task {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "PAUSED" | "DONE";
  plannedStartAt?: Date; // 开始时间（Today 筛选依据）
  dueDate?: Date; // 截止时间
  showInTimeline: boolean; // 是否显示在时间轴
  linkedGoalId?: string; // 外键指向 Goal
}
```

**Area（领域）**：

```typescript
interface AreaWithStats {
  id: string;
  title: string;
  isSystem: boolean; // 系统 Area（如"未分类"）
  goalCount: number; // 包含目标数
  activeGoalCount: number; // 活跃目标数
}
```

### 6.2 状态机

**Goal 状态转换规则**（`domain.rs`）：

```
ACTIVE ──────┐
  ↓          │
PAUSED       │
  ↓          │
ACTIVE       │
  ↓          ↓
READY_TO_COMPLETE
  ↓
COMPLETED
  ↓
ARCHIVED
```

**Task 状态转换规则**：

```
TODO ──Start──> IN_PROGRESS ──Pause──> PAUSED
                    ↓                      ↓
                  Complete             Resume
                    ↓                      ↓
                  DONE                IN_PROGRESS
```

---

## 七、技术栈选型

### 7.1 前端

| 技术          | 版本 | 选型理由                          |
| ------------- | ---- | --------------------------------- |
| React         | 18.x | 成熟生态，Hooks 简化状态管理      |
| TypeScript    | 5.x  | 类型安全，减少运行时错误          |
| Zustand       | 5.x  | 轻量级状态管理，无 Redux 样板代码 |
| Tailwind CSS  | 3.x  | 快速原型，设计系统一致性          |
| Framer Motion | 11.x | 流畅动画，Apple 式微交互          |

### 7.2 后端

| 技术             | 版本 | 选型理由                     |
| ---------------- | ---- | ---------------------------- |
| Tauri            | 2.0  | Rust 性能 + Web 技术，体积小 |
| SQLite           | 3.x  | 本地优先，零配置             |
| serde            | 1.x  | Rust ↔ JSON 序列化           |
| EventKit (Obj-C) | -    | macOS 原生日历/提醒桥接      |

### 7.3 测试

| 工具           | 用途                       |
| -------------- | -------------------------- |
| Playwright     | E2E 测试（浏览器 + Tauri） |
| cargo test     | Rust 单元测试              |
| Vitest（计划） | TypeScript 单元测试        |

---

## 八、未来规划

### 8.1 短期优化（1-2 周）

- [ ] **E2E 测试覆盖**：Today View、Areas 管理、Goal 创建流程
- [ ] **性能监控**：`console.time` 量化派生状态优化效果
- [ ] **Vitest 集成**：为 `DerivedStateManager` 添加单元测试

### 8.2 中期迭代（1-2 月）

- [ ] **Area 扩展属性**：颜色、图标自定义
- [ ] **批量操作**：批量移动 Goals 到其他 Area
- [ ] **事务支持**：跨实体原子操作（Repository Transaction）
- [ ] **查询优化**：添加数据库索引（`goals.area_id`、`desk_tasks.status`）

### 8.3 长期愿景（3-6 月）

- [ ] **ViewModel 层**：封装 Store 交互，降低 View 组件复杂度
- [ ] **CQRS 模式**：分离读写模型，进一步优化性能
- [ ] **自然语言解析**：Quick Capture 支持更丰富的时间表达式
- [ ] **iOS/iPadOS 同步**：iCloud 同步或 Tauri Mobile 支持

---

## 九、设计决策记录（ADR）

### ADR-001: Area 强实体 vs 自由标签

**决策**：Area 作为强实体，禁止自由标签输入

**理由**：

- ✅ 用户需要明确的分类体系
- ✅ 统计功能依赖稳定的 Area 定义
- ✅ 易于实现数据完整性约束

**代价**：

- ❌ 灵活性降低，需要预先创建 Area
- 缓解：提供快速创建 Area 入口

### ADR-002: serde camelCase 转换

**决策**：使用 `#[serde(rename_all = "camelCase")]` 而非前端 normalize 函数

**理由**：

- ✅ 删除 9 个 normalize 函数（100+ 行重复代码）
- ✅ 添加字段从"改 3 处"降为"改 2 处"
- ✅ serde 保证序列化格式一致性

### ADR-003: 独立 DerivedStateManager

**决策**：将派生状态逻辑从 `appStore.ts` 提取到独立模块

**理由**：

- ✅ 194 行逻辑封装在简单接口后
- ✅ 支持智能缓存和选择性计算
- ✅ 独立于 Zustand，易于测试

---

## 十、总结

Kairos 的设计遵循**深层模块**和**富领域模型**原则，通过以下手段实现高质量架构：

1. **简单接口 + 强大实现**：DerivedStateManager、Repository trait
2. **业务逻辑内聚**：Goal/Task 状态机、进度计算封装在领域层
3. **边界清晰**：desktopApi 统一前后端交互，workspaceMutations 分离 Tauri/浏览器实现
4. **可测试性**：41 个 Rust 单元测试，独立于框架的派生状态逻辑

**核心价值**：

- 🎯 **目标驱动**：避免待办清单的无序堆积
- ⏱️ **时间可视化**：持续推进视图让用户感知进展节奏
- 🔒 **本地优先**：隐私和速度，无云依赖
- 🍎 **原生集成**：深度桥接 macOS 生态

---

**文档维护者**: Claude Code  
**参考资料**:

- [Areas 重设计 PRD](../areas-redesign-prd.md)
- [架构重构总结](../architecture-refactor-summary.md)
- [今日焦点时间展示设计](./today-workbench-time-display.md)
