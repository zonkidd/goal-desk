# Goal Desk Tauri · Agent Instructions

This repository is the Tauri + TypeScript rewrite of Goal Desk.

## Limitations

- **Do not install dependencies without user approval** — running install commands without confirmation is forbidden.
- **Do not import the old egui + JSON implementation** from `rust-goal-manager-clean`; reference it only as domain and test prior art.
- **Keep domain concepts separate**: Goal, Project, Todo, Reminder, Calendar Event, and Today Timeline must stay as distinct concepts — do not merge them.
- **Local-first only**: SQLite is the durable store; macOS Calendar and Reminders are external **read-only** sources unless an issue explicitly changes that.

## Working Principles

- Build vertical slices: schema, Rust core, Tauri command, TypeScript UI, and tests move together.
- Prefer one behavior test → one implementation → repeat.

## TDD Rules

- For new behavior and bug fixes, use red/green TDD.
- **RED**: Write exactly one failing behavior test. Run it, confirm failure.
- **GREEN**: Write minimum code to pass. Never weaken tests.
- **REFACTOR**: Only after green. Run tests after each refactor.
- **Rust tests**: `cargo test <test_name>`
- **Report**: Behavior, Test, Command, RED reason, GREEN result, REFACTOR action.

## Agent skills

- When creating, viewing, or closing an issue, see `docs/agents/issue-tracker.md` (issues live as local markdown files under `docs/issues/`).
- When applying triage labels, see `docs/agents/triage-labels.md` (default five-label vocabulary).
- When updating domain docs, see `docs/agents/domain.md` (single-context layout with `CONTEXT.md` and `docs/adr/`).
