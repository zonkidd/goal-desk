import { describe, it, expect, beforeEach } from 'vitest'
import { useTaskStore } from './taskStore'
import { useGoalStore } from './goalStore'
import { useUiStore } from './uiStore'
import { useAreaStore } from './areaStore'

describe('direct store access (no proxy)', () => {
  beforeEach(() => {
    useTaskStore.setState({ tasks: [] })
    useGoalStore.setState({ baseGoals: [] })
    useUiStore.setState({ currentView: 'inbox', activeArea: 'ALL', isLoading: true })
    useAreaStore.setState({ allAreas: [] })
  })

  it('taskStore returns initial empty state', () => {
    expect(useTaskStore.getState().tasks).toEqual([])
  })

  it('goalStore returns initial empty state', () => {
    expect(useGoalStore.getState().baseGoals).toEqual([])
  })

  it('uiStore returns default view and area', () => {
    const state = useUiStore.getState()
    expect(state.currentView).toBe('inbox')
    expect(state.activeArea).toBe('ALL')
    expect(state.isLoading).toBe(true)
  })

  it('areaStore returns initial empty state', () => {
    expect(useAreaStore.getState().allAreas).toEqual([])
  })

  it('uiStore setView changes currentView', () => {
    useUiStore.getState().setView('goals')
    expect(useUiStore.getState().currentView).toBe('goals')
  })

  it('uiStore setActiveArea changes activeArea', () => {
    useUiStore.getState().setActiveArea('Tech')
    expect(useUiStore.getState().activeArea).toBe('Tech')
  })
})
