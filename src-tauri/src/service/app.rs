use crate::repository::SqliteRepository;
use super::{AreaService, GoalService, TaskService};

pub struct AppService {
    pub goal: GoalService,
    pub task: TaskService,
    pub area: AreaService,
}

impl AppService {
    pub fn new(repo: SqliteRepository) -> Self {
        Self {
            goal: GoalService::new(repo.clone()),
            task: TaskService::new(repo.clone()),
            area: AreaService::new(repo),
        }
    }

    pub fn initialize(&self) -> Result<(), String> {
        self.goal.repo.initialize().map_err(|e| e.to_string())
    }
}
