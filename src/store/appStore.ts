import { create } from 'zustand'
import {
  addTaskNote as persistTaskNote,
  captureTask,
  createGoal as persistGoal,
  getCurrentWindowLabel,
  isTauriRuntime,
  setSystemReminderCompleted as persistSystemReminderCompleted,
  showQuickCaptureWindow as openNativeQuickCaptureWindow,
  updateGoalFields as persistGoalFields,
  updateGoalStatus as persistGoalStatus,
  updateTaskContent as persistTaskContent,
  updateTaskFields as persistTaskFields,
  updateTaskStatus as persistTaskStatus,
} from '../lib/desktopApi'
import { parseBrowserQuickCapture } from '../lib/quickCapture'
import {
  deriveGoalRecords,
  filterGoalsByArea,
  filterTasksByArea,
  filterTimelineByArea,
  getRuntimeModeStatusMessage,
  getTodayFocusTasks,
} from '../lib/taskPresentation'
import type { AreaFilter, GoalCard, GoalStatus, IntegrationStatus, ReminderItem, TimelineItem, ViewKey } from '../types/app'
import type { Task, TaskActivityAction, TaskStatus } from '../types/task'

const BROWSER_PREVIEW_STATUS = 'Browser preview only · changes stay in memory'

interface HydratePayload {
  tasks: Task[]
  timeline: TimelineItem[]
  goals: GoalCard[]
  systemReminders: ReminderItem[]
  integrationStatus: IntegrationStatus
  statusMessage: string
}

interface AppStoreState {
  currentView: ViewKey
  activeArea: AreaFilter
  tasks: Task[]
  todayFocusTasks: Task[]
  timeline: TimelineItem[]
  baseTimeline: TimelineItem[]
  goals: GoalCard[]
  baseGoals: GoalCard[]
  systemReminders: ReminderItem[]
  integrationStatus: IntegrationStatus
  selectedTaskId?: string
  selectedGoalId?: string
  selectedReminderId?: string
  statusMessage: string
  isLoading: boolean
  isTaskDrawerOpen: boolean
  isGoalDrawerOpen: boolean
  isReminderDrawerOpen: boolean
  isQuickCaptureOpen: boolean
  setView: (view: ViewKey) => void
  setActiveArea: (area: AreaFilter) => void
  hydrateApp: (payload: HydratePayload) => void
  setLoading: (value: boolean) => void
  setStatusMessage: (value: string) => void
  receiveExternalTask: (task: Task) => void
  openTaskDrawer: (taskId: string) => void
  closeTaskDrawer: () => void
  openGoalDrawer: (goalId: string) => void
  closeGoalDrawer: () => void
  openReminderDrawer: (reminderId?: string) => void
  closeReminderDrawer: () => void
  openQuickCapture: () => void
  closeQuickCapture: () => void
  addTask: (title: string) => Promise<void>
  createGoal: (input: { title: string; area: string; description?: string }) => Promise<string | undefined>
  updateGoalFields: (goalId: string, input: { title: string; area: string; description: string }) => Promise<void>
  updateGoalStatus: (goalId: string, status: GoalStatus) => Promise<void>
  createTaskForGoal: (goalId: string, title: string) => Promise<void>
  addTaskNote: (taskId: string, note: string) => Promise<void>
  updateTaskStatus: (taskId: string, status: TaskStatus, note?: string) => Promise<void>
  updateTaskContent: (taskId: string, content: string) => Promise<void>
  updateTaskFields: (
    taskId: string,
    input: {
      title: string
      dueDate?: Date
      linkedGoalId?: string
      linkedGoalLabel?: string
      isOngoing?: boolean
    },
  ) => Promise<void>
  toggleSystemReminderDone: (reminderId: string, done: boolean) => Promise<void>
}

function logActionForStatus(status: TaskStatus): TaskActivityAction {
  switch (status) {
    case 'PAUSED':
      return 'PAUSED'
    case 'DONE':
      return 'COMPLETED'
    case 'IN_PROGRESS':
      return 'RESUMED'
    default:
      return 'NOTE_ADDED'
  }
}

function replaceTask(tasks: Task[], nextTask: Task) {
  const index = tasks.findIndex((task) => task.id === nextTask.id)
  if (index === -1) return [nextTask, ...tasks]
  return tasks.map((task) => (task.id === nextTask.id ? nextTask : task))
}

function replaceGoal(goals: GoalCard[], nextGoal: GoalCard) {
  const index = goals.findIndex((goal) => goal.id === nextGoal.id)
  if (index === -1) return [nextGoal, ...goals]
  return goals.map((goal) => (goal.id === nextGoal.id ? nextGoal : goal))
}

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate()
}

