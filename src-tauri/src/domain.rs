use chrono::{DateTime, Local, NaiveDate};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TimelineSource {
    Todo,
    Reminder,
    Calendar,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TaskStatus {
    Todo,
    InProgress,
    Paused,
    Done,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TaskActivityAction {
    Created,
    Started,
    Paused,
    Resumed,
    Completed,
    NoteAdded,
}

pub fn task_activity_action_for_transition(
    from_status: TaskStatus,
    to_status: TaskStatus,
) -> TaskActivityAction {
    match (from_status, to_status) {
        (TaskStatus::Todo, TaskStatus::InProgress) => TaskActivityAction::Started,
        (TaskStatus::Todo, TaskStatus::Done) => TaskActivityAction::Completed,
        (TaskStatus::InProgress, TaskStatus::Paused) => TaskActivityAction::Paused,
        (TaskStatus::InProgress, TaskStatus::Done) => TaskActivityAction::Completed,
        (TaskStatus::Paused, TaskStatus::InProgress) => TaskActivityAction::Resumed,
        (TaskStatus::Paused, TaskStatus::Done) => TaskActivityAction::Completed,
        _ => TaskActivityAction::NoteAdded,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum GoalStatus {
    Active,
    Paused,
    ReadyToComplete,
    Completed,
    Archived,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Area {
    pub id: Uuid,
    pub title: String,
    pub is_system: bool,
}

pub const UNCATEGORIZED_AREA_ID: &str = "00000000-0000-0000-0000-000000000000";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AreaWithStats {
    pub id: Uuid,
    pub title: String,
    pub goal_count: usize,
    pub active_goal_count: usize,
    pub is_system: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteAreaResult {
    pub success: bool,
    pub message: String,
    pub affected_goal_count: usize,
    pub reassigned_to_area_id: Option<Uuid>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Goal {
    pub id: Uuid,
    pub area_id: Option<Uuid>,
    pub title: String,
    pub description: String,
    pub status: GoalStatus,
    pub deleted_at: Option<DateTime<Local>>,
}

impl Goal {
    /// 检查是否可以转换到目标状态
    pub fn can_transition_to(&self, target: GoalStatus) -> bool {
        use GoalStatus::*;

        // 相同状态转换（幂等）
        if self.status == target {
            return true;
        }

        match (self.status, target) {
            // ACTIVE 可以转到任何状态（除了 READY_TO_COMPLETE）
            (Active, Paused) | (Active, Completed) | (Active, Archived) => true,
            // PAUSED 只能回到 ACTIVE 或归档
            (Paused, Active) | (Paused, Archived) => true,
            // COMPLETED 只能归档
            (Completed, Archived) => true,
            // READY_TO_COMPLETE 是自动计算状态，禁止手动设置
            (_, ReadyToComplete) => false,
            // ARCHIVED 是终态
            (Archived, _) => false,
            // 其他转换禁止
            _ => false,
        }
    }

    /// 根据关联任务计算派生状态
    pub fn compute_derived_status(&self, tasks: &[DeskTask]) -> GoalStatus {
        // 已完成或归档的目标不再计算派生状态
        if self.status == GoalStatus::Archived || self.status == GoalStatus::Completed {
            return self.status;
        }

        let goal_tasks: Vec<_> = tasks
            .iter()
            .filter(|t| t.linked_goal_id == Some(self.id))
            .collect();

        // 没有关联任务时保持当前状态
        if goal_tasks.is_empty() {
            return self.status;
        }

        // 所有任务都完成时，派生为 READY_TO_COMPLETE
        let all_done = goal_tasks.iter().all(|t| t.status == TaskStatus::Done);
        if all_done {
            GoalStatus::ReadyToComplete
        } else {
            self.status
        }
    }

    /// 创建关联到此 Goal 的新任务
    pub fn create_task(&self, title: String) -> DeskTask {
        DeskTask {
            id: Uuid::new_v4(),
            title,
            content: String::new(),
            status: TaskStatus::Todo,
            planned_start_at: None,
            due_at: None,
            linked_goal_id: Some(self.id),
            linked_goal_label: Some(self.title.clone()),
            bear_note_id: None,
            system_reminder_id: None,
            show_in_timeline: false,
            activity_logs: vec![TaskActivityLog {
                id: Uuid::new_v4(),
                action: TaskActivityAction::Created,
                note: None,
                timestamp: Local::now(),
            }],
            checklists: vec![],
            deleted_at: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoalSummary {
    pub id: String,
    pub title: String,
    pub area: String,
    pub description: String,
    pub status: GoalStatus,
    pub progress: u8,
    pub task_count: usize,
    pub next_todo: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: Uuid,
    pub area_id: Option<Uuid>,
    pub goal_id: Option<Uuid>,
    pub title: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Reminder {
    pub id: Uuid,
    pub title: String,
    pub due_at: DateTime<Local>,
    pub done: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEvent {
    pub id: String,
    pub title: String,
    pub starts_at: DateTime<Local>,
    pub ends_at: DateTime<Local>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelineItem {
    pub id: String,
    pub title: String,
    pub starts_at: DateTime<Local>,
    pub source: TimelineSource,
    pub read_only: bool,
    pub completed: bool,
    pub source_label: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskActivityLog {
    pub id: Uuid,
    pub action: TaskActivityAction,
    pub note: Option<String>,
    pub timestamp: DateTime<Local>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskChecklistItem {
    pub id: Uuid,
    pub title: String,
    pub completed: bool,
    pub sort_order: i32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeskTask {
    pub id: Uuid,
    pub title: String,
    pub content: String,
    pub status: TaskStatus,
    pub planned_start_at: Option<DateTime<Local>>,
    pub due_at: Option<DateTime<Local>>,
    pub linked_goal_id: Option<Uuid>,
    pub linked_goal_label: Option<String>,
    pub bear_note_id: Option<String>,
    pub system_reminder_id: Option<String>,
    pub show_in_timeline: bool,
    pub activity_logs: Vec<TaskActivityLog>,
    #[serde(default)]
    pub checklists: Vec<TaskChecklistItem>,
    pub deleted_at: Option<DateTime<Local>>,
}

impl DeskTask {
    /// 创建新的 TODO 任务
    pub fn new_todo(title: String) -> Self {
        Self {
            id: Uuid::new_v4(),
            title,
            content: String::new(),
            status: TaskStatus::Todo,
            planned_start_at: None,
            due_at: None,
            linked_goal_id: None,
            linked_goal_label: None,
            bear_note_id: None,
            system_reminder_id: None,
            show_in_timeline: false,
            activity_logs: vec![TaskActivityLog {
                id: Uuid::new_v4(),
                action: TaskActivityAction::Created,
                note: None,
                timestamp: Local::now(),
            }],
            checklists: vec![],
            deleted_at: None,
        }
    }

    /// 检查是否可以转换到目标状态
    pub fn can_transition_to(&self, target: TaskStatus) -> bool {
        use TaskStatus::*;

        // 相同状态转换（幂等）
        if self.status == target {
            return true;
        }

        match (self.status, target) {
            // TODO 可以开始或直接完成
            (Todo, InProgress) | (Todo, Done) => true,
            // IN_PROGRESS 可以暂停或完成
            (InProgress, Paused) | (InProgress, Done) => true,
            // PAUSED 可以恢复，也可以直接完成
            (Paused, InProgress) | (Paused, Done) => true,
            // DONE 是只读终态
            (Done, _) => false,
            // 其他转换禁止
            _ => false,
        }
    }

    /// 是否应该在今日时间线显示
    pub fn should_show_in_today_timeline(&self, today: NaiveDate) -> bool {
        if let Some(planned) = self.planned_start_at {
            let start_day = planned.date_naive();
            return start_day == today;
        }
        false
    }

    /// 计算紧急度
    pub fn compute_urgency(&self, now: DateTime<Local>) -> Urgency {
        if self.status == TaskStatus::Done {
            return Urgency::None;
        }

        if let Some(due) = self.due_at {
            let hours_until_due = (due - now).num_hours();
            if hours_until_due < 0 {
                return Urgency::Overdue;
            } else if hours_until_due < 24 {
                return Urgency::High;
            } else if hours_until_due < 72 {
                return Urgency::Medium;
            }
        }

        Urgency::Low
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Urgency {
    Overdue,
    High,   // < 24h
    Medium, // < 72h
    Low,
    None,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct QuickCaptureDraft {
    pub title: String,
    pub planned_start_at: Option<DateTime<Local>>,
    pub due_at: Option<DateTime<Local>>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct WorkspaceSnapshot {
    pub areas: Vec<Area>,
    pub projects: Vec<Project>,
    pub goals: Vec<Goal>,
    pub reminders: Vec<Reminder>,
}

impl WorkspaceSnapshot {
    /// 查找或创建 Area
    pub fn find_or_create_area(&mut self, title: &str) -> Uuid {
        let trimmed = title.trim();

        // 查找已存在的
        if let Some(area) = self.areas.iter().find(|a| a.title == trimmed) {
            return area.id;
        }

        // 创建新的
        let new_area = Area {
            id: Uuid::new_v4(),
            title: trimmed.to_string(),
            is_system: false,
        };
        let id = new_area.id;
        self.areas.push(new_area);
        id
    }

    /// 根据 ID 查找 Area 的标题
    pub fn area_title(&self, area_id: Uuid) -> Option<String> {
        self.areas
            .iter()
            .find(|a| a.id == area_id)
            .map(|a| a.title.clone())
    }

    /// 根据 ID 查找 Goal
    pub fn find_goal(&self, goal_id: Uuid) -> Option<&Goal> {
        self.goals.iter().find(|g| g.id == goal_id)
    }

    /// 根据 ID 可变查找 Goal
    pub fn find_goal_mut(&mut self, goal_id: Uuid) -> Option<&mut Goal> {
        self.goals.iter_mut().find(|g| g.id == goal_id)
    }
}

pub fn today_timeline(
    day: NaiveDate,
    reminders: &[Reminder],
    events: &[CalendarEvent],
) -> Vec<TimelineItem> {
    let mut items = Vec::new();

    for reminder in reminders {
        if reminder.due_at.date_naive() == day {
            items.push(TimelineItem {
                id: reminder.id.to_string(),
                title: reminder.title.clone(),
                starts_at: reminder.due_at,
                source: TimelineSource::Reminder,
                read_only: true,
                completed: reminder.done,
                source_label: None,
            });
        }
    }

    for event in events {
        if event.starts_at.date_naive() == day {
            items.push(TimelineItem {
                id: event.id.clone(),
                title: event.title.clone(),
                starts_at: event.starts_at,
                source: TimelineSource::Calendar,
                read_only: true,
                completed: false,
                source_label: None,
            });
        }
    }

    items.sort_by_key(|item| item.starts_at);
    items
}

pub fn parse_quick_capture(input: &str, now: DateTime<Local>) -> QuickCaptureDraft {
    let parsed = crate::time_parser::parse_time_expression(input, now);
    QuickCaptureDraft {
        title: parsed.title,
        planned_start_at: parsed.planned_start_at,
        due_at: parsed.due_at,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{TimeZone, Timelike};

    #[test]
    fn test_goal_state_transitions() {
        let mut goal = Goal {
            id: Uuid::new_v4(),
            area_id: None,
            title: "Test Goal".to_string(),
            description: String::new(),
            status: GoalStatus::Active,
            deleted_at: None,
        };

        // ACTIVE 可以转到 PAUSED, COMPLETED, ARCHIVED
        assert!(goal.can_transition_to(GoalStatus::Paused));
        assert!(goal.can_transition_to(GoalStatus::Completed));
        assert!(goal.can_transition_to(GoalStatus::Archived));

        // 但不能手动设置 READY_TO_COMPLETE
        assert!(!goal.can_transition_to(GoalStatus::ReadyToComplete));

        // PAUSED 只能回到 ACTIVE 或归档
        goal.status = GoalStatus::Paused;
        assert!(goal.can_transition_to(GoalStatus::Active));
        assert!(goal.can_transition_to(GoalStatus::Archived));
        assert!(!goal.can_transition_to(GoalStatus::Completed));

        // COMPLETED 只能归档
        goal.status = GoalStatus::Completed;
        assert!(goal.can_transition_to(GoalStatus::Archived));
        assert!(!goal.can_transition_to(GoalStatus::Active));

        // ARCHIVED 是终态
        goal.status = GoalStatus::Archived;
        assert!(!goal.can_transition_to(GoalStatus::Active));
        assert!(!goal.can_transition_to(GoalStatus::Completed));

        // 相同状态转换（幂等）
        assert!(goal.can_transition_to(GoalStatus::Archived));
    }

    #[test]
    fn test_goal_derived_status() {
        let goal = Goal {
            id: Uuid::new_v4(),
            area_id: None,
            title: "Test".to_string(),
            description: String::new(),
            status: GoalStatus::Active,
            deleted_at: None,
        };

        // 无任务时保持原状态
        assert_eq!(goal.compute_derived_status(&[]), GoalStatus::Active);

        // 有未完成任务
        let incomplete_tasks = vec![
            DeskTask {
                id: Uuid::new_v4(),
                title: "Task 1".to_string(),
                content: String::new(),
                linked_goal_id: Some(goal.id),
                linked_goal_label: Some(goal.title.clone()),
                status: TaskStatus::Done,
                planned_start_at: None,
                due_at: None,
                bear_note_id: None,
                system_reminder_id: None,
                show_in_timeline: false,
                activity_logs: vec![],
                checklists: vec![],
                deleted_at: None,
            },
            DeskTask {
                id: Uuid::new_v4(),
                title: "Task 2".to_string(),
                content: String::new(),
                linked_goal_id: Some(goal.id),
                linked_goal_label: Some(goal.title.clone()),
                status: TaskStatus::InProgress,
                planned_start_at: None,
                due_at: None,
                bear_note_id: None,
                system_reminder_id: None,
                show_in_timeline: false,
                activity_logs: vec![],
                checklists: vec![],
                deleted_at: None,
            },
        ];

        assert_eq!(
            goal.compute_derived_status(&incomplete_tasks),
            GoalStatus::Active
        );

        // 全部完成 -> READY_TO_COMPLETE
        let complete_tasks = vec![DeskTask {
            id: Uuid::new_v4(),
            title: "Task 1".to_string(),
            content: String::new(),
            linked_goal_id: Some(goal.id),
            linked_goal_label: Some(goal.title.clone()),
            status: TaskStatus::Done,
            planned_start_at: None,
            due_at: None,
            bear_note_id: None,
            system_reminder_id: None,
            show_in_timeline: false,
            activity_logs: vec![],
            checklists: vec![],
            deleted_at: None,
        }];

        assert_eq!(
            goal.compute_derived_status(&complete_tasks),
            GoalStatus::ReadyToComplete
        );
    }

    #[test]
    fn test_task_state_transitions() {
        let mut task = DeskTask::new_todo("Test".to_string());

        // TODO 可以开始或完成
        assert!(task.can_transition_to(TaskStatus::InProgress));
        assert!(task.can_transition_to(TaskStatus::Done));
        assert!(!task.can_transition_to(TaskStatus::Paused));

        // IN_PROGRESS 可以暂停或完成
        task.status = TaskStatus::InProgress;
        assert!(task.can_transition_to(TaskStatus::Paused));
        assert!(task.can_transition_to(TaskStatus::Done));
        assert!(!task.can_transition_to(TaskStatus::Todo));

        // PAUSED 可以恢复或完成
        task.status = TaskStatus::Paused;
        assert!(task.can_transition_to(TaskStatus::InProgress));
        assert!(task.can_transition_to(TaskStatus::Done));
        assert!(!task.can_transition_to(TaskStatus::Todo));

        // DONE 是只读终态
        task.status = TaskStatus::Done;
        assert!(!task.can_transition_to(TaskStatus::Todo));
        assert!(!task.can_transition_to(TaskStatus::InProgress));

        // 幂等转换
        assert!(task.can_transition_to(TaskStatus::Done));
    }

    #[test]
    fn test_task_urgency() {
        let now = Local::now();

        // 已完成任务无紧急度
        let mut task = DeskTask::new_todo("Test".to_string());
        task.status = TaskStatus::Done;
        task.due_at = Some(now + chrono::Duration::hours(1));
        assert_eq!(task.compute_urgency(now), Urgency::None);

        // 过期
        task.status = TaskStatus::Todo;
        task.due_at = Some(now - chrono::Duration::hours(1));
        assert_eq!(task.compute_urgency(now), Urgency::Overdue);

        // 高紧急（< 24h）
        task.due_at = Some(now + chrono::Duration::hours(12));
        assert_eq!(task.compute_urgency(now), Urgency::High);

        // 中等紧急（< 72h）
        task.due_at = Some(now + chrono::Duration::hours(48));
        assert_eq!(task.compute_urgency(now), Urgency::Medium);

        // 低紧急
        task.due_at = Some(now + chrono::Duration::hours(100));
        assert_eq!(task.compute_urgency(now), Urgency::Low);

        // 无截止日期
        task.due_at = None;
        assert_eq!(task.compute_urgency(now), Urgency::Low);
    }

    #[test]
    fn test_task_timeline_display() {
        let today = Local::now().date_naive();

        let mut task = DeskTask::new_todo("Test".to_string());

        // show_in_timeline = false (but planned_start_at matches today)
        task.planned_start_at = Some(Local::now().with_hour(9).unwrap());
        assert!(task.should_show_in_today_timeline(today));

        // show_in_timeline = true, planned_start_at 匹配
        task.show_in_timeline = true;
        assert!(task.should_show_in_today_timeline(today));

        // planned_start_at 不匹配
        task.planned_start_at =
            Some(Local::now().with_hour(9).unwrap() + chrono::Duration::days(1));
        assert!(!task.should_show_in_today_timeline(today));

        // planned_start_at does not span through due_at; Due Time is deadline metadata
        task.planned_start_at =
            Some(Local::now().with_hour(9).unwrap() - chrono::Duration::days(1));
        task.due_at = Some(Local::now().with_hour(17).unwrap() + chrono::Duration::days(1));
        assert!(!task.should_show_in_today_timeline(today));

        // due_at alone drives deadline visibility, not Today Timeline placement
        task.planned_start_at = None;
        task.due_at = Some(Local::now().with_hour(17).unwrap());
        assert!(!task.should_show_in_today_timeline(today));
    }

    #[test]
    fn task_timeline_display_does_not_span_until_due_date() {
        let today = NaiveDate::from_ymd_opt(2026, 6, 14).unwrap();
        let mut task = DeskTask::new_todo("Test".to_string());
        task.show_in_timeline = true;
        task.planned_start_at = Some(Local.with_ymd_and_hms(2026, 6, 13, 9, 0, 0).unwrap());
        task.due_at = Some(Local.with_ymd_and_hms(2026, 6, 15, 18, 0, 0).unwrap());

        assert!(!task.should_show_in_today_timeline(today));
    }

    #[test]
    fn test_workspace_find_or_create_area() {
        let mut snapshot = WorkspaceSnapshot::default();

        // 创建新 area
        let id1 = snapshot.find_or_create_area("Work");
        assert_eq!(snapshot.areas.len(), 1);
        assert_eq!(snapshot.areas[0].title, "Work");

        // 查找已存在的 area
        let id2 = snapshot.find_or_create_area("Work");
        assert_eq!(id1, id2);
        assert_eq!(snapshot.areas.len(), 1);

        // 创建另一个 area
        let id3 = snapshot.find_or_create_area("Personal");
        assert_ne!(id1, id3);
        assert_eq!(snapshot.areas.len(), 2);

        // trim 处理
        let id4 = snapshot.find_or_create_area("  Work  ");
        assert_eq!(id1, id4);
        assert_eq!(snapshot.areas.len(), 2);
    }

    #[test]
    fn test_goal_create_task() {
        let goal = Goal {
            id: Uuid::new_v4(),
            area_id: None,
            title: "Test Goal".to_string(),
            description: String::new(),
            status: GoalStatus::Active,
            deleted_at: None,
        };

        let task = goal.create_task("New Task".to_string());

        assert_eq!(task.title, "New Task");
        assert_eq!(task.status, TaskStatus::Todo);
        assert_eq!(task.linked_goal_id, Some(goal.id));
        assert_eq!(task.linked_goal_label, Some(goal.title.clone()));
        assert_eq!(task.activity_logs.len(), 1);
        assert_eq!(task.activity_logs[0].action, TaskActivityAction::Created);
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyReviewBlock {
    pub id: String,
    pub content: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyReviewItem {
    pub id: Uuid,
    pub date: String,
    pub blocks: Vec<DailyReviewBlock>,
    pub created_at: DateTime<Local>,
    pub updated_at: DateTime<Local>,
}
