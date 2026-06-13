# Task Drawer Polish And RecallLoom Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the task drawer feel like a compact note workspace with larger date and goal editing interactions, while repairing the RecallLoom sidecar so validation passes again.

**Architecture:** Keep the existing `TaskDrawer` as the orchestration component, add only small presentational structure where it reduces local complexity, and preserve the current store persistence paths. Use a narrow TDD loop against the smallest practical frontend behavior surface in this repo, then apply a minimal, explicit damaged-sidecar repair for RecallLoom and immediately validate it.

**Tech Stack:** React 18, TypeScript, Zustand, TailwindCSS, Playwright, Node test runner, RecallLoom helper scripts

---

### Task 1: Add a frontend behavior test surface for the task drawer

**Files:**
- Modify: `package.json`
- Create: `tests/ui/taskDrawer.behavior.test.mjs`
- Create: `tests/ui/renderTaskDrawerHarness.mjs`
- Modify: `src/components/drawer/TaskDrawer.tsx`

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { renderTaskDrawerHarness } from './renderTaskDrawerHarness.mjs'

test('task drawer exposes markdown mode controls and expanded editors', async () => {
  const { getByText, queryByText } = await renderTaskDrawerHarness()

  assert.ok(getByText('编辑'))
  assert.ok(getByText('预览'))
  assert.ok(getByText('分屏'))
  assert.equal(queryByText('选择所属目标'), null)
  assert.equal(queryByText('截止时间'), null)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/ui/taskDrawer.behavior.test.mjs`  
Expected: FAIL because the harness file does not exist yet and the current drawer does not expose the planned UI surface.

- [ ] **Step 3: Write minimal implementation**

```js
// tests/ui/renderTaskDrawerHarness.mjs
export async function renderTaskDrawerHarness() {
  throw new Error('renderTaskDrawerHarness not implemented')
}
```

```json
// package.json
{
  "scripts": {
    "test:ui": "node --test tests/ui/*.test.mjs"
  }
}
```

- [ ] **Step 4: Run test to verify it still fails for the right reason**

Run: `node --test tests/ui/taskDrawer.behavior.test.mjs`  
Expected: FAIL with `renderTaskDrawerHarness not implemented`.

- [ ] **Step 5: Commit**

```bash
git add package.json tests/ui/taskDrawer.behavior.test.mjs tests/ui/renderTaskDrawerHarness.mjs
git commit -m "test: add task drawer behavior harness scaffold"
```

### Task 2: Implement markdown segmented modes in the task drawer

**Files:**
- Modify: `src/components/drawer/TaskDrawer.tsx`
- Modify: `tests/ui/taskDrawer.behavior.test.mjs`
- Modify: `tests/ui/renderTaskDrawerHarness.mjs`
- Test: `tests/ui/taskDrawer.behavior.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
test('task drawer switches between edit, preview, and split markdown modes', async () => {
  const { clickByText, getByText, getAllByTestId } = await renderTaskDrawerHarness()

  await clickByText('编辑')
  assert.equal(getAllByTestId('task-markdown-editor').length, 1)

  await clickByText('预览')
  assert.ok(getByText('Markdown 预览'))

  await clickByText('分屏')
  assert.equal(getAllByTestId('task-markdown-pane').length, 2)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/ui/taskDrawer.behavior.test.mjs`  
Expected: FAIL because the current drawer has no segmented markdown workspace.

- [ ] **Step 3: Write minimal implementation**

```tsx
const [markdownMode, setMarkdownMode] = useState<'edit' | 'preview' | 'split'>('split')
```

```tsx
<div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
  {(['edit', 'preview', 'split'] as const).map((mode) => (
    <button
      key={mode}
      type="button"
      data-testid={`task-markdown-mode-${mode}`}
      onClick={() => setMarkdownMode(mode)}
    >
      {mode === 'edit' ? '编辑' : mode === 'preview' ? '预览' : '分屏'}
    </button>
  ))}
</div>
```

```tsx
{markdownMode === 'edit' && <textarea data-testid="task-markdown-editor" ... />}
{markdownMode === 'preview' && <div data-testid="task-markdown-preview"><MarkdownContent content={contentDraft} /></div>}
{markdownMode === 'split' && (
  <div className="grid grid-cols-2 gap-4">
    <div data-testid="task-markdown-pane"><textarea data-testid="task-markdown-editor" ... /></div>
    <div data-testid="task-markdown-pane"><MarkdownContent content={contentDraft} /></div>
  </div>
)}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/ui/taskDrawer.behavior.test.mjs`  
Expected: PASS for markdown mode behavior.

- [ ] **Step 5: Commit**

```bash
git add src/components/drawer/TaskDrawer.tsx tests/ui/taskDrawer.behavior.test.mjs tests/ui/renderTaskDrawerHarness.mjs
git commit -m "feat: add segmented markdown workspace in task drawer"
```

### Task 3: Replace the tiny due-date inline field with an expanded editor card

**Files:**
- Modify: `src/components/drawer/TaskDrawer.tsx`
- Modify: `tests/ui/taskDrawer.behavior.test.mjs`
- Test: `tests/ui/taskDrawer.behavior.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
test('clicking due date opens the expanded due date editor', async () => {
  const { clickByText, getByLabelText } = await renderTaskDrawerHarness()

  await clickByText('今天 18:30')
  assert.ok(getByLabelText('截止时间'))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/ui/taskDrawer.behavior.test.mjs`  
Expected: FAIL because the due-date trigger and expanded card do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```tsx
const [activeEditor, setActiveEditor] = useState<'none' | 'dueDate' | 'linkedGoal'>('none')
```

```tsx
<button type="button" onClick={() => setActiveEditor(activeEditor === 'dueDate' ? 'none' : 'dueDate')}>
  {dueDateDraft ? formatTaskDueDateLabel(dueDateDraft) : '设置截止时间'}
</button>
```

```tsx
{activeEditor === 'dueDate' && (
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <label className="text-xs font-bold uppercase tracking-widest text-slate-400" htmlFor="task-due-date-input">
      截止时间
    </label>
    <input
      id="task-due-date-input"
      aria-label="截止时间"
      type="datetime-local"
      value={dueDateDraft}
      onChange={(event) => setDueDateDraft(event.target.value)}
      onBlur={() => saveTaskFields()}
    />
  </div>
)}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/ui/taskDrawer.behavior.test.mjs`  
Expected: PASS for the expanded due-date editor behavior.

- [ ] **Step 5: Commit**

```bash
git add src/components/drawer/TaskDrawer.tsx tests/ui/taskDrawer.behavior.test.mjs
git commit -m "feat: expand due date editing in task drawer"
```

### Task 4: Replace the tiny goal select with an expanded goal list picker

**Files:**
- Modify: `src/components/drawer/TaskDrawer.tsx`
- Modify: `tests/ui/taskDrawer.behavior.test.mjs`
- Test: `tests/ui/taskDrawer.behavior.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
test('clicking linked goal opens the expanded goal picker and selection updates the task', async () => {
  const { clickByText, getByText, getStoreState } = await renderTaskDrawerHarness()

  await clickByText('Goal Desk Tauri')
  assert.ok(getByText('选择所属目标'))

  await clickByText('Unlinked task')
  assert.equal(getStoreState().tasks[0].linkedGoalId, undefined)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/ui/taskDrawer.behavior.test.mjs`  
Expected: FAIL because the current drawer still uses a native `select`.

- [ ] **Step 3: Write minimal implementation**

```tsx
<button type="button" onClick={() => setActiveEditor(activeEditor === 'linkedGoal' ? 'none' : 'linkedGoal')}>
  {task.linkedGoalLabel || 'Unlinked task'}
</button>
```

```tsx
{activeEditor === 'linkedGoal' && (
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="text-xs font-bold uppercase tracking-widest text-slate-400">选择所属目标</div>
    <button type="button" onClick={() => saveTaskFields({ linkedGoalId: '' })}>Unlinked task</button>
    {goals.map((goal) => (
      <button
        key={goal.id}
        type="button"
        onClick={() => {
          setLinkedGoalIdDraft(goal.id)
          saveTaskFields({ linkedGoalId: goal.id })
          setActiveEditor('none')
        }}
      >
        {goal.title}
      </button>
    ))}
  </div>
)}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/ui/taskDrawer.behavior.test.mjs`  
Expected: PASS for expanded goal picker behavior.

- [ ] **Step 5: Commit**

```bash
git add src/components/drawer/TaskDrawer.tsx tests/ui/taskDrawer.behavior.test.mjs
git commit -m "feat: add expanded goal picker in task drawer"
```

### Task 5: Polish drawer layout and keep inline goal creation coherent

**Files:**
- Modify: `src/components/drawer/TaskDrawer.tsx`
- Modify: `src/components/drawer/MarkdownContent.tsx`
- Test: `tests/ui/taskDrawer.behavior.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
test('drawer keeps inline goal creation available inside the expanded goal editor', async () => {
  const { clickByText, getByPlaceholderText } = await renderTaskDrawerHarness()

  await clickByText('Goal Desk Tauri')
  assert.ok(getByPlaceholderText('新目标标题'))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/ui/taskDrawer.behavior.test.mjs`  
Expected: FAIL until inline goal creation is repositioned into the expanded goal editor.

- [ ] **Step 3: Write minimal implementation**

```tsx
{activeEditor === 'linkedGoal' && (
  <div>
    {/* goal list */}
    <div className="mt-4 grid grid-cols-[1fr_160px_auto] gap-2">
      <input placeholder="新目标标题" ... />
      <input placeholder="领域" ... />
      <button type="button">保存</button>
    </div>
  </div>
)}
```

```tsx
// MarkdownContent.tsx
<div className="prose prose-slate max-w-none break-words ...">
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/ui/taskDrawer.behavior.test.mjs`  
Expected: PASS for inline goal creation presence.

- [ ] **Step 5: Commit**

```bash
git add src/components/drawer/TaskDrawer.tsx src/components/drawer/MarkdownContent.tsx tests/ui/taskDrawer.behavior.test.mjs
git commit -m "feat: polish task drawer editor layout"
```

### Task 6: Repair the RecallLoom sidecar config and validate it

**Files:**
- Modify: `.recallloom/config.json`
- Test: `.recallloom/config.json`

- [ ] **Step 1: Write the failing validation check**

```bash
python3 /Users/zonkidd/.agents/skills/recallloom/scripts/validate_context.py /Users/zonkidd/IdeaProjects/goal-desk-tauri
```

Expected failure:

```text
Config file is missing required fields ['created_at', 'created_by', 'storage_mode']
```

- [ ] **Step 2: Run validation to verify it fails**

Run: `python3 /Users/zonkidd/.agents/skills/recallloom/scripts/validate_context.py /Users/zonkidd/IdeaProjects/goal-desk-tauri`  
Expected: FAIL with the missing config field error.

- [ ] **Step 3: Write minimal repair**

```json
{
  "storage_root": ".recallloom",
  "workspace_language": "zh-CN",
  "protocol_version": "1.0",
  "created_at": "<existing-sidecar-repair-timestamp>",
  "created_by": "Codex",
  "storage_mode": "hidden"
}
```

- [ ] **Step 4: Run validation to verify it passes**

Run: `python3 /Users/zonkidd/.agents/skills/recallloom/scripts/validate_context.py /Users/zonkidd/IdeaProjects/goal-desk-tauri`  
Expected: PASS with no config contract error.

- [ ] **Step 5: Commit**

```bash
git add .recallloom/config.json
git commit -m "chore: repair recallloom sidecar config"
```

### Task 7: Run regression checks and capture the TDD report

**Files:**
- Modify: `docs/superpowers/plans/2026-06-11-task-drawer-polish-and-recallloom-repair.md`

- [ ] **Step 1: Run the targeted frontend behavior test**

Run: `npm run test:ui`  
Expected: PASS for task drawer behavior.

- [ ] **Step 2: Run the existing browser-preview regression test**

Run: `node --test src/lib/browserPreview.test.mjs`  
Expected: PASS.

- [ ] **Step 3: Run the full project regression command currently available in this repo**

Run: `npm run test:e2e`  
Expected: PASS, or if the local Tauri app is not running, a documented blocked result with the exact missing prerequisite.

- [ ] **Step 4: Record the TDD cycle summary in the final implementation notes**

```text
Behavior:
- markdown segmented workspace
- expanded due date editor
- expanded goal picker
- RecallLoom config repair

Command:
- node --test tests/ui/taskDrawer.behavior.test.mjs
- node --test src/lib/browserPreview.test.mjs
- python3 /Users/zonkidd/.agents/skills/recallloom/scripts/validate_context.py /Users/zonkidd/IdeaProjects/goal-desk-tauri
- npm run test:e2e
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-06-11-task-drawer-polish-and-recallloom-repair.md
git commit -m "docs: record task drawer implementation plan"
```
