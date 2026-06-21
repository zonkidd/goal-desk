import { describe, it, expect } from 'vitest'
import { parseBrowserQuickCapture } from './quickCapture'

describe('parseBrowserQuickCapture deadline keyword cleanup', () => {
  const now = new Date('2026-06-10T09:00:00+08:00')

  it('cleans 之前 keyword without leaving residual characters', () => {
    const draft = parseBrowserQuickCapture('明天3点之前完成报告', now)
    expect(draft.title).toBe('完成报告')
    expect(draft.dueDate).toBeDefined()
  })

  it('cleans 前 keyword correctly', () => {
    const draft = parseBrowserQuickCapture('明天3点前提交代码', now)
    expect(draft.title).toBe('提交代码')
    expect(draft.dueDate).toBeDefined()
  })

  it('cleans 截止 keyword correctly', () => {
    const draft = parseBrowserQuickCapture('明天截止写文档', now)
    expect(draft.title).toBe('写文档')
    expect(draft.dueDate).toBeDefined()
  })

  it('cleans deadline keyword without time', () => {
    const draft = parseBrowserQuickCapture('明天之前完成报告', now)
    expect(draft.title).toBe('完成报告')
    expect(draft.dueDate).toBeDefined()
  })
})
