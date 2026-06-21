import { isTauriRuntime, getCurrentWindowLabel, hideCurrentWindow } from './runtime'

export interface RuntimeAdapter {
  isTauri(): boolean
  getWindowLabel(): string
  hideWindow(): Promise<void>
  canOpenInBear(): boolean
  canSyncTasks(): boolean
  canLoadDesktopSnapshot(): boolean
}

class TauriRuntimeAdapter implements RuntimeAdapter {
  isTauri(): boolean {
    return true
  }

  getWindowLabel(): string {
    return getCurrentWindowLabel()
  }

  async hideWindow(): Promise<void> {
    await hideCurrentWindow()
  }

  canOpenInBear(): boolean {
    return true
  }

  canSyncTasks(): boolean {
    return true
  }

  canLoadDesktopSnapshot(): boolean {
    return true
  }
}

class BrowserRuntimeAdapter implements RuntimeAdapter {
  isTauri(): boolean {
    return false
  }

  getWindowLabel(): string {
    return 'browser'
  }

  async hideWindow(): Promise<void> {
    // no-op in browser
  }

  canOpenInBear(): boolean {
    return false
  }

  canSyncTasks(): boolean {
    return false
  }

  canLoadDesktopSnapshot(): boolean {
    return false
  }
}

let adapterInstance: RuntimeAdapter | null = null

export function getRuntimeAdapter(): RuntimeAdapter {
  if (!adapterInstance) {
    adapterInstance = isTauriRuntime() ? new TauriRuntimeAdapter() : new BrowserRuntimeAdapter()
  }
  return adapterInstance
}

export function setRuntimeAdapter(adapter: RuntimeAdapter): void {
  adapterInstance = adapter
}

export function resetRuntimeAdapter(): void {
  adapterInstance = null
}
