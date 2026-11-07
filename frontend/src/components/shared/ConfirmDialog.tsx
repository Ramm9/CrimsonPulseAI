import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/utils/cn'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  variant?: 'danger' | 'default'
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  variant = 'default',
}: ConfirmDialogProps) {
  const isDanger = variant === 'danger'

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-sm rounded-xl border border-cp-border bg-cp-card p-6 shadow-2xl"
          >
            <div className="flex items-start gap-4">
              {isDanger && (
                <div className="shrink-0 rounded-full bg-red-500/10 p-2">
                  <AlertTriangle className="h-5 w-5 text-cp-critical" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-base font-semibold text-cp-text">{title}</h3>
                <p className="mt-2 text-sm text-cp-text-secondary">{message}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-lg border border-cp-border bg-cp-secondary px-4 py-2 text-sm font-medium text-cp-text transition-colors hover:bg-cp-elevated"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onConfirm()
                  onClose()
                }}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
                  isDanger
                    ? 'bg-cp-critical hover:bg-red-600'
                    : 'bg-cp-crimson hover:bg-cp-crimson/90'
                )}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
