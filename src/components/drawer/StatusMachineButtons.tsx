import { CheckCircle2, PauseCircle, PlayCircle } from 'lucide-react'
import type { TaskStatus } from '../../types/task'
import { cn } from '../../lib/cn'
import { getTaskPrimaryStatusLabel } from '../../lib/taskPresentation'

interface StatusMachineButtonsProps {
  status: TaskStatus
  onAction: (next: TaskStatus) => void
}

export function StatusMachineButtons({ status, onAction }: StatusMachineButtonsProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onAction('IN_PROGRESS')}
        className={cn(
          'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-bold shadow-sm transition-colors',
          status === 'IN_PROGRESS' || status === 'TODO'
            ? 'border-slate-200 bg-white text-slate-700'
            : 'border-transparent text-slate-500 hover:bg-slate-50',
        )}
      >
        <PlayCircle className="h-4 w-4" />
        {getTaskPrimaryStatusLabel(status)}
      </button>
      <button
        onClick={() => onAction('PAUSED')}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors',
          status === 'PAUSED' ? 'bg-amber-50 text-amber-600' : 'text-amber-600 hover:bg-amber-50',
        )}
      >
        <PauseCircle className="h-4 w-4" />
        Pause
      </button>
      <button
        onClick={() => onAction('DONE')}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors',
          status === 'DONE' ? 'bg-emerald-50 text-emerald-600' : 'text-emerald-600 hover:bg-emerald-50',
        )}
      >
        <CheckCircle2 className="h-4 w-4" />
        Complete
      </button>
    </div>
  )
}
