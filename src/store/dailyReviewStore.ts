import { create } from 'zustand'
import { getWorkspaceMutationAdapter } from '../lib/workspaceMutations'
import type { DailyReviewItem } from '../types/dailyReview'
import { upsertById } from './upsertById'

export interface DailyReviewState {
  items: DailyReviewItem[]
  loading: boolean
  hasMore: boolean

  loadInitialTimeline: () => Promise<void>
  loadMoreTimeline: () => Promise<void>
  createItem: (date: string, blocks: import('../types/dailyReview').DailyReviewBlock[]) => Promise<void>
  updateItem: (id: string, blocks: import('../types/dailyReview').DailyReviewBlock[]) => Promise<void>
  deleteItem: (id: string) => Promise<void>
}

export const useDailyReviewStore = create<DailyReviewState>((set, get) => ({
  items: [],
  loading: false,
  hasMore: true,

  loadInitialTimeline: async () => {
    set({ loading: true })
    try {
      const adapter = getWorkspaceMutationAdapter()
      const items = await adapter.getDailyReviewTimeline(20)
      set({ items, hasMore: items.length >= 20, loading: false })
    } catch (error) {
      console.error(error)
      set({ loading: false })
    }
  },

  loadMoreTimeline: async () => {
    const { items, loading, hasMore } = get()
    if (loading || !hasMore || items.length === 0) return

    set({ loading: true })
    try {
      const adapter = getWorkspaceMutationAdapter()
      const lastDate = items[items.length - 1].date
      const newItems = await adapter.getDailyReviewTimeline(20, lastDate)
      set({
        items: [...items, ...newItems],
        hasMore: newItems.length >= 20,
        loading: false,
      })
    } catch (error) {
      console.error(error)
      set({ loading: false })
    }
  },

  createItem: async (date, blocks) => {
    const adapter = getWorkspaceMutationAdapter()
    const result = await adapter.createDailyReviewItem(date, blocks)
    if (result.item) {
      const newItem = result.item
      set((state) => {
        const nextItems = [newItem, ...state.items]
        // Maintain sorting (date descending, then createdAt descending)
        nextItems.sort((a, b) => {
          if (a.date !== b.date) {
            return a.date > b.date ? -1 : 1
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
        return { items: nextItems }
      })
    }
  },

  updateItem: async (id, blocks) => {
    const adapter = getWorkspaceMutationAdapter()
    const result = await adapter.updateDailyReviewItem(id, blocks)
    if (result.item) {
      const updated = result.item
      set((state) => ({
        items: upsertById(state.items, updated),
      }))
    }
  },

  deleteItem: async (id) => {
    const adapter = getWorkspaceMutationAdapter()
    await adapter.deleteDailyReviewItem(id)
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    }))
  },
}))
