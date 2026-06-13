# Issue 019: Today Optional Goal Panel Derived From Today-Relevant Todos

Label: ready-for-agent

## Parent

`docs/prd/2026-06-12-todo-time-and-today-workbench-experience-prd.md`

## What to build

Add an optional persisted `显示 Goal 区` preference to `Today Workbench` and use it to reveal a right-side Goal summary panel derived only from today's relevant Todos. This slice should keep Today's default mode focused on actionable work, switch to a stable left/right layout when the panel is enabled, and show only summary-level Goal context rather than turning Today back into a Goal workspace.

A Goal belongs in this panel only when at least one linked Todo is relevant to today under the agreed Today rules.

## Acceptance criteria

- [ ] Today exposes a persisted `显示 Goal 区` preference in the page header and uses it to toggle between the default single-column layout and the optional split layout.
- [ ] When enabled, the right panel shows only Goals derived from today's relevant Todos and keeps the left side ordered as `今日时间轴` above `今日看点`.
- [ ] Goal cards remain summary-only and are sorted by the urgency of their today-relevant Todos rather than by static Goal metadata alone.

## Blocked by

- `docs/issues/018-today-timeline-and-attention-groups-from-todo-time-semantics.md`
