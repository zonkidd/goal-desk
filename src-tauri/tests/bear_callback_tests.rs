use goal_desk_tauri::bear::{BearCallbackRequestKind, PendingBearRequests};
use uuid::Uuid;

#[test]
fn bear_callback_accepts_only_pending_success_request() {
    let task_id = Uuid::new_v4();
    let mut pending = PendingBearRequests::default();
    let request_id = pending.insert(task_id, BearCallbackRequestKind::LinkSelected);

    let callback_url = format!(
        "kairos://bear-note-callback?request_id={request_id}&identifier=note-123&title=Launch%20Plan&note=Hello%20Bear&tags=%5B%22work%22%5D&is_trashed=no&modificationDate=2026-07-07T09%3A00%3A00%2B08%3A00&creationDate=2026-07-06T09%3A00%3A00%2B08%3A00"
    );

    let accepted = pending.consume_success_url(&callback_url).unwrap();

    assert_eq!(accepted.request.task_id, task_id);
    assert_eq!(accepted.request.kind, BearCallbackRequestKind::LinkSelected);
    assert_eq!(accepted.note.identifier, "note-123");
    assert_eq!(accepted.note.title, "Launch Plan");
    assert_eq!(accepted.note.note, "Hello Bear");
    assert_eq!(accepted.note.tags, vec!["work"]);
    assert!(!accepted.note.is_trashed);

    assert!(pending.consume_success_url(&callback_url).is_err());
    assert!(pending
        .consume_success_url("kairos://bear-note-callback?identifier=note-123")
        .is_err());
}
