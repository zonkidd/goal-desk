use super::{AreaService, BearService, GoalService, TaskService, DailyReviewService};
use crate::repository::SqliteRepository;

pub struct AppService {
    pub goal: GoalService,
    pub task: TaskService,
    pub area: AreaService,
    pub bear: BearService,
    pub daily_review: DailyReviewService,
}

impl AppService {
    pub fn new(repo: SqliteRepository) -> Self {
        Self {
            goal: GoalService::new(repo.clone()),
            task: TaskService::new(repo.clone()),
            area: AreaService::new(repo.clone()),
            bear: BearService::new(repo.clone()),
            daily_review: DailyReviewService::new(repo),
        }
    }

    pub fn initialize(&self) -> Result<(), String> {
        Ok(())
    }
}
