# Architecture Improvements Follow-up

Date: 2026-06-12
Status: ready-for-follow-up

## Purpose

Record the concrete implementation direction for the architecture improvements discovered after finishing:

- Issue 012: Inbox Completed Todo Visibility
- Issue 013: Todo Status Action State Machine
- Issue 014: Todo Goal Linking Flow Clarity

This document is intended as a clean handoff for a new session.

## Context

Recent work improved user-visible behavior, but it also exposed architectural friction around the Todo editing flow:

- Todo status rules now live across `TaskDrawer`, `taskPresentation`, and `appStore`
- Goal association rules are split between `TaskDrawer` and `appStore`
- derived workspace rules are split between `taskPresentation` and `appStore`
- runtime-specific mutation details still leak into `appStore`

The result is working behavior, but shallow modules and weak locality.

## Recommended Order

1. Deepen the Todo editing module
2. Deepen the workspace derivation module
3. Consider deepening the runtime mutation adapter

The first item should be tackled first. It has the highest leverage and best locality payoff.

---

## 1. Deepen The Todo Editing Module

### Goal

Create one Todo editing module whose interface owns:

- Todo draft state
- Todo field saving
- Goal association
- inline Goal creation flow
- valid status actions for the current Todo

`TaskDrawer` should become a rendering module, not the place where Todo editing rules live.

### Current Friction

- `TaskDrawer` owns too much implementation:
  - draft state
  - editor toggle state
  - Goal linking orchestration
  - inline Goal creation orchestration
  - save ordering
- `appStore` knows Todo mutation details and some Goal resolution details
- `taskPresentation` knows status action rules
- tests must cross several modules to understand one Todo editing workflow

### Target Module Shape

Proposed module name:

- `todoEditing`

### Proposed Interface

The exact type names can change, but the module should expose roughly this shape:

```ts
type TodoEditingSession = {
  draft: {
    title: string
    content: string
    dueDateDraft: string
    linkedGoalIdDraft: string
    isOngoingDraft: boolean
    markdownMode: 'edit' | 'preview' | 'split'
    activeEditor: 'none' | 'dueDate' | 'linkedGoal'
    isCreatingGoalInline: boolean
    newGoalTitle: string
    newGoalArea: string
  }
  capabilities: {
    canChangeStatus: boolean
    statusActions: TaskStatus[]
  }
  actions: {
    setTitle(value: string): void
    setContent(value: string): void
    setDueDateDraft(value: string): void
    setLinkedGoalIdDraft(value: string): void
    setIsOngoingDraft(value: boolean): void
    setMarkdownMode(value: 'edit' | 'preview' | 'split'): void
    setActiveEditor(value: 'none' | 'dueDate' | 'linkedGoal'): void
    startInlineGoalCreation(): void
    cancelInlineGoalCreation(): void
    setNewGoalTitle(value: string): void
    setNewGoalArea(value: string): void
    saveFields(): Promise<void>
    linkGoal(goalId: string): Promise<void>
    unlinkGoal(): Promise<void>
    createAndLinkGoal(): Promise<string | undefined>
    submitStatus(next: TaskStatus, note?: string): Promise<void>
    saveContentIfChanged(): Promise<void>
  }
}
```

### Implementation Direction

- Move Todo editing behavior out of `TaskDrawer`
- Keep `TaskDrawer` focused on:
  - layout
  - visual sections
  - wiring DOM events to the Todo editing module
- The Todo editing module should be the only place that knows:
  - how to resolve `linkedGoalId -> linkedGoalLabel`
  - when inline Goal creation keeps Todo Drawer context
  - how status actions are derived for the current Todo
  - when field saves should occur

### Concrete Refactor Steps

1. Create a new module for Todo editing state and actions
2. Move `saveTaskFields` behavior into that module
3. Move inline Goal creation behavior into that module
4. Move Goal unlink / relink behavior into that module
5. Replace local `TaskDrawer` orchestration with calls into the new module
6. Keep `StatusMachineButtons` consuming status actions from the same module or a shared helper

### Testing Direction

Prefer tests against the Todo editing module interface, not against `TaskDrawer` implementation details.

Add tests for:

- selecting an existing Goal links the Todo
- unlinking a Goal clears the Todo Goal association
- inline Goal creation keeps Todo Drawer context
- inline Goal creation links the new Goal immediately
- `DONE` Todo exposes no status actions
- `IN_PROGRESS` Todo exposes only pause and complete

---

