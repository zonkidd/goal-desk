# Area and Goal Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Areas 只作为由目标归属派生的筛选维度展示，Goal 的“待确认”状态由程序自动计算，Goal 所属领域改为明确的“选择已有或新增领域”。

**Architecture:** 复用现有 `GoalCard.area` 字符串、Rust `areas` 表和 `create_goal_record` / `update_goal_record` 中按名称创建 Area 的逻辑，不新增独立 Areas CRUD。前端新增一个轻量的领域选择/新增控件，并在状态层暴露 `areaOptions`，所有目标创建、编辑和待办内联创建目标入口共享这份候选列表；Goal 的 `READY_TO_COMPLETE` 继续由 `deriveGoalStatus` 计算，但从所有手动状态入口移除并加一层 store/后端保护。

**Tech Stack:** Tauri 2, React, TypeScript, Zustand, Tailwind, Node test runner, Rust, SQLite.

---

## File Structure

- Modify: `src/types/app.ts`
  - Add `AreaOption` type so UI can distinguish display label from area value.
- Modify: `src/lib/workspaceDerivation.ts`
  - Add `areaOptions` to derived workspace state.
  - Add `deriveAreaOptions(goals)` pure helper.
  - Keep `READY_TO_COMPLETE` derivation here as the single frontend source of truth.
- Modify: `src/lib/workspaceDerivation.test.mjs`
  - Cover area option derivation.
  - Cover automatic `READY_TO_COMPLETE` derivation and regression that unfinished work returns to `ACTIVE`.
- Create: `src/components/common/AreaSelectWithCreate.tsx`
  - Shared UI control for “选择已有领域 / 新增领域”。
  - Does not create/delete/edit Areas directly; it only emits an area title string for existing goal save flows.
- Modify: `src/store/appStore.ts`
  - Add `areaOptions` state.
  - Prevent manual `READY_TO_COMPLETE` updates from `updateGoalStatus`.
  - Keep browser-preview goal field updates unchanged except that they use validated area strings from the UI.
- Modify: `src/lib/workspaceMutations.ts`
  - Prevent adapter-level manual `READY_TO_COMPLETE` persistence.
- Modify: `src/components/shell/Sidebar.tsx`
  - Remove clickable plus affordance beside “Areas 领域”。
  - Add short copy that Areas are generated from Goal ownership.
  - Read `areaOptions` from store instead of re-deriving inline.
- Modify: `src/components/views/GoalsView.tsx`
  - Remove `READY_TO_COMPLETE` from manual status filters or keep it as a read-only filter label, depending on UI copy below.
  - Replace free-text area input with `AreaSelectWithCreate`.
- Modify: `src/components/drawer/GoalDrawer.tsx`
  - Remove `READY_TO_COMPLETE` from status action buttons.
  - Show it as a computed status pill when active.
  - Replace free-text area input with `AreaSelectWithCreate` and label it as “所属领域”。
- Modify: `src/components/drawer/TaskDrawer.tsx`
  - Replace inline goal creation free-text Area input with `AreaSelectWithCreate`.
- Modify: `src-tauri/src/lib.rs`
  - Reject manual `GoalStatus::ReadyToComplete` in `update_goal_status_record`.
- Modify: `src-tauri/tests/domain_tests.rs`
  - Add a Rust-side unit test for status derivation if `derive_goal_status` is added to Rust; otherwise skip Rust domain status logic and keep this plan’s Rust test to command/record rejection.
- Modify: `src-tauri/tests/repository_tests.rs` or existing command-level test file if present
  - Add coverage that `update_goal_status_record(..., ReadyToComplete)` returns an error.

## Decisions Locked In

- “Areas 领域，目前不能新增、编辑与删除” means the sidebar must not expose direct Area CRUD. It remains a filter list generated from goals.
- “GOAL 所属领域 ... 调整为选择或添加” means area creation is allowed only as part of Goal creation/editing or inline Goal creation, by entering a new area title in a controlled “新增领域” mode.
- `READY_TO_COMPLETE` is not a user action. It appears when a goal has at least one linked task and all linked tasks are `DONE`, unless the goal is `PAUSED` or `ARCHIVED`.
- `COMPLETED` remains a user action because the user still needs to confirm completion after the computed “待确认” state appears.
- Do not change SQLite schema. Existing `areas` table and name-based creation already support this feature.

