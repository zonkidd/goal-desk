import test from 'node:test'
import assert from 'node:assert/strict'

import { getValidTransitions, getTransitionAction, getTransitionLabel } from './taskStateMachine.ts'

test('getValidTransitions returns correct next states', () => {
  assert.deepEqual(getValidTransitions('TODO'), ['IN_PROGRESS', 'DONE'])
  assert.deepEqual(getValidTransitions('IN_PROGRESS'), ['PAUSED', 'DONE'])
  assert.deepEqual(getValidTransitions('PAUSED'), ['IN_PROGRESS', 'DONE'])
  assert.deepEqual(getValidTransitions('DONE'), [])
})

test('getTransitionAction returns STARTED for first TODO to IN_PROGRESS', () => {
  assert.equal(getTransitionAction('TODO', 'IN_PROGRESS'), 'STARTED')
  assert.equal(getTransitionAction('PAUSED', 'IN_PROGRESS'), 'RESUMED')
  assert.equal(getTransitionAction('IN_PROGRESS', 'PAUSED'), 'PAUSED')
  assert.equal(getTransitionAction('TODO', 'DONE'), 'COMPLETED')
  assert.equal(getTransitionAction('IN_PROGRESS', 'DONE'), 'COMPLETED')
  assert.equal(getTransitionAction('PAUSED', 'DONE'), 'COMPLETED')
})

test('getTransitionLabel returns correct action labels', () => {
  assert.equal(getTransitionLabel('TODO'), 'Start')
  assert.equal(getTransitionLabel('IN_PROGRESS'), 'Pause')
  assert.equal(getTransitionLabel('PAUSED'), 'Resume')
  assert.equal(getTransitionLabel('DONE'), '')
})
