use crate::domain::{Goal, GoalStatus, DeskTask, WorkspaceSnapshot};
use crate::repository::SqliteRepository;
use uuid::Uuid;

/// WorkspaceSession: 封装 WorkspaceSnapshot 的生命周期管理
///
/// 职责：
/// - 自动加载和保存 snapshot
/// - 提供高级别的领域操作
/// - 追踪脏状态，只在必要时保存
///
/// 使用方式：
/// ```rust
/// let repo = SqliteRepository::new(path);
/// let mut session = WorkspaceSession::load(&repo)?;
/// let goal = session.create_goal(GoalSpec { title, area })?;
/// session.commit()?;
/// ```
pub struct WorkspaceSession<'a> {
    repo: &'a SqliteRepository,
    snapshot: WorkspaceSnapshot,
    dirty: bool,
}

impl<'a> WorkspaceSession<'a> {
    /// 加载 workspace session
    pub fn load(repo: &'a SqliteRepository) -> Result<Self, String> {
        let snapshot = repo.load_workspace().map_err(|e| e.to_string())?;
        Ok(Self {
            repo,
            snapshot,
            dirty: false,
        })
    }

    /// 确保 Area 存在（如果不存在则创建）
    pub fn ensure_area(&mut self, area_title: &str) -> Uuid {
        let area_id = self.snapshot.find_or_create_area(area_title);
        self.dirty = true;
        area_id
    }

    /// 创建 Goal
    pub fn create_goal(&mut self, title: String, area: String, description: String, status: GoalStatus) -> Result<Goal, String> {
        let area_id = self.ensure_area(&area);

        let goal = Goal {
            id: Uuid::new_v4(),
            area_id: Some(area_id),
            title,
            description,
            status,
        };

        self.snapshot.goals.push(goal.clone());
        self.dirty = true;
        Ok(goal)
    }

    /// 更新 Goal
    pub fn update_goal(&mut self, goal: Goal) -> Result<(), String> {
        let index = self.snapshot.goals.iter().position(|g| g.id == goal.id)
            .ok_or_else(|| format!("Goal not found: {}", goal.id))?;

        self.snapshot.goals[index] = goal;
        self.dirty = true;
        Ok(())
    }

    /// 创建 Task（关联到 Goal）
    pub fn create_task_for_goal(&mut self, goal_id: Uuid, title: String) -> Result<DeskTask, String> {
        let goal = self.snapshot.goals.iter()
            .find(|g| g.id == goal_id)
            .ok_or_else(|| format!("Goal not found: {}", goal_id))?;

        let task = goal.create_task(title);
        // Note: tasks 不在 snapshot 中，由 repository 单独管理
        Ok(task)
    }

    /// 提交变更（如果有脏数据）
    pub fn commit(self) -> Result<(), String> {
        if self.dirty {
            self.repo.save_workspace(&self.snapshot).map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    /// 获取 snapshot 的只读引用
    pub fn snapshot(&self) -> &WorkspaceSnapshot {
        &self.snapshot
    }
}