function formatTimeLabel(date: Date) {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function timeLabelSortValue(timeLabel: string) {
  const [hours, minutes] = timeLabel.split(':').map((value) => Number.parseInt(value, 10))
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return Number.MAX_SAFE_INTEGER
  return hours * 60 + minutes
}

function mergeTimelineWithDeskTasks(baseTimeline: TimelineItem[], tasks: Task[]): TimelineItem[] {
  const today = startOfToday()
  const taskItems = tasks
    .filter((task) => task.dueDate && isSameDay(task.dueDate, today))
    .map((task) => ({
      id: task.id,
      title: task.title,
      timeLabel: formatTimeLabel(task.dueDate as Date),
      source: 'todo' as const,
      readonly: false,
      done: task.status === 'DONE',
      sourceLabel: task.linkedGoalLabel || 'Desk Task',
    }))

  const merged = [...baseTimeline.filter((item) => !taskItems.some((task) => task.id === item.id)), ...taskItems]
  return merged.sort((left, right) => timeLabelSortValue(left.timeLabel) - timeLabelSortValue(right.timeLabel))
}

function mergeGoalsWithTasks(baseGoals: GoalCard[], tasks: Task[]): GoalCard[] {
  return baseGoals.map((goal) => {
    const linkedTasks = tasks.filter((task) => task.linkedGoalId === goal.id)
    if (linkedTasks.length === 0) return goal

    const completedTasks = linkedTasks.filter((task) => task.status === 'DONE').length
    const nextTask =
      linkedTasks
        .filter((task) => task.status !== 'DONE')
        .sort((left, right) => {
          const leftTime = left.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER
          const rightTime = right.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER
          return leftTime - rightTime
        })[0]?.title || 'Keep going'

    return {
      ...goal,
      progress: Math.round((completedTasks / linkedTasks.length) * 100),
      nextTodo: nextTask,
    }
  })
}

function buildDerivedState(baseTimeline: TimelineItem[], baseGoals: GoalCard[], tasks: Task[]) {
  return buildDerivedStateForArea(baseTimeline, baseGoals, tasks, 'ALL')
}

function buildDerivedStateForArea(baseTimeline: TimelineItem[], baseGoals: GoalCard[], tasks: Task[], activeArea: AreaFilter) {
  const derivedGoals = deriveGoalRecords(baseGoals, tasks)
  const visibleGoals = filterGoalsByArea(derivedGoals, activeArea)
  const visibleTasks = filterTasksByArea(tasks, derivedGoals, activeArea)
  return {
    todayFocusTasks: activeArea === 'ALL' ? getTodayFocusTasks(tasks) : filterTasksByArea(getTodayFocusTasks(tasks), derivedGoals, activeArea),
    timeline:
      activeArea === 'ALL'
        ? mergeTimelineWithDeskTasks(baseTimeline, tasks)
        : filterTimelineByArea(mergeTimelineWithDeskTasks(baseTimeline, tasks), visibleTasks),
    goals: visibleGoals,
  }
}

function syncTasksForSystemReminder(tasks: Task[], reminderId: string, done: boolean): Task[] {
  return tasks.map((task) =>
    task.systemReminderId === reminderId
      ? {
          ...task,
          status: (done ? 'DONE' : 'TODO') as TaskStatus,
          activityLogs:
            task.status === ((done ? 'DONE' : 'TODO') as TaskStatus)
              ? task.activityLogs
              : [
                  {
                    action: (done ? 'COMPLETED' : 'RESUMED') as TaskActivityAction,
                    note: 'Synced from Apple Reminders.',
                    timestamp: new Date(),
                  },
                  ...task.activityLogs,
                ],
        }
      : task,
  )
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  currentView: 'inbox',
  activeArea: 'ALL',
  tasks: [],
  todayFocusTasks: [],
  timeline: [],
  baseTimeline: [],
  goals: [],
  baseGoals: [],
  systemReminders: [],
  integrationStatus: {
    calendar: 'not_determined',
    reminders: 'not_determined',
  },
  statusMessage: '',
  isLoading: true,
  isTaskDrawerOpen: false,
  isGoalDrawerOpen: false,
  isReminderDrawerOpen: false,
  isQuickCaptureOpen: false,
  setView: (view) => set({ currentView: view }),
  setActiveArea: (area) =>
    set((state) => ({
      activeArea: area,
      ...buildDerivedStateForArea(state.baseTimeline, state.baseGoals, state.tasks, area),
    })),
  hydrateApp: (payload) =>
    set((state) => {
      const derived = buildDerivedStateForArea(payload.timeline, payload.goals, payload.tasks, state.activeArea)
      return {
        tasks: payload.tasks,
        todayFocusTasks: derived.todayFocusTasks,
        timeline: derived.timeline,
        baseTimeline: payload.timeline,
        goals: derived.goals,
        baseGoals: payload.goals,
        systemReminders: payload.systemReminders,
        integrationStatus: payload.integrationStatus,
        statusMessage: payload.statusMessage,
      }
    }),
  setLoading: (value) => set({ isLoading: value }),
  setStatusMessage: (value) => set({ statusMessage: value }),
  receiveExternalTask: (task) =>
    set((state) => {
      const nextTasks = replaceTask(state.tasks, task)
      return {
        tasks: nextTasks,
        ...buildDerivedStateForArea(state.baseTimeline, state.baseGoals, nextTasks, state.activeArea),
        statusMessage: 'Quick capture synced',
      }
    }),
  openTaskDrawer: (taskId) => set({ selectedTaskId: taskId, isTaskDrawerOpen: true }),
  closeTaskDrawer: () => set({ isTaskDrawerOpen: false }),
  openGoalDrawer: (goalId) => set({ selectedGoalId: goalId, isGoalDrawerOpen: true }),
  closeGoalDrawer: () => set({ isGoalDrawerOpen: false }),
  openReminderDrawer: (reminderId) => set({ selectedReminderId: reminderId, isReminderDrawerOpen: true }),
  closeReminderDrawer: () => set({ isReminderDrawerOpen: false, selectedReminderId: undefined }),
  openQuickCapture: () => {
    if (isTauriRuntime() && getCurrentWindowLabel() !== 'quick-capture') {
      void openNativeQuickCaptureWindow()
        .then(() => set({ statusMessage: 'Quick capture ready' }))
        .catch((error) =>
          set({
            statusMessage: `Unable to open quick capture · ${error instanceof Error ? error.message : String(error)}`,
          }),
        )
      return
    }

    set({ isQuickCaptureOpen: true })
  },
  closeQuickCapture: () => set({ isQuickCaptureOpen: false }),
  addTask: async (title) => {
    const trimmed = title.trim()
    if (!trimmed) return

    try {
      const nextTask = isTauriRuntime()
        ? await captureTask(trimmed)
        : (() => {
            const draft = parseBrowserQuickCapture(trimmed)
            return {
              id: crypto.randomUUID(),
              title: draft.title,
              content: '',
              status: 'TODO' as const,
              dueDate: draft.dueDate,
              isOngoing: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              activityLogs: [{ action: 'CREATED' as const, timestamp: new Date() }],
            }
          })()

      set((state) => ({
        tasks: replaceTask(state.tasks, nextTask),
        ...buildDerivedStateForArea(state.baseTimeline, state.baseGoals, replaceTask(state.tasks, nextTask), state.activeArea),
        selectedTaskId: nextTask.id,
        isTaskDrawerOpen: true,
        currentView: 'inbox',
        statusMessage: isTauriRuntime() ? 'Saved to local database' : BROWSER_PREVIEW_STATUS,
      }))
    } catch (error) {
      set({ statusMessage: `Unable to save task · ${error instanceof Error ? error.message : String(error)}` })
    }
  },
  createGoal: async (input) => {
    const title = input.title.trim()
    const area = input.area.trim()
    if (!title || !area) return undefined

    const nextGoal = isTauriRuntime()
      ? await persistGoal({
          title,
          area,
          description: input.description?.trim() || '',
          status: 'ACTIVE',
        })
      : (() => {
          const goalId = crypto.randomUUID()
          const now = new Date()
          return {
            id: goalId,
            title,
            area,
            description: input.description?.trim() || '',
            status: 'ACTIVE' as const,
            progress: 0,
            nextTodo: 'Keep going',
            taskCount: 0,
            createdAt: now,
            updatedAt: now,
          }
        })()

    set((state) => {
      const nextGoals = replaceGoal(state.baseGoals, nextGoal)
      return {
        baseGoals: nextGoals,
        ...buildDerivedStateForArea(state.baseTimeline, nextGoals, state.tasks, state.activeArea),
        selectedGoalId: nextGoal.id,
        isGoalDrawerOpen: true,
        currentView: 'goals',
        statusMessage: isTauriRuntime() ? 'Goal saved to local database' : BROWSER_PREVIEW_STATUS,
      }
    })

    return nextGoal.id
  },
  updateGoalFields: async (goalId, input) => {
    const title = input.title.trim()
    const area = input.area.trim()
    if (!title || !area) return

    const updatedGoal = isTauriRuntime()
      ? await persistGoalFields(goalId, {
          title,
          area,
          description: input.description.trim(),
        })
      : undefined

    set((state) => {
      const nextGoals = isTauriRuntime()
        ? replaceGoal(state.baseGoals, updatedGoal as GoalCard)
        : state.baseGoals.map((goal) =>
            goal.id === goalId
              ? {
                  ...goal,
                  title,
                  area,
                  description: input.description.trim(),
                  updatedAt: new Date(),
                }
              : goal,
          )
      return {
        baseGoals: nextGoals,
        ...buildDerivedStateForArea(state.baseTimeline, nextGoals, state.tasks, state.activeArea),
        statusMessage: isTauriRuntime() ? 'Goal details saved' : BROWSER_PREVIEW_STATUS,
      }
    })
  },
  updateGoalStatus: async (goalId, status) => {
    const updatedGoal = isTauriRuntime() ? await persistGoalStatus(goalId, status) : undefined

    set((state) => {
      const nextGoals = isTauriRuntime()
        ? replaceGoal(state.baseGoals, updatedGoal as GoalCard)
        : state.baseGoals.map((goal) =>
            goal.id === goalId
              ? {
                  ...goal,
                  status,
                  updatedAt: new Date(),
                }
              : goal,
          )
      return {
        baseGoals: nextGoals,
        ...buildDerivedStateForArea(state.baseTimeline, nextGoals, state.tasks, state.activeArea),
        statusMessage: isTauriRuntime() ? 'Goal status saved' : BROWSER_PREVIEW_STATUS,
      }
    })
  },
  createTaskForGoal: async (goalId, title) => {
    const trimmed = title.trim()
    if (!trimmed) return

    const goal = get().baseGoals.find((item) => item.id === goalId)
    if (!goal) return

    const nextTask: Task = {
      id: crypto.randomUUID(),
      title: trimmed,
      content: '',
      status: 'TODO',
      linkedGoalId: goal.id,
      linkedGoalLabel: goal.title,
      isOngoing: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      activityLogs: [{ action: 'CREATED', timestamp: new Date() }],
    }

    set((state) => {
      const nextTasks = replaceTask(state.tasks, nextTask)
      return {
        tasks: nextTasks,
        ...buildDerivedStateForArea(state.baseTimeline, state.baseGoals, nextTasks, state.activeArea),
        selectedTaskId: nextTask.id,
        isTaskDrawerOpen: true,
        isGoalDrawerOpen: false,
        statusMessage: isTauriRuntime()
          ? 'TODO: Goal persistence is not wired to SQLite yet'
          : BROWSER_PREVIEW_STATUS,
      }
    })
  },
  addTaskNote: async (taskId, note) => {
    const trimmed = note.trim()
    if (!trimmed) return

    try {
      if (isTauriRuntime()) {
        const updatedTask = await persistTaskNote(taskId, trimmed)
        set((state) => ({
          tasks: state.tasks.map((task) => (task.id === taskId ? updatedTask : task)),
          ...buildDerivedStateForArea(
            state.baseTimeline,
            state.baseGoals,
            state.tasks.map((task) => (task.id === taskId ? updatedTask : task)),
            state.activeArea,
          ),
          statusMessage: 'Activity log updated',
        }))
        return
      }

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                activityLogs: [
                  {
                    action: 'NOTE_ADDED',
                    note: trimmed,
                    timestamp: new Date(),
                  },
                  ...task.activityLogs,
                ],
              }
            : task,
        ),
        statusMessage: BROWSER_PREVIEW_STATUS,
      }))
    } catch (error) {
      set({ statusMessage: `Unable to save activity log · ${error instanceof Error ? error.message : String(error)}` })
    }
  },
  updateTaskStatus: async (taskId, status, note) => {
    try {
      if (isTauriRuntime()) {
        const updatedTask = await persistTaskStatus(taskId, status, note)
        set((state) => ({
          tasks: state.tasks.map((task) => (task.id === taskId ? updatedTask : task)),
          ...buildDerivedStateForArea(
            state.baseTimeline,
            state.baseGoals,
            state.tasks.map((task) => (task.id === taskId ? updatedTask : task)),
            state.activeArea,
          ),
          statusMessage: 'Task status saved',
        }))
        return
      }

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status,
                activityLogs: [
                  {
                    action: logActionForStatus(status),
                    note: note?.trim() || undefined,
                    timestamp: new Date(),
                  },
                  ...task.activityLogs,
                ],
              }
            : task,
        ),
        statusMessage: BROWSER_PREVIEW_STATUS,
      }))
    } catch (error) {
      set({ statusMessage: `Unable to save task status · ${error instanceof Error ? error.message : String(error)}` })
    }
  },
  updateTaskContent: async (taskId, content) => {
    try {
      if (isTauriRuntime()) {
        const updatedTask = await persistTaskContent(taskId, content)
        set((state) => ({
          tasks: state.tasks.map((task) => (task.id === taskId ? updatedTask : task)),
          ...buildDerivedStateForArea(
            state.baseTimeline,
            state.baseGoals,
            state.tasks.map((task) => (task.id === taskId ? updatedTask : task)),
            state.activeArea,
          ),
          statusMessage: 'Markdown notes saved',
        }))
        return
      }

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                content,
              }
            : task,
        ),
        statusMessage: BROWSER_PREVIEW_STATUS,
      }))
    } catch (error) {
      set({ statusMessage: `Unable to save markdown notes · ${error instanceof Error ? error.message : String(error)}` })
    }
  },
  updateTaskFields: async (taskId, input) => {
    const trimmedTitle = input.title.trim()
    if (!trimmedTitle) return

    try {
      if (isTauriRuntime()) {
        const updatedTask = await persistTaskFields(taskId, {
          title: trimmedTitle,
          dueAt: input.dueDate,
          linkedGoalId: input.linkedGoalId,
          linkedGoalLabel: input.linkedGoalLabel,
          isOngoing: input.isOngoing,
        })
        set((state) => ({
          tasks: state.tasks.map((task) => (task.id === taskId ? updatedTask : task)),
          ...buildDerivedStateForArea(
            state.baseTimeline,
            state.baseGoals,
            state.tasks.map((task) => (task.id === taskId ? updatedTask : task)),
            state.activeArea,
          ),
          statusMessage: 'Task details saved',
        }))
        return
      }

      set((state) => {
        const nextTasks = state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                title: trimmedTitle,
                dueDate: input.dueDate,
                linkedGoalId: input.linkedGoalId,
                linkedGoalLabel: input.linkedGoalLabel,
                isOngoing: input.isOngoing ?? task.isOngoing,
                updatedAt: new Date(),
              }
            : task,
        )
        return {
          tasks: nextTasks,
          ...buildDerivedStateForArea(state.baseTimeline, state.baseGoals, nextTasks, state.activeArea),
          statusMessage: BROWSER_PREVIEW_STATUS,
        }
      })
    } catch (error) {
      set({ statusMessage: `Unable to save task details · ${error instanceof Error ? error.message : String(error)}` })
    }
  },
  toggleSystemReminderDone: async (reminderId, done) => {
    try {
      if (!isTauriRuntime()) {
        set((state) => ({
          systemReminders: state.systemReminders.map((reminder) =>
            reminder.id === reminderId
              ? {
                  ...reminder,
                  done,
                }
              : reminder,
          ),
          timeline: state.timeline.map((item) => (item.id === reminderId ? { ...item, done } : item)),
          statusMessage: getRuntimeModeStatusMessage(false),
        }))
        return
      }

      const updatedReminder = await persistSystemReminderCompleted(reminderId, done)
      set((state) => ({
        systemReminders: state.systemReminders.map((reminder) =>
          reminder.id === reminderId ? updatedReminder : reminder,
        ),
        tasks: syncTasksForSystemReminder(state.tasks, reminderId, updatedReminder.done),
        ...buildDerivedState(
          state.baseTimeline,
          state.baseGoals,
          syncTasksForSystemReminder(state.tasks, reminderId, updatedReminder.done),
        ),
        timeline: state.timeline.map((item) =>
          item.id === reminderId
            ? {
                ...item,
                done: updatedReminder.done,
              }
            : item,
        ),
        statusMessage: updatedReminder.done ? 'Apple Reminder completed' : 'Apple Reminder reopened',
      }))
    } catch (error) {
      set({
        statusMessage: `Unable to update Apple Reminder · ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  },
}))

export function useSelectedTask() {
  const selectedTaskId = useAppStore((state) => state.selectedTaskId)
  return useAppStore((state) => state.tasks.find((task) => task.id === selectedTaskId))
}

export function useSelectedGoal() {
  const selectedGoalId = useAppStore((state) => state.selectedGoalId)
  return useAppStore((state) => state.baseGoals.find((goal) => goal.id === selectedGoalId))
}
