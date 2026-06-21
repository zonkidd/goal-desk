import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTaskStore } from './taskStore'
import { useGoalStore } from './goalStore'
import { useEventkitStore } from './eventkitStore'
import { useUiStore } from './uiStore'

vi.mock('../lib/runtime', () => ({
  isTauriRuntime: vi.fn(() => false),
  getCurrentWindowLabel: vi.fn(() => 'browser'),
}))

vi.mock('../lib/workspaceMutations', () => ({
  getWorkspaceMutationAdapter: vi.fn(() => ({
    createTask: vi.fn().mockResolvedValue({}),
    createTaskForGoal: vi.fn().mockResolvedValue({}),
    createGoal: vi.fn().mockResolvedValue({}),
    updateGoalFields: vi.fn().mockResolvedValue({}),
    updateGoalStatus: vi.fn().mockResolvedValue({}),
    addTaskNote: vi.fn().mockResolvedValue({}),
    updateTaskStatus: vi.fn().mockResolvedValue({}),
    updateTaskContent: vi.fn().mockResolvedValue({}),
    updateTaskFields: vi.fn().mockResolvedValue({}),
    listAreas: vi.fn().mockResolvedValue({}),
    createArea: vi.fn().mockResolvedValue({}),
    renameArea: vi.fn().mockResolvedValue({}),
    deleteArea: vi.fn().mockResolvedValue({ success: true, message: 'ok' }),
    createSystemReminder: vi.fn().mockResolvedValue(''),
  })),
}))

describe('Store action results', () => {
  beforeEach(() => {
    useTaskStore.setState({
      tasks: [],
    })
    useGoalStore.setState({ baseGoals: [] })
    useEventkitStore.setState({
      systemReminders: [],
      integrationStatus: { calendar: 'not_determined', reminders: 'not_determined' },
      eventkitPermissions: { calendar: 'not_determined', reminders: 'not_determined' },
      rawEventKit: { calendarEvents: [], reminders: [] },
    })
    useUiStore.setState({
      statusMessage: '',
      currentView: 'inbox',
      isTaskDrawerOpen: false,
      isGoalDrawerOpen: false,
    })
    vi.clearAllMocks()
  })

  describe('taskStore actions return results', () => {
    it('addTask should not internally call setStatusMessage', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await useTaskStore.getState().addTask('Test task')

      expect(warnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('setStatusMessage called before being linked'),
      )
      warnSpy.mockRestore()
    })

    it('updateTaskStatus should not internally call setStatusMessage', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await useTaskStore.getState().updateTaskStatus('nonexistent', 'DONE')

      expect(warnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('setStatusMessage called before being linked'),
      )
      warnSpy.mockRestore()
    })
  })

  describe('goalStore actions return results', () => {
    it('createGoal should not internally call setStatusMessage', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await useGoalStore.getState().createGoal({ title: 'Test goal' })

      expect(warnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('setStatusMessage called before being linked'),
      )
      warnSpy.mockRestore()
    })
  })

  describe('eventkitStore actions return results', () => {
    it('requestCalendarAccess should not internally call setStatusMessage', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await useEventkitStore.getState().requestCalendarAccess()

      expect(warnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('setStatusMessage called before being linked'),
      )
      warnSpy.mockRestore()
    })
  })

  describe('no store has setStatusMessage in its public interface', () => {
    it('taskStore should not export setStatusMessage', () => {
      const state = useTaskStore.getState() as any
      expect(state.setStatusMessage).toBeUndefined()
    })

    it('goalStore should not export setStatusMessage', () => {
      const state = useGoalStore.getState() as any
      expect(state.setStatusMessage).toBeUndefined()
    })

    it('eventkitStore should not export setStatusMessage', () => {
      const state = useEventkitStore.getState() as any
      expect(state.setStatusMessage).toBeUndefined()
    })
  })
})
