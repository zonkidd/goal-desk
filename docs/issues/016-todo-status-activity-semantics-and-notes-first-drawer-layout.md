# Issue 016: Todo Status Activity Semantics And Notes-First Drawer Layout

Label: ready-for-agent

## Parent

`docs/prd/2026-06-12-todo-time-and-today-workbench-experience-prd.md`

## What to build

Tighten the Todo state semantics and the Todo Drawer information hierarchy so the product uses precise action language and a clearer workspace layout. A new Todo should start in `TODO`, `Start` should represent the first move into active work, `Resume` should be reserved for paused work, and activity history should reflect those distinctions. In the same slice, rebalance the Todo Drawer into a 7:3 layout with structured Todo fields and Notes on the left, `ACTIVITY & UPDATES` on the right, and `NOTES` as the default preview-first surface for both new and existing Todos.

Prototype state mapping:

```text
TODO -> Start -> IN_PROGRESS -> log STARTED
IN_PROGRESS -> Pause -> PAUSED -> log PAUSED
PAUSED -> Resume -> IN_PROGRESS -> log RESUMED
TODO | IN_PROGRESS | PAUSED -> Complete -> DONE -> log COMPLETED
DONE -> view only
```

## Acceptance criteria

- [ ] Todo actions expose only valid next moves, and the first `TODO -> IN_PROGRESS` transition records `STARTED` while only `PAUSED -> IN_PROGRESS` records `RESUMED`.
- [ ] The Todo Drawer uses the agreed 7:3 split with title, state actions, basic properties, and `NOTES` on the left and `ACTIVITY & UPDATES` on the right.
- [ ] Both newly created and existing Todos open with preview-first `NOTES`, including an empty-state preview when no Notes content exists.

## Blocked by

None - can start immediately
