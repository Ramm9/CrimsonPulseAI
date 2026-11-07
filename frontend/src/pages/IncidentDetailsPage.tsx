import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  User,
  Sparkles,
  GitCommit,
  CheckCircle2,
  MessageSquare,
  Send,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { incidentService } from '@/services/incidentService'
import type { Incident, IncidentStatus, IncidentComment } from '@/types'
import { SeverityBadge } from '@/components/shared/SeverityBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { MethodBadge } from '@/components/shared/MethodBadge'
import { formatRelativeTime, formatTimestamp } from '@/utils/helpers'
import { useAppStore } from '@/store/appStore'

export function IncidentDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToast } = useAppStore()

  const [incident, setIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')

  useEffect(() => {
    async function loadData() {
      if (!id) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const item = await incidentService.getIncident(id)
        setIncident(item || null)
      } catch (err) {
        console.error('Failed to load incident:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  const handleStatusChange = async (newStatus: IncidentStatus) => {
    if (!incident) return
    const updated = await incidentService.updateIncidentStatus(incident.id, newStatus)
    if (updated) {
      setIncident(updated)
      addToast({
        id: Math.random().toString(),
        type: 'success',
        title: 'Status Updated',
        message: `Incident status changed to ${newStatus}`,
      })
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!incident || !commentText.trim()) return

    const updated = await incidentService.addComment(incident.id, commentText.trim())
    if (updated) {
      setIncident(updated)
      setCommentText('')
      addToast({
        type: 'success',
        title: 'Comment Added',
        message: 'Your comment was posted to the incident thread.',
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-36 bg-cp-elevated animate-pulse rounded" />
        <div className="h-32 bg-cp-card animate-pulse rounded-xl" />
        <div className="h-80 bg-cp-card animate-pulse rounded-xl" />
      </div>
    )
  }

  if (!incident) {
    return (
      <div className="rounded-xl border border-cp-border bg-cp-card p-12 text-center">
        <h2 className="text-xl font-bold text-cp-text">Incident Not Found</h2>
        <p className="mt-2 text-sm text-cp-text-secondary">
          No incident recorded with ID {id}.
        </p>
        <button
          onClick={() => navigate('/incidents')}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cp-crimson px-4 py-2 text-sm font-medium text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Incidents
        </button>
      </div>
    )
  }

  // Simulated latency chart leading up to and during the incident
  const chartData = [
    { time: '-60m', latency: 180 },
    { time: '-50m', latency: 185 },
    { time: '-40m', latency: 175 },
    { time: '-30m', latency: 190 },
    { time: '-20m', latency: 220 },
    { time: '-15m', latency: 850 },
    { time: '-10m', latency: 1650 },
    { time: '-5m', latency: 2100 },
    { time: 'now', latency: 1840 },
  ]

  return (
    <div className="space-y-6 pb-12">
      {/* Back button & Title Bar */}
      <div>
        <button
          onClick={() => navigate('/incidents')}
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-cp-text-secondary hover:text-cp-text transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Incidents
        </button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <SeverityBadge severity={incident.severity} />
              <h1 className="text-xl font-bold text-cp-text sm:text-2xl">{incident.title}</h1>
              <StatusBadge status={incident.status} />
            </div>
            <div className="flex items-center gap-3 font-mono text-xs text-cp-text-secondary">
              <MethodBadge method={incident.method} />
              <span>{incident.endpoint}</span>
              <span>•</span>
              <span>Detected {formatRelativeTime(incident.firstDetected)}</span>
            </div>
          </div>

          {/* Quick status selector */}
          <div className="flex items-center gap-2">
            <select
              value={incident.status}
              onChange={(e) => handleStatusChange(e.target.value as IncidentStatus)}
              className="rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-xs font-semibold text-cp-text focus:outline-none focus:border-cp-crimson"
            >
              <option value="open">Status: Open</option>
              <option value="acknowledged">Status: Acknowledged</option>
              <option value="investigating">Status: Investigating</option>
              <option value="resolved">Status: Resolved</option>
            </select>

            {incident.status !== 'resolved' && (
              <button
                onClick={() => handleStatusChange('resolved')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cp-healthy px-3.5 py-2 text-xs font-semibold text-black hover:bg-cp-healthy/90 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" /> Resolve Incident
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Two-Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 cols): Summary, Evidence, Errors, Comments */}
        <div className="space-y-6 lg:col-span-2">
          {/* Summary Card */}
          <div className="rounded-xl border border-cp-border bg-cp-card p-5">
            <h3 className="text-sm font-semibold text-cp-text mb-2">Incident Description</h3>
            <p className="text-xs text-cp-text-secondary leading-relaxed">{incident.description}</p>

            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-cp-border/50 pt-4 text-xs font-mono">
              <div>
                <span className="text-cp-text-secondary font-sans block">Total Error Occurrences</span>
                <span className="text-base font-bold text-cp-text">{incident.occurrenceCount}</span>
              </div>
              <div>
                <span className="text-cp-text-secondary font-sans block">Last Spike Recorded</span>
                <span className="text-base font-bold text-cp-crimson">
                  {formatRelativeTime(incident.lastOccurred)}
                </span>
              </div>
            </div>
          </div>

          {/* AI Investigation Highlight */}
          <div className="rounded-xl border border-cp-crimson/30 bg-cp-crimson/5 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cp-crimson font-semibold text-sm">
                <Sparkles className="h-4 w-4" /> AI Investigation Summary
              </div>
              <button
                onClick={() => navigate(`/ai-investigator?incident=${incident.id}`)}
                className="inline-flex items-center gap-1 text-xs text-cp-crimson hover:underline font-medium"
              >
                Open in AI Investigator <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <p className="mt-2 text-xs text-cp-text leading-relaxed">
              {incident.aiSummary ||
                'Correlated with deployment v2.4.1. Unindexed sequential scan on orders_order table causing cascading connection timeouts.'}
            </p>
          </div>

          {/* Performance Evidence Chart */}
          <div className="rounded-xl border border-cp-border bg-cp-card p-5">
            <h3 className="text-sm font-semibold text-cp-text mb-2">
              Performance Evidence (P95 Latency Surge)
            </h3>
            <p className="text-xs text-cp-text-secondary mb-4">
              Telemetry sample during anomaly onset
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="incSpike" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E63946" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#E63946" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292C35" vertical={false} />
                  <XAxis dataKey="time" stroke="#969AA5" fontSize={11} tickLine={false} />
                  <YAxis stroke="#969AA5" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1D2028', borderColor: '#292C35' }} />
                  <Area
                    type="monotone"
                    dataKey="latency"
                    stroke="#E63946"
                    strokeWidth={2}
                    fill="url(#incSpike)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Related Error Groups */}
          <div className="rounded-xl border border-cp-border bg-cp-card p-5">
            <h3 className="text-sm font-semibold text-cp-text mb-3">Captured Error Groups</h3>
            <div className="space-y-2 text-xs font-mono">
              <div className="rounded-lg border border-cp-border/50 bg-cp-secondary p-3">
                <div className="flex items-center justify-between text-cp-critical font-semibold">
                  <span>HTTP 503: Service Unavailable</span>
                  <span>34 occurrences</span>
                </div>
                <div className="mt-1 text-cp-text-secondary">
                  django.db.utils.OperationalError: server closed the connection unexpectedly
                </div>
              </div>

              <div className="rounded-lg border border-cp-border/50 bg-cp-secondary p-3">
                <div className="flex items-center justify-between text-cp-warning font-semibold">
                  <span>HTTP 504: Gateway Timeout</span>
                  <span>13 occurrences</span>
                </div>
                <div className="mt-1 text-cp-text-secondary">
                  upstream request timeout to service 'order-processor' after 5000ms
                </div>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="rounded-xl border border-cp-border bg-cp-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-cp-text flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-cp-text-secondary" /> Incident Discussion
            </h3>

            {/* Existing comments */}
            <div className="space-y-3">
              {incident.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-lg border border-cp-border/50 bg-cp-secondary/60 p-3 text-xs"
                >
                  <div className="flex items-center justify-between text-cp-text-secondary mb-1">
                    <span className="font-semibold text-cp-text">{comment.userName}</span>
                    <span>{formatRelativeTime(comment.createdAt)}</span>
                  </div>
                  <p className="text-cp-text leading-relaxed">{comment.content}</p>
                </div>
              ))}
            </div>

            {/* Comment input form */}
            <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add an engineering note or mitigation update..."
                className="flex-1 rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-xs text-cp-text focus:outline-none focus:border-cp-crimson"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cp-crimson px-4 py-2 text-xs font-semibold text-white hover:bg-cp-red disabled:opacity-50 transition-colors"
              >
                <Send className="h-3.5 w-3.5" /> Post
              </button>
            </form>
          </div>
        </div>

        {/* Right Column (1 col): Metadata, Deployment info, Timeline */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="rounded-xl border border-cp-border bg-cp-card p-5 space-y-3 text-xs">
            <h3 className="text-sm font-semibold text-cp-text">Incident Metadata</h3>

            <div className="flex justify-between border-b border-cp-border/50 pb-2">
              <span className="text-cp-text-secondary">Assignee:</span>
              <span className="text-cp-text font-medium flex items-center gap-1">
                <User className="h-3 w-3 text-cp-crimson" />
                {incident.assignee ? incident.assignee.name : 'Unassigned'}
              </span>
            </div>

            <div className="flex justify-between border-b border-cp-border/50 pb-2">
              <span className="text-cp-text-secondary">First Detected:</span>
              <span className="font-mono text-cp-text">{formatTimestamp(incident.firstDetected)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-cp-text-secondary">Last Occurred:</span>
              <span className="font-mono text-cp-text">{formatTimestamp(incident.lastOccurred)}</span>
            </div>
          </div>

          {/* Deployment Info Card */}
          {incident.deploymentInfo && (
            <div className="rounded-xl border border-cp-border bg-cp-card p-5 space-y-3 text-xs">
              <h3 className="text-sm font-semibold text-cp-text flex items-center gap-2">
                <GitCommit className="h-4 w-4 text-purple-400" /> Correlated Deployment
              </h3>

              <div className="space-y-2 font-mono">
                <div className="flex justify-between border-b border-cp-border/50 pb-1.5">
                  <span className="text-cp-text-secondary font-sans">Version:</span>
                  <span className="text-cp-text font-bold">{incident.deploymentInfo.version}</span>
                </div>
                <div className="flex justify-between border-b border-cp-border/50 pb-1.5">
                  <span className="text-cp-text-secondary font-sans">Commit:</span>
                  <span className="text-purple-400">{incident.deploymentInfo.commitHash}</span>
                </div>
                <div className="flex justify-between border-b border-cp-border/50 pb-1.5">
                  <span className="text-cp-text-secondary font-sans">Author:</span>
                  <span className="text-cp-text">{incident.deploymentInfo.deployedBy}</span>
                </div>
                <div className="pt-1">
                  <span className="text-cp-text-secondary font-sans block mb-1">Changelog:</span>
                  <span className="text-[11px] text-cp-text-secondary block font-sans">
                    {incident.deploymentInfo.changelog}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Incident Activity Timeline */}
          <div className="rounded-xl border border-cp-border bg-cp-card p-5">
            <h3 className="text-sm font-semibold text-cp-text mb-3">Activity Timeline</h3>
            <div className="relative space-y-4 border-l border-cp-border ml-2 pl-4 text-xs">
              {incident.timeline.map((event) => (
                <div key={event.id} className="relative">
                  <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-cp-crimson" />
                  <p className="font-medium text-cp-text">{event.description}</p>
                  <span className="text-[10px] text-cp-text-secondary font-mono">
                    {formatRelativeTime(event.timestamp)}
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
export default IncidentDetailsPage
