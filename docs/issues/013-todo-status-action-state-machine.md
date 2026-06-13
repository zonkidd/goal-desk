# Issue 013: Todo Status Action State Machine

Label: ready-for-agent

## Parent

`docs/prd/2026-06-11-inbox-completed-task-state-and-goal-linking-clarity-prd.md`

## What to build

Tighten the Todo action model so the Todo Drawer only shows valid next actions for the current Todo state. `TODO` should offer start and complete, `IN_PROGRESS` should offer pause and complete, `PAUSED` should offer resume and complete, and `DONE` should be view-only in this version.

Prototype state mapping:

```text
TODO -> [start, complete]
IN_PROGRESS -> [pause, complete]
PAUSED -> [resume, complete]
DONE -> [view only]
```

## Acceptance criteria

- [ ] Todo action controls reflect only valid next actions for `TODO`, `IN_PROGRESS`, `PAUSED`, and `DONE`.
- [ ] `恢复` is available only for the `PAUSED -> IN_PROGRESS` path.
- [ ] `DONE` Todos remain readable in the Drawer but do not expose status actions.

## Blocked by

- `docs/issues/012-inbox-completed-todo-visibility.md`
