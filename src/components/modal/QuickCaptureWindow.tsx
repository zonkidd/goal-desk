import { useState } from 'react'
import { hideCurrentWindow } from '../../lib/runtime'
import { getWorkspaceMutationAdapter } from '../../lib/workspaceMutations'
import { runQuickCapture } from '../../lib/quickCaptureFlow'
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

  async function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed) return

    try {
      const adapter = getWorkspaceMutationAdapter()
      const result = await runQuickCapture({
        input: trimmed,
        port: {
          createTask: async (input) => {
            return (await adapter.createTask(input)).task
          },
        },
      })

      setStatus(result.statusMessage)
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
