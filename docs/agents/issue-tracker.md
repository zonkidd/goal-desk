# Issue Tracker

This repository uses local markdown issues.

## Location

- Product PRDs live in `docs/prd/`.
- Implementation issues live in `docs/issues/`.
- Scratch planning can live in `.scratch/<topic>/`.

## Publishing Rules

- Create one markdown file per issue.
- Use a stable numeric prefix: `001-...md`, `002-...md`.
- Include `Label: ready-for-agent` when an issue is ready to implement without more product clarification.
- Preserve parent PRD references in each issue body.

## No External Tracker

Do not call GitHub, GitLab, Jira, Linear, or other remote issue trackers unless the user explicitly changes this repository's tracker.
