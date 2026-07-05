import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getAllowedTodoStatusActions,
  getTodoStatusActionLabel,
  logActionForTodoTransition,
} from './todoTransition.ts'

test('getAllowedTodoStatusActions returns correct next states', () => {
  assert.deepEqual(getAllowedTodoStatusActions('TODO'), ['IN_PROGRESS', 'DONE'])
  assert.deepEqual(getAllowedTodoStatusActions('IN_PROGRESS'), ['PAUSED', 'DONE'])
  assert.deepEqual(getAllowedTodoStatusActions('PAUSED'), ['IN_PROGRESS', 'DONE'])
  assert.deepEqual(getAllowedTodoStatusActions('DONE'), [])
})

test('logActionForTodoTransition returns lifecycle activity log actions', () => {
  assert.equal(logActionForTodoTransition('TODO', 'IN_PROGRESS'), 'STARTED')
  assert.equal(logActionForTodoTransition('PAUSED', 'IN_PROGRESS'), 'RESUMED')
  assert.equal(logActionForTodoTransition('IN_PROGRESS', 'PAUSED'), 'PAUSED')
  assert.equal(logActionForTodoTransition('TODO', 'DONE'), 'COMPLETED')
  assert.equal(logActionForTodoTransition('IN_PROGRESS', 'DONE'), 'COMPLETED')
  assert.equal(logActionForTodoTransition('PAUSED', 'DONE'), 'COMPLETED')
})

test('getTodoStatusActionLabel returns correct action labels', () => {
  assert.equal(getTodoStatusActionLabel('TODO'), 'Start')
  assert.equal(getTodoStatusActionLabel('IN_PROGRESS'), 'Pause')
  assert.equal(getTodoStatusActionLabel('PAUSED'), 'Resume')
  assert.equal(getTodoStatusActionLabel('DONE'), '')
})
