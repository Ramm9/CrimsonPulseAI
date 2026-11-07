import { useState, useEffect, useRef } from 'react'
import {
  Sparkles,
  Send,
  AlertTriangle,
  GitCommit,
  CheckSquare,
  Square,
  Clock,
  Layers,
  ArrowRight,
  ShieldAlert,
  Terminal,
  Cpu,
} from 'lucide-react'
import { incidentService } from '@/services/incidentService'
import { aiService } from '@/services/aiService'
import type { Incident, AIMessage, EvidenceCard, DebugChecklistItem } from '@/types'
import { SeverityBadge } from '@/components/shared/SeverityBadge'
import { MethodBadge } from '@/components/shared/MethodBadge'
import { formatRelativeTime } from '@/utils/helpers'

export function AIInvestigatorPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [evidenceCards, setEvidenceCards] = useState<EvidenceCard[]>([])
  const [checklist, setChecklist] = useState<DebugChecklistItem[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const incList = await incidentService.getIncidents()
        setIncidents(incList)
        if (incList.length > 0) {
          setSelectedIncident(incList[0])
          loadInvestigation(incList[0].id)
        }
      } catch (err) {
        console.error('Failed to load incidents:', err)
      }
    }
    loadData()
  }, [])

  const loadInvestigation = async (incidentId: string) => {
    const inv = await aiService.getInvestigation(incidentId)
    if (inv) {
      setMessages(inv.messages)
      setEvidenceCards(inv.evidenceCards)
      setChecklist(inv.debugChecklist)
    } else {
      // Default investigation template if not found
      setMessages([
        {
          id: 'msg-init-1',
          role: 'user',
          content: 'Why is my orders API suddenly slow?',
          timestamp: new Date().toISOString(),
        },
        {
          id: 'msg-init-2',
          role: 'assistant',
          content:
            "Based on multi-source telemetry correlation, I've identified the root cause factors:\n\n1. **Latency Spike**: P95 latency increased from 180ms to 2,100ms starting at 14:32 UTC\n2. **Deployment Correlation**: A new release (v2.4.1) was deployed at 14:28 UTC, 4 minutes prior to the surge\n3. **Query Degradation**: The database engine reported sequential table scans on `orders_order` due to a missing compound index\n4. **Downstream Cascade**: The payment processor began timing out after 5,000ms thresholds were reached\n\n**Recommendation**: Check the migration history of v2.4.1 and add the missing composite index on `(user_id, status)`.",
          timestamp: new Date().toISOString(),
        },
      ])
      setEvidenceCards([
        {
          id: 'ev-1',
          title: 'Latency Anomaly Detected',
          type: 'metric',
          content: 'P95 latency surged from 180ms to 2,100ms (+1,066%)',
          severity: 'critical',
        },
        {
          id: 'ev-2',
          title: 'Deployment Correlation',
          type: 'deployment',
          content: 'Release v2.4.1 deployed 4 minutes before anomaly by Alex Chen',
          severity: 'warning',
        },
        {
          id: 'ev-3',
          title: 'Connection Pool Exhaustion',
          type: 'log',
          content: 'Postgres active connections peaked at 98/100 pool limit',
          severity: 'critical',
        },
      ])
      setChecklist([
        { id: 'chk-1', label: 'Verify v2.4.1 migration script in staging', completed: true, priority: 'high' },
        { id: 'chk-2', label: 'Inspect PostgreSQL EXPLAIN ANALYZE on orders query', completed: false, priority: 'high' },
        { id: 'chk-3', label: 'Restart gunicorn worker pool or scale instances', completed: false, priority: 'medium' },
        { id: 'chk-4', label: 'Confirm payment gateway timeout recovery', completed: false, priority: 'low' },
      ])
    }
  }

  const handleSelectIncident = (inc: Incident) => {
    setSelectedIncident(inc)
    loadInvestigation(inc.id)
  }

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage
    if (!text.trim()) return

    const userMsg: AIMessage = {
      id: Math.random().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputMessage('')
    setIsTyping(true)

    // Scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 50)

    // Simulate AI response
    setTimeout(() => {
      let replyContent = ''
      const lower = text.toLowerCase()
      if (lower.includes('changed') || lower.includes('recent')) {
        replyContent =
          "In the last 60 minutes:\n- **14:28 UTC**: Deployment `v2.4.1` by Alex Chen (Commit `8f4b2c1`). Modified `orders/views.py` and `models.py`.\n- **14:32 UTC**: First 503 errors recorded.\n- **14:35 UTC**: Background Celery queue delay spiked to 45s."
      } else if (lower.includes('affected') || lower.includes('endpoint')) {
        replyContent =
          "The affected primary endpoint is `POST /api/orders/` (P95 2,100ms).\nDownstream services impacted:\n- `POST /api/payments/` (+4.2% timeout rate)\n- `GET /api/inventory/` (elevated connection contention)"
      } else if (lower.includes('previous') || lower.includes('similar')) {
        replyContent =
          "Found 1 similar previous incident: **#inc-084 on Oct 14**.\nRoot cause: Unindexed query on `orders_order` during flash sale.\nResolution: Added B-tree index `CREATE INDEX idx_orders_status ON orders_order(status)`."
      } else {
        replyContent =
          `I analyzed your inquiry against real-time telemetry:\n\n- Current error rate on \`${selectedIncident?.endpoint}\`: **3.8%**\n- Active gunicorn threads: **92% utilization**\n\nI recommend prioritizing the database query optimization identified in checklist item #2.`
      }

      const aiMsg: AIMessage = {
        id: Math.random().toString(),
        role: 'assistant',
        content: replyContent,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, aiMsg])
      setIsTyping(false)

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    }, 1200)
  }

  const toggleChecklist = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    )
  }

  const suggestedQuestions = [
    'What changed recently?',
    'Which endpoints are affected?',
    'Are there similar previous incidents?',
    'What should I investigate first?',
  ]

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-cp-text sm:text-3xl flex items-center gap-2.5">
          <Sparkles className="h-7 w-7 text-cp-crimson" />
          AI Incident Investigator
        </h1>
        <p className="text-sm text-cp-text-secondary">
          Autonomous root-cause analysis workspace powered by multimodal telemetry reasoning
        </p>
      </div>

      {/* 3-Panel Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 min-h-[680px]">
        {/* PANEL 1: Incident Selector (3 cols) */}
        <div className="lg:col-span-3 rounded-xl border border-cp-border bg-cp-card p-4 flex flex-col">
          <h3 className="text-xs font-semibold text-cp-text-secondary uppercase mb-3">
            Active Incidents ({incidents.length})
          </h3>
          <div className="space-y-2 overflow-y-auto flex-1 max-h-[600px]">
            {incidents.map((inc) => {
              const isSelected = selectedIncident?.id === inc.id
              return (
                <div
                  key={inc.id}
                  onClick={() => handleSelectIncident(inc)}
                  className={`cursor-pointer rounded-lg border p-3 transition-all ${
                    isSelected
                      ? 'border-cp-crimson bg-cp-elevated shadow-sm'
                      : 'border-cp-border/60 bg-cp-secondary hover:border-cp-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <SeverityBadge severity={inc.severity} />
                    <span className="text-[10px] text-cp-text-secondary font-mono">
                      {formatRelativeTime(inc.lastOccurred)}
                    </span>
                  </div>
                  <h4 className="mt-2 text-xs font-semibold text-cp-text line-clamp-1">{inc.title}</h4>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-cp-text-secondary">
                    <MethodBadge method={inc.method} />
                    <span className="truncate">{inc.endpoint}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* PANEL 2: Conversation & Investigation (6 cols) */}
        <div className="lg:col-span-6 rounded-xl border border-cp-border bg-cp-card flex flex-col h-[700px]">
          {/* Chat Header */}
          <div className="p-4 border-b border-cp-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cp-crimson/15 text-cp-crimson">
                <Cpu className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-cp-text">
                  Investigation Thread: {selectedIncident?.title || 'Orders Anomaly'}
                </h3>
                <span className="text-[11px] font-mono text-cp-crimson">
                  {selectedIncident?.endpoint}
                </span>
              </div>
            </div>
            <span className="rounded bg-cp-elevated px-2 py-0.5 text-[10px] text-cp-text-secondary font-mono border border-cp-border">
              LLM Reasoning v4.2
            </span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => {
              const isAssistant = m.role === 'assistant'
              return (
                <div
                  key={m.id}
                  className={`flex gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                >
                  {isAssistant && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cp-crimson text-white text-xs font-bold shadow-sm">
                      CP
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-xl p-3.5 text-xs leading-relaxed ${
                      isAssistant
                        ? 'border border-cp-border bg-cp-elevated text-cp-text border-l-2 border-l-cp-crimson'
                        : 'bg-cp-crimson/90 text-white'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans">{m.content}</div>
                    <div
                      className={`mt-2 text-[10px] text-right ${
                        isAssistant ? 'text-cp-text-secondary' : 'text-white/70'
                      }`}
                    >
                      {new Date(m.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              )
            })}

            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-cp-text-secondary font-mono">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cp-crimson/20 text-cp-crimson text-xs font-bold">
                  CP
                </div>
                <span>Analyzing telemetry traces & correlated diffs...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Quick Questions */}
          <div className="px-4 py-2 border-t border-cp-border/50 flex flex-wrap gap-1.5">
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                onClick={() => handleSendMessage(q)}
                className="rounded-full border border-cp-border bg-cp-secondary px-2.5 py-1 text-[11px] text-cp-text-secondary hover:text-cp-text hover:border-cp-crimson transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="p-3 border-t border-cp-border flex gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask CrimsonPulse AI about this incident..."
              className="flex-1 rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-xs text-cp-text focus:outline-none focus:border-cp-crimson"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isTyping}
              className="inline-flex items-center justify-center rounded-lg bg-cp-crimson px-4 py-2 text-xs font-semibold text-white hover:bg-cp-red disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* PANEL 3: Supporting Evidence & Checklist (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Evidence Cards */}
          <div className="rounded-xl border border-cp-border bg-cp-card p-4 space-y-3">
            <h3 className="text-xs font-semibold text-cp-text-secondary uppercase">
              Supporting Evidence
            </h3>
            <div className="space-y-2.5">
              {evidenceCards.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-lg border border-cp-border/60 bg-cp-secondary p-3 text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-cp-text">{ev.title}</span>
                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                        ev.severity === 'critical'
                          ? 'bg-cp-critical/15 text-cp-critical'
                          : 'bg-cp-warning/15 text-cp-warning'
                      }`}
                    >
                      {ev.type}
                    </span>
                  </div>
                  <p className="text-cp-text-secondary leading-normal">{ev.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Debug Checklist */}
          <div className="rounded-xl border border-cp-border bg-cp-card p-4 space-y-3">
            <h3 className="text-xs font-semibold text-cp-text-secondary uppercase">
              Recommended Remediation
            </h3>
            <div className="space-y-2">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleChecklist(item.id)}
                  className="flex items-start gap-2.5 cursor-pointer rounded-lg p-2 hover:bg-cp-elevated transition-colors text-xs"
                >
                  {item.completed ? (
                    <CheckSquare className="h-4 w-4 text-cp-healthy shrink-0 mt-0.5" />
                  ) : (
                    <Square className="h-4 w-4 text-cp-text-secondary shrink-0 mt-0.5" />
                  )}
                  <span
                    className={`leading-tight ${
                      item.completed ? 'line-through text-cp-text-secondary' : 'text-cp-text'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
export default AIInvestigatorPage

