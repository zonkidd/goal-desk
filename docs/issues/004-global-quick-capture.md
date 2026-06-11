# Issue 004: Global Quick Capture

Label: ready-for-agent

## Parent

`docs/prd/2026-06-09-goal-desk-tauri-prd.md`

## What to build

Add Option+Space Quick Capture. The shortcut opens a compact capture window or overlay, accepts text, parses common natural Chinese time phrases, and creates either a scheduled Todo or inbox Todo.

## Acceptance criteria

- [ ] Option+Space opens Quick Capture while the app is running.
- [ ] Capture text with `明天下午三点` schedules a Todo for tomorrow at 15:00.
- [ ] Capture text without a recognized time creates an inbox Todo.
- [ ] The capture path persists through SQLite once Issue 003 is complete.
- [ ] Tests cover natural time parsing for the supported phrase set.

## Blocked by

Issue 003 for durable persistence and user approval to install global shortcut dependencies.

## TODO

- Defer the global `Option+Space` shortcut and capture window wiring until the prototype is reviewed again.
- Keep the current Rust natural-language parser seam as the accepted starting point for the later shortcut flow.
