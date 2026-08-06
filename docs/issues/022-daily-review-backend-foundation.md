# Daily Review Backend Foundation

## Metadata
- **Parent PRD**: `docs/prd/daily-review.md`
- **Spec**: `docs/spec/daily-review.md`
- **Label**: ready-for-agent

## Overview
Implement the backend foundation for the new Daily Review feature, including the SQLite database schema, Rust domain models, and Tauri IPC commands.

## Tasks
- [ ] Update SQLite initialization script to create `daily_review_items` table (with `id`, `date`, `content`, `created_at`, `updated_at`).
- [ ] Add `idx_daily_review_items_timeline` index on `(date DESC, created_at ASC)`.
- [ ] Create `DailyReviewItem` struct in `src-tauri/src/domain.rs`.
- [ ] Implement Repository and Service layer methods for Daily Review CRUD.
- [ ] Expose Tauri commands: `create_daily_review_item`, `update_daily_review_item`, `delete_daily_review_item`, `get_daily_review_timeline`.
- [ ] Update `desktopApi.ts` on the frontend with the corresponding TypeScript interfaces and API wrappers.
- [ ] Add Rust unit/integration tests for the new repository and service methods.
