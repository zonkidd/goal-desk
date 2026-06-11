# Goal Workbench Closure PRD

Label: ready-for-agent

## Problem Statement

Goal Desk now has a usable prototype shell for Inbox, Today, Board, and a first Goal entry, but the product still breaks at the most important local-first seams. Goals are not yet durably managed through SQLite-backed Tauri commands, Todo-to-Goal linking is only partially closed, and the new `持续推进` rule is not yet fully carried through every durable workflow. From the user's perspective, they can see the product shape, but they cannot yet trust Goals, linked Todos, and Today focus behavior as a stable core workflow.

## Solution

Close the local Goal workbench loop around `Area -> Goal -> Todo` before returning to macOS native integrations. A Goal becomes a first-class local object with durable create/edit/status flows, a Todo can optionally attach to one Goal, and `持续推进` Todos appear in Today before their deadline. Goal progress and Goal readiness to complete are derived from linked Todos, and the same behavior is visible in browser preview and Tauri runtime, with SQLite-backed persistence in Tauri as the durable source of truth.

## User Stories

1. As a Goal Desk user, I want Goals to be first-class objects, so that I can manage outcomes separately from individual Todos.
2. As a Goal Desk user, I want a Goal entry in the main navigation, so that I can browse all Goals without going through Today or Board.
3. As a Goal Desk user, I want to create a Goal with a title, Area, and description, so that I can define an outcome before adding work to it.
4. As a Goal Desk user, I want a Goal to exist even with zero Todos, so that I can set direction before planning the concrete work.
5. As a Goal Desk user, I want a Goal with zero linked Todos to remain `ACTIVE` at `0%`, so that empty Goals are not incorrectly treated as complete.
6. As a Goal Desk user, I want to pause a Goal, so that I can keep it visible without treating it as active work.
7. As a Goal Desk user, I want to archive a Goal, so that old outcomes leave the active workspace without being deleted.
8. As a Goal Desk user, I want a Goal to move to `READY_TO_COMPLETE` when all linked Todos are done, so that I get a deliberate completion checkpoint.
9. As a Goal Desk user, I want to manually confirm a `READY_TO_COMPLETE` Goal as `COMPLETED`, so that final completion still reflects judgment rather than blind automation.
10. As a Goal Desk user, I want a Goal to return to `ACTIVE` when a new unfinished Todo is linked later, so that progress reflects current reality.
11. As a Goal Desk user, I want Goal progress to be derived from linked Todos, so that I do not maintain progress manually.
12. As a Goal Desk user, I want Goal progress to move automatically as linked Todos are completed, so that the product shows real advancement.
13. As a Goal Desk user, I want Goal cards to show the next unfinished Todo, so that each Goal stays actionable.
14. As a Goal Desk user, I want Todo editing to offer an optional Goal selector, so that I can attach work to a Goal while keeping unlinked Todos possible.
15. As a Goal Desk user, I want one Todo to link to at most one Goal, so that Goal progress remains unambiguous.
16. As a Goal Desk user, I want to create a Goal inline while editing a Todo, so that I do not have to break flow to open another screen first.
17. As a Goal Desk user, I want a Goal Drawer to show linked Todos, so that I can understand the work driving each Goal.
18. As a Goal Desk user, I want to create a Todo directly from a Goal Drawer, so that a Goal also works as a planning container.
19. As a Goal Desk user, I want a `持续推进` switch on a Todo, so that certain work can stay in Today every day until the deadline.
20. As a Goal Desk user, I want a `持续推进` Todo to appear in Today before its deadline, so that deadline-bound effort stays visible instead of disappearing until the last day.
21. As a Goal Desk user, I want a normal deadline-only Todo to appear in Today on the due day, so that Today does not get cluttered by every future task.
22. As a Goal Desk user, I want `持续推进` items to appear in a separate Today block, so that all-day focus work is not confused with the hourly timeline.
23. As a Goal Desk user, I want completed or paused Todos excluded from the ongoing Today focus block, so that Today remains about actionable work.
24. As a Goal Desk user, I want the Area filter to continue working across Inbox, Today, Board, and Goals, so that high-level filtering remains consistent.
25. As a Goal Desk user, I want Goal creation and editing to persist in Tauri runtime, so that my Goals survive app relaunch.
26. As a Goal Desk user, I want Todo-to-Goal linking to persist in Tauri runtime, so that Goal progress survives app relaunch.
27. As a Goal Desk user, I want `持续推进` Todo behavior to persist in Tauri runtime, so that Today behavior survives app relaunch.
28. As a Goal Desk user, I want browser preview to remain honest about its in-memory limitations, so that I do not mistake preview behavior for SQLite persistence.
29. As a developer, I want Goal derivation rules tested through public seams, so that refactors do not silently change product semantics.
30. As a developer, I want Goal persistence tested through repository and Tauri command seams, so that browser-only success does not mask runtime gaps.
31. As a developer, I want Todo focus rules tested through derived-state seams, so that Today behavior is stable without coupling tests to DOM structure.
32. As a developer, I want smoke tests to cover the Goal workbench loop, so that end-to-end regression is visible before moving to EventKit work.

