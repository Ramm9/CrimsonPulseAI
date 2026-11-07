import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  ChevronRight,
} from 'lucide-react'
import { incidentService } from '@/services/incidentService'
import type { Incident, IncidentSeverity, IncidentStatus } from '@/types'
import { SeverityBadge } from '@/components/shared/SeverityBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { MethodBadge } from '@/components/shared/MethodBadge'
import { SearchInput } from '@/components/shared/SearchInput'
import { formatRelativeTime } from '@/utils/helpers'

export function IncidentsPage() {
  const navigate = useNavigate()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    async function loadIncidents() {
      setLoading(true)
      try {
        const data = await incidentService.getIncidents()
        setIncidents(data)
      } catch (err) {
        console.error('Failed to load incidents:', err)
      } finally {
        setLoading(false)
      }
    }
    loadIncidents()
  }, [])

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (search) {
        const q = search.toLowerCase()
        if (
          !inc.title.toLowerCase().includes(q) &&
          !inc.endpoint.toLowerCase().includes(q) &&
          !inc.description.toLowerCase().includes(q)
        ) {
          return false
        }
      }
      if (severityFilter !== 'all' && inc.severity !== severityFilter) {
        return false
      }
      if (statusFilter !== 'all' && inc.status !== statusFilter) {
        return false
      }
      return true
    })
  }, [incidents, search, severityFilter, statusFilter])

  // Count summaries
  const criticalCount = incidents.filter((i) => i.severity === 'critical').length
  const openCount = incidents.filter((i) => i.status === 'open').length
  const investigatingCount = incidents.filter((i) => i.status === 'investigating').length

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-cp-text sm:text-3xl flex items-center gap-2.5">
            <AlertTriangle className="h-7 w-7 text-cp-crimson" />
            Incident Management
          </h1>
          <p className="text-sm text-cp-text-secondary">
            ML-correlated incident triage, deployment impact mapping, and automated resolution workflows
          </p>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-cp-border bg-cp-card p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cp-critical/15 text-cp-critical">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-cp-text-secondary">CRITICAL INCIDENTS</div>
            <div className="text-2xl font-bold font-mono text-cp-critical">{criticalCount}</div>
          </div>
        </div>

        <div className="rounded-xl border border-cp-border bg-cp-card p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cp-warning/15 text-cp-warning">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-cp-text-secondary">OPEN TICKETS</div>
            <div className="text-2xl font-bold font-mono text-cp-text">{openCount}</div>
          </div>
        </div>

        <div className="rounded-xl border border-cp-border bg-cp-card p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-cp-text-secondary">IN INVESTIGATION</div>
            <div className="text-2xl font-bold font-mono text-cp-text">{investigatingCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search incident, endpoint, description..."
            className="w-full sm:w-80"
          />

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-xs text-cp-text focus:outline-none focus:border-cp-crimson"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-xs text-cp-text focus:outline-none focus:border-cp-crimson"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div className="text-xs text-cp-text-secondary">
          Showing {filteredIncidents.length} of {incidents.length} incidents
        </div>
      </div>

      {/* Incidents List */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-cp-card animate-pulse border border-cp-border" />
          ))
        ) : filteredIncidents.length === 0 ? (
          <div className="rounded-xl border border-cp-border bg-cp-card p-12 text-center text-sm text-cp-text-secondary">
            No incidents found matching current filters.
          </div>
        ) : (
          filteredIncidents.map((inc) => (
            <div
              key={inc.id}
              onClick={() => navigate(`/incidents/${inc.id}`)}
              className="group cursor-pointer rounded-xl border border-cp-border bg-cp-card p-5 hover:border-cp-crimson/40 hover:bg-cp-elevated/40 transition-all"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <SeverityBadge severity={inc.severity} />
                    <h3 className="text-base font-semibold text-cp-text group-hover:text-cp-crimson transition-colors">
                      {inc.title}
                    </h3>
                    <StatusBadge status={inc.status} />
                  </div>

                  <p className="text-xs text-cp-text-secondary line-clamp-1">{inc.description}</p>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-cp-text-secondary">
                    <span className="flex items-center gap-1.5 text-cp-text">
                      <MethodBadge method={inc.method} />
                      {inc.endpoint}
                    </span>
                    <span>Occurrences: <strong className="text-cp-text">{inc.occurrenceCount}</strong></span>
                    <span>First: {formatRelativeTime(inc.firstDetected)}</span>
                    <span>Last: {formatRelativeTime(inc.lastOccurred)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end lg:self-center">
                  <div className="text-right text-xs">
                    <div className="text-cp-text-secondary">Assignee</div>
                    <div className="text-cp-text font-medium flex items-center gap-1">
                      <User className="h-3 w-3 text-cp-crimson" />
                      {inc.assignee ? inc.assignee.name : 'Unassigned'}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-cp-text-secondary group-hover:text-cp-crimson group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
export default IncidentsPage