---

### Task 1: Add Area Options and Goal Status Derivation Tests

**Files:**
- Modify: `src/types/app.ts:11-27`
- Modify: `src/lib/workspaceDerivation.ts:20-50,118-149`
- Test: `src/lib/workspaceDerivation.test.mjs`

- [ ] **Step 1: Write failing tests for area options and automatic goal status**

Append these tests to `src/lib/workspaceDerivation.test.mjs`:

```js
test('area options are derived from all base goals with stable first-seen order', () => {
  const state = deriveWorkspaceState({
    baseTimeline: [],
    baseGoals: [
      buildGoal({ id: 'goal-1', area: '独立开发' }),
      buildGoal({ id: 'goal-2', area: '健康与运动' }),
      buildGoal({ id: 'goal-3', area: '独立开发' }),
      buildGoal({ id: 'goal-4', area: '  ' }),
    ],
    tasks: [],
    activeArea: 'ALL',
  })

  assert.deepEqual(state.areaOptions, [
    { value: '独立开发', label: '独立开发', goalCount: 2 },
    { value: '健康与运动', label: '健康与运动', goalCount: 1 },
  ])
})

test('goal enters ready-to-complete automatically when all linked todos are done', () => {
  const state = deriveWorkspaceState({
    baseTimeline: [],
    baseGoals: [buildGoal({ id: 'goal-ready', status: 'ACTIVE' })],
    tasks: [
      buildTask({ id: 'task-a', linkedGoalId: 'goal-ready', status: 'DONE' }),
      buildTask({ id: 'task-b', linkedGoalId: 'goal-ready', status: 'DONE' }),
    ],
    activeArea: 'ALL',
  })

  assert.equal(state.goals[0].status, 'READY_TO_COMPLETE')
})

test('goal leaves ready-to-complete automatically when linked work reopens', () => {
  const state = deriveWorkspaceState({
    baseTimeline: [],
    baseGoals: [buildGoal({ id: 'goal-active', status: 'READY_TO_COMPLETE' })],
    tasks: [
      buildTask({ id: 'task-done', linkedGoalId: 'goal-active', status: 'DONE' }),
      buildTask({ id: 'task-open', linkedGoalId: 'goal-active', status: 'TODO' }),
    ],
    activeArea: 'ALL',
  })

  assert.equal(state.goals[0].status, 'ACTIVE')
})

test('paused and archived goals do not become ready-to-complete automatically', () => {
  const state = deriveWorkspaceState({
    baseTimeline: [],
    baseGoals: [
      buildGoal({ id: 'goal-paused', status: 'PAUSED' }),
      buildGoal({ id: 'goal-archived', status: 'ARCHIVED' }),
    ],
    tasks: [
      buildTask({ id: 'task-paused', linkedGoalId: 'goal-paused', status: 'DONE' }),
      buildTask({ id: 'task-archived', linkedGoalId: 'goal-archived', status: 'DONE' }),
    ],
    activeArea: 'ALL',
  })

  assert.deepEqual(state.goals.map((goal) => goal.status), ['PAUSED', 'ARCHIVED'])
})
```

- [ ] **Step 2: Run the tests and verify they fail**

Run:

```bash
nvm use 26 && node src/lib/workspaceDerivation.test.mjs
```

Expected: FAIL because `state.areaOptions` does not exist yet. The status tests may already pass; keep them as regression coverage.

- [ ] **Step 3: Add `AreaOption` type**

In `src/types/app.ts`, after `GoalCard`, add:

```ts
export interface AreaOption {
  value: string
  label: string
  goalCount: number
}
```

- [ ] **Step 4: Add area option derivation**

Update `src/lib/workspaceDerivation.ts` imports and interfaces:

```ts
import type { AreaFilter, AreaOption, GoalCard, TimelineItem } from '../types/app'
```

Add `areaOptions` to `WorkspaceDerivedState`:

```ts
export interface WorkspaceDerivedState {
  goals: GoalCard[]
  areaOptions: AreaOption[]
  timeline: TimelineItem[]
  todayFocusTasks: Task[]
  todayAttentionGroups: TodayAttentionGroups
  todayRelevantGoals: TodayRelevantGoal[]
  inbox: InboxTaskGroups
  visibleTasks: Task[]
}
```

Update `deriveWorkspaceState` return value:

