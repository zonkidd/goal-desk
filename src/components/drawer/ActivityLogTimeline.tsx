import { Activity, CheckCircle2, NotebookPen, Pause, Play } from 'lucide-react'
import type { TaskActivityLog } from '../../types/task'

function iconForAction(action: TaskActivityLog['action']) {
  switch (action) {
    case 'PAUSED':
      return <Pause className="h-3 w-3 fill-current" />
    case 'STARTED':
    case 'RESUMED':
      return <Play className="h-3 w-3 fill-current" />
    case 'COMPLETED':
      return <CheckCircle2 className="h-3 w-3" />
    case 'NOTE_ADDED':
      return <NotebookPen className="h-3 w-3" />
    default:
      return <Activity className="h-3 w-3" />
  }
}

const labelMap: Record<TaskActivityLog['action'], string> = {
  CREATED: 'Created',
  STARTED: 'Started',
  PAUSED: 'Paused',
  RESUMED: 'Resumed',
  COMPLETED: 'Completed',
  NOTE_ADDED: 'Note',
}

export function ActivityLogTimeline({ logs }: { logs: TaskActivityLog[] }) {
  return (
    <div className="relative space-y-6 before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
      {logs.map((log, index) => (
        <div key={`${log.action}-${log.timestamp.toISOString()}-${index}`} className="relative flex items-start gap-4">
          <div className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600">
            {iconForAction(log.action)}
          </div>
          <div className="flex-1 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">{labelMap[log.action]}</span>
              <span className="text-[10px] font-medium text-slate-400">{log.timestamp.toLocaleString('zh-CN')}</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">{log.note || '状态已更新。'}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
