use crate::domain::{Area, DeskTask, Goal, GoalStatus, GoalSummary, TaskStatus};
use crate::repository::{AreaRepository, GoalRepository, SqliteRepository, TaskRepository};
use std::collections::HashMap;
use uuid::Uuid;

pub fn build_goal_summary(
    goal: &Goal,
    area_title: &str,
    goal_tasks: &[&DeskTask],
    derived_status: GoalStatus,
) -> GoalSummary {
    let task_count = goal_tasks.len();
    let done_count = goal_tasks
        .iter()
        .filter(|t| t.status == TaskStatus::Done)
        .count();
    let progress = if task_count == 0 {
        0
    } else {
        ((done_count as f64 / task_count as f64) * 100.0).round() as u8
    };
    let next_todo = goal_tasks
        .iter()
        .find(|t| t.status != TaskStatus::Done)
        .map(|t| t.title.clone())
        .unwrap_or_default();

    GoalSummary {
        id: goal.id.to_string(),
        title: goal.title.clone(),
        area: area_title.to_string(),
        description: goal.description.clone(),
        status: derived_status,
        progress,
        task_count,
        next_todo,
    }
}

pub struct GoalSummaryAssembler<'a> {
    area_titles: HashMap<Uuid, String>,
    tasks_by_goal: HashMap<Uuid, Vec<&'a DeskTask>>,
    all_tasks: &'a [DeskTask],
}

impl<'a> GoalSummaryAssembler<'a> {
    pub fn new(areas: &[Area], tasks: &'a [DeskTask]) -> Self {
        let area_titles = areas
            .iter()
            .map(|area| (area.id, area.title.clone()))
            .collect();
        let mut tasks_by_goal: HashMap<Uuid, Vec<&DeskTask>> = HashMap::new();
        for task in tasks {
            if let Some(goal_id) = task.linked_goal_id {
                tasks_by_goal.entry(goal_id).or_default().push(task);
            }
        }

        Self {
            area_titles,
            tasks_by_goal,
            all_tasks: tasks,
        }
    }

    pub fn summarize(&self, goal: &Goal) -> GoalSummary {
        let area_title = goal
            .area_id
            .and_then(|area_id| self.area_titles.get(&area_id).cloned())
            .unwrap_or_else(|| "Unsorted".to_string());
        let goal_tasks = self
            .tasks_by_goal
            .get(&goal.id)
            .map(|tasks| tasks.as_slice())
            .unwrap_or(&[]);
        let derived_status = goal.compute_derived_status(self.all_tasks);

        build_goal_summary(goal, &area_title, goal_tasks, derived_status)
    }
}

pub struct GoalService {
    pub(crate) repo: SqliteRepository,
}

impl GoalService {
    pub fn new(repo: SqliteRepository) -> Self {
        Self { repo }
    }

    pub fn create_goal(
        &self,
        title: &str,
        area: &str,
        description: &str,
        status: GoalStatus,
    ) -> Result<Goal, String> {
        if status == GoalStatus::ReadyToComplete {
            return Err("READY_TO_COMPLETE cannot be set manually".to_string());
        }

        let trimmed_title = title.trim();
        if trimmed_title.is_empty() {
            return Err("Goal title cannot be empty".to_string());
        }

        let trimmed_area = area.trim();
        let area_title = if trimmed_area.is_empty() {
            "未分类"
        } else {
            trimmed_area
        };

        let area_id = super::area::find_or_create_area(&self.repo, area_title)?;

        let goal = Goal {
            id: Uuid::new_v4(),
            area_id: Some(area_id),
            title: trimmed_title.to_string(),
            description: description.to_string(),
            status,
            deleted_at: None,
        };

        GoalRepository::create(&self.repo, &goal).map_err(|e| e.to_string())?;
        Ok(goal)
    }

