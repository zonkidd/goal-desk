import { useState } from 'react'
import { hideCurrentWindow } from '../../lib/runtime'
import { getWorkspaceMutationAdapter } from '../../lib/workspaceMutations'
import { QuickCaptureForm, type CreationMode } from './QuickCaptureForm'

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

  async function handleSubmit(mode: CreationMode) {
    const trimmed = value.trim()
    if (!trimmed) return

    try {
      const adapter = getWorkspaceMutationAdapter()

      if (mode === 'local') {
        await adapter.createTask(trimmed)
        setStatus('已保存到本地收集箱')
      } else if (mode === 'reminder') {
        await adapter.createSystemReminder(trimmed)
        setStatus('已创建系统提醒')
      } else if (mode === 'both') {
        await adapter.createTask(trimmed)
        setStatus('已保存到本地收集箱并创建系统提醒')
      }

      setValue('')
      await closeWindow()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-transparent text-slate-800">
      <div className="w-[520px]">
        <QuickCaptureForm
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          onClose={() => void closeWindow()}
        />
        {status && <p className="mt-3 px-2 text-xs font-medium text-slate-500">{status}</p>}
      </div>
    </main>
  )
}
