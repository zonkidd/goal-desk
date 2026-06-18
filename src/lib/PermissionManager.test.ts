import { describe, expect, it, vi, beforeEach } from 'vitest'
import { PermissionManager } from './PermissionManager'

describe('PermissionManager', () => {
  let mockApiRequest: ReturnType<typeof vi.fn>
  let manager: PermissionManager

  beforeEach(() => {
    mockApiRequest = vi.fn()
    manager = new PermissionManager(mockApiRequest)
  })

  describe('请求去重', () => {
    it('应该对相同类型的并发请求进行去重', async () => {
      // 设置 API 请求延迟
      mockApiRequest.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve('granted'), 100)
      }))

      // 同时发起两个相同类型的请求
      const promise1 = manager.request('calendar')
      const promise2 = manager.request('calendar')

      const [result1, result2] = await Promise.all([promise1, promise2])

      // 应该只调用一次 API
      expect(mockApiRequest).toHaveBeenCalledOnce()
      expect(mockApiRequest).toHaveBeenCalledWith('calendar')
      expect(result1).toBe('granted')
      expect(result2).toBe('granted')
    })

    it('应该允许不同类型的并发请求', async () => {
      mockApiRequest.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve('granted'), 100)
      }))

      // 同时发起不同类型的请求
      const promise1 = manager.request('calendar')
      const promise2 = manager.request('reminders')

      const [result1, result2] = await Promise.all([promise1, promise2])

      // 应该调用两次 API
      expect(mockApiRequest).toHaveBeenCalledTimes(2)
      expect(result1).toBe('granted')
      expect(result2).toBe('granted')
    })
  })

  describe('竞态保护', () => {
    it('应该在请求进行中时拒绝新的相同类型请求', async () => {
      let resolveFirst: (value: string) => void
      mockApiRequest.mockImplementation(() => new Promise(resolve => {
        resolveFirst = resolve
      }))

      // 发起第一个请求
      const promise1 = manager.request('calendar')

      // 尝试发起第二个请求（应该被拒绝或等待）
      const promise2 = manager.request('calendar')

      // 完成第一个请求
      resolveFirst!('granted')

      const [result1, result2] = await Promise.all([promise1, promise2])

      // 两个请求都应该返回相同结果
      expect(result1).toBe('granted')
      expect(result2).toBe('granted')
    })

    it('应该在请求失败时正确处理', async () => {
      mockApiRequest.mockRejectedValue(new Error('Network error'))

      const result = await manager.request('calendar').catch(e => e)

      expect(result).toBeInstanceOf(Error)
      expect(manager.getStatus('calendar')).toBe('error')
    })
  })

  describe('状态管理', () => {
    it('应该正确更新状态', () => {
      manager.updateState({
        calendar: 'granted',
        reminders: 'denied',
      })

      expect(manager.getStatus('calendar')).toBe('granted')
      expect(manager.getStatus('reminders')).toBe('denied')
    })

    it('应该在状态变更时通知监听器', () => {
      const callback = vi.fn()
      manager.onChange(callback)

      manager.updateState({
        calendar: 'granted',
        reminders: 'not_determined',
      })

      expect(callback).toHaveBeenCalledWith({
        calendar: 'granted',
        reminders: 'not_determined',
      })
    })

    it('应该在状态未变更时不通知监听器', () => {
      const callback = vi.fn()
      manager.onChange(callback)

      // 设置相同的状态
      manager.updateState({
        calendar: 'not_determined',
        reminders: 'not_determined',
      })

      expect(callback).not.toHaveBeenCalled()
    })
  })
})