    pub fn update_goal_fields(
        &self,
        goal_id: &str,
        title: &str,
        area: &str,
        description: &str,
    ) -> Result<Goal, String> {
        let trimmed_title = title.trim();
        if trimmed_title.is_empty() {
            return Err("Goal title cannot be empty".to_string());
        }

        let trimmed_area = area.trim();
        let area_title = if trimmed_area.is_empty() {
            "未分类"
        } else {
            trimmed_area
        };

        let goal_uuid = Uuid::parse_str(goal_id).map_err(|e| e.to_string())?;
        let area_id = super::area::find_or_create_area(&self.repo, area_title)?;

        let mut goal = GoalRepository::find(&self.repo, goal_uuid)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Goal not found: {goal_id}"))?;

        let previous_title = goal.title.clone();
        goal.title = trimmed_title.to_string();
        goal.area_id = Some(area_id);
        goal.description = description.to_string();

        GoalRepository::update(&self.repo, &goal).map_err(|e| e.to_string())?;
        if previous_title != goal.title {
            let tasks =
                TaskRepository::list_by_goal(&self.repo, goal.id).map_err(|e| e.to_string())?;
            for mut task in tasks {
                task.linked_goal_label = Some(goal.title.clone());
                TaskRepository::update(&self.repo, &task).map_err(|e| e.to_string())?;
            }
        }
        Ok(goal)
    }

    pub fn update_goal_status(&self, goal_id: &str, status: GoalStatus) -> Result<Goal, String> {
        let goal_uuid = Uuid::parse_str(goal_id).map_err(|e| e.to_string())?;

        let mut goal = GoalRepository::find(&self.repo, goal_uuid)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Goal not found: {goal_id}"))?;

        if !goal.can_transition_to(status) {
            return Err(format!(
                "Invalid status transition from {:?} to {:?}",
                goal.status, status
            ));
        }

        goal.status = status;
        GoalRepository::update(&self.repo, &goal).map_err(|e| e.to_string())?;
        Ok(goal)
    }

    pub fn goal_summaries(&self) -> Result<Vec<GoalSummary>, String> {
        let goals = GoalRepository::list(&self.repo).map_err(|e| e.to_string())?;
        let areas = AreaRepository::list(&self.repo).map_err(|e| e.to_string())?;
        let tasks = TaskRepository::list(&self.repo).map_err(|e| e.to_string())?;
        let assembler = GoalSummaryAssembler::new(&areas, &tasks);

        Ok(goals.iter().map(|goal| assembler.summarize(goal)).collect())
    }

    pub fn get_goal_summary_by_id(&self, goal_id: &str) -> Result<GoalSummary, String> {
        let goal_uuid = Uuid::parse_str(goal_id).map_err(|e| e.to_string())?;

        let goal = GoalRepository::find(&self.repo, goal_uuid)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Goal not found: {goal_id}"))?;

        let areas = AreaRepository::list(&self.repo).map_err(|e| e.to_string())?;
        let all_tasks = TaskRepository::list(&self.repo).map_err(|e| e.to_string())?;
        let assembler = GoalSummaryAssembler::new(&areas, &all_tasks);
        Ok(assembler.summarize(&goal))
    }

    pub fn soft_delete_goal(&self, goal_id: &str) -> Result<(), String> {
        let goal_uuid = Uuid::parse_str(goal_id).map_err(|e| e.to_string())?;
        GoalRepository::soft_delete(&self.repo, goal_uuid).map_err(|e| e.to_string())
    }

    pub fn restore_goal(&self, goal_id: &str) -> Result<GoalSummary, String> {
        let goal_uuid = Uuid::parse_str(goal_id).map_err(|e| e.to_string())?;
        GoalRepository::restore(&self.repo, goal_uuid).map_err(|e| e.to_string())?;
        self.get_goal_summary_by_id(goal_id)
    }

    pub fn list_deleted_goals(&self) -> Result<Vec<GoalSummary>, String> {
        let goals = GoalRepository::list_deleted(&self.repo).map_err(|e| e.to_string())?;
        let areas = AreaRepository::list(&self.repo).map_err(|e| e.to_string())?;
        let tasks = TaskRepository::list(&self.repo).map_err(|e| e.to_string())?;
        let assembler = GoalSummaryAssembler::new(&areas, &tasks);

        Ok(goals.iter().map(|goal| assembler.summarize(goal)).collect())
    }
}
