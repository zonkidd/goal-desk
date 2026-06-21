import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getRuntimeAdapter, setRuntimeAdapter, resetRuntimeAdapter, RuntimeAdapter } from './runtimeAdapter'

describe('RuntimeAdapter', () => {
  afterEach(() => {
    resetRuntimeAdapter()
  })

  describe('BrowserRuntimeAdapter (default)', () => {
    it('isTauri returns false', () => {
      const adapter = getRuntimeAdapter()
      expect(adapter.isTauri()).toBe(false)
    })

    it('getWindowLabel returns browser', () => {
      const adapter = getRuntimeAdapter()
      expect(adapter.getWindowLabel()).toBe('browser')
    })

    it('canOpenInBear returns false', () => {
      const adapter = getRuntimeAdapter()
      expect(adapter.canOpenInBear()).toBe(false)
    })

    it('canSyncTasks returns false', () => {
      const adapter = getRuntimeAdapter()
      expect(adapter.canSyncTasks()).toBe(false)
    })

    it('canLoadDesktopSnapshot returns false', () => {
      const adapter = getRuntimeAdapter()
      expect(adapter.canLoadDesktopSnapshot()).toBe(false)
    })

    it('hideWindow resolves without error', async () => {
      const adapter = getRuntimeAdapter()
      await expect(adapter.hideWindow()).resolves.toBeUndefined()
    })
  })

  describe('Custom adapter injection', () => {
    it('setRuntimeAdapter overrides default', () => {
      const mockAdapter: RuntimeAdapter = {
        isTauri: vi.fn().mockReturnValue(true),
        getWindowLabel: vi.fn().mockReturnValue('main'),
        hideWindow: vi.fn().mockResolvedValue(undefined),
        canOpenInBear: vi.fn().mockReturnValue(true),
        canSyncTasks: vi.fn().mockReturnValue(true),
        canLoadDesktopSnapshot: vi.fn().mockReturnValue(true),
      }

      setRuntimeAdapter(mockAdapter)
      const adapter = getRuntimeAdapter()

      expect(adapter.isTauri()).toBe(true)
      expect(adapter.getWindowLabel()).toBe('main')
      expect(mockAdapter.isTauri).toHaveBeenCalled()
    })

    it('resetRuntimeAdapter restores default', () => {
      const mockAdapter: RuntimeAdapter = {
        isTauri: vi.fn().mockReturnValue(true),
        getWindowLabel: vi.fn().mockReturnValue('test'),
        hideWindow: vi.fn().mockResolvedValue(undefined),
        canOpenInBear: vi.fn().mockReturnValue(true),
        canSyncTasks: vi.fn().mockReturnValue(true),
        canLoadDesktopSnapshot: vi.fn().mockReturnValue(true),
      }

      setRuntimeAdapter(mockAdapter)
      resetRuntimeAdapter()
      const adapter = getRuntimeAdapter()

      expect(adapter.isTauri()).toBe(false)
    })
  })
})
