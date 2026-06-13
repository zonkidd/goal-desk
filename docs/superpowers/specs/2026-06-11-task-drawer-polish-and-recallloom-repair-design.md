# Task Drawer Polish And RecallLoom Repair Design

## Summary

This change combines two scoped improvements:

1. Refine the task detail drawer so date selection, goal/category selection, and markdown editing feel more deliberate and easier to use.
2. Repair the damaged RecallLoom sidecar so continuity helpers can resume working normally.

The UI direction keeps the current compact drawer feel, but makes edit interactions much larger once activated.

## Goals

- Keep the task drawer visually compact at rest.
- Make due-date editing significantly easier than the current small inline `datetime-local` control.
- Replace the tiny linked-goal selector with a larger, list-based picker interaction.
- Replace the current markdown area with a note-style segmented experience: `编辑`, `预览`, `分屏`.
- Preserve current save semantics unless a targeted behavior change is necessary.
- Restore `.recallloom/` to a valid protocol state without blind manual reconstruction.

## Non-Goals

- No new markdown editor dependency.
- No fuzzy search / command palette for goal selection in this slice.
- No redesign of the entire drawer shell or task status controls.
- No protocol migration beyond what is needed to make the current sidecar valid again.

## Current State

### Task drawer

[`/Users/zonkidd/IdeaProjects/goal-desk-tauri/src/components/drawer/TaskDrawer.tsx`](/Users/zonkidd/IdeaProjects/goal-desk-tauri/src/components/drawer/TaskDrawer.tsx) currently uses:

- a small inline `datetime-local` input
- a small inline native `select` for linked goal
- a rendered markdown preview followed by a plain `textarea`

This works functionally, but the important editable fields feel too small and the markdown flow feels bolted together rather than intentional.

### RecallLoom sidecar

[`/Users/zonkidd/IdeaProjects/goal-desk-tauri/.recallloom/config.json`](/Users/zonkidd/IdeaProjects/goal-desk-tauri/.recallloom/config.json) is missing required fields:

- `created_at`
- `created_by`
- `storage_mode`

Current RecallLoom helpers therefore treat the sidecar as damaged and refuse to trust it.

## Design

### 1. Compact rest state, expanded edit state

The task drawer should keep a compact top metadata row similar to the user's preferred "B" direction.

At rest:

- due date appears as a compact trigger chip
- linked goal appears as a compact trigger chip
- ongoing state remains a compact control

When editing:

- activating the date trigger expands an in-place edit card below the metadata row
- activating the linked-goal trigger expands an in-place selection panel below the metadata row
- only one expanded panel is open at a time

This preserves density while making interaction targets meaningfully larger.

### 2. Due date interaction

The due-date chip should display the current value in a readable compact form.

On activation, the drawer reveals a larger due-date card containing:

- a section label
- a full-width `datetime-local` input
- optional clear/reset action if a due date exists

The actual input can remain native HTML, but the editable surface around it should feel like a card rather than a tiny field embedded in a sentence.

### 3. Linked goal interaction

The linked-goal chip should display the current linked goal title or an explicit unlinked label.

On activation, the drawer reveals a larger linked-goal panel containing:

- a section label
- a tappable/clickable list of existing goals
- a visible unlinked option
- the existing inline "create goal and link" path, if it still fits the panel cleanly

This replaces the current tiny native `select` as the primary interaction.

### 4. Markdown segmented workspace

The markdown section becomes a single note workspace with three modes:

- `编辑`: show only the `textarea`
- `预览`: show only rendered markdown
- `分屏`: show editor and preview side by side

Key rules:

- continue using a plain `textarea`
- do not add a toolbar that implies unsupported rich-text features
- keep the current markdown renderer for preview
- keep save-on-blur unless a small adjustment is required for mode switching

Layout expectations:

- segmented control is placed in the section header
- the content region has stable sizing
- split mode should stay legible inside the current drawer width

## Components And State

### TaskDrawer changes

`TaskDrawer` will likely gain small local UI state for:

- active metadata editor: `none | dueDate | linkedGoal`
- markdown mode: `edit | preview | split`

The drawer should continue to own transient draft state for title, content, due date, linked goal, and ongoing flag.

### Markdown rendering

[`/Users/zonkidd/IdeaProjects/goal-desk-tauri/src/components/drawer/MarkdownContent.tsx`](/Users/zonkidd/IdeaProjects/goal-desk-tauri/src/components/drawer/MarkdownContent.tsx) can stay as the preview renderer.

If the section becomes too dense, a small presentational subcomponent for the segmented markdown workspace is acceptable, but only if it reduces complexity in `TaskDrawer`.

## Save Behavior

- Title save behavior remains on blur.
- Content save behavior remains on blur from the textarea.
- Due date saves when the expanded date editor changes or closes, following the existing `updateTaskFields` path.
- Linked goal saves immediately when the user selects an option from the expanded list.

No extra explicit "Save" button is required for this slice.

## Testing

This repo requires red/green TDD for behavior changes.

Behavior coverage should focus on:

- markdown mode switching renders the expected editor/preview/split surfaces
- linked-goal expanded selection updates the task through the public UI
- due-date expanded editor remains usable and persists changes

Tests should stay targeted to the smallest relevant frontend surface first, then broaden only if needed.

## RecallLoom Repair

Repair should follow RecallLoom's managed-file rules instead of ad hoc blind patching.

Repair target:

- restore required `config.json` metadata fields so `validate_context.py` passes

Repair approach for this repository:

1. inspect RecallLoom helper contracts and current expected config shape
2. apply the smallest consistent repair to `.recallloom/config.json`
3. rerun RecallLoom validation
4. only then treat the sidecar as healthy again

Because this is an explicit damaged-sidecar repair, the work should stay narrowly scoped and immediately verified.

## Risks

- Split mode can get cramped inside the drawer if spacing is too generous.
- Replacing native `select` with a custom list picker can accidentally regress keyboard accessibility if done carelessly.
- Save-on-blur for markdown needs care when switching tabs so content is not lost.

## Acceptance Criteria

- The task drawer keeps a compact overall feel.
- Clicking due date opens a visibly larger editing surface than today.
- Clicking linked goal opens a visibly larger list-based picker than today.
- Markdown editing uses `编辑 / 预览 / 分屏`.
- No new editor dependency is added.
- RecallLoom validation succeeds after repair.
