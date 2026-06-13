# Issue 017: Todo Inline Goal Creation Immediate Linking

Label: ready-for-agent

## Parent

`docs/prd/2026-06-12-todo-time-and-today-workbench-experience-prd.md`

## What to build

Repair the Todo inline Goal creation flow so creating a Goal from Todo editing immediately links the current Todo to the real newly created Goal entity and keeps the Todo editing session stable. The Todo Drawer should treat Goal creation as a lightweight fallback path inside Goal association, not as a separate workspace jump. If Goal creation fails, the Todo draft should remain intact and the Goal creation step should surface a retryable error instead of wiping the user's other edits.

## Acceptance criteria

- [ ] Creating a Goal inline from Todo editing immediately links the current Todo to the successfully created Goal record and updates the visible Goal state in the Drawer.
- [ ] Inline Goal creation remains a lightweight fallback path inside Goal association rather than navigating away into full Goal management.
- [ ] If inline Goal creation fails, the Todo draft state is preserved and the user can retry Goal creation without rebuilding unrelated edits.

## Blocked by

None - can start immediately
