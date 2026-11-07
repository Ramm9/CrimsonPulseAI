import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  BrainCircuit,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Server,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { anomalyService } from '@/services/anomalyService'
import type { Anomaly } from '@/types'
import { MethodBadge } from '@/components/shared/MethodBadge'
import { SeverityBadge } from '@/components/shared/SeverityBadge'
import { formatRelativeTime, formatTimestamp } from '@/utils/helpers'
import { useAppStore } from '@/store/appStore'

export function AnomalyDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToast } = useAppStore()

  const [anomaly, setAnomaly] = useState<Anomaly | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      if (!id) return
      setLoading(true)
      try {
        const item = await anomalyService.getAnomaly(id)
        setAnomaly(item || null)
      } catch (err) {
        console.error('Failed to load anomaly details:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  const handleUpdateStatus = async (status: Anomaly['status']) => {
    if (!anomaly) return
    const updated = await anomalyService.updateAnomalyStatus(anomaly.id, status)
    if (updated) {
      setAnomaly(updated)
      addToast({
        id: Math.random().toString(),
        type: 'success',
        title: 'Status Updated',
        message: `Anomaly status marked as ${status.replace('_', ' ')}`,
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-36 bg-cp-elevated animate-pulse rounded" />
        <div className="h-28 bg-cp-card animate-pulse rounded-xl" />
        <div className="h-80 bg-cp-card animate-pulse rounded-xl" />
      </div>
    )
  }

  if (!anomaly) {
    return (
      <div className="rounded-xl border border-cp-border bg-cp-card p-12 text-center">
        <h2 className="text-xl font-bold text-cp-text">Anomaly Record Not Found</h2>
        <p className="mt-2 text-sm text-cp-text-secondary">
          No anomaly found with ID {id}.
        </p>
        <button
          onClick={() => navigate('/anomalies')}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cp-crimson px-4 py-2 text-sm font-medium text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Anomalies
        </button>
      </div>
    )
  }

  // 24-step timeline chart data around the anomaly event
  const timelineData = Array.from({ length: 24 }).map((_, i) => {
    const isSpike = i >= 18 && i <= 21
    const baseline = anomaly.baselineValue
    const actual = isSpike
      ? anomaly.observedValue - (21 - i) * 150
      : baseline + Math.sin(i) * (baseline * 0.15)

    return {
      time: `${i}:00`,
      actual: Math.max(0, Math.round(actual)),
      baseline: baseline,
    }
  })

  return (
    <div className="space-y-6 pb-12">
      {/* Top back button */}
      <div>
        <button
          onClick={() => navigate('/anomalies')}
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-cp-text-secondary hover:text-cp-text transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Anomalies
        </button>

        {/* Title Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <MethodBadge method={anomaly.method} />
            <h1 className="font-mono text-xl font-bold text-cp-text sm:text-2xl">{anomaly.endpoint}</h1>
            <SeverityBadge severity={anomaly.severity} />
            <span className="rounded-full bg-cp-elevated px-2.5 py-0.5 text-xs font-mono capitalize text-cp-text-secondary">
              {anomaly.status.replace('_', ' ')}
            </span>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {anomaly.status !== 'resolved' && (
              <button
                onClick={() => handleUpdateStatus('resolved')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cp-border bg-cp-elevated px-3 py-1.5 text-xs font-medium text-cp-healthy hover:bg-cp-border transition-colors"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
              </button>
            )}

            {anomaly.status !== 'false_positive' && (
              <button
                onClick={() => handleUpdateStatus('false_positive')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cp-border bg-cp-elevated px-3 py-1.5 text-xs font-medium text-cp-text-secondary hover:text-cp-text hover:bg-cp-border transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" /> False Positive
              </button>
            )}

            {anomaly.relatedIncidentId ? (
              <button
                onClick={() => navigate(`/incidents/${anomaly.relatedIncidentId}`)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cp-crimson px-3 py-1.5 text-xs font-medium text-white hover:bg-cp-red transition-colors"
              >
                <AlertTriangle className="h-3.5 w-3.5" /> View Incident
              </button>
            ) : (
              <button
                onClick={() => navigate('/incidents')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cp-crimson px-3 py-1.5 text-xs font-medium text-white hover:bg-cp-red transition-colors"
              >
                <AlertTriangle className="h-3.5 w-3.5" /> Escalate to Incident
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Model Confidence Notice Banner */}
      <div className="flex items-center gap-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs text-blue-300">
        <Sparkles className="h-4 w-4 shrink-0 text-blue-400" />
        <span>
          Anomaly scores represent statistical deviations computed by isolation forests & autoencoders. They are model confidence scores, not probabilities of outage.
        </span>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 cols): Historical Chart & Detection Narrative */}
        <div className="space-y-6 lg:col-span-2">
          {/* Main Chart */}
          <div className="rounded-xl border border-cp-border bg-cp-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-cp-text">
                  Observed vs Baseline {anomaly.metric}
                </h3>
                <p className="text-xs text-cp-text-secondary">
                  Telemetry time-series leading up to detection event
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-cp-text-secondary">
                  <span className="h-2 w-2 rounded-full border border-dashed border-cp-text-secondary" />
                  Baseline ({anomaly.baselineValue}ms)
                </span>
                <span className="flex items-center gap-1.5 text-cp-crimson">
                  <span className="h-2 w-2 rounded-full bg-cp-crimson" />
                  Observed ({anomaly.observedValue}ms)
                </span>
              </div>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292C35" vertical={false} />
                  <XAxis dataKey="time" stroke="#969AA5" fontSize={11} tickLine={false} />
                  <YAxis stroke="#969AA5" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1D2028', borderColor: '#292C35' }} />
                  <Line
                    type="monotone"
                    dataKey="baseline"
                    stroke="#969AA5"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                    name="Trained Baseline"
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#E63946"
                    strokeWidth={2}
                    dot={false}
                    name="Observed Value"
                  />
                  <ReferenceLine
                    x="18:00"
                    stroke="#FF4655"
                    strokeDasharray="3 3"
                    label={{ value: 'Anomaly Inception', fill: '#FF4655', fontSize: 10, position: 'top' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Machine Learning Root-Cause Reasoning */}
          <div className="rounded-xl border border-cp-border bg-cp-card p-5">
            <h3 className="text-sm font-semibold text-cp-text flex items-center gap-2 mb-3">
              <BrainCircuit className="h-4 w-4 text-cp-crimson" />
              Model Explanation & Behavioral Analysis
            </h3>
            <p className="text-xs text-cp-text leading-relaxed">
              {anomaly.description} The behavioral model detected an acute distribution shift exceeding 3.8 standard deviations beyond the 14-day rolling mean.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-cp-border/60 bg-cp-secondary p-3">
                <div className="text-[11px] font-semibold text-cp-text-secondary uppercase">
                  Dominant Contributing Factor
                </div>
                <div className="mt-1 text-xs text-cp-text font-medium">
                  Database Query Contention on <code className="font-mono text-cp-crimson">orders_order</code> table
                </div>
              </div>

              <div className="rounded-lg border border-cp-border/60 bg-cp-secondary p-3">
                <div className="text-[11px] font-semibold text-cp-text-secondary uppercase">
                  Cross-Service Impact
                </div>
                <div className="mt-1 text-xs text-cp-text font-medium">
                  Payment processor upstream timeout cascade (+3.2% error surge)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Key Anomaly Attributes & Related Links */}
        <div className="space-y-6">
          {/* Observation Details Card */}
          <div className="rounded-xl border border-cp-border bg-cp-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-cp-text">Anomaly Metadata</h3>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between border-b border-cp-border/50 pb-2">
                <span className="text-cp-text-secondary font-sans">Detection Time:</span>
                <span className="text-cp-text font-sans">{formatTimestamp(anomaly.detectedAt)}</span>
              </div>
              <div className="flex justify-between border-b border-cp-border/50 pb-2">
                <span className="text-cp-text-secondary font-sans">Model Version:</span>
                <span className="text-cp-text">{anomaly.modelVersion}</span>
              </div>
              <div className="flex justify-between border-b border-cp-border/50 pb-2">
                <span className="text-cp-text-secondary font-sans">Confidence Score:</span>
                <span className="text-cp-crimson font-bold">{(anomaly.anomalyScore * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between border-b border-cp-border/50 pb-2">
                <span className="text-cp-text-secondary font-sans">Metric Tracked:</span>
                <span className="text-cp-text">{anomaly.metric}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-cp-text-secondary font-sans">Baseline Value:</span>
                <span className="text-cp-healthy">{anomaly.baselineValue} ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cp-text-secondary font-sans">Observed Peak:</span>
                <span className="text-cp-critical font-bold">{anomaly.observedValue} ms</span>
              </div>
            </div>
          </div>

          {/* Related Incident link */}
          <div className="rounded-xl border border-cp-border bg-cp-card p-5">
            <h3 className="text-sm font-semibold text-cp-text mb-3">Correlated Incident</h3>
            {anomaly.relatedIncidentId ? (
              <div
                onClick={() => navigate(`/incidents/${anomaly.relatedIncidentId}`)}
                className="cursor-pointer rounded-lg border border-cp-border bg-cp-secondary p-3 hover:border-cp-crimson transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-cp-text">Orders Latency Spike</span>
                  <ExternalLink className="h-3.5 w-3.5 text-cp-crimson" />
                </div>
                <div className="mt-1 text-[11px] text-cp-text-secondary">
                  Active incident ticket #inc-001 • Open
                </div>
              </div>
            ) : (
              <div className="text-xs text-cp-text-secondary">
                No active incident associated with this anomaly.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
export default AnomalyDetailsPage

