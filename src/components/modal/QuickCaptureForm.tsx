import { Sparkles, X } from 'lucide-react'

interface QuickCaptureFormProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onClose?: () => void
  compact?: boolean
}

export function QuickCaptureForm({
  value,
  onChange,
  onSubmit,
  onClose,
  compact = false,
}: QuickCaptureFormProps) {
  return (
    <div className={`glass-panel rounded-[28px] border border-white/80 p-6 shadow-2xl ${compact ? '' : ''}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-700">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <h3 className="font-bold">Quick Capture</h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-500">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="mb-3 text-sm text-slate-500">先把想法收进来。后面我们再把它解析成具体时间和提醒。</p>
      <input
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            onSubmit()
          }
        }}
        className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-medium shadow-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
        placeholder="例如：明天下午三点看熊掌记"
      />
    </div>
  )
}
