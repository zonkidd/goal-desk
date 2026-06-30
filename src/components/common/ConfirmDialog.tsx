import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  danger?: boolean
}

export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = '确认',
  danger = true,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
          <motion.div
            className="relative mx-4 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="mb-4 flex items-center gap-3">
              {danger && (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
              )}
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            </div>
            <p className="mb-6 whitespace-pre-line text-sm leading-relaxed text-slate-600">{message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={onCancel}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={onConfirm}
                className={`rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors ${
                  danger
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
