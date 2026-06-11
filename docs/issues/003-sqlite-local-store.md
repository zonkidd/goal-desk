# Issue 003: SQLite Local Store

Label: ready-for-agent

## Parent

`docs/prd/2026-06-09-goal-desk-tauri-prd.md`

## What to build

Replace seed-only data with SQLite-backed persistence for Areas, Goals, Projects, Todos, Reminders, and milestones. The repository interface should hide SQLite details from UI and domain callers.

## Acceptance criteria

- [ ] The app creates a local SQLite database on first launch.
- [ ] Areas, Goals, Projects, Todos, Reminders, and milestones can be saved and reloaded.
- [ ] Repository callers do not construct SQL strings directly.
- [ ] Storage errors are shown in the UI without crashing the app.
- [ ] Tests cover create-and-reload behavior through the repository interface.

## Blocked by

Issue 001 and user approval to install SQLite/Tauri dependencies if not already present.
