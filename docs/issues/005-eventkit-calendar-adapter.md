# Issue 005: EventKit Calendar Adapter

Label: ready-for-agent

## Parent

`docs/prd/2026-06-09-goal-desk-tauri-prd.md`

## What to build

Add a native macOS Calendar adapter seam backed by EventKit through Swift. The adapter returns read-only Calendar Events for the Today Timeline and handles permission denied states without breaking local work.

## Acceptance criteria

- [ ] The Rust side exposes a Calendar adapter interface that can be faked in tests.
- [ ] The production adapter uses EventKit rather than AppleScript for the intended path.
- [ ] Calendar permission denial is represented as a recoverable status.
- [ ] Calendar Events remain read-only in the UI and domain model.
- [ ] Tests cover success, no-events, and permission-denied adapter results through a fake adapter.

## Blocked by

Issue 001 for Today Timeline integration and a human review of macOS signing/entitlement requirements.

## TODO

- Defer the Swift/EventKit bridge until the prototype direction is revisited.
- Keep the current demo calendar path as a placeholder only; do not treat it as the long-term macOS adapter.
