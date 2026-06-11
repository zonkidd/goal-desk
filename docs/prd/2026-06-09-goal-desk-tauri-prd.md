# Goal Desk Tauri PRD

Label: ready-for-agent

## Problem Statement

Users need a macOS desktop app that turns goals into daily action. Existing reminders, calendar meetings, and ad-hoc tasks are scattered, so the user cannot open one view in the morning and answer: what happens today, what must be done before each meeting, and how today's actions move larger goals forward.

The previous Rust Goal Manager prototype proved useful domain concepts, but its egui + JSON implementation does not match the requested Tauri + TypeScript + Rust + SQLite product direction. The new version needs a web-quality desktop interface, durable local storage, global quick capture, and a path to native macOS Calendar and Reminders integration through EventKit.

## Solution

Build Goal Desk as a local-first Tauri app. TypeScript renders the desktop workbench UI, Rust owns the core domain logic and native integration seams, and SQLite stores durable local data.

The default view is Today Timeline. It mixes today's Calendar Events, Reminders, and scheduled Todos in chronological order, with enough metadata to show what must happen before and after meetings. Goals remain separate from Todos: a Goal is an outcome, a Todo is a concrete action, and progress is calculated from linked Todos or milestones. Areas and Projects provide the Things 3-style structure for life domains and grouped work.

Quick Capture is available from Option+Space. The user can type natural phrases such as `明天下午三点看熊掌记的总结笔记`; the app extracts a title and a scheduled time, creates a Todo, and places it in the appropriate Today Timeline when relevant.

macOS Calendar and Reminders access is modeled as a native adapter. The first production path should use EventKit through a Swift bridge invoked by Rust. AppleScript is acceptable only as a temporary prototype fallback and must not become the long-term seam.

## User Stories

1. As a macOS user, I want the app to open directly into Today Timeline, so that I can see today's meetings and work in one place.
2. As a macOS user, I want Calendar Events, Reminders, and scheduled Todos mixed chronologically, so that my day reads as one plan.
3. As a macOS user, I want each timeline item to show its source, so that I know whether it came from Calendar, Reminders, or local Goal Desk data.
4. As a macOS user, I want read-only Calendar Events clearly labeled, so that I do not expect Goal Desk to edit system calendar data.
5. As a macOS user, I want a Goal to represent an outcome, so that it does not get confused with a concrete Todo.
6. As a macOS user, I want a Todo to represent one concrete action, so that I can complete it independently.
7. As a macOS user, I want Areas to group stable parts of my life, so that work, health, study, and personal commitments remain organized.
8. As a macOS user, I want Projects under Areas or Goals, so that multi-step efforts have a bounded workspace.
9. As a macOS user, I want Goals to show progress bars, so that small completed actions visibly move larger outcomes forward.
10. As a macOS user, I want Goal progress to update when linked Todos are completed, so that progress reflects real work.
11. As a macOS user, I want milestones under Goals, so that a Goal can progress even when work is not a flat todo checklist.
12. As a macOS user, I want Today Timeline to show work before a meeting, so that I know what to finish before the meeting starts.
13. As a macOS user, I want Today Timeline to show overdue items, so that late work does not disappear.
14. As a macOS user, I want quick capture from Option+Space, so that I can record a task without switching apps.
15. As a macOS user, I want Quick Capture to accept natural Chinese time phrases, so that I can write the way I think.
16. As a macOS user, I want `明天下午三点` to schedule a Todo for tomorrow at 15:00, so that common phrases work without manual date picking.
17. As a macOS user, I want captured text without a time phrase to become an inbox Todo, so that quick capture is never blocked.
18. As a macOS user, I want the app to store data in SQLite locally, so that my goals and todos persist without cloud sync.
19. As a macOS user, I want startup to work without network access, so that local planning is reliable.
20. As a macOS user, I want Calendar permission failures to be visible but non-fatal, so that local work remains usable.
21. As a macOS user, I want Reminders permission failures to be visible but non-fatal, so that local work remains usable.
22. As a macOS user, I want a Goal detail surface, so that I can inspect progress, linked Projects, milestones, and Todos.
23. As a macOS user, I want a Todo detail surface, so that I can edit title, schedule, completion, linked Goal, and notes.
24. As a macOS user, I want a Project detail surface, so that grouped Todos remain understandable.
25. As a macOS user, I want a navigation structure for Today, Goals, Areas, Projects, and Inbox, so that deep organization does not clutter the morning view.
26. As a macOS user, I want the UI to match the provided Goal Desk prototype's quiet desktop workbench style, so that it feels focused rather than like a generic web dashboard.
27. As a macOS user, I want native global shortcut registration, so that Quick Capture works while another app is active.
28. As a macOS user, I want the native integration seam to be testable without hitting real macOS APIs, so that implementation can remain reliable.
29. As a developer, I want Rust domain tests for Today Timeline and Goal progress, so that the most important behavior survives UI rewrites.
30. As a developer, I want local markdown issues for vertical slices, so that implementation can proceed without a remote tracker.

## Implementation Decisions

- Create a new Tauri-oriented project rather than mutating the egui project in place.
- Use TypeScript for UI and state orchestration.
- Use Rust for domain logic, Tauri commands, SQLite access, and native macOS adapter seams.
- Prefer SQLite for durable data. JSON from the older project is not the new durable store.
- Use the old `rust-goal-manager-clean` project only as reference for domain language, demo data, and test style.
- Keep Today Timeline as the default screen.
- Model Goal, Area, Project, Todo, Reminder, Calendar Event, and Today Timeline explicitly.
- Keep Calendar Events read-only until a future issue explicitly introduces write support.
- Implement Quick Capture around a small command-style interface: input text goes in, parsed capture result comes out.
- Implement Natural Language Time locally for common phrases first. Do not add a cloud AI parser in the initial version.
- Treat EventKit as the intended long-term macOS integration path. A Swift bridge can sit behind a Rust adapter.
- Use Tauri global shortcut support for Option+Space.
- Keep tests focused on behavior at public seams: Rust domain functions, Tauri command contracts, and UI state rendering.

## Testing Decisions

- Good tests verify observable behavior, not internal implementation details.
- Rust domain tests should cover Today Timeline ordering, source labels, Goal progress, and Natural Language Time parsing.
- Storage tests should verify that SQLite persistence can create and reload Areas, Goals, Projects, Todos, and Reminders through repository interfaces.
- Tauri command tests should verify command input/output contracts without launching a full window where possible.
- UI tests should verify that the Today Timeline renders mixed item types and that Quick Capture can submit text to the command layer.
- Native macOS adapters should be tested through fake adapters first. Real EventKit smoke tests are manual until signing, permissions, and entitlements are configured.

## Out of Scope

- Cloud sync.
- Multi-user collaboration.
- Writing back to macOS Calendar.
- Writing back to Apple Reminders.
- Full NLP or AI scheduling.
- Mobile apps.
- Importing legacy JSON automatically.
- Production code signing and notarization in the first implementation slice.

## Further Notes

- Tauri dependency installation and native plugin installation require user approval before running commands that modify dependency trees.
- The first implementation slice should prove the app shape with local data and tests before native EventKit work begins.
- Global shortcut wiring and EventKit integration are intentionally parked as TODO items while prototype iteration continues.
