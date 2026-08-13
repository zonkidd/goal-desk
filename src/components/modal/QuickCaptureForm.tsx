import { Sparkles, X } from 'lucide-react'
import { motion } from 'framer-motion'

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
    <motion.div 
      layout
      data-testid="qc-container"
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`glass-panel overflow-hidden rounded-[28px] border border-theme-accent/50 p-6 shadow-[0_0_30px_rgba(6,182,212,0.15)] ring-1 ring-white/10 ${compact ? '' : ''}`}
    >
      <motion.div layout="position" className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-theme-primary">
          <Sparkles className="h-4 w-4 text-theme-accent animate-pulse" />
          <h3 className="font-bold">Quick Capture</h3>
        </div>
        {onClose && (
          <button
            type="button"
            aria-label="Close quick capture"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 p-1.5 text-theme-secondary hover:bg-white/10 hover:text-theme-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </motion.div>
      <motion.p layout="position" className="mb-3 text-sm text-theme-secondary">先把想法收进来。后面再安排时间。</motion.p>

      <motion.input
        layout="position"
        data-testid="quick-capture-input"
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
        className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-base font-medium text-theme-primary placeholder:text-theme-secondary shadow-sm outline-none transition-all focus:border-theme-accent focus:bg-theme-card/80 focus:ring-4 focus:ring-theme-accent/20"
        placeholder="例如：明天下午三点看熊掌记"
      />
    </motion.div>
  )
}
