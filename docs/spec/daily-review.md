# Daily Review Technical Specification

## 1. 架构概览 (Architecture Overview)
Daily Review 功能采用标准的前后端分离架构，通过 Tauri IPC 进行通信：
- **存储层 (SQLite)**：新增 `daily_review_items` 表，按行存储每个回顾条目。
- **后端 (Rust)**：实现 CRUD 操作的 Repository 和 Service 层，以及暴露给前端的 Tauri Commands。
- **前端 (React + Zustand)**：新增 `DailyReviewView` 主视图，通过 `dailyReviewStore` 管理无限滚动的状态与按日期分组的数据。

## 2. 数据模型与数据库设计
由于我们采用类似聊天的追加模式，每个“回车发送”的内容都是一个独立的条目。为方便修改和删除，最灵活的设计是只维护一张 Item 表，通过 `date` 字段进行逻辑上的日期分组。

### 2.1 SQLite Schema (`daily_review_items`)
```sql
CREATE TABLE IF NOT EXISTS daily_review_items (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,          -- 归属日期，格式 'YYYY-MM-DD'
    content TEXT NOT NULL,       -- 回顾文本内容
    created_at DATETIME NOT NULL,-- 创建时间
    updated_at DATETIME NOT NULL -- 最后更新时间
);

-- 用于无限滚动查询的索引：按日期倒序，同日期按创建时间正序
CREATE INDEX IF NOT EXISTS idx_daily_review_items_timeline 
ON daily_review_items (date DESC, created_at ASC);
```

### 2.2 Rust Domain Model
在 `src-tauri/src/domain.rs` 中新增：
```rust
pub struct DailyReviewItem {
    pub id: Uuid,
    pub date: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

## 3. 后端接口设计 (Tauri Commands)

暴露以下 Tauri 命令供前端调用：

1. **`create_daily_review_item(date: String, content: String)`**
   * 创建一条新的回顾记录，返回完整的 `DailyReviewItem`。
2. **`update_daily_review_item(id: Uuid, content: String)`**
   * 更新已存在的记录内容，更新 `updated_at`。
3. **`delete_daily_review_item(id: Uuid)`**
   * 删除指定的记录。
4. **`get_daily_review_timeline(limit: u32, offset: u32)`** 
   * **或者使用 Cursor 分页**：`get_daily_review_timeline(cursor_date: Option<String>, cursor_id: Option<Uuid>, limit: u32)`
   * 必须按 `date DESC, created_at ASC` 排序。前端按组渲染。返回结构建议直接是一个扁平的 `Vec<DailyReviewItem>`，前端在渲染前执行 `groupBy(date)`。
5. **`check_daily_review_status(target_date: String)`** (可选)
   * 用于前端快速判断某天（如昨天）是否已经写过回顾，从而决定输入框的提示语。

## 4. 前端架构与状态管理

### 4.1 状态管理 (`src/store/dailyReviewStore.ts`)
新增一个 Zustand Store：
* `items: DailyReviewItem[]`：当前已加载的所有条目。
* `hasMore: boolean`：是否还有更早的历史记录。
* `isLoading: boolean`：防抖与加载状态指示。
* actions: `fetchNextPage()`, `addItem()`, `updateItem()`, `deleteItem()`

### 4.2 核心组件设计
* **`DailyReviewView`**: 
  * 页面主容器，处理左侧边栏的路由渲染。
  * 包含内部的 Scroll 容器，监听滚动事件（或使用 `IntersectionObserver`）触发 `fetchNextPage` 从而实现无限滚动。
* **`DailyReviewTimeline`**: 
  * 接收 `items`，内部执行按 `date` 分组逻辑。
  * 遍历分组，渲染 `DailyReviewDateDivider` (例如 "2026-08-05")，然后遍历该日期下的条目渲染 `DailyReviewItemCard`。
* **`DailyReviewItemCard`**: 
  * 展示 `content` 纯文本（可处理换行）。
  * 容器设为 `group`，在 `hover` 状态下显示右上角的编辑/删除图标。
  * 编辑状态下，原位切换为一个 textarea。
* **`DailyReviewInput`**: 
  * 固定在页面底部的输入区域。
  * **智能提示语逻辑**：根据当前系统日期，检查 `dailyReviewStore.items` 中是否存在“昨天”的记录。如果没有，`placeholder` 显示“花个几分钟回顾一下昨天吧”；如果有，则显示“回顾一下今天吧”。
  * 监听 `Enter` 发送，`Shift+Enter` 换行。

## 5. 开发路径与实施步骤 (Implementation Steps)
1. **Schema & Rust 层**：
   * 在 Repository 层添加 SQL 建表和 CRUD 方法。
   * 在 Service 层封装业务逻辑。
   * 注册 Tauri Commands。
   * 添加 Rust 单元测试和集成测试。
2. **Frontend 状态与 API 层**：
   * 在 `desktopApi.ts` 和 `mutationAdapter.ts` 中添加接口调用契约。
   * 创建 `dailyReviewStore.ts`。
3. **UI 组件开发**：
   * 开发 Timeline、ItemCard 和 Input 组件。
   * 集成到左侧 Sidebar。
4. **集成与打磨**：
   * 调试无限滚动的平滑度。
   * 验证“昨天 vs 今天”的日期推断逻辑边界条件。
   * 核对 UI 细节与动效。
