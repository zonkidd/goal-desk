import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from './uiStore'

describe('DrawerState generalization', () => {
  beforeEach(() => {
    useUiStore.setState({ activeDrawer: null })
  })

  it('openDrawer sets activeDrawer to task', () => {
    useUiStore.getState().openDrawer('task', 't1')
    const s = useUiStore.getState()
    expect(s.activeDrawer).toEqual({ type: 'task', id: 't1' })
  })

  it('closeDrawer clears activeDrawer', () => {
    useUiStore.getState().openDrawer('goal', 'g1')
    useUiStore.getState().closeDrawer()
    const s = useUiStore.getState()
    expect(s.activeDrawer).toBeNull()
  })

  it('opening a new drawer closes the previous one', () => {
    useUiStore.getState().openDrawer('task', 't1')
    useUiStore.getState().openDrawer('goal', 'g1')
    const s = useUiStore.getState()
    expect(s.activeDrawer).toEqual({ type: 'goal', id: 'g1' })
  })

  it('isDrawerOpen returns true for the active drawer type', () => {
    useUiStore.getState().openDrawer('reminder', 'r1')
    expect(useUiStore.getState().isDrawerOpen('task')).toBe(false)
    expect(useUiStore.getState().isDrawerOpen('reminder')).toBe(true)
  })

  it('selectedDrawerId returns the id for the active drawer type', () => {
    useUiStore.getState().openDrawer('calendarEvent', 'ev1')
    expect(useUiStore.getState().selectedDrawerId('task')).toBeUndefined()
    expect(useUiStore.getState().selectedDrawerId('calendarEvent')).toBe('ev1')
  })

  it('closeDrawer then openDrawer should end with the new drawer open', () => {
    useUiStore.getState().openDrawer('goal', 'g1')
    useUiStore.getState().closeDrawer()
    useUiStore.getState().openDrawer('task', 't1')
    const s = useUiStore.getState()
    expect(s.activeDrawer).toEqual({ type: 'task', id: 't1' })
  })

  it('openDrawer then closeDrawer should end with no drawer (regression)', () => {
    useUiStore.getState().openDrawer('task', 't1')
    useUiStore.getState().closeDrawer()
    const s = useUiStore.getState()
    expect(s.activeDrawer).toBeNull()
  })

  it('calendarEvent drawer type should be usable for calendar events', () => {
    useUiStore.getState().openDrawer('calendarEvent', 'evt-1')
    const s = useUiStore.getState()
    expect(s.activeDrawer).toEqual({ type: 'calendarEvent', id: 'evt-1' })
    expect(s.isDrawerOpen('calendarEvent')).toBe(true)
    expect(s.isDrawerOpen('reminder')).toBe(false)
  })
})
