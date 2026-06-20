import { create } from 'zustand'
import { createWorkspaceMutationAdapter } from '../lib/workspaceMutations'
import { useUiStore } from './uiStore'
import type { AreaWithStats } from '../types/app'

export interface AreaStoreState {
  allAreas: AreaWithStats[]
  statusMessage: string

  loadAreas: () => Promise<void>
  createArea: (title: string) => Promise<void>
  renameArea: (areaId: string, newTitle: string) => Promise<void>
  deleteArea: (areaId: string, force?: boolean) => Promise<void>
}

export const useAreaStore = create<AreaStoreState>((set) => ({
  allAreas: [],
  statusMessage: '',

  loadAreas: async () => {
    const adapter = createWorkspaceMutationAdapter()
    try {
      const { areas, statusMessage } = await adapter.listAreas()
      set({
        allAreas: areas || [],
        statusMessage: statusMessage || '',
      })
    } catch (error) {
      set({
        statusMessage: `Unable to load areas · ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  },

  createArea: async (title) => {
    const adapter = createWorkspaceMutationAdapter()
    try {
      const { area, statusMessage } = await adapter.createArea(title)
      if (area) {
        set((state) => {
          const withoutDuplicate = state.allAreas.filter((a) => a.id !== area.id && a.title !== area.title)
          return {
            allAreas: [...withoutDuplicate, area].sort((a, b) => a.title.localeCompare(b.title)),
            statusMessage: statusMessage || '',
          }
        })
      }
    } catch (error) {
      set({ statusMessage: `Unable to create area · ${error instanceof Error ? error.message : String(error)}` })
    }
  },

  renameArea: async (areaId, newTitle) => {
    const adapter = createWorkspaceMutationAdapter()
    try {
      const { area, statusMessage } = await adapter.renameArea(areaId, newTitle)
      if (area) {
        set((state) => ({
          allAreas: state.allAreas.map((a) => (a.id === areaId ? { ...a, title: area.title } : a)).sort((a, b) => a.title.localeCompare(b.title)),
          statusMessage: statusMessage || '',
        }))
      }
    } catch (error) {
      set({ statusMessage: `Unable to rename area · ${error instanceof Error ? error.message : String(error)}` })
    }
  },

  deleteArea: async (areaId, force = false) => {
    const adapter = createWorkspaceMutationAdapter()
    try {
      const { success, message, statusMessage } = await adapter.deleteArea(areaId, force)
      if (success) {
        set((state) => ({
          allAreas: state.allAreas.filter((a) => a.id !== areaId),
          statusMessage: statusMessage || '',
        }))
      } else {
        set({ statusMessage: message })
      }
    } catch (error) {
      set({ statusMessage: `Unable to delete area · ${error instanceof Error ? error.message : String(error)}` })
    }
  },
}))
