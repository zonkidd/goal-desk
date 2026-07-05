use goal_desk_tauri::domain::{
    task_activity_action_for_transition, DeskTask, TaskActivityAction, TaskStatus,
};
use serde::Deserialize;
use std::collections::HashMap;

#[derive(Debug, Deserialize)]
struct TransitionState {
    #[serde(rename = "allowedTargets")]
    allowed_targets: Vec<TaskStatus>,
    #[serde(rename = "activityActions")]
    activity_actions: HashMap<TaskStatus, TaskActivityAction>,
}

#[derive(Debug, Deserialize)]
struct TodoTransitionContract {
    #[serde(rename = "TODO")]
    todo: TransitionState,
    #[serde(rename = "IN_PROGRESS")]
    in_progress: TransitionState,
    #[serde(rename = "PAUSED")]
    paused: TransitionState,
    #[serde(rename = "DONE")]
    done: TransitionState,
}

impl TodoTransitionContract {
    fn entries(&self) -> [(TaskStatus, &TransitionState); 4] {
        [
            (TaskStatus::Todo, &self.todo),
            (TaskStatus::InProgress, &self.in_progress),
            (TaskStatus::Paused, &self.paused),
            (TaskStatus::Done, &self.done),
        ]
    }
}

#[test]
fn rust_todo_state_machine_matches_shared_transition_contract() {
    let contract: TodoTransitionContract =
        serde_json::from_str(include_str!("../../src/lib/todoTransition.contract.json")).unwrap();
    let all_statuses = [
        TaskStatus::Todo,
        TaskStatus::InProgress,
        TaskStatus::Paused,
        TaskStatus::Done,
    ];

    for (source, state) in contract.entries() {
        let mut task = DeskTask::new_todo("Contract task".to_string());
        task.status = source;

        for target in all_statuses {
            let expected = source == target || state.allowed_targets.contains(&target);
            assert_eq!(
                task.can_transition_to(target),
                expected,
                "transition {source:?} -> {target:?} should match shared contract",
            );
        }

        for target in &state.allowed_targets {
            let expected_action = state.activity_actions.get(target).unwrap_or_else(|| {
                panic!("transition {source:?} -> {target:?} should declare an activity action")
            });
            assert_eq!(
                task_activity_action_for_transition(source, *target),
                *expected_action,
                "activity action for transition {source:?} -> {target:?} should match shared contract",
            );
        }

        assert_eq!(
            state.activity_actions.len(),
            state.allowed_targets.len(),
            "activity action map for {source:?} should only contain allowed transition targets",
        );
    }
}
