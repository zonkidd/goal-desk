import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useTaskStore } from '../../store/taskStore'
import { useUiStore } from '../../store/uiStore'
import { QuickCaptureForm } from './QuickCaptureForm'
import { runQuickCapture } from '../../lib/quickCaptureFlow'

export function QuickCaptureModal() {
  const isOpen = useUiStore((state) => state.isQuickCaptureOpen)
  const closeQuickCapture = useUiStore((state) => state.closeQuickCapture)
  const addTask = useTaskStore((state) => state.addTask)
  const setView = useUiStore((state) => state.setView)
  const [value, setValue] = useState('')

  const handleSubmit = async () => {
    const trimmed = value.trim()
    if (!trimmed) return

    const result = await runQuickCapture({
      input: trimmed,
      port: {
        createTask: addTask,
      },
    })

    if (result.task) {
      setView('inbox')
    }

    setValue('')
    closeQuickCapture()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close quick capture"
            className="fixed inset-0 z-40 bg-slate-900/15 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeQuickCapture}
          />
          <motion.div
            className="fixed left-1/2 top-24 z-50 w-[520px] -translate-x-1/2"
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          >
            <QuickCaptureForm
              value={value}
              onChange={setValue}
              onSubmit={handleSubmit}
              onClose={closeQuickCapture}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
