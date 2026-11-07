import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Globe,
  Layers,
  Activity,
  AlertTriangle,
  Clock,
  Settings,
  Plug,
  BarChart3,
  Copy,
  Check,
  Trash2,
  Save,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { projectService } from '@/services/projectService'
import { endpointService } from '@/services/endpointService'
import { incidentService } from '@/services/incidentService'
import { telemetryService } from '@/services/telemetryService'
import type { Project, Endpoint, Incident, MetricWindow, EnvironmentType } from '@/types'
import { HealthBadge } from '@/components/shared/HealthBadge'
import { MethodBadge } from '@/components/shared/MethodBadge'
import { SeverityBadge } from '@/components/shared/SeverityBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Tabs } from '@/components/shared/Tabs'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatNumber, formatLatency, formatPercentage, formatRelativeTime } from '@/utils/helpers'
import { useAppStore } from '@/store/appStore'

export function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToast } = useAppStore()

  const [project, setProject] = useState<Project | null>(null)
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [metrics, setMetrics] = useState<MetricWindow[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [copiedKey, setCopiedKey] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  // Settings form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formBaseUrl, setFormBaseUrl] = useState('')
  const [formEnv, setFormEnv] = useState<EnvironmentType>('production')

  useEffect(() => {
    async function loadData() {
      if (!id) return
      setLoading(true)
      try {
        const p = await projectService.getProject(id)
        if (p) {
          setProject(p)
          setFormName(p.name)
          setFormDescription(p.description)
          setFormBaseUrl(p.baseUrl)
          setFormEnv(p.environment)
        }

        const [epList, incList, metricData] = await Promise.all([
          endpointService.getEndpoints(id),
          incidentService.getIncidents({ projectId: id }),
          telemetryService.getTrafficMetrics('24h'),
        ])
        setEndpoints(epList)
        setIncidents(incList)
        setMetrics(metricData)
      } catch (err) {
        console.error('Failed to load project details:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  const handleCopyKey = () => {
    if (!project) return
    navigator.clipboard.writeText(project.apiKey)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
    addToast({
      id: Math.random().toString(),
      type: 'success',
      title: 'Copied',
      message: 'Project API key copied to clipboard',
    })
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project) return
    try {
      const updated = await projectService.updateProject(project.id, {
        name: formName,
        description: formDescription,
        baseUrl: formBaseUrl,
        environment: formEnv,
      })
      if (updated) {
        setProject(updated)
        addToast({
          id: Math.random().toString(),
          type: 'success',
          title: 'Saved',
          message: 'Project settings updated successfully',
        })
      }
    } catch {
      addToast({
        id: Math.random().toString(),
        type: 'error',
        title: 'Error',
        message: 'Failed to update project settings',
      })
    }
  }

  const handleDeleteProject = async () => {
    if (!project) return
    await projectService.deleteProject(project.id)
    addToast({
      id: Math.random().toString(),
      type: 'info',
      title: 'Project deleted',
      message: `${project.name} has been removed`,
    })
    navigate('/projects')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-cp-elevated animate-pulse rounded" />
        <div className="h-32 bg-cp-card animate-pulse rounded-xl" />
        <div className="h-64 bg-cp-card animate-pulse rounded-xl" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="rounded-xl border border-cp-border bg-cp-card p-12 text-center">
        <h2 className="text-xl font-bold text-cp-text">Project Not Found</h2>
        <p className="mt-2 text-sm text-cp-text-secondary">
          The requested project does not exist or has been removed.
        </p>
        <button
          onClick={() => navigate('/projects')}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cp-crimson px-4 py-2 text-sm font-medium text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Projects
        </button>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'endpoints', label: 'Endpoints', count: endpoints.length },
    { id: 'analytics', label: 'Analytics' },
    { id: 'incidents', label: 'Incidents', count: incidents.length },
    { id: 'integrations', label: 'SDK Integration' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <div className="space-y-6 pb-12">
      {/* Back button & Header */}
      <div>
        <button
          onClick={() => navigate('/projects')}
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-cp-text-secondary hover:text-cp-text transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Projects
        </button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-cp-text sm:text-3xl">{project.name}</h1>
              <HealthBadge status={project.health} />
              <span className="rounded-full bg-cp-elevated px-2.5 py-0.5 text-xs font-medium text-cp-text-secondary capitalize">
                {project.environment}
              </span>
            </div>
            <p className="mt-1 text-sm text-cp-text-secondary">{project.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-cp-text-secondary flex items-center gap-1.5 bg-cp-elevated px-3 py-1.5 rounded-lg border border-cp-border">
              <Globe className="h-3.5 w-3.5 text-cp-text-secondary" />
              {project.baseUrl}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-cp-border bg-cp-card p-5">
              <div className="flex items-center justify-between text-xs text-cp-text-secondary">
                <span>TOTAL REQUESTS</span>
                <Activity className="h-4 w-4 text-cp-crimson" />
              </div>
              <div className="mt-2 text-2xl font-bold text-cp-text">
                {formatNumber(project.totalRequests)}
              </div>
              <div className="mt-1 text-xs text-cp-healthy">+8.4% vs last week</div>
            </div>

            <div className="rounded-xl border border-cp-border bg-cp-card p-5">
              <div className="flex items-center justify-between text-xs text-cp-text-secondary">
                <span>ERROR RATE</span>
                <AlertTriangle className="h-4 w-4 text-cp-warning" />
              </div>
              <div className="mt-2 text-2xl font-bold text-cp-text">
                {formatPercentage(project.errorRate)}
              </div>
              <div className="mt-1 text-xs text-cp-healthy">-0.05% vs baseline</div>
            </div>

            <div className="rounded-xl border border-cp-border bg-cp-card p-5">
              <div className="flex items-center justify-between text-xs text-cp-text-secondary">
                <span>ENDPOINTS</span>
                <Layers className="h-4 w-4 text-blue-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-cp-text">
                {project.endpointCount}
              </div>
              <div className="mt-1 text-xs text-cp-text-secondary">Auto-discovered</div>
            </div>

            <div className="rounded-xl border border-cp-border bg-cp-card p-5">
              <div className="flex items-center justify-between text-xs text-cp-text-secondary">
                <span>P95 LATENCY</span>
                <Clock className="h-4 w-4 text-purple-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-cp-text">142 ms</div>
              <div className="mt-1 text-xs text-cp-healthy">Nominal range</div>
            </div>
          </div>

          {/* Key Endpoints & Recent Activity */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-cp-border bg-cp-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-cp-text">Top Endpoints</h3>
                <button
                  onClick={() => setActiveTab('endpoints')}
                  className="text-xs text-cp-crimson hover:underline"
                >
                  View all ({endpoints.length})
                </button>
              </div>
              <div className="divide-y divide-cp-border/50">
                {endpoints.slice(0, 5).map((ep) => (
                  <div
                    key={ep.id}
                    onClick={() => navigate(`/api-explorer/${ep.id}`)}
                    className="flex cursor-pointer items-center justify-between py-3 hover:bg-cp-elevated/40 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <MethodBadge method={ep.method} />
                      <span className="font-mono text-xs text-cp-text">{ep.path}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="text-cp-text-secondary">{formatNumber(ep.requestCount)} reqs</span>
                      <span className="text-cp-text">{formatLatency(ep.p95Latency)}</span>
                      <HealthBadge status={ep.health} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-cp-border bg-cp-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-cp-text">Recent Project Incidents</h3>
                <button
                  onClick={() => setActiveTab('incidents')}
                  className="text-xs text-cp-crimson hover:underline"
                >
                  View all ({incidents.length})
                </button>
              </div>
              {incidents.length === 0 ? (
                <div className="py-8 text-center text-sm text-cp-text-secondary">
                  No active incidents recorded for this project.
                </div>
              ) : (
                <div className="space-y-3">
                  {incidents.slice(0, 4).map((inc) => (
                    <div
                      key={inc.id}
                      onClick={() => navigate(`/incidents/${inc.id}`)}
                      className="cursor-pointer rounded-lg border border-cp-border/60 bg-cp-secondary/50 p-3 hover:border-cp-crimson/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-cp-text">{inc.title}</span>
                        <SeverityBadge severity={inc.severity} />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-cp-text-secondary">
                        <span className="font-mono">{inc.endpoint}</span>
                        <span>{formatRelativeTime(inc.lastOccurred)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ENDPOINTS */}
      {activeTab === 'endpoints' && (
        <div className="rounded-xl border border-cp-border bg-cp-card overflow-hidden">
          <div className="p-4 border-b border-cp-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-cp-text">
              Discovered Endpoints ({endpoints.length})
            </h3>
            <span className="text-xs text-cp-text-secondary">
              Endpoints automatically mapped by CrimsonPulse SDK telemetry
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-cp-border bg-cp-secondary/70 text-cp-text-secondary uppercase">
                <tr>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Endpoint Path</th>
                  <th className="py-3 px-4 text-right">Requests</th>
                  <th className="py-3 px-4 text-right">P95 Latency</th>
                  <th className="py-3 px-4 text-right">Error Rate</th>
                  <th className="py-3 px-4 text-center">Health</th>
                  <th className="py-3 px-4 text-right">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cp-border/40 font-mono">
                {endpoints.map((ep) => (
                  <tr
                    key={ep.id}
                    onClick={() => navigate(`/api-explorer/${ep.id}`)}
                    className="cursor-pointer hover:bg-cp-elevated/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <MethodBadge method={ep.method} />
                    </td>
                    <td className="py-3 px-4 font-semibold text-cp-text">{ep.path}</td>
                    <td className="py-3 px-4 text-right text-cp-text">
                      {formatNumber(ep.requestCount)}
                    </td>
                    <td className="py-3 px-4 text-right text-cp-text">
                      {formatLatency(ep.p95Latency)}
                    </td>
                    <td className="py-3 px-4 text-right text-cp-text">
                      {formatPercentage(ep.errorRate)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <HealthBadge status={ep.health} />
                    </td>
                    <td className="py-3 px-4 text-right text-cp-text-secondary font-sans text-xs">
                      {formatRelativeTime(ep.lastActivity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-cp-border bg-cp-card p-5">
            <h3 className="text-base font-semibold text-cp-text mb-4">Request Throughput (24h)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics}>
                  <defs>
                    <linearGradient id="projReqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#969AA5" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#969AA5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292C35" vertical={false} />
                  <XAxis dataKey="timestamp" stroke="#969AA5" fontSize={11} tickLine={false} />
                  <YAxis stroke="#969AA5" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1D2028', borderColor: '#292C35' }} />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="#969AA5"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#projReqGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-cp-border bg-cp-card p-5">
            <h3 className="text-base font-semibold text-cp-text mb-4">P95 & P50 Latency (ms)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292C35" vertical={false} />
                  <XAxis dataKey="timestamp" stroke="#969AA5" fontSize={11} tickLine={false} />
                  <YAxis stroke="#969AA5" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1D2028', borderColor: '#292C35' }} />
                  <Line
                    type="monotone"
                    dataKey="p95Latency"
                    stroke="#E63946"
                    strokeWidth={2}
                    dot={false}
                    name="P95 Latency (ms)"
                  />
                  <Line
                    type="monotone"
                    dataKey="p50Latency"
                    stroke="#48C78E"
                    strokeWidth={1.5}
                    dot={false}
                    name="P50 Latency (ms)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INCIDENTS */}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-cp-text">Project Incidents</h3>
            <span className="text-xs text-cp-text-secondary">
              Showing all incidents associated with this project
            </span>
          </div>
          {incidents.length === 0 ? (
            <div className="rounded-xl border border-cp-border bg-cp-card p-12 text-center text-sm text-cp-text-secondary">
              No incidents reported for this project.
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => navigate(`/incidents/${inc.id}`)}
                  className="cursor-pointer rounded-xl border border-cp-border bg-cp-card p-5 hover:border-cp-crimson/30 transition-all hover:bg-cp-elevated/40"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <SeverityBadge severity={inc.severity} />
                      <h4 className="text-base font-medium text-cp-text">{inc.title}</h4>
                      <StatusBadge status={inc.status} />
                    </div>
                    <span className="text-xs text-cp-text-secondary">
                      Last occurred {formatRelativeTime(inc.lastOccurred)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-cp-text-secondary">{inc.description}</p>
                  <div className="mt-3 flex items-center gap-4 text-xs font-mono text-cp-text-secondary">
                    <span>Endpoint: <strong className="text-cp-text">{inc.endpoint}</strong></span>
                    <span>Occurrences: <strong className="text-cp-text">{inc.occurrenceCount}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: INTEGRATIONS */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-cp-border bg-cp-card p-5">
            <h3 className="text-base font-semibold text-cp-text mb-2">Project API Key</h3>
            <p className="text-xs text-cp-text-secondary mb-4">
              Pass this key to your CrimsonPulse Python SDK configuration.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="text"
                readOnly
                value={project.apiKey}
                className="w-full max-w-lg rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 font-mono text-xs text-cp-text"
              />
              <button
                onClick={handleCopyKey}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cp-border bg-cp-elevated px-3 py-2 text-xs font-medium text-cp-text hover:bg-cp-border transition-colors"
              >
                {copiedKey ? <Check className="h-4 w-4 text-cp-healthy" /> : <Copy className="h-4 w-4" />}
                {copiedKey ? 'Copied' : 'Copy Key'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-cp-border bg-cp-card p-5">
            <h3 className="text-base font-semibold text-cp-text mb-2">Python SDK Configuration</h3>
            <p className="text-xs text-cp-text-secondary mb-4">
              Add this block into your Django <code className="text-cp-crimson">settings.py</code>:
            </p>
            <div className="relative rounded-lg border border-cp-border bg-[#0D0E12] p-4 font-mono text-xs text-cp-text overflow-x-auto">
              <pre>{`# settings.py
CRIMSONPULSE = {
    "ENABLED": True,
    "PROJECT_KEY": "${project.apiKey}",
    "ENVIRONMENT": "${project.environment}",
    "SERVICE_NAME": "${project.slug}",
    "SAMPLE_RATE": 1.0,
}

MIDDLEWARE = [
    "crimsonpulse.middleware.PulseMonitoringMiddleware",
    # ... existing middleware
]`}</pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveSettings} className="rounded-xl border border-cp-border bg-cp-card p-5 space-y-4">
            <h3 className="text-base font-semibold text-cp-text">General Settings</h3>

            <div>
              <label className="block text-xs font-medium text-cp-text-secondary mb-1">
                Project Name
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full max-w-md rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-sm text-cp-text focus:outline-none focus:border-cp-crimson"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-cp-text-secondary mb-1">
                Description
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                className="w-full max-w-md rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-sm text-cp-text focus:outline-none focus:border-cp-crimson"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-cp-text-secondary mb-1">
                Base URL
              </label>
              <input
                type="url"
                value={formBaseUrl}
                onChange={(e) => setFormBaseUrl(e.target.value)}
                className="w-full max-w-md rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-sm font-mono text-cp-text focus:outline-none focus:border-cp-crimson"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-cp-text-secondary mb-1">
                Environment
              </label>
              <select
                value={formEnv}
                onChange={(e) => setFormEnv(e.target.value as EnvironmentType)}
                className="w-full max-w-md rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-sm text-cp-text focus:outline-none focus:border-cp-crimson"
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-cp-crimson px-4 py-2 text-sm font-medium text-white hover:bg-cp-crimson/80 transition-colors"
              >
                <Save className="h-4 w-4" /> Save Changes
              </button>
            </div>
          </form>

          {/* Danger Zone */}
          <div className="rounded-xl border border-cp-critical/30 bg-cp-critical/5 p-5">
            <h3 className="text-base font-semibold text-cp-critical">Danger Zone</h3>
            <p className="mt-1 text-xs text-cp-text-secondary">
              Deleting this project permanently removes all telemetry history, discovered endpoint mappings, and active incidents.
            </p>
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cp-critical px-4 py-2 text-sm font-medium text-white hover:bg-cp-critical/80 transition-colors"
            >
              <Trash2 className="h-4 w-4" /> Delete Project
            </button>
          </div>

          <ConfirmDialog
            open={deleteConfirmOpen}
            onClose={() => setDeleteConfirmOpen(false)}
            onConfirm={handleDeleteProject}
            title={`Delete ${project.name}?`}
            message="This action is irreversible. All associated metrics, endpoints, and incident tickets will be permanently deleted."
            confirmText="Yes, delete project"
            variant="danger"
          />
        </div>
      )}
    </div>
  )
}
export default ProjectDetailsPage

