import { create } from 'zustand'
import { getWorkspaceMutationAdapter } from '../lib/workspaceMutations'
import { executeMutation } from './mutationHelper'
import { upsertById } from './upsertById'
import type { AreaWithStats } from '../types/app'

export interface AreaStoreState {
  allAreas: AreaWithStats[]

  loadAreas: () => Promise<void>
  createArea: (title: string) => Promise<void>
  renameArea: (areaId: string, newTitle: string) => Promise<void>
  deleteArea: (areaId: string, force?: boolean) => Promise<void>
}

function sortAreas(areas: AreaWithStats[]): AreaWithStats[] {
  return [...areas].sort((a, b) => a.title.localeCompare(b.title))
}

function replaceArea(areas: AreaWithStats[], area: AreaWithStats): AreaWithStats[] {
  return sortAreas(upsertById(areas, area))
}

export const useAreaStore = create<AreaStoreState>((set, get) => ({
  allAreas: [],

  loadAreas: async () => {
    const adapter = getWorkspaceMutationAdapter()
    const result = await executeMutation(
      (a) => a.listAreas(),
      adapter,
    )
    if (result?.areas) {
      set({ allAreas: result.areas })
    }
  },

  createArea: async (title) => {
    const adapter = getWorkspaceMutationAdapter()
    const result = await executeMutation(
      (a) => a.createArea(title),
      adapter,
    )
    if (result?.area) {
      set((state) => ({ allAreas: replaceArea(state.allAreas, result.area!) }))
    }
  },

  renameArea: async (areaId, newTitle) => {
    const adapter = getWorkspaceMutationAdapter()
    const result = await executeMutation(
      (a) => a.renameArea(areaId, newTitle),
      adapter,
    )
    if (result?.area) {
      set((state) => ({ allAreas: replaceArea(state.allAreas, result.area!) }))
    }
  },

  deleteArea: async (areaId, force = false) => {
    const adapter = getWorkspaceMutationAdapter()
    const result = await executeMutation(
      (a) => a.deleteArea(areaId, force),
      adapter,
    )
    if (result?.success) {
      set((state) => ({
        allAreas: state.allAreas.filter((a) => a.id !== areaId),
      }))
    }
  },
}))
