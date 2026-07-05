/**
 * workspaceMutations - Adapter registry
 *
 * Provides the MutationAdapter and EventKitAdapter used by all stores.
 * In production, auto-detects Tauri vs browser runtime.
 * In tests, use setWorkspaceMutationAdapter() / setEventKitAdapter() to inject mocks.
 */
import { getRuntimeAdapter } from './runtimeAdapter'
import { TauriAdapter } from './tauriAdapter'
import { BrowserAdapter, BROWSER_PREVIEW_STATUS } from './browserAdapter'
import { ValidatingMutationAdapter } from './validatingAdapter'
import { TauriEventKitAdapter, BrowserEventKitAdapter } from './eventkitAdapter'
import type { MutationAdapter } from './mutationAdapter'
import type { EventKitAdapter } from './eventkitAdapter'

export type { MutationAdapter, TaskResult, GoalResult, AreaResult, DeleteAreaResult } from './mutationAdapter'
export { BROWSER_PREVIEW_STATUS } from './browserAdapter'
export type { EventKitAdapter } from './eventkitAdapter'

let adapterInstance: MutationAdapter | null = null
let eventkitAdapterInstance: EventKitAdapter | null = null

export function getWorkspaceMutationAdapter(): MutationAdapter {
  if (!adapterInstance) {
    const runtimeAdapter = getRuntimeAdapter().isTauri() ? new TauriAdapter() : new BrowserAdapter()
    adapterInstance = new ValidatingMutationAdapter(runtimeAdapter)
  }
  return adapterInstance
}

export function setWorkspaceMutationAdapter(adapter: MutationAdapter): void {
  adapterInstance = adapter
}

export function resetWorkspaceMutationAdapter(): void {
  adapterInstance = null
}

export function getEventKitAdapter(): EventKitAdapter {
  if (!eventkitAdapterInstance) {
    eventkitAdapterInstance = getRuntimeAdapter().isTauri() ? new TauriEventKitAdapter() : new BrowserEventKitAdapter()
  }
  return eventkitAdapterInstance
}

export function setEventKitAdapter(adapter: EventKitAdapter): void {
  eventkitAdapterInstance = adapter
}

export function resetEventKitAdapter(): void {
  eventkitAdapterInstance = null
}

export const createWorkspaceMutationAdapter = getWorkspaceMutationAdapter

export function createBrowserTaskNote(note: string) {
  return {
    action: 'NOTE_ADDED' as const,
    note,
    timestamp: new Date(),
  }
}
