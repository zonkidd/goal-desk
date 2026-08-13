import { getCurrentWindow } from '@tauri-apps/api/window'

/**
 * 检测当前是否运行在 Tauri 环境中
 */
export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/**
 * 获取当前窗口标签
 * Tauri 环境返回实际窗口标签，浏览器环境返回 'browser'
 */
export function getCurrentWindowLabel(): string {
  return isTauriRuntime() ? getCurrentWindow().label : 'browser'
}

/**
 * 隐藏当前窗口（仅 Tauri 环境）
 */
export async function hideCurrentWindow(): Promise<void> {
  if (!isTauriRuntime()) return
  await getCurrentWindow().hide()
}

/**
 * 拖动当前窗口（仅 Tauri 环境）
 */
export async function startWindowDrag(): Promise<void> {
  if (!isTauriRuntime()) return
  await getCurrentWindow().startDragging()
}
