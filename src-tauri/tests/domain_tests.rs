use chrono::{Local, TimeZone};
use goal_desk_tauri::domain::{
    goal_progress, parse_quick_capture, today_timeline, CalendarEvent, Milestone, Reminder,
    TimelineSource, Todo,
};
use uuid::Uuid;

#[test]
fn today_timeline_mixes_todos_reminders_and_calendar_events_by_time() {
    let goal_id = Uuid::new_v4();
    let todo_id = Uuid::new_v4();
    let reminder_id = Uuid::new_v4();
    let day = Local.with_ymd_and_hms(2026, 6, 9, 0, 0, 0).unwrap().date_naive();

    let todos = vec![Todo {
        id: todo_id,
        goal_id: Some(goal_id),
        project_id: None,
        title: "整理本周目标".to_string(),
        scheduled_at: Some(Local.with_ymd_and_hms(2026, 6, 9, 11, 30, 0).unwrap()),
        completed: false,
    }];
    let reminders = vec![Reminder {
        id: reminder_id,
        title: "复盘周目标".to_string(),
        due_at: Local.with_ymd_and_hms(2026, 6, 9, 14, 30, 0).unwrap(),
        done: false,
    }];
    let events = vec![CalendarEvent {
        id: "calendar-1".to_string(),
        title: "Design review · Work".to_string(),
        starts_at: Local.with_ymd_and_hms(2026, 6, 9, 10, 0, 0).unwrap(),
        ends_at: Local.with_ymd_and_hms(2026, 6, 9, 11, 0, 0).unwrap(),
    }];

    let timeline = today_timeline(day, &todos, &reminders, &events);

    assert_eq!(timeline.len(), 3);
    assert_eq!(timeline[0].source, TimelineSource::Calendar);
    assert_eq!(timeline[0].title, "Design review · Work");
    assert!(timeline[0].read_only);
    assert_eq!(timeline[1].source, TimelineSource::Todo);
    assert_eq!(timeline[2].source, TimelineSource::Reminder);
}

#[test]
fn goal_progress_counts_linked_todos_and_milestones() {
    let goal_id = Uuid::new_v4();
    let other_goal_id = Uuid::new_v4();

    let todos = vec![
        Todo {
            id: Uuid::new_v4(),
            goal_id: Some(goal_id),
            project_id: None,
            title: "今晚跑步 3 公里".to_string(),
            scheduled_at: None,
            completed: true,
        },
        Todo {
            id: Uuid::new_v4(),
            goal_id: Some(goal_id),
            project_id: None,
            title: "记录饮食".to_string(),
            scheduled_at: None,
            completed: false,
        },
        Todo {
            id: Uuid::new_v4(),
            goal_id: Some(other_goal_id),
            project_id: None,
            title: "无关任务".to_string(),
            scheduled_at: None,
            completed: true,
        },
    ];
    let milestones = vec![
        Milestone {
            id: Uuid::new_v4(),
            goal_id,
            title: "完成第一周训练".to_string(),
            completed: true,
        },
        Milestone {
            id: Uuid::new_v4(),
            goal_id,
            title: "体重下降 2kg".to_string(),
            completed: false,
        },
    ];

    let progress = goal_progress(goal_id, &todos, &milestones);

    assert_eq!(progress.completed_units, 2);
    assert_eq!(progress.total_units, 4);
    assert_eq!(progress.percent, 50);
}

#[test]
fn goal_without_linked_work_has_zero_progress() {
    let progress = goal_progress(Uuid::new_v4(), &[], &[]);

    assert_eq!(progress.completed_units, 0);
    assert_eq!(progress.total_units, 0);
    assert_eq!(progress.percent, 0);
}

#[test]
fn quick_capture_parses_tomorrow_afternoon_three_oclock() {
    let now = Local.with_ymd_and_hms(2026, 6, 10, 9, 0, 0).unwrap();

    let draft = parse_quick_capture("明天下午三点看熊掌记的总结笔记", now);

    assert_eq!(draft.title, "看熊掌记的总结笔记");
    assert_eq!(draft.scheduled_at, Some(Local.with_ymd_and_hms(2026, 6, 11, 15, 0, 0).unwrap()));
}

#[test]
fn quick_capture_parses_tonight_as_eight_pm() {
    let now = Local.with_ymd_and_hms(2026, 6, 10, 9, 0, 0).unwrap();

    let draft = parse_quick_capture("今晚跑步3公里", now);

    assert_eq!(draft.title, "跑步3公里");
    assert_eq!(draft.scheduled_at, Some(Local.with_ymd_and_hms(2026, 6, 10, 20, 0, 0).unwrap()));
}

#[test]
fn quick_capture_without_time_phrase_stays_in_inbox() {
    let now = Local.with_ymd_and_hms(2026, 6, 10, 9, 0, 0).unwrap();

    let draft = parse_quick_capture("整理年度目标", now);

    assert_eq!(draft.title, "整理年度目标");
    assert_eq!(draft.scheduled_at, None);
}
