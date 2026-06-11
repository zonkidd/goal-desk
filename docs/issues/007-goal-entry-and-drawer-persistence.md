# Issue 007: Goal Entry And Drawer Persistence

Label: ready-for-agent

## Parent

`docs/prd/2026-06-10-goal-workbench-closure-prd.md`

## What to build

Close the Goal screen and Goal Drawer around the durable Goal command loop so that a user can browse all Goals, filter them by status, open a Goal Drawer, edit Goal fields, and change Goal status in Tauri runtime while keeping browser preview behavior honest.

## Acceptance criteria

- [ ] The Goal navigation entry loads durable Goal data in Tauri runtime.
- [ ] Goal Drawer edits flow through durable commands rather than preview-only state in Tauri runtime.
- [ ] Goal status changes from the Drawer update the visible Goal list and survive reload.
- [ ] Browser preview still works with in-memory demo behavior and explicit preview messaging.
- [ ] Smoke coverage demonstrates Goal list -> Goal Drawer -> save -> reload behavior.

## Blocked by

- `docs/issues/006-goal-persistence-command-loop.md`

