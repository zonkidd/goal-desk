import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from './uiStore'

describe('DrawerState generalization', () => {
  beforeEach(() => {
    useUiStore.setState({
      isTaskDrawerOpen: false,
      selectedTaskId: undefined,
      isGoalDrawerOpen: false,
      selectedGoalId: undefined,
      isReminderDrawerOpen: false,
      selectedReminderId: undefined,
      isCalendarEventDrawerOpen: false,
      selectedCalendarEventId: undefined,
    })
  })

  it('openTaskDrawer sets activeDrawer to task', () => {
    useUiStore.getState().openTaskDrawer('t1')
    const s = useUiStore.getState()
    expect(s.activeDrawer).toEqual({ type: 'task', id: 't1' })
    expect(s.isTaskDrawerOpen).toBe(true)
    expect(s.selectedTaskId).toBe('t1')
  })

  it('closeDrawer clears activeDrawer', () => {
    useUiStore.getState().openGoalDrawer('g1')
    useUiStore.getState().closeDrawer()
    const s = useUiStore.getState()
    expect(s.activeDrawer).toBeNull()
    expect(s.isGoalDrawerOpen).toBe(false)
    expect(s.selectedGoalId).toBeUndefined()
  })

  it('opening a new drawer closes the previous one', () => {
    useUiStore.getState().openTaskDrawer('t1')
    useUiStore.getState().openGoalDrawer('g1')
    const s = useUiStore.getState()
    expect(s.activeDrawer).toEqual({ type: 'goal', id: 'g1' })
    expect(s.isTaskDrawerOpen).toBe(false)
    expect(s.isGoalDrawerOpen).toBe(true)
  })

  it('isDrawerOpen returns true for the active drawer type', () => {
    useUiStore.getState().openReminderDrawer('r1')
    expect(useUiStore.getState().isDrawerOpen('task')).toBe(false)
    expect(useUiStore.getState().isDrawerOpen('reminder')).toBe(true)
  })

  it('selectedDrawerId returns the id for the active drawer type', () => {
    useUiStore.getState().openCalendarEventDrawer('ev1')
    expect(useUiStore.getState().selectedDrawerId('task')).toBeUndefined()
    expect(useUiStore.getState().selectedDrawerId('calendarEvent')).toBe('ev1')
  })
})
