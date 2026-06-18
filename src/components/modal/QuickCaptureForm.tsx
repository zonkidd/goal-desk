import { useState } from 'react'
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
  const [creationMode, setCreationMode] = useState<'local' | 'reminder' | 'both'>('local')

  return (
    <div className={`glass-panel rounded-[28px] border border-white/80 p-6 shadow-2xl ${compact ? '' : ''}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-700">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <h3 className="font-bold">Quick Capture</h3>
        </div>
        {onClose && (
          <button
            type="button"
            aria-label="Close quick capture"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="mb-3 text-sm text-slate-500">先把想法收进来。后面我们再把它解析成具体时间和提醒。</p>

      {/* 创建模式选择器 */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="mb-2 text-xs font-bold text-slate-600">创建方式</div>
        <div className="flex items-center gap-3">
          {/* 本地待办 */}
          <label className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 transition-all ${
            creationMode === 'local'
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50'
          }`}>
            <input
              type="radio"
              name="mode"
              value="local"
              checked={creationMode === 'local'}
              onChange={() => setCreationMode('local')}
              className="h-4 w-4 text-indigo-600"
            />
            <span className="text-xs font-bold text-slate-900">本地</span>
            <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[9px] font-black text-white">默认</span>
          </label>

          {/* 系统提醒 */}
          <label className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 transition-all ${
            creationMode === 'reminder'
              ? 'border-orange-500 bg-orange-50'
              : 'border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50'
          }`}>
            <input
              type="radio"
              name="mode"
              value="reminder"
              checked={creationMode === 'reminder'}
              onChange={() => setCreationMode('reminder')}
              className="h-4 w-4 text-orange-600"
            />
            <span className="text-xs font-bold text-slate-900">系统</span>
          </label>

          {/* 混合模式 */}
          <label className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 transition-all ${
            creationMode === 'both'
              ? 'border-green-500 bg-green-50'
              : 'border-slate-200 bg-white hover:border-green-300 hover:bg-green-50'
          }`}>
            <input
              type="radio"
              name="mode"
              value="both"
              checked={creationMode === 'both'}
              onChange={() => setCreationMode('both')}
              className="h-4 w-4 text-green-600"
            />
            <span className="text-xs font-bold text-slate-900">混合</span>
            <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-black text-green-700">荐</span>
          </label>
        </div>
        <div className="mt-2 text-[10px] text-slate-500">
          本地=Desk管理 · 系统=提醒App · 混合=Desk+通知
        </div>
      </div>

      <input
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            onSubmit()
          } else if (event.key === 'Escape' && onClose) {
            onClose()
          }
        }}
        className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-medium shadow-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
        placeholder="例如：明天下午三点看熊掌记"
      />
    </div>
  )
}
