# Todo Time And Today Workbench Experience PRD

Label: ready-for-agent

## Problem Statement

Goal Desk already has a workable local-first Todo and Today prototype, but the current experience breaks down at the exact points where a user needs trust and speed. A Todo only has one time field even though "when I should start" and "when it must be done" are different concepts. The Todo Drawer still makes key actions harder than they need to be: time picking is awkward, Notes does not own the primary editing surface, Goal linking can fail to bind the newly created Goal, and activity history uses the wrong language for first-start versus resume. `Today Workbench` also still mixes placeholder behavior with real workflow expectations: the timeline is still driven by the wrong time semantics, Goals occupy primary space by default even though Today should be about today's actionable work, and the user cannot clearly distinguish overdue work, due-today work, ongoing work, and optional Goal context.

From the user's perspective, this creates friction in both planning and execution. They cannot cleanly express when a Todo should start, they cannot trust Goal linkage during Todo editing, and they cannot rely on Today to show only the work that deserves attention today.

## Solution

Re-center the Todo and Today experience around a clearer model:

- A Todo can optionally have both a `Planned Start Time` and a `Due Time`.
- `Today Workbench` shows only today's actionable work by default.
- `Today Timeline` is strictly time-based and only contains items with a real start time today.
- `今日看点` becomes a grouped action surface for overdue Todos, due-today Todos, and ongoing Todos.
- Goals no longer occupy default Today space, but can appear as an optional persisted supporting panel derived only from today's related Todos.
- The Todo Drawer becomes the main focused editing workspace, with a left/right split, Notes-first visual hierarchy, inline Goal creation that immediately binds on success, and field-level autosave.
- Todo state actions and activity language become precise: Start is not Resume.

This keeps the product aligned with the local-first `Area -> Goal -> Todo` model while making Todo scheduling and Today review feel intentional rather than provisional.

## User Stories