## Implementation Decisions

- This PRD keeps the current glossary decision: `Area -> Goal -> Todo`, with `Project` reserved for a future version but not active in this implementation scope.
- Goal is the primary progress object in this version. It serves simultaneously as task container, result object, and progress board.
- Goal status is modeled as `ACTIVE`, `PAUSED`, `READY_TO_COMPLETE`, `COMPLETED`, and `ARCHIVED`.
- Goal progress is derived from linked Todos rather than edited manually.
- Goal completion is semi-automatic: all linked Todos done moves the Goal to `READY_TO_COMPLETE`; the user then confirms true completion.
- A Goal with no linked Todos remains valid and stays `ACTIVE` with `0%` progress.
- Todo linking remains optional. A Todo may exist without any Goal.
- Todo-to-Goal cardinality is one Todo to at most one Goal.
- `持续推进` is represented by a simple boolean rule in this version rather than a more general focus policy object.
- `持续推进` Todos are rendered in a dedicated Today focus section rather than merged into the hourly Today Timeline.
- Browser preview remains explicitly in-memory. Tauri runtime with SQLite is the durable implementation target for this loop.
- The preferred testing seams for this PRD are:
  - pure derivation seam for Goal status/progress and Today focus rules,
  - application-state seam for Goal/Todo mutations and derived state,
  - workflow seam for Goal creation, linked Todo creation, and Today visibility.
- Existing browser preview tests, Rust domain tests, repository tests, and command tests are prior art and should be extended rather than replaced.

## Testing Decisions

- Good tests verify externally observable behavior at public seams, not implementation details such as component-local state or internal helper branching.
- Goal derivation tests should cover zero-task Goals, mixed completion, all-Todo completion moving to `READY_TO_COMPLETE`, and reopened work returning Goals to `ACTIVE`.
- Repository tests should cover create-and-reload behavior for Goal fields and Todo linkage fields through the repository interface.
- Tauri command tests should cover Goal snapshot and Goal mutation command contracts, including status changes and persisted linkage behavior.
- Frontend state tests should verify that `持续推进` Todos appear in Today before their deadline while normal Todos remain due-day-only.
- Smoke tests should cover the user-visible loop of creating a Goal, creating a linked Todo, and seeing the expected Goal and Today updates.
- Tests should prefer existing public interfaces: repository methods, Tauri invoke contracts, store actions/selectors, and browser-visible flows.

## Out of Scope

- EventKit Calendar or Apple Reminders write integration.
- Bear integration expansion beyond existing link behavior.
- Bringing `Project` back as an active domain object.
- Goal milestones as a new editable object in this phase.
- Cloud sync or multi-device state sharing.
- Rich Goal analytics, sorting rules, or reporting dashboards.
- Reworking the underlying visual language away from the current prototype.

## Further Notes

- The current repo already has early browser-preview support for Goals and `持续推进`, but this PRD treats that as prototype behavior to be hardened through SQLite-backed Tauri flows.
- The work should proceed slice-by-slice using TDD, one issue per RED→GREEN→REFACTOR cycle.
- Complex slices around Todo-to-Goal workflow and Goal readiness state transitions are good candidates for subagent-isolated TDD phases.
