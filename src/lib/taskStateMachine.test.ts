import { describe, test, expect } from 'vitest'
import { canTransitionTo, getNextActions, type TaskStatus } from './taskStateMachine'

describe('taskStateMachine - 状态转换合法性', () => {
  test('TODO 只能转换到 IN_PROGRESS', () => {
    expect(canTransitionTo('TODO', 'IN_PROGRESS')).toBe(true)
    expect(canTransitionTo('TODO', 'PAUSED')).toBe(false)
    expect(canTransitionTo('TODO', 'DONE')).toBe(false)
    expect(canTransitionTo('TODO', 'TODO')).toBe(false)
  })

  test('IN_PROGRESS 可以转换到 PAUSED 或 DONE', () => {
    expect(canTransitionTo('IN_PROGRESS', 'PAUSED')).toBe(true)
    expect(canTransitionTo('IN_PROGRESS', 'DONE')).toBe(true)
    expect(canTransitionTo('IN_PROGRESS', 'TODO')).toBe(false)
    expect(canTransitionTo('IN_PROGRESS', 'IN_PROGRESS')).toBe(false)
  })

  test('PAUSED 只能转换到 IN_PROGRESS', () => {
    expect(canTransitionTo('PAUSED', 'IN_PROGRESS')).toBe(true)
    expect(canTransitionTo('PAUSED', 'TODO')).toBe(false)
    expect(canTransitionTo('PAUSED', 'DONE')).toBe(false)
    expect(canTransitionTo('PAUSED', 'PAUSED')).toBe(false)
  })

  test('DONE 可以转换到 TODO（重新打开）', () => {
    expect(canTransitionTo('DONE', 'TODO')).toBe(true)
    expect(canTransitionTo('DONE', 'IN_PROGRESS')).toBe(false)
    expect(canTransitionTo('DONE', 'PAUSED')).toBe(false)
    expect(canTransitionTo('DONE', 'DONE')).toBe(false)
  })
})

describe('taskStateMachine - 可用操作按钮', () => {
  test('TODO 状态应显示 Start 按钮', () => {
    const actions = getNextActions('TODO')
    expect(actions).toContain('start')
    expect(actions).not.toContain('pause')
    expect(actions).not.toContain('resume')
    expect(actions).not.toContain('complete')
  })

  test('IN_PROGRESS 状态应显示 Pause 和 Complete 按钮', () => {
    const actions = getNextActions('IN_PROGRESS')
    expect(actions).toContain('pause')
    expect(actions).toContain('complete')
    expect(actions).not.toContain('start')
    expect(actions).not.toContain('resume')
  })

  test('PAUSED 状态应显示 Resume 按钮', () => {
    const actions = getNextActions('PAUSED')
    expect(actions).toContain('resume')
    expect(actions).not.toContain('start')
    expect(actions).not.toContain('pause')
    expect(actions).not.toContain('complete')
  })

  test('DONE 状态应显示 Reopen 按钮', () => {
    const actions = getNextActions('DONE')
    expect(actions).toContain('reopen')
    expect(actions).not.toContain('start')
    expect(actions).not.toContain('pause')
    expect(actions).not.toContain('complete')
  })
})

describe('taskStateMachine - 活动日志 action 映射', () => {
  test('TODO → IN_PROGRESS 应记录 STARTED', () => {
    const action = getActivityAction('TODO', 'IN_PROGRESS')
    expect(action).toBe('STARTED')
  })

  test('IN_PROGRESS → PAUSED 应记录 PAUSED', () => {
    const action = getActivityAction('IN_PROGRESS', 'PAUSED')
    expect(action).toBe('PAUSED')
  })

  test('PAUSED → IN_PROGRESS 应记录 RESUMED', () => {
    const action = getActivityAction('PAUSED', 'IN_PROGRESS')
    expect(action).toBe('RESUMED')
  })

  test('任何状态 → DONE 应记录 COMPLETED', () => {
    expect(getActivityAction('TODO', 'DONE')).toBe('COMPLETED')
    expect(getActivityAction('IN_PROGRESS', 'DONE')).toBe('COMPLETED')
    expect(getActivityAction('PAUSED', 'DONE')).toBe('COMPLETED')
  })
})

// 辅助函数（需要在实际代码中实现）
function getActivityAction(from: TaskStatus, to: TaskStatus): string {
  if (to === 'DONE') return 'COMPLETED'
  if (from === 'TODO' && to === 'IN_PROGRESS') return 'STARTED'
  if (from === 'PAUSED' && to === 'IN_PROGRESS') return 'RESUMED'
  if (from === 'IN_PROGRESS' && to === 'PAUSED') return 'PAUSED'
  return 'NOTE_ADDED'
}
