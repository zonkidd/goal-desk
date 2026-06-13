# Issue 015: Todo Planned Start Time Persistence And Editing

Label: ready-for-agent

## Parent

`docs/prd/2026-06-12-todo-time-and-today-workbench-experience-prd.md`

## What to build

Add `Planned Start Time` as a first-class optional Todo field that survives end-to-end through the local-first stack and can be edited from the Todo Drawer using the new full-row time-field interaction. This slice should make a Todo capable of storing a distinct start time without changing the meaning of `Due Time`, and should autosave the start-time change as soon as the user confirms it.

The slice is complete only when the field exists durably, can be read back after reload, and can be edited through the user-facing Todo flow rather than only through internal state.

## Acceptance criteria

- [ ] A Todo can persist an optional `Planned Start Time` independently from `Due Time` in Tauri runtime and browser preview semantics.
- [ ] The Todo Drawer exposes a full-row `Planned Start Time` field that opens the shared polished date-time picker interaction rather than relying on a tiny icon target.
- [ ] Confirming a `Planned Start Time` change saves immediately and survives reload without changing existing `Due Time` behavior.

## Blocked by

None - can start immediately
