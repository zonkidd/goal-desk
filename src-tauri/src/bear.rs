use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Instant;
use url::Url;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BearCallbackRequestKind {
    LinkSelected,
    RefreshPreview,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PendingBearRequest {
    pub task_id: Uuid,
    pub kind: BearCallbackRequestKind,
}

#[derive(Debug)]
struct PendingBearRequestRecord {
    request: PendingBearRequest,
    _created_at: Instant,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BearCallbackNote {
    pub identifier: String,
    pub title: String,
    pub note: String,
    pub tags: Vec<String>,
    pub is_trashed: bool,
    pub modification_date: Option<DateTime<Local>>,
    pub creation_date: Option<DateTime<Local>>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BearNotePreview {
    pub task_id: Uuid,
    pub bear_note_id: String,
    pub title: String,
    pub note: String,
    pub tags: Vec<String>,
    pub is_trashed: bool,
    pub modification_date: Option<DateTime<Local>>,
    pub creation_date: Option<DateTime<Local>>,
    pub fetched_at: DateTime<Local>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AcceptedBearCallback {
    pub request: PendingBearRequest,
    pub note: BearCallbackNote,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AcceptedBearErrorCallback {
    pub request: PendingBearRequest,
    pub message: String,
}

pub fn build_bear_selected_note_url(token: &str, request_id: &str) -> Result<String, String> {
    let trimmed_token = token.trim();
    if trimmed_token.is_empty() {
        return Err("Bear API token cannot be empty".to_string());
    }

    let mut url =
        Url::parse("bear://x-callback-url/open-note").map_err(|error| error.to_string())?;
    url.query_pairs_mut()
        .append_pair("selected", "yes")
        .append_pair("token", trimmed_token)
        .append_pair("open_note", "no")
        .append_pair("show_window", "no")
        .append_pair(
            "x-success",
            &bear_callback_url("bear-note-callback", request_id),
        )
        .append_pair("x-error", &bear_callback_url("bear-note-error", request_id));
    Ok(url.to_string())
}

pub fn build_bear_note_preview_url(note_id: &str, request_id: &str) -> Result<String, String> {
    let trimmed_note_id = note_id.trim();
    if trimmed_note_id.is_empty() {
        return Err("Bear note id cannot be empty".to_string());
    }

    let mut url =
        Url::parse("bear://x-callback-url/open-note").map_err(|error| error.to_string())?;
    url.query_pairs_mut()
        .append_pair("id", trimmed_note_id)
        .append_pair("open_note", "no")
        .append_pair("show_window", "no")
        .append_pair(
            "x-success",
            &bear_callback_url("bear-note-callback", request_id),
        )
        .append_pair("x-error", &bear_callback_url("bear-note-error", request_id));
    Ok(url.to_string())
}

fn bear_callback_url(host: &str, request_id: &str) -> String {
    format!("kairos://{host}?request_id={request_id}")
}

#[derive(Debug, Default)]
pub struct PendingBearRequests {
    requests: HashMap<String, PendingBearRequestRecord>,
}

impl PendingBearRequests {
    pub fn insert(&mut self, task_id: Uuid, kind: BearCallbackRequestKind) -> String {
        let request_id = Uuid::new_v4().to_string();
        self.insert_with_id(request_id.clone(), task_id, kind);
        request_id
    }

    pub fn insert_with_id(
        &mut self,
        request_id: String,
        task_id: Uuid,
        kind: BearCallbackRequestKind,
    ) {
        self.requests.insert(
            request_id,
            PendingBearRequestRecord {
                request: PendingBearRequest { task_id, kind },
                _created_at: Instant::now(),
            },
        );
    }

    pub fn consume_success_url(&mut self, raw_url: &str) -> Result<AcceptedBearCallback, String> {
        let url = Url::parse(raw_url).map_err(|error| error.to_string())?;
        if url.scheme() != "kairos" || url.host_str() != Some("bear-note-callback") {
            return Err("Unsupported Bear callback URL".to_string());
        }

        let request_id = query_value(&url, "request_id")
            .ok_or_else(|| "Bear callback missing request_id".to_string())?;
        let request = self
            .requests
            .remove(&request_id)
            .ok_or_else(|| "Bear callback request is not pending".to_string())?
            .request;

        Ok(AcceptedBearCallback {
            request,
            note: BearCallbackNote {
                identifier: required_query_value(&url, "identifier")?,
                title: required_query_value(&url, "title")?,
                note: required_query_value(&url, "note")?,
                tags: parse_tags(query_value(&url, "tags")),
                is_trashed: query_value(&url, "is_trashed").as_deref() == Some("yes"),
                modification_date: parse_optional_datetime(query_value(&url, "modificationDate"))?,
                creation_date: parse_optional_datetime(query_value(&url, "creationDate"))?,
            },
        })
    }

    pub fn consume_error_url(
        &mut self,
        raw_url: &str,
    ) -> Result<AcceptedBearErrorCallback, String> {
        let url = Url::parse(raw_url).map_err(|error| error.to_string())?;
        if url.scheme() != "kairos" || url.host_str() != Some("bear-note-error") {
            return Err("Unsupported Bear error callback URL".to_string());
        }

        let request_id = query_value(&url, "request_id")
            .ok_or_else(|| "Bear error callback missing request_id".to_string())?;
        let request = self
            .requests
            .remove(&request_id)
            .ok_or_else(|| "Bear error callback request is not pending".to_string())?
            .request;
        let message = query_value(&url, "errorMessage")
            .or_else(|| query_value(&url, "errorCode"))
            .unwrap_or_else(|| "Bear could not return the note".to_string());

        Ok(AcceptedBearErrorCallback { request, message })
    }
}

fn query_value(url: &Url, key: &str) -> Option<String> {
    url.query_pairs()
        .find_map(|(name, value)| (name == key).then(|| value.into_owned()))
}

fn required_query_value(url: &Url, key: &str) -> Result<String, String> {
    query_value(url, key).ok_or_else(|| format!("Bear callback missing {key}"))
}

fn parse_optional_datetime(value: Option<String>) -> Result<Option<DateTime<Local>>, String> {
    value
        .map(|date| {
            DateTime::parse_from_rfc3339(&date)
                .map(|parsed| parsed.with_timezone(&Local))
                .map_err(|error| error.to_string())
        })
        .transpose()
}

fn parse_tags(value: Option<String>) -> Vec<String> {
    let Some(raw) = value else {
        return Vec::new();
    };
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Vec::new();
    }

    serde_json::from_str::<Vec<String>>(trimmed).unwrap_or_else(|_| {
        trimmed
            .split(',')
            .map(|tag| tag.trim().to_string())
            .filter(|tag| !tag.is_empty())
            .collect()
    })
}
