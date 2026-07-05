use crate::domain::{Area, DeleteAreaResult, GoalStatus, UNCATEGORIZED_AREA_ID};
use crate::repository::{AreaRepository, GoalRepository, SqliteRepository};
use uuid::Uuid;

pub struct AreaService {
    pub(crate) repo: SqliteRepository,
}

impl AreaService {
    pub fn new(repo: SqliteRepository) -> Self {
        Self { repo }
    }

    pub fn create_area(&self, title: &str) -> Result<Area, String> {
        let trimmed = title.trim();
        if trimmed.is_empty() {
            return Err("Area title cannot be empty".to_string());
        }

        let existing = AreaRepository::list(&self.repo).map_err(|e| e.to_string())?;
        if existing
            .iter()
            .any(|a| a.title.to_lowercase() == trimmed.to_lowercase())
        {
            return Err(format!("Area '{}' already exists", trimmed));
        }

        let area = Area {
            id: Uuid::new_v4(),
            title: trimmed.to_string(),
            is_system: false,
        };
        AreaRepository::create(&self.repo, &area).map_err(|e| e.to_string())?;
        Ok(area)
    }

    pub fn rename_area(&self, area_id: &str, new_title: &str) -> Result<Area, String> {
        let trimmed = new_title.trim();
        if trimmed.is_empty() {
            return Err("Area title cannot be empty".to_string());
        }

        let uuid = Uuid::parse_str(area_id).map_err(|e| e.to_string())?;

        let existing = AreaRepository::list(&self.repo).map_err(|e| e.to_string())?;
        if existing
            .iter()
            .any(|a| a.id != uuid && a.title.to_lowercase() == trimmed.to_lowercase())
        {
            return Err(format!("Area '{}' already exists", trimmed));
        }

        let mut area = AreaRepository::find(&self.repo, uuid)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Area not found: {area_id}"))?;

        area.title = trimmed.to_string();
        AreaRepository::update(&self.repo, &area).map_err(|e| e.to_string())?;
        Ok(area)
    }

    pub fn delete_area(&self, area_id: &str, force: bool) -> Result<DeleteAreaResult, String> {
        let uuid = Uuid::parse_str(area_id).map_err(|e| e.to_string())?;

        let area = AreaRepository::find(&self.repo, uuid)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Area not found: {area_id}"))?;

        if area.is_system {
            return Ok(DeleteAreaResult {
                success: false,
                message: "系统领域无法删除".to_string(),
                affected_goal_count: 0,
                reassigned_to_area_id: None,
            });
        }

        let affected_goals =
            GoalRepository::list_by_area(&self.repo, uuid).map_err(|e| e.to_string())?;
        let affected_goal_count = affected_goals.len();

        if affected_goal_count > 0 && !force {
            return Ok(DeleteAreaResult {
                success: false,
                message: format!(
                    "该领域有 {} 个关联目标，请先处理或使用强制删除",
                    affected_goal_count
                ),
                affected_goal_count,
                reassigned_to_area_id: None,
            });
        }

        let uncategorized_id = Uuid::parse_str(UNCATEGORIZED_AREA_ID).unwrap();
        if force && affected_goal_count > 0 {
            for mut goal in affected_goals {
                goal.area_id = Some(uncategorized_id);
                GoalRepository::update(&self.repo, &goal).map_err(|e| e.to_string())?;
            }
        }

        AreaRepository::delete(&self.repo, uuid).map_err(|e| e.to_string())?;

        Ok(DeleteAreaResult {
            success: true,
            message: "领域已删除".to_string(),
            affected_goal_count,
            reassigned_to_area_id: if affected_goal_count > 0 {
                Some(uncategorized_id)
            } else {
                None
            },
        })
    }

    pub fn list_areas_with_stats(&self) -> Result<Vec<crate::domain::AreaWithStats>, String> {
        let areas = AreaRepository::list(&self.repo).map_err(|e| e.to_string())?;
        let goals = GoalRepository::list(&self.repo).map_err(|e| e.to_string())?;

        let mut result: Vec<crate::domain::AreaWithStats> = areas
            .iter()
            .map(|area| {
                let goals_in_area: Vec<&crate::domain::Goal> = goals
                    .iter()
                    .filter(|g| g.area_id == Some(area.id))
                    .collect();
                let goal_count = goals_in_area.len();
                let active_goal_count = goals_in_area
                    .iter()
                    .filter(|g| {
                        g.status == GoalStatus::Active || g.status == GoalStatus::ReadyToComplete
                    })
                    .count();
                crate::domain::AreaWithStats {
                    id: area.id,
                    title: area.title.clone(),
                    goal_count,
                    active_goal_count,
                    is_system: area.is_system,
                }
            })
            .collect();

        result.sort_by(|a, b| a.title.cmp(&b.title));
        Ok(result)
    }
}

pub fn find_or_create_area(repo: &SqliteRepository, area_title: &str) -> Result<Uuid, String> {
    repo.initialize().map_err(|e| e.to_string())?;
    let areas = AreaRepository::list(repo).map_err(|e| e.to_string())?;
    if let Some(existing) = areas
        .iter()
        .find(|a| a.title.to_lowercase() == area_title.to_lowercase())
    {
        return Ok(existing.id);
    }
    let area = Area {
        id: Uuid::new_v4(),
        title: area_title.to_string(),
        is_system: false,
    };
    AreaRepository::create(repo, &area).map_err(|e| e.to_string())?;
    Ok(area.id)
}
