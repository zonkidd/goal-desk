# Inbox Completed, Task State, And Goal Linking Clarity PRD

Label: ready-for-agent

## Problem Statement

Goal Desk already has a usable Todo editing flow, but the current Todo experience still creates friction in three places. Completed Todos are no longer visible in the main task pool, which makes users feel like finished work disappears. Todo status actions do not consistently reflect the Todo's current state, so an `IN_PROGRESS` Todo can still imply the wrong next action. The Goal-linking flow inside Todo editing also feels mixed together with Goal management, which makes it harder to understand whether the user is selecting a Goal, creating a Goal, or navigating into another product area.

From the user's perspective, this creates uncertainty around where completed work goes, what actions are actually available for a Todo right now, and how Goal linking is supposed to work when editing a Todo.

## Solution

Clarify the Todo workflow around one simple mental model:

- `Inbox` is the complete Todo pool, including completed Todos.
- `Today` remains action-oriented and only shows work that still needs attention.
- Todo status actions only show valid next moves for the current Todo state.
- Goal handling inside Todo editing is a focused "link this Todo to a Goal" workflow, with inline Goal creation available only as a secondary fallback when no existing Goal fits.

This keeps Todo review, Todo action, and Goal association understandable without expanding the surface area of the product.

## User Stories

1. As a Goal Desk user, I want completed Todos to remain visible somewhere in the main workspace, so that finished work does not feel like it vanished.
2. As a Goal Desk user, I want completed Todos to appear in `Inbox`, so that I can review all Todos from one task-pool view.
3. As a Goal Desk user, I want completed Todos grouped separately from active Todos, so that finished work does not overwhelm actionable work.
4. As a Goal Desk user, I want the `Completed` group to be collapsed by default, so that `Inbox` stays focused on work I can still act on.
5. As a Goal Desk user, I want to expand the `Completed` group when I need it, so that historical work is still easy to inspect.
6. As a Goal Desk user, I do not want completed Todos mixed into `Today`, so that `Today` stays centered on current action.
7. As a Goal Desk user, I do not want completed Todos mixed into the ongoing Today focus block, so that `持续推进` remains about active effort.
8. As a Goal Desk user, I want a `TODO` Todo to offer `开始` and `完成`, so that the next actions are obvious.
9. As a Goal Desk user, I want an `IN_PROGRESS` Todo to offer `暂停` and `完成`, so that I do not see a misleading `恢复` action.
10. As a Goal Desk user, I want a `PAUSED` Todo to offer `恢复` and `完成`, so that paused work can resume cleanly.
11. As a Goal Desk user, I want a `DONE` Todo to stop offering state actions in this version, so that completed work feels final and stable.
12. As a Goal Desk user, I want Todo status actions to reflect only valid state transitions, so that the interface never asks me to perform an impossible or nonsensical move.
13. As a Goal Desk user, I want the Todo Drawer to remain readable for completed Todos, so that I can inspect notes, Goal linkage, and history after completion.
14. As a Goal Desk user, I want completed Todos to remain visible in activity history and detail view, so that completion does not remove context.
15. As a Goal Desk user, I want Goal linking in the Todo Drawer to feel like one focused workflow, so that I understand I am assigning a Goal rather than managing the whole Goal system.
16. As a Goal Desk user, I want the `所属目标` field to show either the currently linked Goal or an explicit unlinked state, so that the Todo's Goal state is obvious at a glance.
17. As a Goal Desk user, I want Goal linking to start with existing Goal selection, so that the most common path is fast.
18. As a Goal Desk user, I want to search or scan existing Goals when linking a Todo, so that I can find the right Goal without leaving the Drawer.
19. As a Goal Desk user, I want inline Goal creation to appear as a fallback when no existing Goal fits, so that Goal creation does not dominate the normal linking flow.
20. As a Goal Desk user, I want the inline Goal creation entry point to clearly say it will create and link a Goal, so that the result is predictable.
21. As a Goal Desk user, I want inline Goal creation to ask for the smallest useful set of fields, so that I do not lose momentum while editing a Todo.
22. As a Goal Desk user, I want inline Goal creation to require a Goal title and make Area optional, so that creating a Goal from Todo flow stays lightweight.
23. As a Goal Desk user, I want the new Goal to link back to the current Todo immediately after creation, so that I do not have to do two separate steps.
24. As a Goal Desk user, I want the Todo Drawer to return to a clear linked state after inline Goal creation succeeds, so that the workflow feels complete rather than half-finished.
25. As a Goal Desk user, I want to leave a Todo unlinked without friction, so that standalone work remains a first-class path.
26. As a Goal Desk user, I want the Goal page to remain the primary place for deliberate Goal management, so that Goal editing and Goal creation responsibilities stay understandable.
27. As a Goal Desk user, I want the Todo Drawer Goal UI to support Goal association without pretending to be a full Goal management screen, so that product boundaries remain clear.
28. As a Goal Desk user, I want browser preview and Tauri runtime to present the same Todo state rules, so that the UI semantics stay consistent across environments.
29. As a Goal Desk user, I want browser preview and Tauri runtime to present the same Goal-linking workflow, so that I can trust the product shape before native persistence is involved.
30. As a Goal Desk user, I want completed Todo visibility, Todo state actions, and Goal-linking clarity to work together as one coherent Todo editing experience, so that the product feels intentional instead of patched together.
31. As a developer, I want Todo status transitions tested through public seams, so that future UI refactors do not silently reintroduce invalid actions.
32. As a developer, I want completed Todo grouping tested through public seams, so that visibility rules stay stable while layout evolves.
33. As a developer, I want Goal-linking workflow tests to focus on observable behavior rather than component internals, so that the tests survive UI polish work.

