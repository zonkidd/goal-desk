# Issue 010: Goal Derived Progress And Ready To Complete

Label: ready-for-agent

## Parent

`docs/prd/2026-06-10-goal-workbench-closure-prd.md`

## What to build

Derive Goal progress and Goal readiness from linked Todos so that Goal cards, Goal Drawer state, and Today goal summaries all reflect the same rule set: zero-task Goals stay `ACTIVE` at `0%`, partially complete Goals stay active, and all-done linked work moves the Goal into `READY_TO_COMPLETE` until the user confirms `COMPLETED`.

## Acceptance criteria

- [ ] Goal progress derives from linked Todo completion count.
- [ ] A zero-task Goal remains `ACTIVE` at `0%`.
- [ ] A Goal with all linked Todos done moves to `READY_TO_COMPLETE`.
- [ ] Adding new unfinished linked work later returns the Goal to `ACTIVE`.
- [ ] Tests cover these state transitions through public derivation seams.

## Blocked by

- `docs/issues/006-goal-persistence-command-loop.md`
- `docs/issues/008-todo-goal-linking-and-inline-goal-creation.md`

