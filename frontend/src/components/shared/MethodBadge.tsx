import { cn } from '@/utils/cn'
import type { HttpMethod } from '@/types'

interface MethodBadgeProps {
  method: HttpMethod
  className?: string
}

const methodStyles: Record<HttpMethod, string> = {
  GET: 'bg-blue-500/10 text-blue-400',
  POST: 'bg-cp-crimson/10 text-cp-crimson',
  PUT: 'bg-amber-500/10 text-amber-400',
  PATCH: 'bg-purple-500/10 text-purple-400',
  DELETE: 'bg-red-500/10 text-red-400/80',
  OPTIONS: 'bg-zinc-500/10 text-zinc-400',
  HEAD: 'bg-teal-500/10 text-teal-400',
}

export function MethodBadge({ method, className }: MethodBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold font-mono uppercase',
        methodStyles[method],
        className
      )}
    >
      {method}
    </span>
  )
}
