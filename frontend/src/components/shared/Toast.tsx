import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/store/appStore'
import type { ToastType } from '@/store/appStore'

const toastConfig: Record<ToastType, { icon: typeof CheckCircle2; color: string; borderColor: string }> = {
  success: {
    icon: CheckCircle2,
    color: 'text-cp-healthy',
    borderColor: 'border-l-cp-healthy',
  },
  error: {
    icon: AlertCircle,
    color: 'text-cp-critical',
    borderColor: 'border-l-cp-critical',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-cp-warning',
    borderColor: 'border-l-cp-warning',
  },
  info: {
    icon: Info,
    color: 'text-blue-400',
    borderColor: 'border-l-blue-400',
  },
}

function ToastItem({ id, type, title, message }: { id: string; type: ToastType; title: string; message: string }) {
  const removeToast = useAppStore((s) => s.removeToast)
  const config = toastConfig[type]
  const Icon = config.icon

  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(id)
    }, 5000)
    return () => clearTimeout(timer)
  }, [id, removeToast])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn(
        'pointer-events-auto w-80 rounded-lg border border-cp-border border-l-4 bg-cp-card p-4 shadow-xl',
        config.borderColor
      )}
    >
      <div className="flex gap-3">
        <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', config.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-cp-text">{title}</p>
          <p className="mt-0.5 text-xs text-cp-text-secondary line-clamp-2">{message}</p>
        </div>
        <button
          onClick={() => removeToast(id)}
          className="shrink-0 rounded p-1 text-cp-text-secondary transition-colors hover:text-cp-text"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  )
}

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts)

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex flex-col-reverse gap-3">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} {...toast} />
        ))}
      </AnimatePresence>
    </div>
  )
}
