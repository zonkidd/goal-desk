import { create } from 'zustand'
import {
  getBearIntegrationStatus,
  getBearNotePreview,
  linkSelectedBearNote,
  refreshBearNotePreview,
  saveBearApiToken,
  unlinkBearNote,
} from '../lib/tauriCommands'
import type { BearNotePreview, LinkedBearNote } from '../types/bear'
import type { Task } from '../types/task'

const BEAR_CALLBACK_TIMEOUT_MS = 30_000
const BEAR_CALLBACK_TIMEOUT_MESSAGE = 'Bear 没有返回笔记，请确认 Bear 已打开、已选中笔记，并允许 Kairos deep link 回调。'

let bearCallbackTimeout: ReturnType<typeof setTimeout> | undefined

function clearBearCallbackTimeout() {
  if (!bearCallbackTimeout) return
  clearTimeout(bearCallbackTimeout)
  bearCallbackTimeout = undefined
}

function scheduleBearCallbackTimeout(onTimeout: () => void) {
  clearBearCallbackTimeout()
  bearCallbackTimeout = setTimeout(() => {
    bearCallbackTimeout = undefined
    onTimeout()
  }, BEAR_CALLBACK_TIMEOUT_MS)
}

interface BearNoteStoreState {
  tokenConfigured: boolean
  isLoading: boolean
  errorMessage?: string
  previewsByTaskId: Record<string, BearNotePreview>
  loadIntegrationStatus: () => Promise<void>
  saveApiToken: (token: string) => Promise<void>
  loadPreview: (taskId: string) => Promise<void>
  linkSelectedNote: (taskId: string) => Promise<void>
  refreshPreview: (taskId: string) => Promise<void>
  unlinkNote: (taskId: string) => Promise<Task | null>
  receiveLinkedNote: (linked: LinkedBearNote) => void
  receiveError: (message: string) => void
}

export const useBearNoteStore = create<BearNoteStoreState>((set, get) => ({
  tokenConfigured: false,
  isLoading: false,
  previewsByTaskId: {},

  loadIntegrationStatus: async () => {
    try {
      const status = await getBearIntegrationStatus()
      set({ tokenConfigured: status.tokenConfigured, errorMessage: undefined })
    } catch (error) {
      set({ errorMessage: error instanceof Error ? error.message : String(error) })
    }
  },

  saveApiToken: async (token) => {
    set({ isLoading: true, errorMessage: undefined })
    try {
      const status = await saveBearApiToken(token)
      set({ tokenConfigured: status.tokenConfigured, isLoading: false })
    } catch (error) {
      set({ isLoading: false, errorMessage: error instanceof Error ? error.message : String(error) })
    }
  },

  loadPreview: async (taskId) => {
    try {
      const preview = await getBearNotePreview(taskId)
      if (!preview) return
      set({ previewsByTaskId: { ...get().previewsByTaskId, [taskId]: preview } })
    } catch (error) {
      set({ errorMessage: error instanceof Error ? error.message : String(error) })
    }
  },

  linkSelectedNote: async (taskId) => {
    set({ isLoading: true, errorMessage: undefined })
    try {
      await linkSelectedBearNote(taskId)
      scheduleBearCallbackTimeout(() => {
        set({ isLoading: false, errorMessage: BEAR_CALLBACK_TIMEOUT_MESSAGE })
      })
    } catch (error) {
      clearBearCallbackTimeout()
      set({ isLoading: false, errorMessage: error instanceof Error ? error.message : String(error) })
    }
  },

  refreshPreview: async (taskId) => {
    set({ isLoading: true, errorMessage: undefined })
    try {
      await refreshBearNotePreview(taskId)
      scheduleBearCallbackTimeout(() => {
        set({ isLoading: false, errorMessage: BEAR_CALLBACK_TIMEOUT_MESSAGE })
      })
    } catch (error) {
      clearBearCallbackTimeout()
      set({ isLoading: false, errorMessage: error instanceof Error ? error.message : String(error) })
    }
  },

  unlinkNote: async (taskId) => {
    set({ isLoading: true, errorMessage: undefined })
    try {
      const task = await unlinkBearNote(taskId)
      const { [taskId]: _removed, ...nextPreviews } = get().previewsByTaskId
      set({ isLoading: false, previewsByTaskId: nextPreviews })
      return task
    } catch (error) {
      set({ isLoading: false, errorMessage: error instanceof Error ? error.message : String(error) })
      return null
    }
  },

  receiveLinkedNote: (linked) => {
    clearBearCallbackTimeout()
    set({
      isLoading: false,
      errorMessage: undefined,
      previewsByTaskId: {
        ...get().previewsByTaskId,
        [linked.task.id]: linked.preview,
      },
    })
  },

  receiveError: (message) => {
    clearBearCallbackTimeout()
    set({ isLoading: false, errorMessage: message })
  },
}))
