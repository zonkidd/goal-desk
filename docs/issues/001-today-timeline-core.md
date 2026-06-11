# Issue 001: Today Timeline Core

Label: ready-for-agent

## Parent

`docs/prd/2026-06-09-goal-desk-tauri-prd.md`

## What to build

Build the first vertical slice of Today Timeline: Rust domain logic accepts local Todos, Reminders, and Calendar Events, then returns a chronologically ordered list of timeline items with source labels and completion/read-only metadata. The TypeScript UI renders this mixed list on the default screen using local seed data until Tauri commands are wired.

## Acceptance criteria

- [ ] Today Timeline includes scheduled Todos, Reminders, and Calendar Events for the selected day.
- [ ] Timeline items are ordered by time, with overdue local items visible before upcoming items.
- [ ] Calendar Events are labeled read-only.
- [ ] The default UI screen renders the mixed timeline without requiring network access.
- [ ] Rust tests cover the timeline ordering and source labels.

## Blocked by

None - can start immediately.
