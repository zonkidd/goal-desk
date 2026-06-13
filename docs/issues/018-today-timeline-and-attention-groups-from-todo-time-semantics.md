# Issue 018: Today Timeline And Attention Groups From Todo Time Semantics

Label: ready-for-agent

## Parent

`docs/prd/2026-06-12-todo-time-and-today-workbench-experience-prd.md`

## What to build

Rebuild `Today Workbench` around the new Todo time semantics so `Today Timeline` becomes strictly about items with a real start time today and `今日看点` becomes the grouped attention surface for overdue, due-today, and ongoing Todos. This slice should stop using placeholder or deadline-only behavior for the timeline, carry `Planned Start Time` through derived Today logic, and enforce the agreed grouping and sorting rules for actionable Today work.

The grouped attention behavior should follow the product decisions already made:

```text
今日看点 groups:
1. 已逾期
2. 今天截止
3. 持续推进

ongoing startBoundary = plannedStartAt ?? createdAt
ongoing endBoundary = dueAt
```

## Acceptance criteria

- [ ] `Today Timeline` contains only today's Calendar Events, Reminders with real times, and Todos whose `Planned Start Time` falls today.
- [ ] `今日看点` is split into `已逾期`, `今天截止`, and `持续推进`, with paused and completed Todos excluded and with the agreed within-group sorting rules.
- [ ] Derived Today behavior is covered by public-seam tests for start-only, due-only, overdue, and ongoing Todos using `plannedStartAt ?? createdAt` as the ongoing start boundary.

## Blocked by

- `docs/issues/015-todo-planned-start-time-persistence-and-editing.md`