1. As a Goal Desk user, I want a Todo to distinguish between when I plan to start and when it is due, so that planning and deadline pressure are not collapsed into one field.
2. As a Goal Desk user, I want `Planned Start Time` to be optional, so that a Todo can exist without forcing me to schedule it.
3. As a Goal Desk user, I want `Due Time` to be optional, so that lightweight Todos do not require an artificial deadline.
4. As a Goal Desk user, I want a Todo with both time fields empty to remain a valid Todo, so that unscheduled work is still first-class.
5. As a Goal Desk user, I want a Todo with only `Planned Start Time` to appear on the correct day in `Today Timeline`, so that scheduled work shows up when I intend to begin it.
6. As a Goal Desk user, I want a Todo with only `Due Time` to appear in today's attention rules only when it becomes due or overdue, so that future deadlines do not clutter Today too early.
7. As a Goal Desk user, I want a Todo with both `Planned Start Time` and `Due Time` to use them for different meanings, so that start visibility and deadline pressure can coexist cleanly.
8. As a Goal Desk user, I want a new Todo to default to `TODO`, so that fresh work starts in a clear not-started state.
9. As a Goal Desk user, I want a `TODO` Todo to expose `Start`, so that first action is explicit.
10. As a Goal Desk user, I want a `PAUSED` Todo to expose `Resume`, so that returning to paused work uses different language from first start.
11. As a Goal Desk user, I want the first `TODO -> IN_PROGRESS` transition to log `STARTED`, so that my activity history reflects that work actually began.
12. As a Goal Desk user, I want only `PAUSED -> IN_PROGRESS` to log `RESUMED`, so that activity language stays trustworthy.
13. As a Goal Desk user, I want `IN_PROGRESS -> PAUSED` to log `PAUSED`, so that interruptions remain visible in history.
14. As a Goal Desk user, I want completion from any active state to log `COMPLETED`, so that finish events are consistent.
15. As a Goal Desk user, I want the Todo Drawer to open with Notes as the primary reading surface, so that context feels central rather than buried.
16. As a Goal Desk user, I want the Todo Drawer to default to Notes preview even when Notes are empty, so that the editing workspace stays visually consistent.
17. As a Goal Desk user, I want an empty Notes area to show a clear invitation to start writing, so that blank state still feels useful.
18. As a Goal Desk user, I want the Todo Drawer layout to prioritize title, status, time fields, Goal linkage, and Notes on the left, so that the main work happens in one focused column.
19. As a Goal Desk user, I want activity history and updates separated to the right side, so that history supports work without overpowering it.
20. As a Goal Desk user, I want the Todo Drawer to use a 7:3 left/right split, so that writing and editing have more room than the history rail.
21. As a Goal Desk user, I want both time fields to open the picker when I click the whole row, so that I do not have to aim for a tiny icon.
22. As a Goal Desk user, I want `Planned Start Time` and `Due Time` to use the same interaction style, so that time editing feels coherent.
23. As a Goal Desk user, I want a more polished date-time picker than a plain input, so that scheduling feels deliberate and pleasant.
24. As a Goal Desk user, I want the time picker to offer date selection, common time shortcuts, and precise hour/minute choice, so that I can schedule quickly without losing control.
25. As a Goal Desk user, I want to clear either time field explicitly, so that removing a schedule is as easy as adding one.
26. As a Goal Desk user, I want Todo fields to save automatically as I work, so that editing feels like a workbench rather than a fragile form.
27. As a Goal Desk user, I want time changes to save immediately when I confirm them, so that my Today behavior updates right away.
28. As a Goal Desk user, I want Goal linkage changes to save immediately, so that Todo context never depends on a later hidden save step.
29. As a Goal Desk user, I want toggling ongoing state to save immediately, so that Today visibility reflects the change at once.
30. As a Goal Desk user, I want inline Goal creation inside Todo editing to stay lightweight, so that linking work to a new Goal does not break flow.
31. As a Goal Desk user, I want inline Goal creation to use a minimal form, so that creating and linking a Goal from Todo editing remains fast.
32. As a Goal Desk user, I want a newly created inline Goal to bind immediately to the current Todo, so that the Goal association does not silently point at the wrong record.
33. As a Goal Desk user, I want the Todo Drawer to keep my current Todo draft if inline Goal creation fails, so that a Goal error does not wipe unrelated work.
34. As a Goal Desk user, I want to retry Goal creation after a failure without rebuilding the whole Todo draft, so that transient errors do not punish me.
35. As a Goal Desk user, I want `Today Workbench` to focus only on work that deserves attention today, so that it does not become a generic dashboard.
36. As a Goal Desk user, I want `Today Timeline` to contain only Calendar Events, Reminders, and Todos that have an actual start time today, so that the timeline remains a true chronological surface.
37. As a Goal Desk user, I do not want due-only Todos to appear on the timeline just because they are due today, so that time-based and attention-based views stay distinct.
38. As a Goal Desk user, I want overdue Todos to stay visible in Today, so that late work cannot disappear.
39. As a Goal Desk user, I want due-today Todos grouped separately from overdue and ongoing work, so that urgency is visually obvious.
40. As a Goal Desk user, I want ongoing Todos grouped separately from hard deadlines, so that long-running effort does not look the same as urgent due work.
41. As a Goal Desk user, I want `今日看点` split into `已逾期`, `今天截止`, and `持续推进`, so that Today communicates why each Todo is here.
42. As a Goal Desk user, I want overdue Todos sorted by earliest missed due time first, so that the most pressing lateness rises to the top.
43. As a Goal Desk user, I want due-today Todos sorted by earliest due time first, so that same-day pressure is easy to sequence.
44. As a Goal Desk user, I want ongoing Todos sorted by start intent first and then fallback recency rules, so that longer-running work still feels ordered.
45. As a Goal Desk user, I want paused and completed Todos excluded from `今日看点`, so that Today only shows work I can act on.
46. As a Goal Desk user, I want an ongoing Todo to appear in `今日看点` only when today falls between its start boundary and due boundary, so that ongoing visibility feels principled rather than arbitrary.
47. As a Goal Desk user, I want an ongoing Todo without `Planned Start Time` to treat creation time as its start boundary, so that I do not have to fill every field to get sensible behavior.
48. As a Goal Desk user, I want Goals hidden from Today by default, so that Today remains a work surface rather than a Goal board.
49. As a Goal Desk user, I want an optional `显示 Goal 区` preference in Today, so that I can choose whether Goal context helps me.
50. As a Goal Desk user, I want that Goal visibility preference remembered locally, so that Today reopens the way I prefer.
51. As a Goal Desk user, I want enabling the Goal panel to switch Today into a stable left/right layout, so that the page adapts without feeling chaotic.
52. As a Goal Desk user, I want the left side of Today to keep the same order when the Goal panel is shown, so that timeline and attention blocks stay familiar.
53. As a Goal Desk user, I want the right Goal panel to show only Goals that have today's related Todos, so that Goal context remains directly relevant to current work.
54. As a Goal Desk user, I do not want a Goal with no today-relevant Todos to appear in Today just because it exists, so that Goal presence is earned by current work.
55. As a Goal Desk user, I want Today Goals derived only from Todo reality rather than a separate Goal schedule, so that Goal visibility cannot drift away from actual work.
56. As a Goal Desk user, I want Today Goal cards to stay summary-only, so that the optional Goal panel does not turn Today back into a Goal workspace.
57. As a Goal Desk user, I want each Today Goal card to show title, Area, progress, today-related Todo count, and next Todo, so that I get enough context without losing focus.
58. As a Goal Desk user, I want Today Goal cards sorted by the urgency of their related Todos, so that the most important Goal context appears first.
59. As a Goal Desk user, I want Area filtering to apply consistently to Today attention, timeline Todo entries, and optional Today Goals, so that high-level focus rules still hold.
60. As a Goal Desk user, I want browser preview and Tauri runtime to agree on these Todo and Today semantics, so that preview remains a truthful model of the product.
61. As a Goal Desk user, I want Tauri persistence to remember `Planned Start Time`, Goal linkage, ongoing state, and derived Today behavior after relaunch, so that local-first trust is maintained.
62. As a developer, I want Todo scheduling rules tested through pure derivation seams, so that time-based behavior can evolve safely.
63. As a developer, I want Todo state transitions tested through public status and activity seams, so that UI polish does not reintroduce semantic drift.
64. As a developer, I want Todo Drawer editing behavior tested through store and workflow seams, so that autosave and inline Goal linking remain stable.
65. As a developer, I want SQLite migration and Tauri persistence covered by round-trip tests, so that a new start-time field does not break durable data integrity.

