import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBearNoteStore } from './bearNoteStore'
import { linkSelectedBearNote } from '../lib/tauriCommands'

vi.mock('../lib/tauriCommands', () => ({
  getBearIntegrationStatus: vi.fn().mockResolvedValue({ tokenConfigured: true }),
  getBearNotePreview: vi.fn().mockResolvedValue(undefined),
  linkSelectedBearNote: vi.fn().mockResolvedValue(undefined),
  refreshBearNotePreview: vi.fn().mockResolvedValue(undefined),
  saveBearApiToken: vi.fn().mockResolvedValue({ tokenConfigured: true }),
  unlinkBearNote: vi.fn().mockResolvedValue(null),
}))

describe('bearNoteStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useBearNoteStore.setState({
      tokenConfigured: true,
      isLoading: false,
      errorMessage: undefined,
      previewsByTaskId: {},
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('shows a friendly timeout when Bear does not return a callback', async () => {
    await useBearNoteStore.getState().linkSelectedNote('task-1')

    expect(linkSelectedBearNote).toHaveBeenCalledWith('task-1')
    expect(useBearNoteStore.getState().isLoading).toBe(true)

    vi.advanceTimersByTime(30_000)

    expect(useBearNoteStore.getState().isLoading).toBe(false)
    expect(useBearNoteStore.getState().errorMessage).toContain('Bear 没有返回笔记')
  })
})
