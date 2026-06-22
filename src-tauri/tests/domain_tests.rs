use chrono::{Local, TimeZone};
use goal_desk_tauri::domain::{
    parse_quick_capture, today_timeline, CalendarEvent, Reminder,
    TimelineSource,
};
use uuid::Uuid;

#[test]
fn today_timeline_mixes_reminders_and_calendar_events_by_time() {
    let reminder_id = Uuid::new_v4();
    let day = Local.with_ymd_and_hms(2026, 6, 9, 0, 0, 0).unwrap().date_naive();

    let reminders = vec![Reminder {
        id: reminder_id,
        title: "Weekly goal review".to_string(),
        due_at: Local.with_ymd_and_hms(2026, 6, 9, 14, 30, 0).unwrap(),
        done: false,
    }];
    let events = vec![CalendarEvent {
        id: "calendar-1".to_string(),
        title: "Design review · Work".to_string(),
        starts_at: Local.with_ymd_and_hms(2026, 6, 9, 10, 0, 0).unwrap(),
        ends_at: Local.with_ymd_and_hms(2026, 6, 9, 11, 0, 0).unwrap(),
    }];

    let timeline = today_timeline(day, &reminders, &events);

    assert_eq!(timeline.len(), 2);
    assert_eq!(timeline[0].source, TimelineSource::Calendar);
    assert_eq!(timeline[0].title, "Design review · Work");
    assert!(timeline[0].read_only);
    assert_eq!(timeline[1].source, TimelineSource::Reminder);
}

#[test]
fn quick_capture_parses_tomorrow_afternoon_three_oclock() {
    let now = Local.with_ymd_and_hms(2026, 6, 10, 9, 0, 0).unwrap();

    let draft = parse_quick_capture("明天下午三点 review notes", now);
    assert_eq!(draft.title, "review notes");
    assert!(draft.planned_start_at.is_some());
}

#[test]
fn quick_capture_tonight_3am_parses_to_3am_not_3pm() {
    let now = Local.with_ymd_and_hms(2026, 6, 10, 9, 0, 0).unwrap();

    let draft = parse_quick_capture("今晚3点开会", now);
    assert_eq!(draft.title, "开会");
    let time = draft.planned_start_at.unwrap();
    // Should be 3:00 AM, not 15:00 (3 PM)
    use chrono::Timelike;
    assert_eq!(time.hour(), 3, "今晚3点 should parse to 3:00 AM");
}
