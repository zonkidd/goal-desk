import type { Task } from '../types/task'

export interface QuickCapturePort {
  createTask(input: string): Promise<Task | null | undefined>
}

export interface RunQuickCaptureInput {
  input: string
  port: QuickCapturePort
}

export interface QuickCaptureResult {
  task?: Task | null
  statusMessage?: string
}

export async function runQuickCapture({
  input,
  port,
}: RunQuickCaptureInput): Promise<QuickCaptureResult> {
  const trimmed = input.trim()
  if (!trimmed) return {}

  const task = await port.createTask(trimmed)
  return { task, statusMessage: '已保存到本地收集箱' }
}
