use goal_desk_tauri::bear::build_bear_selected_note_url;
use std::collections::HashMap;
use url::Url;

#[test]
fn bear_open_note_url_for_selected_note_includes_token_and_callbacks() {
    let url = build_bear_selected_note_url("token 123", "request-1").unwrap();
    let parsed = Url::parse(&url).unwrap();

    assert_eq!(parsed.scheme(), "bear");
    assert_eq!(parsed.host_str(), Some("x-callback-url"));
    assert_eq!(parsed.path(), "/open-note");

    let params = parsed
        .query_pairs()
        .map(|(key, value)| (key.into_owned(), value.into_owned()))
        .collect::<HashMap<_, _>>();

    assert_eq!(params.get("selected").map(String::as_str), Some("yes"));
    assert_eq!(params.get("token").map(String::as_str), Some("token 123"));
    assert_eq!(params.get("open_note").map(String::as_str), Some("no"));
    assert_eq!(params.get("show_window").map(String::as_str), Some("no"));
    assert_eq!(
        params.get("x-success").map(String::as_str),
        Some("kairos://bear-note-callback?request_id=request-1")
    );
    assert_eq!(
        params.get("x-error").map(String::as_str),
        Some("kairos://bear-note-error?request_id=request-1")
    );
}
