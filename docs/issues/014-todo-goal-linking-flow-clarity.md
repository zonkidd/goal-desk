# Issue 014: Todo Goal Linking Flow Clarity

Label: ready-for-agent

## Parent

`docs/prd/2026-06-11-inbox-completed-task-state-and-goal-linking-clarity-prd.md`

## What to build

Clarify Goal handling inside Todo editing as one focused workflow: link the current Todo to an existing Goal first, and only use inline Goal creation as a fallback when no existing Goal fits. Successful inline Goal creation should immediately link back to the current Todo and return the UI to a clear selected Goal state.

## Acceptance criteria

- [ ] The Todo Drawer presents Goal association as one focused workflow around the current Todo.
- [ ] Existing Goal selection is the primary path; inline Goal creation is a secondary fallback path.
- [ ] Creating a Goal inline immediately links it to the current Todo and returns the UI to a clear linked state.

## Blocked by

- `docs/issues/013-todo-status-action-state-machine.md`