## Implementation Decisions

- The glossary now distinguishes `Planned Start Time` from `Due Time`; they are separate stable product concepts rather than alternative labels for one field.
- A Todo continues to be a valid object with zero, one, or two time fields populated.
- `Planned Start Time` drives Todo entry into `Today Timeline`.
- `Due Time` drives due-today and overdue judgment.
- `Today Timeline` stays limited to three source types: `Calendar Event`, `Reminder`, and `Todo`.
- Todo entries appear in `Today Timeline` only when `Planned Start Time` falls on today.
- Due-only Todos do not enter `Today Timeline`.
- `Today Workbench` is explicitly defined as a surface for today's actionable work; Goals are secondary and optional there.
- The default Today layout is a single-column view with `今日时间轴` above `今日看点`.
- When the user enables the persisted `显示 Goal 区` preference, Today becomes a left/right split view while keeping the left-side information order stable.
- The optional Today Goal panel is derived only from Goals that have at least one today-relevant Todo.
- A Goal does not receive its own independent time range in this phase; Today Goal visibility is derived from related Todos rather than direct Goal scheduling.
- Today-relevant Todos for Goal derivation include:
  - Todos with `Planned Start Time` today,
  - Todos with `Due Time` today,
  - overdue unfinished Todos,
  - ongoing Todos whose active interval includes today.
- The Today Goal panel remains summary-only and does not inline Todo lists.
- `今日看点` is split into three explicit groups: `已逾期`, `今天截止`, and `持续推进`.
- Group ordering is fixed in that urgency order.
- `已逾期` sorts by earliest missed `Due Time`, then earliest `Planned Start Time`.
- `今天截止` sorts by earliest `Due Time`.
- `持续推进` sorts by earliest `Planned Start Time`, then earliest creation time when start time is absent.
- Ongoing Todo visibility uses an interval rule:

```text
startBoundary = plannedStartAt ?? createdAt
endBoundary = dueAt
show in 持续推进 when today is between startBoundary and endBoundary, inclusive
if today is after dueAt and the Todo is unfinished, move it to 已逾期
```

- Paused and completed Todos do not appear in `今日看点`.
- Todo status semantics are clarified as a state machine with distinct activity language:

```text
TODO -> Start -> IN_PROGRESS -> log STARTED
IN_PROGRESS -> Pause -> PAUSED -> log PAUSED
PAUSED -> Resume -> IN_PROGRESS -> log RESUMED
TODO | IN_PROGRESS | PAUSED -> Complete -> DONE -> log COMPLETED
DONE -> view only
```

