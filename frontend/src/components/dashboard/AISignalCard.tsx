import { Sparkles, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'

interface AISignalCardProps {
  className?: string
}

export function AISignalCard({ className }: AISignalCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-cp-border bg-cp-card',
        'border-l-2 border-l-cp-crimson',
        className
      )}
    >
      {/* Subtle crimson glow at top */}
      <div className="absolute -top-24 left-1/2 h-32 w-64 -translate-x-1/2 rounded-full bg-cp-crimson/5 blur-3xl" />

      <div className="relative p-5">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cp-crimson/10">
              <Sparkles size={16} className="text-cp-crimson" />
            </div>
            <span className="text-sm font-semibold text-cp-text">AI Signal</span>
          </div>

          {/* Pulsing dot */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cp-crimson opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cp-crimson" />
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-cp-crimson">
              Active
            </span>
          </div>
        </div>

        {/* Signal description */}
        <p className="mb-4 text-sm leading-relaxed text-cp-text">
          Orders endpoint deviated from its normal latency profile.
        </p>

        {/* Evidence */}
        <div className="mb-5 space-y-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-cp-text-secondary">
            Evidence
          </p>

          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="flex items-center gap-3 rounded-lg bg-cp-secondary/80 px-3 py-2.5"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-cp-warning" />
            <div className="text-xs text-cp-text-secondary">
              <span className="text-cp-text-secondary">P95 changed from </span>
              <span className="font-mono font-medium text-cp-text">180ms</span>
              <span className="mx-1 text-cp-text-secondary">→</span>
              <span className="font-mono font-medium text-cp-crimson">2,100ms</span>
              <span className="ml-1 text-[11px] text-cp-crimson font-mono">(+1,066%)</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35, duration: 0.3 }}
            className="flex items-center gap-3 rounded-lg bg-cp-secondary/80 px-3 py-2.5"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-cp-critical" />
            <div className="text-xs text-cp-text-secondary">
              <span className="text-cp-text-secondary">Error rate changed from </span>
              <span className="font-mono font-medium text-cp-text">0.40%</span>
              <span className="mx-1 text-cp-text-secondary">→</span>
              <span className="font-mono font-medium text-cp-critical">1.82%</span>
              <span className="ml-1 text-[11px] text-cp-text-secondary font-mono">(peak 3.8%)</span>
            </div>
          </motion.div>
        </div>

        {/* Action button */}
        <Link
          to="/incidents/inc_01"
          className="group/btn flex w-full items-center justify-center gap-2 rounded-lg border border-cp-crimson/30 bg-cp-crimson/10 px-4 py-2.5 text-sm font-medium text-cp-crimson transition-all hover:bg-cp-crimson/20 hover:border-cp-crimson/50"
        >
          Inspect Incident
          <ArrowRight
            size={14}
            className="transition-transform group-hover/btn:translate-x-0.5"
          />
        </Link>
      </div>
    </div>
  )
}
