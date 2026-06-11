# Issue 011: Goal Workbench Smoke And Runtime Alignment

Label: ready-for-agent

## Parent

`docs/prd/2026-06-10-goal-workbench-closure-prd.md`

## What to build

Verify the end-to-end Goal workbench loop across preview and Tauri runtime: create a Goal, create or link a Todo under it, mark a Todo ongoing, see the Todo in Today, and confirm Goal progress/state behavior matches the defined rules. Use this slice to close the remaining preview/runtime mismatch gaps discovered during smoke testing.

## Acceptance criteria

- [ ] A smoke test proves Goal creation, linked Todo creation, and Today visibility in browser preview.
- [ ] A smoke test proves the same flow in Tauri runtime with SQLite-backed persistence.
- [ ] Preview-only limitations remain clearly labeled where persistence is not available.
- [ ] Goal and Today surfaces show the same derived state after the tested workflow.
- [ ] Any runtime-only gaps found during smoke testing are fixed or called out as explicit TODOs.

## Blocked by

- `docs/issues/007-goal-entry-and-drawer-persistence.md`
- `docs/issues/008-todo-goal-linking-and-inline-goal-creation.md`
- `docs/issues/009-ongoing-todo-today-focus-loop.md`
- `docs/issues/010-goal-derived-progress-and-ready-to-complete.md`
