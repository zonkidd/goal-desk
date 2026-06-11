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
          'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-bold shadow-sm transition-all duration-200',
          status === 'IN_PROGRESS' || status === 'TODO'
            ? 'border-indigo-300 bg-indigo-50 text-indigo-700 shadow-indigo-100'
            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300',
        )}
      >
        <PlayCircle className={cn('h-5 w-5 transition-transform duration-200', status === 'IN_PROGRESS' && 'scale-110')} />
        {getTaskPrimaryStatusLabel(status)}
      </button>
      <button
        onClick={() => onAction('PAUSED')}
        className={cn(
          'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all duration-200',
          status === 'PAUSED' ? 'bg-amber-100 text-amber-700 shadow-amber-100 shadow-sm scale-105' : 'bg-white border border-amber-200 text-amber-600 hover:bg-amber-50',
        )}
      >
        <PauseCircle className={cn('h-5 w-5 transition-transform duration-200', status === 'PAUSED' && 'scale-110')} />
        Pause
      </button>
      <button
        onClick={() => onAction('DONE')}
        className={cn(
          'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all duration-200',
          status === 'DONE' ? 'bg-emerald-100 text-emerald-700 shadow-emerald-100 shadow-sm scale-105' : 'bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50',
        )}
      >
        <CheckCircle2 className={cn('h-5 w-5 transition-transform duration-200', status === 'DONE' && 'scale-110')} />
        Complete
      </button>
    </div>
  )
}