```ts
export function deriveWorkspaceState(input: DeriveWorkspaceStateInput): WorkspaceDerivedState {
  const goals = deriveGoalRecords(input.baseGoals, input.tasks)
  const areaOptions = deriveAreaOptions(input.baseGoals)
  const visibleGoals = filterGoalsByArea(goals, input.activeArea)
  const visibleTasks = filterTasksByArea(input.tasks, goals, input.activeArea)
  const todayFocusTasks =
    input.activeArea === 'ALL'
      ? getTodayFocusTasks(input.tasks, input.now)
      : filterTasksByArea(getTodayFocusTasks(input.tasks, input.now), goals, input.activeArea)
  const timeline =
    input.activeArea === 'ALL'
      ? deriveTodayTimeline(input.baseTimeline, input.tasks, input.now)
      : filterTimelineByArea(deriveTodayTimeline(input.baseTimeline, input.tasks, input.now), visibleTasks)
  const todayAttentionGroups =
    input.activeArea === 'ALL'
      ? deriveTodayAttentionGroups(input.tasks, input.now)
      : deriveTodayAttentionGroups(visibleTasks, input.now)
  const todayRelevantGoals = deriveTodayRelevantGoals(goals, todayAttentionGroups)

  return {
    goals: visibleGoals,
    areaOptions,
    timeline,
    todayFocusTasks,
    todayAttentionGroups,
    todayRelevantGoals,
    inbox: getInboxTaskGroups(visibleTasks, input.showCompletedTodos ?? false),
    visibleTasks,
  }
}
```

Add this exported helper near `filterGoalsByArea`:

```ts
export function deriveAreaOptions(goals: GoalCard[]): AreaOption[] {
  const counts = new Map<string, number>()

  for (const goal of goals) {
    const value = goal.area.trim()
    if (!value) continue
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  return Array.from(counts.entries()).map(([value, goalCount]) => ({
    value,
    label: value,
    goalCount,
  }))
}
```

- [ ] **Step 5: Run tests and verify they pass**

Run:

```bash
nvm use 26 && node src/lib/workspaceDerivation.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit only if the user explicitly asked for commits**

```bash
git add src/types/app.ts src/lib/workspaceDerivation.ts src/lib/workspaceDerivation.test.mjs
git commit -m "test: cover goal area options and computed status"
```

---

### Task 2: Expose Area Options in the Store and Guard Manual Ready Status

**Files:**
- Modify: `src/store/appStore.ts:16-75,121-147,172-353`
- Modify: `src/lib/workspaceMutations.ts:19-29,153-162`
- Test: `src/store/appStore.test.mjs`

- [ ] **Step 1: Write failing store tests**

Append these tests to `src/store/appStore.test.mjs`:

```js
test('store exposes area options derived from goals', () => {
  resetStore()
  useAppStore.getState().hydrateApp({
    tasks: [],
    timeline: [],
    goals: [
      {
        id: 'goal-a',
        title: 'A',
        area: '独立开发',
        description: '',
        status: 'ACTIVE',
        progress: 0,
        nextTodo: 'Keep going',
        taskCount: 0,
        createdAt: new Date('2026-06-12T09:00:00+08:00'),
        updatedAt: new Date('2026-06-12T09:00:00+08:00'),
      },
      {
        id: 'goal-b',
        title: 'B',
        area: '健康与运动',
        description: '',
        status: 'ACTIVE',
        progress: 0,
        nextTodo: 'Keep going',
        taskCount: 0,
        createdAt: new Date('2026-06-12T09:00:00+08:00'),
        updatedAt: new Date('2026-06-12T09:00:00+08:00'),
      },
    ],
    systemReminders: [],
    integrationStatus: { calendar: 'not_determined', reminders: 'not_determined' },
    statusMessage: 'ready',
  })

  assert.deepEqual(useAppStore.getState().areaOptions.map((area) => area.value), ['独立开发', '健康与运动'])
})

