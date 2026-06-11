# Issue 002: Goal Progress Core

Label: ready-for-agent

## Parent

`docs/prd/2026-06-09-goal-desk-tauri-prd.md`

## What to build

Add Goal progress calculation from linked Todos and milestones. The UI should show a progress bar for each Goal, and completion of linked work should change the visible percentage.

## Acceptance criteria

- [ ] Goals remain distinct from Todos in the domain model and UI.
- [ ] Goal progress can be calculated from linked Todos.
- [ ] Goal progress can include milestone completion.
- [ ] The UI shows progress bars for Goals.
- [ ] Rust tests cover empty, partial, and complete progress.

## Blocked by

Issue 001 for initial app shell and domain module.