## Implementation Decisions

- `Inbox` becomes the canonical workspace surface for active, paused, and completed Todos.
- Completed Todos are shown in a dedicated `Completed` group inside `Inbox`.
- The `Completed` group is collapsed by default and can be expanded by the user within the same view.
- `Today` remains an action-first surface and does not take on the responsibility of displaying completed Todos.
- The ongoing Today focus block keeps its existing rule: completed and paused Todos are excluded.
- Todo status actions are treated as a constrained state machine rather than a static action row.
- The current-state action mapping is:

```text
TODO -> [start, complete]
IN_PROGRESS -> [pause, complete]
PAUSED -> [resume, complete]
DONE -> [view only]
```

- `resume` is reserved exclusively for the `PAUSED -> IN_PROGRESS` transition.
- `DONE` Todos remain readable in detail views, including content, Goal linkage, and activity history, but this PRD does not add a reopen workflow.
- Goal association inside Todo editing is defined as one focused workflow: link the current Todo to an existing Goal, or create a new Goal inline only when needed.
- The primary Goal-linking surface starts with the currently linked Goal or an explicit unlinked state.
- The Goal selection panel should prioritize existing Goal choice before any inline creation affordance.
- Inline Goal creation remains available inside Todo editing, but it is demoted to a secondary fallback path instead of competing with Goal selection as an equal primary mode.
- Inline Goal creation in Todo flow asks only for the minimum fields needed to establish a valid Goal in this version: required title, optional Area.
- Successful inline Goal creation immediately links the new Goal to the current Todo and returns the Drawer to a clear linked state.
- The Goal screen remains the primary workspace for deliberate Goal management. Todo editing supports Goal association, not general Goal administration.
- Browser preview continues to mirror the same UI semantics while remaining explicit about in-memory limitations.
- Tauri runtime remains the durable path for persisted Todo and Goal linkage changes.

## Testing Decisions

- Good tests verify observable behavior through public seams and avoid coupling to component-local implementation details, internal helper branching, or transient DOM structure that does not define product behavior.
- The preferred seams for this PRD are:
  - pure presentation/derivation seams for Todo status labels, action availability, and completed visibility rules,
  - application-state seams for Todo mutation behavior and Goal-linking state updates,
  - browser-visible workflow seams for `Inbox` grouping and Todo Drawer Goal-linking interactions.
- Completed Todo visibility should be tested at the highest seam that can prove grouping behavior without overfitting to visual markup details.
- Todo action tests should prove that each Todo state exposes only its valid next actions.
- Goal-linking tests should prove the intended workflow shape: existing Goal selection first, inline Goal creation as fallback, and automatic linkage after creation.
- Browser preview tests and existing Todo/Goal workflow tests in the repository are prior art and should be extended rather than replaced.
- End-to-end or browser-visible tests should focus on what the user can observe:
  - completed Todos appear in `Inbox > Completed`,
  - completed Todos stay out of `Today`,
  - `IN_PROGRESS` Todos do not expose `恢复`,
  - `PAUSED` Todos do expose `恢复`,
  - inline Goal creation links the Todo and returns to a clear selected Goal state.
- Tauri persistence tests should continue to verify that Todo updates and Goal linkage survive reload, but this PRD does not require a new persistence model.

## Out of Scope

- Reopening a `DONE` Todo back to `TODO` or `IN_PROGRESS`
- Redefining Goal progress derivation or Goal completion rules
- Changing the `Today Timeline` concept or merging completed items into it
- Introducing `Project` as an active domain object
- Reworking the broader Goal management experience outside the Todo-focused workflow
- New analytics, reporting, or productivity summaries around completed work
- Multi-select, bulk Todo actions, or archive flows for completed Todos

## Further Notes

- This PRD is a clarity-and-interaction pass over existing Goal/Todo capabilities, not a new domain expansion.
- The most important product outcome is reducing ambiguity: where completed Todos live, what a Todo can do next, and what it means to create or link a Goal while editing a Todo.
- The implementation should preserve the existing local-first split: browser preview is honest demo behavior, while Tauri runtime is the durable source of truth.
