# Goal Desk Tauri

Goal Desk Tauri is a local-first macOS desktop app for goals, projects, todos, reminders, and calendar context.

## Language

**Goal**:
A container for related Todos and the user-facing result they want to achieve. In this version, Goal is the primary progress object: it groups Todos, reflects completion progress, and acts as the board-level outcome the user manages.
_Avoid_: Todo, reminder, calendar event, Project

**Project**:
A reserved future concept for bounded work. It is not an active product object in this version.
_Avoid_: Goal, Todo

**Area**:
A stable life or work domain, similar to Things 3 Areas. Areas can contain Projects and Goals.
_Avoid_: tag, folder

**Todo**:
A concrete action the user can complete, schedule, and optionally attach to one Goal. A Todo may also exist without any Goal.
_Avoid_: Goal, reminder, note

**Todo Status**:
The lifecycle state of a Todo. A new Todo starts as `TODO` (not started), moves to `IN_PROGRESS` only through Start, moves back to `IN_PROGRESS` from `PAUSED` only through Resume, and may complete from any active state.
_Avoid_: phase, goal status

**Planned Start Time**:
The optional time a Todo is intended to enter the user's execution view. It is distinct from the Todo deadline and drives when a Todo appears on the Today Timeline.
_Avoid_: due date, deadline, reminder time

**Due Time**:
The optional latest time by which a Todo should be finished. It is distinct from the Todo planned start time and drives deadline visibility and overdue judgment.
_Avoid_: start time, schedule time

**Reminder**:
A time-triggered attention item that may link to a Todo, Goal, Project, or external Calendar Event.
_Avoid_: Todo, calendar event

**Calendar Event**:
A read-only item imported from macOS Calendar through EventKit.
_Avoid_: Reminder, Todo

**Today Timeline**:
The unified view that mixes today's Calendar Events, Reminders, and scheduled Todos in chronological order.
_Avoid_: calendar view, todo list

**Today Workbench**:
The workspace that shows only the things the user should handle today, centered on the Today Timeline and today's actionable Todos. Goals are not primary Today items, but may appear as an optional supporting view when their time range includes today.
_Avoid_: goal board, dashboard

**Quick Capture**:
The global Option+Space entry point for capturing a Todo or idea without switching context.
_Avoid_: full editor

**Natural Language Time**:
The lightweight parser that turns phrases such as `明天下午三点` into a scheduled local time.
_Avoid_: AI assistant, full NLP engine
