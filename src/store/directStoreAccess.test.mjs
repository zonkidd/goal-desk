import test from 'node:test'
import assert from 'node:assert/strict'

import { useTaskStore } from './taskStore.ts'
import { useGoalStore } from './goalStore.ts'
import { useUiStore } from './uiStore.ts'
import { useAreaStore } from './areaStore.ts'

test('taskStore: initial state has empty tasks', () => {
  const state = useTaskStore.getState()
  assert.deepStrictEqual(state.tasks, [])
  assert.deepStrictEqual(state.inbox.activeTasks, [])
})

test('goalStore: initial state has empty goals', () => {
  const state = useGoalStore.getState()
  assert.deepStrictEqual(state.baseGoals, [])
})

test('uiStore: initial state has default view and area', () => {
  const state = useUiStore.getState()
  assert.equal(state.currentView, 'inbox')
  assert.equal(state.activeArea, 'ALL')
  assert.equal(state.isLoading, true)
})

test('areaStore: initial state has empty areas', () => {
  const state = useAreaStore.getState()
  assert.deepStrictEqual(state.allAreas, [])
})

test('uiStore: setView changes currentView', () => {
  const prev = useUiStore.getState().currentView
  useUiStore.getState().setView('goals')
  assert.equal(useUiStore.getState().currentView, 'goals')
  useUiStore.getState().setView(prev)
})

test('uiStore: setActiveArea changes activeArea', () => {
  const prev = useUiStore.getState().activeArea
  useUiStore.getState().setActiveArea('Tech')
  assert.equal(useUiStore.getState().activeArea, 'Tech')
  useUiStore.getState().setActiveArea(prev)
})
