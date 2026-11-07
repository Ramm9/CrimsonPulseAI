import { cn } from '@/utils/cn'

interface LogoProps {
  collapsed?: boolean
  className?: string
}

export function Logo({ collapsed = false, className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {/* Heartbeat SVG */}
      <svg
        viewBox="0 0 36 36"
        className="h-8 w-8 shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background circle */}
        <circle cx="18" cy="18" r="17" stroke="#E63946" strokeWidth="1.5" strokeOpacity="0.3" />
        {/* Pulse line */}
        <path
          d="M4 19 L10 19 L13 14 L16 24 L19 8 L22 22 L25 16 L27 19 L32 19"
          stroke="#E63946"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-[0_0_6px_rgba(230,57,70,0.5)]"
        />
        {/* Glow dot at peak */}
        <circle cx="19" cy="8" r="2" fill="#E63946" fillOpacity="0.4" />
      </svg>

      {/* Text */}
      {!collapsed && (
        <div className="flex items-center gap-1.5">
          <span className="text-base font-bold tracking-tight text-cp-text">
            CRIMSON<span className="text-cp-crimson">PULSE</span>
          </span>
          <span className="rounded bg-cp-crimson/15 px-1.5 py-0.5 text-[10px] font-bold text-cp-crimson">
            AI
          </span>
        </div>
      )}
    </div>
  )
}
