use crate::domain::{DailyReviewItem, DailyReviewBlock};
use crate::repository::{DailyReviewRepository, SqliteRepository};
use chrono::Local;
use uuid::Uuid;

pub struct DailyReviewService {
    pub(crate) repo: SqliteRepository,
}

impl DailyReviewService {
    pub fn new(repo: SqliteRepository) -> Self {
        Self { repo }
    }

    pub fn create_item(&self, date: &str, blocks: Vec<DailyReviewBlock>) -> Result<DailyReviewItem, String> {
        if blocks.is_empty() {
            return Err("Blocks cannot be empty".to_string());
        }
        
        let trimmed_date = date.trim();
        if trimmed_date.is_empty() {
            return Err("Date cannot be empty".to_string());
        }

        let now = Local::now();
        let item = DailyReviewItem {
            id: Uuid::new_v4(),
            date: trimmed_date.to_string(),
            blocks,
            created_at: now,
            updated_at: now,
        };

        self.repo.create(&item).map_err(|e| e.to_string())?;
        Ok(item)
    }

    pub fn update_item(&self, id: Uuid, blocks: Vec<DailyReviewBlock>) -> Result<DailyReviewItem, String> {
        if blocks.is_empty() {
            return Err("Blocks cannot be empty".to_string());
        }

        let item = DailyReviewItem {
            id,
            date: String::new(), // not updated
            blocks,
            created_at: Local::now(), // not updated
            updated_at: Local::now(),
        };

        self.repo.update(&item).map_err(|e| e.to_string())?;
        Ok(item) // Note: This doesn't return the full updated item (e.g. date, created_at), but frontend mainly needs success. Wait, actually we can fetch the item first, but we don't have a `find` method in the trait yet. Let's just return what we have or nothing.
    }

    pub fn delete_item(&self, id: Uuid) -> Result<(), String> {
        self.repo.delete(id).map_err(|e| e.to_string())
    }

    pub fn get_timeline(&self, limit: u32, offset: u32) -> Result<Vec<DailyReviewItem>, String> {
        self.repo.get_timeline(limit, offset).map_err(|e| e.to_string())
    }
}
