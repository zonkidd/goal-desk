# Issue 021: Functional Bug Review Fix Slice

Label: ready-for-agent

## Parent References

- `docs/history/prd/2026-06-12-todo-time-and-today-workbench-experience-prd.md`
- `docs/spec/derived-state-manager.md`
- `docs/design/refactor-isOngoing-to-showInTimeline.md`
- Code review findings from current project bug hunt.

## Problem

Current implementation has several user-visible functional mismatches:

1. Ongoing Todos without Planned Start Time do not appear in Today focus because imported tasks do not carry `createdAt`.
2. Todo timeline derivation ignores the explicit `showInTimeline` switch.
3. Soft-deleted tasks can still be found and mutated through active task lookup paths.
4. Unlinked Todos disappear when the user filters to the system `未分类` area.
5. Renaming a Goal leaves linked Todo labels stale.

## Scope

Fix the five behaviors with vertical red/green TDD cycles.

## Acceptance Criteria

- Today focus treats a Todo's `CREATED` activity timestamp as the start boundary when both `plannedStartAt` and `createdAt` are absent.
- Today/Calendar Todo timeline entries require `showInTimeline === true`.
- Active task repository lookups and filters exclude soft-deleted tasks.
- `未分类` area filtering includes unlinked Todos.
- Goal title edits refresh the `linkedGoalLabel` for active linked Todos.
- Existing frontend and Rust test suites remain green.

## Out Of Scope

- UI redesign.
- New persistence columns for `createdAt` / `updatedAt`.
- EventKit write support.
- Hard-delete behavior changes.

## TDD Plan

1. RED/GREEN: Today focus fallback start boundary from `CREATED` activity log.
2. RED/GREEN: Timeline excludes planned-start Todos when `showInTimeline` is false.
3. RED/GREEN: Active task repository queries exclude soft-deleted tasks.
4. RED/GREEN: `未分类` area includes unlinked Todos.
5. RED/GREEN: Goal rename synchronizes linked Todo labels.