test('manual ready-to-complete status update is ignored', async () => {
  resetStore()
  useAppStore.setState({
    baseGoals: [
      {
        id: 'goal-manual-ready',
        title: 'Manual ready should not persist',
        area: '独立开发',
        description: '',
        status: 'ACTIVE',
        progress: 0,
        nextTodo: 'Keep going',
        taskCount: 0,
        createdAt: new Date('2026-06-12T09:00:00+08:00'),
        updatedAt: new Date('2026-06-12T09:00:00+08:00'),
      },
    ],
    goals: [
      {
        id: 'goal-manual-ready',
        title: 'Manual ready should not persist',
        area: '独立开发',
        description: '',
        status: 'ACTIVE',
        progress: 0,
        nextTodo: 'Keep going',
        taskCount: 0,
        createdAt: new Date('2026-06-12T09:00:00+08:00'),
        updatedAt: new Date('2026-06-12T09:00:00+08:00'),
      },
    ],
  })

  await useAppStore.getState().updateGoalStatus('goal-manual-ready', 'READY_TO_COMPLETE')

  assert.equal(useAppStore.getState().baseGoals[0].status, 'ACTIVE')
})
```

Also add `areaOptions: []` to `baseState` in the same file.

- [ ] **Step 2: Run the tests and verify they fail**

Run:

```bash
nvm use 26 && node src/store/appStore.test.mjs
```

Expected: FAIL because `areaOptions` is missing and `updateGoalStatus` still accepts `READY_TO_COMPLETE`.

- [ ] **Step 3: Add `areaOptions` to store state**

In `src/store/appStore.ts`, update the type import:

```ts
import type { AreaFilter, AreaOption, GoalCard, GoalStatus, IntegrationStatus, ReminderItem, TimelineItem, ViewKey } from '../types/app'
```

Add to `AppStoreState` after `baseGoals`:

```ts
  areaOptions: AreaOption[]
```

Add to `buildDerivedStateForArea` return object:

```ts
    areaOptions: derived.areaOptions,
```

Initialize the store near `baseGoals: []`:

```ts
  baseGoals: [],
  areaOptions: [],
