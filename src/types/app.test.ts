import { describe, it, expect } from 'vitest'
import type { ViewKey } from './app'

// 类型守卫函数 - 使用实际的 ViewKey 类型定义
const VALID_VIEW_KEYS: readonly ViewKey[] = ['inbox', 'today', 'board', 'goals', 'areas', 'calendar', 'reminders'] as const

function isValidViewKey(key: string): key is ViewKey {
  return (VALID_VIEW_KEYS as readonly string[]).includes(key)
}

describe('ViewKey 类型', () => {
  it('应该接受 calendar 作为有效的 ViewKey', () => {
    const key: ViewKey = 'calendar' // 这行会在编译时失败如果 'calendar' 不在 ViewKey 中
    expect(isValidViewKey('calendar')).toBe(true)
  })

  it('应该接受 reminders 作为有效的 ViewKey', () => {
    const key: ViewKey = 'reminders' // 这行会在编译时失败如果 'reminders' 不在 ViewKey 中
    expect(isValidViewKey('reminders')).toBe(true)
  })
})
