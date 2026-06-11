import { getCurrentWindow } from '@tauri-apps/api/window'
import { useEffect, useState } from 'react'
import { captureTask, isTauriRuntime } from '../../lib/desktopApi'
import { QuickCaptureForm } from './QuickCaptureForm'

export function QuickCaptureWindow() {
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<string>()

  useEffect(() => {
    if (!isTauriRuntime()) return

    const currentWindow = getCurrentWindow()
    let disposed = false

    const cleanup = currentWindow.onCloseRequested(async (event) => {
      event.preventDefault()
      if (!disposed) {
        await currentWindow.hide()
      }
    })

    return () => {
      disposed = true
      void cleanup.then((unlisten) => unlisten())
    }
  }, [])

  async function hideWindow() {
    if (!isTauriRuntime()) return
    await getCurrentWindow().hide()
  }

  async function submitCapture() {
    const trimmed = value.trim()
    if (!trimmed) return

    try {
      await captureTask(trimmed)
      setValue('')
      setStatus('已保存到本地收集箱')
      await hideWindow()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <main className="mesh-bg flex min-h-screen items-center justify-center p-4 text-slate-800">
      <div className="w-full max-w-[520px]">
        <QuickCaptureForm value={value} onChange={setValue} onSubmit={() => void submitCapture()} onClose={() => void hideWindow()} />
        {status && <p className="mt-3 px-2 text-xs font-medium text-slate-500">{status}</p>}
      </div>
    </main>
  )
}
