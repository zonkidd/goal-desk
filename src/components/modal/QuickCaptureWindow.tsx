import { useState } from 'react'
import { captureTask, createSystemReminder } from '../../lib/tauriCommands'
import { hideCurrentWindow } from '../../lib/runtime'
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
      if (mode === 'local') {
        // 仅创建本地任务
        await captureTask(trimmed)
        setStatus('已保存到本地收集箱')
      } else if (mode === 'reminder') {
        // 仅创建系统提醒
        await createSystemReminder(trimmed)
        setStatus('已创建系统提醒')
      } else if (mode === 'both') {
        // 创建本地任务并关联系统提醒
        const task = await captureTask(trimmed)
        if (task) {
          await createSystemReminder(trimmed)
        }
        setStatus('已保存到本地收集箱并创建系统提醒')
      }

      setValue('')
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
          onSubmit={handleSubmit}
          onClose={() => void closeWindow()}
        />
        {status && <p className="mt-3 px-2 text-xs font-medium text-slate-500">{status}</p>}
      </div>
    </main>
  )
}
