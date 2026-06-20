/**
 * workspaceMutations - Adapter registry
 *
 * Provides the MutationAdapter used by all stores.
 * In production, auto-detects Tauri vs browser runtime.
 * In tests, use setWorkspaceMutationAdapter() to inject a mock.
 */
import { isTauriRuntime } from './runtime'
import { TauriAdapter } from './tauriAdapter'
import { BrowserAdapter, BROWSER_PREVIEW_STATUS } from './browserAdapter'
import type { MutationAdapter } from './mutationAdapter'

export type { MutationAdapter, TaskResult, GoalResult, AreaResult, DeleteAreaResult } from './mutationAdapter'
export { BROWSER_PREVIEW_STATUS } from './browserAdapter'

let adapterInstance: MutationAdapter | null = null

export function getWorkspaceMutationAdapter(): MutationAdapter {
  if (!adapterInstance) {
    adapterInstance = isTauriRuntime() ? new TauriAdapter() : new BrowserAdapter()
  }
  return adapterInstance
}

export function setWorkspaceMutationAdapter(adapter: MutationAdapter): void {
  adapterInstance = adapter
}

export function resetWorkspaceMutationAdapter(): void {
  adapterInstance = null
}

export const createWorkspaceMutationAdapter = getWorkspaceMutationAdapter

export function createBrowserTaskNote(note: string) {
  return {
    action: 'NOTE_ADDED' as const,
    note,
    timestamp: new Date(),
  }
}
