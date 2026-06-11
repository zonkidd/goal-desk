# Issue 009: Ongoing Todo Today Focus Loop

Label: ready-for-agent

## Parent

`docs/prd/2026-06-10-goal-workbench-closure-prd.md`

## What to build

Carry the `持续推进` Todo rule through durable and derived state so that a Todo marked ongoing appears every day in the dedicated Today focus block until its deadline, while normal deadline-only Todos remain due-day-only.

## Acceptance criteria

- [ ] A Todo can persist an `isOngoing` choice in Tauri runtime.
- [ ] An ongoing Todo appears in Today before its deadline.
- [ ] A deadline-only Todo appears in Today on its due day rather than every day before it.
- [ ] Paused or completed Todos do not appear in the ongoing Today focus block.
- [ ] Tests cover the derived Today focus behavior at public seams.

## Blocked by

- `docs/issues/006-goal-persistence-command-loop.md`
- `docs/issues/008-todo-goal-linking-and-inline-goal-creation.md`