## 2. Deepen The Workspace Derivation Module

### Goal

Concentrate all workspace-visible derivation rules into one module.

This includes:

- Inbox group derivation
- Today focus derivation
- Today Timeline derivation
- Goal progress / next Todo derivation
- Area-filtered visible state derivation

### Current Friction

- `appStore` has `buildDerivedStateForArea`, `mergeTimelineWithDeskTasks`, reminder sync effects, and filtering orchestration
- `taskPresentation` has status labels, Inbox grouping, Goal derivation, area filtering, and Today focus derivation
- understanding one visible rule often requires bouncing between both modules

### Target Module Shape

Proposed module name:

- `workspaceDerivation`

### Proposed Interface

```ts
type WorkspaceDerivedState = {
  goals: GoalCard[]
  timeline: TimelineItem[]
  todayFocusTasks: Task[]
  inbox: {
    activeTasks: Task[]
    pausedTasks: Task[]
    completed: {
      totalCount: number
      visibleTasks: Task[]
      isCollapsedByDefault: true
    }
  }
}

function deriveWorkspaceState(input: {
  baseTimeline: TimelineItem[]
  baseGoals: GoalCard[]
  tasks: Task[]
  activeArea: AreaFilter
  showCompletedTodos?: boolean
}): WorkspaceDerivedState
```

### Implementation Direction

- Move visible-state derivation into one module
- `appStore` should call one derive function instead of orchestrating several helpers
- `InboxView`, `TodayView`, and later other view modules should consume derived state, not recompute it

### Concrete Refactor Steps

1. Create `deriveWorkspaceState`
2. Move Goal derivation, Today focus derivation, Inbox grouping, and area filtering under that interface
3. Replace `buildDerivedStateForArea` with one call to the new module
4. Remove duplicate orchestration where possible
5. Keep view modules dumb: they render the derived state only

### Testing Direction

Add tests for:

- completed Todos appear only in Inbox completed group
- paused and completed Todos stay out of Today focus
- Goal progress and next Todo remain correct under area filtering
- Today Timeline stays aligned with scheduled Todos

---

## 3. Deepen The Runtime Mutation Adapter

### Goal

Reduce runtime-specific mutation details leaking into `appStore`.

### Current Friction

- `appStore` contains many `isTauriRuntime()` branches
- Todo and Goal mutation payload shaping still happens near the store
- the store still knows more about runtime mode and persistence payload shape than it should

### Recommendation Strength

Speculative for now.

This should be done only after the Todo editing module and workspace derivation module are improved, or when a second adapter becomes real enough to justify the seam more strongly.

### Target Module Shape

Proposed module name:

- `workspaceMutations`

### Possible Interface

```ts
type WorkspaceMutations = {
  createGoal(input: GoalDraft, options?: CreateGoalOptions): Promise<GoalCard>
  updateTaskFields(taskId: string, input: TodoFieldUpdate): Promise<Task>
  updateTaskStatus(taskId: string, next: TaskStatus, note?: string): Promise<Task>
  updateTaskContent(taskId: string, content: string): Promise<Task>
}
```

### Implementation Direction

- Callers should pass domain intent
- the adapter should own:
  - runtime mode branching
  - persistence payload shape
  - mutation normalization
  - Goal label resolution when appropriate

### Testing Direction

Only pursue this once there is enough variation to justify the seam:

- browser preview adapter
- Tauri adapter

If there is still effectively one adapter, do not over-abstract it.

---

## Suggested First Session Plan

If starting a fresh session, begin with the Todo editing module only.

Suggested session scope:

1. Introduce a Todo editing module
2. Move Goal association logic into it
3. Move inline Goal creation logic into it
4. Move status-action derivation use-site into it or a single shared helper
5. Rewire `TaskDrawer` to render from that module
6. Keep behavior unchanged while improving locality

## Suggested First Tests

Start TDD with one tracer bullet:

- “inline Goal creation links the new Goal and keeps Todo Drawer context”

Then continue with:

- “existing Goal selection links the Todo and closes the Goal picker”
- “DONE Todo exposes no status actions”
- “saving Todo fields resolves Goal label from Goal identity”

## Success Criteria For The Refactor

The refactor is successful if:

- `TaskDrawer` becomes materially smaller
- fewer Todo-editing rules live directly inside React event handlers
- Todo editing tests can hit one interface instead of several modules
- Goal association and status rules gain better locality
- user-visible behavior from issues `012-014` remains unchanged
