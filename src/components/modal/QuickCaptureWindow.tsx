import { useState } from 'react'
import { captureTask, hideCurrentWindow } from '../../lib/desktopApi'
import { QuickCaptureForm } from './QuickCaptureForm'

export function QuickCaptureWindow() {
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<string>()

  async function closeWindow() {
    try {
      await hideCurrentWindow()
    } catch (error) {
      setStatus(`关闭失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async function submitCapture() {
    const trimmed = value.trim()
    if (!trimmed) return

    try {
      await captureTask(trimmed)
      setValue('')
      setStatus('已保存到本地收集箱')
      await closeWindow()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900/15 backdrop-blur-sm text-slate-800">
      <div className="w-[520px]">
        <QuickCaptureForm
          value={value}
          onChange={setValue}
          onSubmit={() => void submitCapture()}
          onClose={() => void closeWindow()}
        />
        {status && <p className="mt-3 px-2 text-xs font-medium text-slate-500">{status}</p>}
      </div>
    </main>
  )
}
