use super::{AreaService, GoalService, TaskService};
use crate::repository::SqliteRepository;

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
        Ok(())
    }
}
