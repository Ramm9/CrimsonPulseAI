import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  LayoutDashboard,
  AlertTriangle,
  Radio,
  BrainCircuit,
  FolderKanban,
  Compass,
  FileCheck,
  Sparkles,
  Settings,
  ArrowRight,
  CornerDownLeft,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAppStore } from '@/store/appStore'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: typeof LayoutDashboard
  action: () => void
  category: 'navigation' | 'action'
}

export function CommandPalette() {
  const open = useAppStore((s) => s.commandPaletteOpen)
  const setOpen = useAppStore((s) => s.setCommandPaletteOpen)
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const items: CommandItem[] = [
    { id: 'dashboard', label: 'Go to Dashboard', description: 'Overview and metrics', icon: LayoutDashboard, action: () => navigate('/dashboard'), category: 'navigation' },
    { id: 'projects', label: 'View Projects', description: 'Manage your API projects', icon: FolderKanban, action: () => navigate('/projects'), category: 'navigation' },
    { id: 'explorer', label: 'API Explorer', description: 'Browse endpoints', icon: Compass, action: () => navigate('/explorer'), category: 'navigation' },
    { id: 'traffic', label: 'Live Traffic', description: 'Real-time request stream', icon: Radio, action: () => navigate('/traffic'), category: 'navigation' },
    { id: 'anomalies', label: 'Anomalies', description: 'ML-detected anomalies', icon: BrainCircuit, action: () => navigate('/anomalies'), category: 'navigation' },
    { id: 'incidents', label: 'View Incidents', description: 'Active and past incidents', icon: AlertTriangle, action: () => navigate('/incidents'), category: 'navigation' },
    { id: 'contracts', label: 'Contract Validation', description: 'API spec compliance', icon: FileCheck, action: () => navigate('/contracts'), category: 'navigation' },
    { id: 'investigator', label: 'AI Investigator', description: 'AI-powered debugging', icon: Sparkles, action: () => navigate('/investigator'), category: 'navigation' },
    { id: 'settings', label: 'Settings', description: 'App configuration', icon: Settings, action: () => navigate('/settings'), category: 'navigation' },
  ]

  const filteredItems = query
    ? items.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.description?.toLowerCase().includes(query.toLowerCase())
      )
    : items

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleClose = useCallback(() => {
    setOpen(false)
    setQuery('')
    setSelectedIndex(0)
  }, [setOpen])

  // Global Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(!open)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, setOpen])

  // Focus input
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filteredItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      filteredItems[selectedIndex].action()
      handleClose()
    } else if (e.key === 'Escape') {
      handleClose()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-lg overflow-hidden rounded-xl border border-cp-border bg-cp-card shadow-2xl"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 border-b border-cp-border px-4 py-3">
              <Search className="h-5 w-5 text-cp-text-secondary" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search pages, actions..."
                className="flex-1 bg-transparent text-sm text-cp-text placeholder:text-cp-text-secondary/60 outline-none"
              />
              <kbd className="hidden rounded border border-cp-border bg-cp-elevated px-1.5 py-0.5 text-[10px] font-mono text-cp-text-secondary sm:inline-block">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto py-2">
              {filteredItems.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-cp-text-secondary">
                  No results found for &quot;{query}&quot;
                </div>
              ) : (
                <>
                  <div className="px-3 pb-1 pt-1">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-cp-text-secondary/60">
                      {query ? 'Results' : 'Quick Actions'}
                    </span>
                  </div>
                  {filteredItems.map((item, index) => {
                    const Icon = item.icon
                    const isSelected = index === selectedIndex
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          item.action()
                          handleClose()
                        }}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={cn(
                          'mx-2 flex w-[calc(100%-16px)] items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                          isSelected
                            ? 'bg-cp-elevated text-cp-text'
                            : 'text-cp-text-secondary hover:bg-cp-elevated/50'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{item.label}</span>
                          {item.description && (
                            <span className="ml-2 text-xs text-cp-text-secondary">
                              {item.description}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-cp-text-secondary" />
                        )}
                      </button>
                    )
                  })}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-4 border-t border-cp-border px-4 py-2.5">
              <div className="flex items-center gap-1.5 text-[11px] text-cp-text-secondary/60">
                <kbd className="rounded border border-cp-border bg-cp-elevated px-1 py-0.5 text-[10px] font-mono">↑↓</kbd>
                Navigate
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-cp-text-secondary/60">
                <CornerDownLeft className="h-3 w-3" />
                Select
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-cp-text-secondary/60">
                <kbd className="rounded border border-cp-border bg-cp-elevated px-1 py-0.5 text-[10px] font-mono">⌘K</kbd>
                Toggle
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