```

- [ ] **Step 4: Guard manual ready status in the store**

At the start of `updateGoalStatus` in `src/store/appStore.ts`, add:

```ts
  updateGoalStatus: async (goalId, status) => {
    if (status === 'READY_TO_COMPLETE') return
    const adapter = createWorkspaceMutationAdapter()
```

- [ ] **Step 5: Guard manual ready status in the mutation adapter**

In `src/lib/workspaceMutations.ts`, update `updateGoalStatus`:

```ts
    async updateGoalStatus(goalId, status) {
      if (status === 'READY_TO_COMPLETE') return {}

      if (mode === 'tauri') {
        return {
          goal: await persistGoalStatus(goalId, status),
          statusMessage: 'Goal status saved',
        }
      }

      return { statusMessage: BROWSER_PREVIEW_STATUS }
    },
```

- [ ] **Step 6: Run store tests and derivation tests**

Run:

```bash
nvm use 26 && node src/store/appStore.test.mjs && node src/lib/workspaceDerivation.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit only if the user explicitly asked for commits**

```bash
git add src/store/appStore.ts src/store/appStore.test.mjs src/lib/workspaceMutations.ts
git commit -m "fix: prevent manual goal ready status"
```

---

### Task 3: Add Shared Area Select/Create Control

**Files:**
- Create: `src/components/common/AreaSelectWithCreate.tsx`

- [ ] **Step 1: Create the shared control**

Create `src/components/common/AreaSelectWithCreate.tsx` with this complete content:

```tsx
import { useMemo } from 'react'
import type { AreaOption } from '../../types/app'

const NEW_AREA_VALUE = '__new_area__'

interface AreaSelectWithCreateProps {
  value: string
  onChange: (value: string) => void
  areaOptions: AreaOption[]
  label?: string
  compact?: boolean
}

export function AreaSelectWithCreate({
  value,
  onChange,
  areaOptions,
  label = '所属领域',
  compact = false,
}: AreaSelectWithCreateProps) {
  const trimmedValue = value.trim()
  const existingValues = useMemo(() => new Set(areaOptions.map((area) => area.value)), [areaOptions])
  const isNewArea = trimmedValue !== '' && !existingValues.has(trimmedValue)
  const selectValue = isNewArea ? NEW_AREA_VALUE : trimmedValue

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</label>
        <span className="text-[11px] font-semibold text-slate-400">选择已有或新增</span>
      </div>
      <select
        value={selectValue}
        onChange={(event) => {
          const nextValue = event.target.value
          onChange(nextValue === NEW_AREA_VALUE ? '' : nextValue)
        }}
        className={`${
          compact ? 'h-8 rounded-lg px-3 text-xs' : 'h-11 rounded-2xl px-4 text-sm'
        } w-full border border-slate-200 bg-white font-semibold text-slate-600 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15`}
      >
        <option value="">选择领域</option>
        {areaOptions.map((area) => (
          <option key={area.value} value={area.value}>
            {area.label}（{area.goalCount}）
          </option>
        ))}
        <option value={NEW_AREA_VALUE}>新增领域...</option>
      </select>
      {(selectValue === NEW_AREA_VALUE || areaOptions.length === 0) && (
        <input
          value={isNewArea ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder="输入新领域名称"
          className={`${
            compact ? 'h-8 rounded-lg px-3 text-xs' : 'h-11 rounded-2xl px-4 text-sm'
          } w-full border border-dashed border-indigo-200 bg-indigo-50/40 font-semibold text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15`}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run TypeScript build and verify current imports are unaffected**

Run:

```bash
nvm use 26 && npm run build
```

Expected: PASS or only pre-existing build failures unrelated to the new file. If there is a new error, it should mention `AreaSelectWithCreate.tsx` and must be fixed before continuing.

- [ ] **Step 3: Commit only if the user explicitly asked for commits**

```bash
git add src/components/common/AreaSelectWithCreate.tsx
git commit -m "feat: add reusable area selector"
```

---

### Task 4: Update Sidebar and Goal Creation UI

**Files:**
- Modify: `src/components/shell/Sidebar.tsx:1-86`
- Modify: `src/components/views/GoalsView.tsx:1-126`

- [ ] **Step 1: Update Sidebar imports and state reads**

In `src/components/shell/Sidebar.tsx`, remove `Plus` from the import:

```tsx
import { Inbox, KanbanSquare, PauseCircle, Sun, Target, Workflow } from 'lucide-react'
```

Replace:

```tsx
  const goals = useAppStore((state) => state.baseGoals)
```

with:

```tsx
  const goals = useAppStore((state) => state.baseGoals)
  const areaOptions = useAppStore((state) => state.areaOptions)
```

Replace:

```tsx
  const areas = ['ALL', ...new Set(goals.map((goal) => goal.area))]
```

with:

```tsx
  const areas = [{ value: 'ALL', label: '全部领域', goalCount: goals.length }, ...areaOptions]
```

- [ ] **Step 2: Remove the sidebar plus affordance and add explanatory copy**

Replace the Areas header and map block with:

```tsx
        <div className="mb-3 mt-8 px-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Areas 领域</p>
          <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-400">由目标所属领域自动生成</p>
        </div>
        {areas.map((area, index) => {
          const swatch = area.value === 'ALL' ? 'bg-slate-400' : index === 1 ? 'bg-blue-500' : index === 2 ? 'bg-amber-500' : 'bg-emerald-500'
          const active = activeArea === area.value
          return (
            <motion.button
              key={area.value}
              whileHover={{ x: 2 }}
              onClick={() => setActiveArea(area.value)}
              className={cn(
                'flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all hover:bg-white/60',
                active ? 'bg-white/70 text-indigo-600 shadow-sm' : 'text-slate-600',
              )}
            >
              <div className="flex items-center gap-3"><div className={`h-2 w-2 rounded-full ${swatch}`} /> {area.label}</div>
              <span className="text-xs text-slate-400">{area.goalCount}</span>
            </motion.button>
          )
        })}
```

- [ ] **Step 3: Update GoalsView imports**

In `src/components/views/GoalsView.tsx`, add the shared control import:

```tsx
import { AreaSelectWithCreate } from '../common/AreaSelectWithCreate'
```

Keep status filter values as display filters, but label `READY_TO_COMPLETE` as computed in Step 5.

Add store read:

```tsx
  const areaOptions = useAppStore((state) => state.areaOptions)
```

Replace the initial area state:

```tsx
  const [area, setArea] = useState('独立开发')
```

with:

```tsx
  const [area, setArea] = useState('')
```

- [ ] **Step 4: Replace free-text area input in GoalsView**

Replace the area `<input ... placeholder="所属领域" ... />` with:

```tsx
            <AreaSelectWithCreate value={area} onChange={setArea} areaOptions={areaOptions} />
```

Replace the create handler reset block:

```tsx
                  setArea('独立开发')
```

with:

```tsx
                  setArea('')
```

- [ ] **Step 5: Make status filters clearer**

Add this helper below `goalStatuses`:

```tsx
const goalStatusLabels: Record<GoalStatus, string> = {
  ACTIVE: '进行中',
  PAUSED: '暂停',
  READY_TO_COMPLETE: '待确认（自动）',
  COMPLETED: '已完成',
  ARCHIVED: '已归档',
}
```

Replace:

```tsx
              <FilterButton key={status} active={activeStatus === status} label={status} onClick={() => setActiveStatus(status)} />
```

with:

```tsx
              <FilterButton key={status} active={activeStatus === status} label={goalStatusLabels[status]} onClick={() => setActiveStatus(status)} />
```

Replace card status text:

```tsx
                      {goal.status}
```

with:

```tsx
                      {goalStatusLabels[goal.status]}
```

- [ ] **Step 6: Run focused tests and build**

Run:

```bash
nvm use 26 && node src/lib/workspaceDerivation.test.mjs && node src/store/appStore.test.mjs && npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit only if the user explicitly asked for commits**

```bash
git add src/components/shell/Sidebar.tsx src/components/views/GoalsView.tsx
git commit -m "fix: clarify area filters and goal creation area selection"
```

---

### Task 5: Update Goal Drawer Status and Area Editing

**Files:**
- Modify: `src/components/drawer/GoalDrawer.tsx:1-168`

- [ ] **Step 1: Update imports and action list**

In `src/components/drawer/GoalDrawer.tsx`, replace the icon import:

```tsx
import { Pause, Play, CheckCircle2, Archive, Plus, X } from 'lucide-react'
```

Add shared control import:

```tsx
import { AreaSelectWithCreate } from '../common/AreaSelectWithCreate'
```

Replace `statusActions` with:

```tsx
const statusActions: Array<{ status: Exclude<GoalStatus, 'READY_TO_COMPLETE'>; label: string; icon: typeof Play }> = [
  { status: 'ACTIVE', label: '开启', icon: Play },
  { status: 'PAUSED', label: '暂停', icon: Pause },
  { status: 'COMPLETED', label: '完成', icon: CheckCircle2 },
  { status: 'ARCHIVED', label: '归档', icon: Archive },
]

const statusLabels: Record<GoalStatus, string> = {
  ACTIVE: '进行中',
  PAUSED: '暂停',
  READY_TO_COMPLETE: '待确认（自动）',
  COMPLETED: '已完成',
  ARCHIVED: '已归档',
}
```

- [ ] **Step 2: Read area options from store**

After `tasks` store read, add:

```tsx
  const areaOptions = useAppStore((state) => state.areaOptions)
```

- [ ] **Step 3: Add computed status copy in the drawer header**

Replace the task count line:

```tsx
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{goal.taskCount} 个关联任务</div>
```

with:

```tsx
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                  <span>{goal.taskCount} 个关联任务</span>
                  <span className="rounded-full bg-indigo-50 px-2 py-1 text-[11px] text-indigo-600">{statusLabels[goal.status]}</span>
                  {goal.status === 'READY_TO_COMPLETE' && <span className="normal-case tracking-normal text-slate-400">所有关联任务已完成，请确认是否完成目标</span>}
                </div>
```

- [ ] **Step 4: Replace free-text area input with selector**

Replace the `<input value={area} ... />` in the two-column grid with:

```tsx
                  <AreaSelectWithCreate
                    value={area}
                    onChange={setArea}
                    areaOptions={areaOptions}
                    label="所属领域"
                  />
```

Because the selector is taller than the progress card, replace the wrapping grid class:

```tsx
                <div className="grid grid-cols-2 gap-3">
```

with:

```tsx
                <div className="grid grid-cols-[1fr_160px] items-start gap-3">
```

- [ ] **Step 5: Make field save resilient to empty area**

Replace every GoalDrawer blur save call:

```tsx
onBlur={() => void updateGoalFields(goal.id, { title, area, description })}
```

with:

```tsx
onBlur={() => void updateGoalFields(goal.id, { title, area: area.trim() || goal.area, description })}
```

- [ ] **Step 6: Run focused build**

Run:

```bash
nvm use 26 && npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit only if the user explicitly asked for commits**

```bash
git add src/components/drawer/GoalDrawer.tsx
git commit -m "fix: make goal ready status computed-only in drawer"
```

---

### Task 6: Update Inline Goal Creation in Task Drawer

**Files:**
- Modify: `src/components/drawer/TaskDrawer.tsx:1-80,545-665`

- [ ] **Step 1: Add shared control import and area options read**

At the top of `src/components/drawer/TaskDrawer.tsx`, add:

```tsx
import { AreaSelectWithCreate } from '../common/AreaSelectWithCreate'
```

Near the existing store reads in `TaskDrawer`, add:

```tsx
  const areaOptions = useAppStore((state) => state.areaOptions)
```

Pass `areaOptions` into `GoalPickerPopover` where it is rendered:

```tsx
                        areaOptions={areaOptions}
```

- [ ] **Step 2: Update GoalPickerPopover props**

Change the import type usage by adding `AreaOption` to the existing app type import if one exists, or add this import near the top:

```tsx
import type { AreaOption } from '../../types/app'
```

Update `GoalPickerPopover` function props type:

```tsx
  areaOptions,
}: {
  draft: {
    linkedGoalIdDraft: string
    isCreatingGoalInline: boolean
    newGoalTitle: string
    newGoalArea: string
  }
  goals: Array<{ id: string; title: string; area: string }>
  areaOptions: AreaOption[]
  editingSession: {
```

- [ ] **Step 3: Replace inline free-text Area input**

Replace this block:

```tsx
              <div className="flex gap-2">
                <input
                  value={draft.newGoalArea}
                  onChange={(event) => editingSession.actions.setNewGoalArea(event.target.value)}
                  placeholder="Area"
                  className="h-8 flex-1 rounded-lg border border-slate-200 bg-white/80 px-3 text-xs outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                />
                <button
                  type="button"
                  onClick={() => void editingSession.actions.createAndLinkGoal()}
                  className="rounded-lg bg-slate-900 px-3 text-xs font-bold text-white"
                >
                  创建
                </button>
                <button
                  type="button"
                  onClick={() => editingSession.actions.cancelInlineGoalCreation()}
                  className="rounded-lg border border-slate-200 bg-white/70 px-3 text-xs font-bold text-slate-500"
                >
                  取消
                </button>
              </div>
```

with:

```tsx
              <AreaSelectWithCreate
                value={draft.newGoalArea}
                onChange={editingSession.actions.setNewGoalArea}
                areaOptions={areaOptions}
                label="所属领域"
                compact
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void editingSession.actions.createAndLinkGoal()}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"
                >
                  创建
                </button>
                <button
                  type="button"
                  onClick={() => editingSession.actions.cancelInlineGoalCreation()}
                  className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-xs font-bold text-slate-500"
                >
                  取消
                </button>
              </div>
```

- [ ] **Step 4: Run build and existing inline goal tests**

Run:

```bash
nvm use 26 && node src/store/appStore.test.mjs && npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit only if the user explicitly asked for commits**

```bash
git add src/components/drawer/TaskDrawer.tsx
git commit -m "fix: use area selector for inline goal creation"
```

---

### Task 7: Reject Manual Ready Status in Rust Persistence

**Files:**
- Modify: `src-tauri/src/lib.rs:123-144`
- Test: `src-tauri/tests/repository_tests.rs`

- [ ] **Step 1: Add failing Rust test**

Append this test to `src-tauri/tests/repository_tests.rs`:

```rust
use goal_desk_tauri::{create_goal_record, update_goal_status_record};
use goal_desk_tauri::domain::GoalStatus;
use tempfile::tempdir;

#[test]
fn update_goal_status_rejects_manual_ready_to_complete() {
    let directory = tempdir().unwrap();
    let database_path = directory.path().join("workspace.sqlite");
    let goal = create_goal_record(
        &database_path,
        "Confirm computed status".to_string(),
        Some("独立开发".to_string()),
        "".to_string(),
        GoalStatus::Active,
    )
    .unwrap();

    let result = update_goal_status_record(
        &database_path,
        goal.id.to_string(),
        GoalStatus::ReadyToComplete,
    );

    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "Ready-to-complete is computed automatically");
}
```

If `repository_tests.rs` already imports any of these names, merge imports instead of duplicating them.

- [ ] **Step 2: Run the Rust test and verify it fails**

Run:

```bash
nvm use 26 && cd src-tauri && cargo test update_goal_status_rejects_manual_ready_to_complete
```

Expected: FAIL because `update_goal_status_record` currently accepts `GoalStatus::ReadyToComplete`.

- [ ] **Step 3: Add backend guard**

In `src-tauri/src/lib.rs`, at the start of `update_goal_status_record` after the function signature and before parsing `goal_id`, add:

```rust
    if status == GoalStatus::ReadyToComplete {
        return Err("Ready-to-complete is computed automatically".to_string());
    }
```

The resulting function start should be:

```rust
pub fn update_goal_status_record(
    path: &std::path::Path,
    goal_id: String,
    status: GoalStatus,
) -> Result<Goal, String> {
    if status == GoalStatus::ReadyToComplete {
        return Err("Ready-to-complete is computed automatically".to_string());
    }

    let goal_id = Uuid::parse_str(&goal_id).map_err(|error| error.to_string())?;
```

- [ ] **Step 4: Run Rust tests**

Run:

```bash
nvm use 26 && cd src-tauri && cargo test
```

Expected: PASS.

- [ ] **Step 5: Commit only if the user explicitly asked for commits**

```bash
git add src-tauri/src/lib.rs src-tauri/tests/repository_tests.rs
git commit -m "fix: reject manual ready goal status"
```

---

### Task 8: Manual Verification in the Running App

**Files:**
- No code changes.

- [ ] **Step 1: Start the app**

Run:

```bash
nvm use 26 && npm run dev
```

Expected: Vite starts on `http://localhost:1420`.

- [ ] **Step 2: Verify Areas sidebar behavior**

In the browser preview:

1. Open the app.
2. Look at the sidebar section “Areas 领域”.
3. Confirm there is no plus/add/edit/delete control in that section.
4. Confirm the helper text says the list is generated from Goal ownership.
5. Click an area and confirm the current filter changes.

- [ ] **Step 3: Verify Goal creation area behavior**

1. Open “目标”.
2. In “新建目标”, open the “所属领域” select.
3. Choose an existing area and create a goal.
4. Confirm the new goal shows that area badge.
5. Create another goal with “新增领域...” and type a new area name.
6. Confirm the sidebar shows the new area after the goal exists.

- [ ] **Step 4: Verify Goal drawer behavior**

1. Open any goal drawer.
2. Confirm there is no “待确认” button in the status action buttons.
3. Confirm the drawer still shows the current status label.
4. Change the area using the selector.
5. Confirm the goal card and sidebar area list update after blur/save.

- [ ] **Step 5: Verify automatic ready status**

1. Pick or create a goal with linked tasks.
2. Mark every linked task as `DONE`.
3. Reopen or refresh the Goal view.
4. Confirm the goal status displays “待确认（自动）”.
5. Reopen one linked task back to `TODO` or `IN_PROGRESS`.
6. Confirm the goal status returns to “进行中”.

- [ ] **Step 6: Run full validation**

Run:

```bash
nvm use 26 && node src/lib/workspaceDerivation.test.mjs && node src/store/appStore.test.mjs && npm run build && cd src-tauri && cargo test
```

Expected: PASS.

---

## Self-Review

**Spec coverage:**
- Areas cannot be directly added/edited/deleted from the Areas section: Task 4 removes the sidebar plus and adds generated-list copy.
- Goal `READY_TO_COMPLETE` is automatic: Tasks 1, 2, 5, and 7 add tests, remove UI action, and guard persistence.
- Goal area field explanation: Tasks 3, 4, 5, and 6 label it “所属领域” and show “选择已有或新增”.
- Goal area cannot be arbitrary invisible editing: Tasks 3, 4, 5, and 6 replace free-text fields with a controlled select/create flow.

**Placeholder scan:**
- No `TBD`, no deferred implementation step, and every code-changing step includes concrete code blocks.

**Type consistency:**
- `AreaOption` is defined in `src/types/app.ts` and used by `workspaceDerivation`, store, and `AreaSelectWithCreate`.
- `areaOptions` is returned by `deriveWorkspaceState` and stored in `AppStoreState`.
- `READY_TO_COMPLETE` remains in `GoalStatus` for computed display and filtering, but is excluded from manual drawer action type with `Exclude<GoalStatus, 'READY_TO_COMPLETE'>`.