- `Resume` is reserved exclusively for the `PAUSED -> IN_PROGRESS` transition.
- A newly created Todo defaults to `TODO`, which is the product's not-started state.
- The Todo Drawer is rebalanced into a 7:3 split:
  - left side for title, status actions, structured Todo fields, and Notes,
  - right side for `ACTIVITY & UPDATES`.
- The left side keeps `basic properties` above `NOTES`.
- `NOTES` is the default reading surface for both newly created and existing Todos, using preview-first presentation even when empty.
- Empty Notes still render a preview-style empty state with a direct call to begin writing rather than dropping into raw editing immediately.
- Both time fields use the same interaction model: clicking the whole field row opens a polished date-time picker surface.
- The date-time picker should use a desktop card/popover pattern rather than a bare inline native-looking control.
- The picker should support:
  - calendar-based date selection,
  - common time shortcuts,
  - precise hour/minute selection,
  - clear,
  - confirm.
- Inline Goal creation inside Todo editing remains a focused Goal-linking flow, not a full Goal management experience.
- Inline Goal creation uses a minimal form and immediately links the successfully created Goal back to the current Todo.
- If inline Goal creation fails, the Todo editing draft remains intact and only the Goal creation subflow enters error state.
- Todo editing adopts field-level autosave rather than a final all-fields submit step.
- Structured field changes save at the moment the user confirms or commits each field.
- The durable data model expands to include a new optional Todo start-time field in SQLite.
- Existing persisted Todo `Due Time` data remains valid; migration should be additive and forward-compatible rather than reinterpret existing due values.
- Browser preview should mirror these semantics honestly even though Tauri runtime remains the durable source of truth.

## Testing Decisions

- Good tests should assert externally visible behavior through public seams rather than implementation details such as component-local state shape, internal helper branching, or specific layout markup that does not define the product contract.
- The preferred seams for this PRD are:
  - pure derivation seams for Today grouping, timeline inclusion, Goal derivation, and sorting rules,
  - pure status/action seams for Todo action availability and activity log language,
  - application-state seams for Todo Drawer autosave behavior and inline Goal linking,
  - persistence seams for migration, repository round-trip behavior, and Tauri command contracts.
- Todo time derivation tests should cover:
  - no-time Todos staying out of Today,
  - start-only Todos entering `Today Timeline`,
  - due-only Todos entering `今天截止` only on the due day,
  - overdue Todos moving into `已逾期`,
  - ongoing Todos using `plannedStartAt ?? createdAt` as their start boundary.
- Today Goal derivation tests should prove that Goals appear in the optional Today Goal panel only when at least one related Todo is today-relevant.
- Today sorting tests should verify group ordering and within-group priority without binding to visual component structure.
- Todo status tests should verify both valid next actions and the correct activity language for Start versus Resume.
- Todo Drawer workflow tests should verify:
  - default Notes preview behavior,
  - full-row time picker activation,
  - immediate persistence after time confirmation,
  - immediate linkage after inline Goal creation success,
  - draft preservation after inline Goal creation failure.
- Persistence tests should cover the additive SQLite migration for Todo start time and ensure reloaded snapshots preserve start time, due time, ongoing state, Goal linkage, and correct Today derivation.
- Existing browser-preview tests, store tests, repository tests, Rust domain tests, and Tauri command tests are prior art and should be extended rather than replaced.

## Out of Scope

- Adding a separate Goal-level schedule or calendar range independent of Todos.
- Turning the optional Today Goal panel into a full Goal workspace or embedded Todo list.
- Reopening `DONE` Todos back to an earlier state.
- Adding cloud sync, shared workspaces, or multi-device state coordination.
- Writing back to Apple Calendar or Apple Reminders.
- Replacing the local-first SQLite model with another durable store.
- Introducing `Project` as an active object in this phase.
- Expanding Notes into a full document system beyond the current Todo context workflow.
- Major visual redesign outside the Todo Drawer time editing, Today information architecture, and adjacent polish needed to support this behavior.

## Further Notes

- This PRD intentionally sharpens product language already present in the glossary rather than introducing a new domain branch.
- The scope naturally decomposes into three vertical slices:
  - Todo time semantics, Drawer interaction, and status/activity correctness,
  - inline Goal creation and immediate Todo linkage reliability,
  - Today real-data derivation, optional Goal panel, and grouped attention rules.
- The work should proceed with red/green/refactor TDD cycles, one behavior slice at a time, using the smallest targeted seam available before broader regression coverage.
