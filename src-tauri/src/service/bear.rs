use crate::bear::{BearCallbackNote, BearNotePreview};
use crate::domain::DeskTask;
use crate::repository::{SqliteRepository, TaskRepository};
use chrono::Local;
use serde::Serialize;
use uuid::Uuid;

const BEAR_API_TOKEN_SETTING_KEY: &str = "bear.api_token";

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BearIntegrationStatus {
    pub token_configured: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkedBearNote {
    pub task: DeskTask,
    pub preview: BearNotePreview,
}

pub struct BearService {
    repo: SqliteRepository,
}

impl BearService {
    pub fn new(repo: SqliteRepository) -> Self {
        Self { repo }
    }

    pub fn integration_status(&self) -> Result<BearIntegrationStatus, String> {
        Ok(BearIntegrationStatus {
            token_configured: self.bear_api_token()?.is_some(),
        })
    }

    pub fn save_api_token(&self, token: &str) -> Result<BearIntegrationStatus, String> {
        let trimmed = token.trim();
        if trimmed.is_empty() {
            return Err("Bear API token cannot be empty".to_string());
        }
        self.repo
            .set_app_setting(BEAR_API_TOKEN_SETTING_KEY, trimmed)
            .map_err(|error| error.to_string())?;
        self.integration_status()
    }

    pub fn clear_api_token(&self) -> Result<BearIntegrationStatus, String> {
        self.repo
            .delete_app_setting(BEAR_API_TOKEN_SETTING_KEY)
            .map_err(|error| error.to_string())?;
        self.integration_status()
    }

    pub fn bear_api_token(&self) -> Result<Option<String>, String> {
        self.repo
            .get_app_setting(BEAR_API_TOKEN_SETTING_KEY)
            .map_err(|error| error.to_string())
    }

    pub fn link_task_to_callback_note(
        &self,
        task_id: &str,
        note: BearCallbackNote,
    ) -> Result<LinkedBearNote, String> {
        let task_uuid = Uuid::parse_str(task_id).map_err(|error| error.to_string())?;
        let mut task = TaskRepository::find(&self.repo, task_uuid)
            .map_err(|error| error.to_string())?
            .ok_or_else(|| format!("Task not found: {task_id}"))?;

        task.bear_note_id = Some(note.identifier.clone());
        TaskRepository::update(&self.repo, &task).map_err(|error| error.to_string())?;

        let preview = BearNotePreview {
            task_id: task_uuid,
            bear_note_id: note.identifier,
            title: note.title,
            note: note.note,
            tags: note.tags,
            is_trashed: note.is_trashed,
            modification_date: note.modification_date,
            creation_date: note.creation_date,
            fetched_at: Local::now(),
        };
        self.repo
            .upsert_bear_note_preview(&preview)
            .map_err(|error| error.to_string())?;

        Ok(LinkedBearNote { task, preview })
    }

    pub fn get_note_preview(&self, task_id: &str) -> Result<Option<BearNotePreview>, String> {
        let task_uuid = Uuid::parse_str(task_id).map_err(|error| error.to_string())?;
        self.repo
            .find_bear_note_preview(task_uuid)
            .map_err(|error| error.to_string())
    }

    pub fn unlink_note(&self, task_id: &str) -> Result<DeskTask, String> {
        let task_uuid = Uuid::parse_str(task_id).map_err(|error| error.to_string())?;
        let mut task = TaskRepository::find(&self.repo, task_uuid)
            .map_err(|error| error.to_string())?
            .ok_or_else(|| format!("Task not found: {task_id}"))?;

        task.bear_note_id = None;
        TaskRepository::update(&self.repo, &task).map_err(|error| error.to_string())?;
        self.repo
            .delete_bear_note_preview(task_uuid)
            .map_err(|error| error.to_string())?;

        Ok(task)
    }
}
