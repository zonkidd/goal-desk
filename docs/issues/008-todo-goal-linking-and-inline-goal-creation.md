# Issue 008: Todo Goal Linking And Inline Goal Creation

Label: ready-for-agent

## Parent

`docs/prd/2026-06-10-goal-workbench-closure-prd.md`

## What to build

Allow a Todo to optionally link to one Goal through the Todo editing flow, and let the user create a new Goal inline from the Todo editor before immediately linking the Todo to it. The same workflow should persist in Tauri runtime and remain usable in browser preview.

## Acceptance criteria

- [ ] A Todo can link to one existing Goal from the Todo editing flow.
- [ ] A Todo can be left unlinked without breaking the editor flow.
- [ ] Inline Goal creation from the Todo editor creates the Goal and links the Todo in one user-visible workflow.
- [ ] Todo-to-Goal linkage persists through Tauri reload.
- [ ] Tests cover the linkage contract through public store/command seams rather than component internals.

## Blocked by

- `docs/issues/006-goal-persistence-command-loop.md`

