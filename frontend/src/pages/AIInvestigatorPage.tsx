import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
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
  Activity,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { incidentService } from '@/services/incidentService'
import { aiService } from '@/services/aiService'
import type { Incident, AIMessage, EvidenceCard, DebugChecklistItem } from '@/types'
import { SeverityBadge } from '@/components/shared/SeverityBadge'
import { MethodBadge } from '@/components/shared/MethodBadge'
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer'
import { formatRelativeTime } from '@/utils/helpers'
import { useAppStore } from '@/store/appStore'

type EvidenceFilterType = 'all' | 'metric' | 'log' | 'trace' | 'deployment'

interface Hypothesis {
  id: string
  title: string
  confidence: number
  status: 'suspected' | 'investigating' | 'refuted' | 'validated'
  explanation: string
  supportingEvidenceIds: string[]
}

const mockHypotheses: Record<string, Hypothesis[]> = {
  inc_01: [
    {
      id: 'hyp_01_1',
      title: 'PostgreSQL connection pool saturation via unindexed query',
      confidence: 88,
      status: 'suspected',
      explanation:
        'Materialized view query introduced in deploy v2.4.1 holds database connections for 8–12 seconds, exhausting the 20-connection pool and queueing incoming order requests.',
      supportingEvidenceIds: ['ev_01', 'ev_02', 'ev_04'],
    },
    {
      id: 'hyp_01_2',
      title: 'Upstream gateway timeout cascade to payment processor',
      confidence: 64,
      status: 'suspected',
      explanation:
        'Cascading latency caused downstream payment validation calls to reach default 5,000ms socket timeouts, yielding secondary 504 errors.',
      supportingEvidenceIds: ['ev_03', 'ev_05'],
    },
  ],
  inc_02: [
    {
      id: 'hyp_02_1',
      title: 'Django serializer extended with warehouse fields without updating OpenAPI spec',
      confidence: 94,
      status: 'suspected',
      explanation:
        'Commit d8f1a2c added sku and warehouse_id to ProductSerializer to support warehouse inventory tracking, but openapi.yaml was not regenerated or synchronized.',
      supportingEvidenceIds: ['ev_02_01', 'ev_02_03'],
    },
    {
      id: 'hyp_02_2',
      title: 'Serializer field definition type coercion bug on stock_count',
      confidence: 78,
      status: 'suspected',
      explanation:
        'stock_count was serialized via CharField or string formatting ("42") rather than IntegerField, violating OpenAPI 2.1.0 contract expectations.',
      supportingEvidenceIds: ['ev_02_02', 'ev_02_04'],
    },
  ],
  inc_03: [
    {
      id: 'hyp_03_1',
      title: 'Transient 502 Bad Gateway responses from upstream payment processor',
      confidence: 91,
      status: 'suspected',
      explanation:
        'Payment gateway status incident correlates with elevated 502 responses during webhook delivery and charge confirmation calls.',
      supportingEvidenceIds: ['ev_03_01', 'ev_03_02'],
    },
    {
      id: 'hyp_03_2',
      title: 'Missing exponential backoff causing webhook queue worker starvation',
      confidence: 68,
      status: 'suspected',
      explanation:
        'Immediate retry attempts on 502 errors saturated Celery payment worker concurrency, preventing timely processing of subsequent requests.',
      supportingEvidenceIds: ['ev_03_03', 'ev_03_04'],
    },
  ],
  inc_04: [
    {
      id: 'hyp_04_1',
      title: 'Single-key JWKS endpoint rejected pre-rotation JWT refresh requests',
      confidence: 95,
      status: 'suspected',
      explanation:
        'Deploy v1.8.3 rotated signing keys but removed the old key from the JWKS response instead of retaining it for the 24-hour expiration grace window.',
      supportingEvidenceIds: ['ev_04_01', 'ev_04_02'],
    },
    {
      id: 'hyp_04_2',
      title: 'Auth middleware lacks multi-key verification fallback',
      confidence: 76,
      status: 'suspected',
      explanation:
        'Token verification logic expected a single static kid and threw immediate 401 Unauthorized upon seeing tokens signed with the previous key.',
      supportingEvidenceIds: ['ev_04_02', 'ev_04_03'],
    },
  ],
  inc_05: [
    {
      id: 'hyp_05_1',
      title: 'Heavy Lucene segment merging following full schema index rebuild',
      confidence: 89,
      status: 'suspected',
      explanation:
        'Full index rebuild triggered intensive background segment merge operations on Elasticsearch nodes, contending for disk I/O and CPU.',
      supportingEvidenceIds: ['ev_05_01', 'ev_05_02'],
    },
    {
      id: 'hyp_05_2',
      title: 'Search thread pool queue saturation under elevated read load',
      confidence: 65,
      status: 'suspected',
      explanation:
        'Merge thread CPU consumption reduced available worker capacity, causing incoming search queries to queue and latency to double.',
      supportingEvidenceIds: ['ev_05_03', 'ev_05_04'],
    },
  ],
}

export function AIInvestigatorPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const currentProject = useAppStore((s) => s.currentProject)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [evidenceCards, setEvidenceCards] = useState<EvidenceCard[]>([])
  const [checklist, setChecklist] = useState<DebugChecklistItem[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isLoadingInvestigation, setIsLoadingInvestigation] = useState(false)
  const [evidenceFilter, setEvidenceFilter] = useState<EvidenceFilterType>('all')
  const [activeRightTab, setActiveRightTab] = useState<'evidence' | 'hypotheses' | 'actions'>('evidence')

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const incList = await incidentService.getIncidents({ projectId: currentProject || undefined })
        setIncidents(incList)
        if (incList.length > 0) {
          const targetId =
            searchParams.get('incident') ||
            (location.state as { incidentId?: string } | null)?.incidentId
          const matched = targetId ? incList.find((i) => i.id === targetId) : null
          const initialInc = matched || incList[0]
          setSelectedIncident(initialInc)
          loadInvestigation(initialInc.id, initialInc)
        } else {
          setSelectedIncident(null)
          setMessages([])
          setEvidenceCards([])
          setChecklist([])
        }
      } catch (err) {
        console.error('Failed to load incidents:', err)
      }
    }
    loadData()
  }, [searchParams, location.state, currentProject])

  const loadInvestigation = async (incidentId: string, currentInc?: Incident) => {
    setIsLoadingInvestigation(true)
    try {
      const inv = await aiService.getInvestigation(incidentId)
      if (inv && inv.incidentId === incidentId) {
        setMessages(inv.messages)
        setEvidenceCards(inv.evidenceCards)
        setChecklist(inv.debugChecklist)
      } else {
        const inc = currentInc || incidents.find((i) => i.id === incidentId)
        if (inc) {
          setMessages([
            {
              id: `msg_init_${inc.id}_1`,
              role: 'user',
              content: `What is the observed anomaly and current status of ${inc.endpoint}?`,
              timestamp: new Date().toISOString(),
            },
            {
              id: `msg_init_${inc.id}_2`,
              role: 'assistant',
              content: `### 1. Observed Evidence (Verified Facts)
- **Endpoint**: \`${inc.method} ${inc.endpoint}\`
- **Reported Incident**: **${inc.title}**
- **Severity**: ${inc.severity.toUpperCase()}
- **Occurrences**: ${inc.occurrenceCount.toLocaleString()} events recorded

### 2. Hypothesized Contributing Factors (Unconfirmed)
- AI telemetry models are currently correlating telemetry timeseries and deployment commits for this endpoint.

### 3. Recommended Actions
1. Inspect live endpoint traces in API Explorer.
2. Review recent deployments for project \`${inc.projectId}\`.`,
              timestamp: new Date().toISOString(),
            },
          ])
          setEvidenceCards([])
          setChecklist([])
        }
      }
    } catch (err) {
      console.error('Failed to load investigation:', err)
    } finally {
      setIsLoadingInvestigation(false)
    }
  }

  const handleSelectIncident = async (inc: Incident) => {
    if (selectedIncident?.id === inc.id) return
    // Immediately clear all previous state so no old conversation or evidence is visible
    setSelectedIncident(inc)
    setMessages([])
    setEvidenceCards([])
    setChecklist([])
    setInputMessage('')
    setIsLoadingInvestigation(true)
    await loadInvestigation(inc.id, inc)
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

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 50)

    setTimeout(() => {
      let replyContent = ''
      const lower = text.toLowerCase()
      const incId = selectedIncident?.id

      if (incId === 'inc_02') {
        // Contract Mismatch – Products
        if (
          lower.includes('evidence') ||
          lower.includes('telemetry') ||
          lower.includes('mismatch') ||
          lower.includes('field') ||
          lower.includes('drift')
        ) {
          replyContent = `### Observed Contract Evidence (Verified Facts)
- **Schema Drift**: \`GET /api/products/\` response payload returns fields \`sku\` and \`warehouse_id\` not declared in OpenAPI spec \`v2.1.0\` \`[Demo Contract: OpenAPI 2.1.0]\`.
- **Type Incompatibility**: Field \`stock_count\` is returned as String (\`"42"\`) instead of expected Integer (\`42\`) \`[Demo Schema: Type Mismatch]\`.
- **Commit Origin**: Introduced in commit \`d8f1a2c\` ("Add warehouse inventory integration") by Sofia Petrov \`[Demo Deploy: Commit d8f1a2c]\`.
- **Violation Volume**: 312 response contract violations recorded over the last 24 hours.`
        } else if (
          lower.includes('root cause') ||
          lower.includes('cause') ||
          lower.includes('why') ||
          lower.includes('suspect')
        ) {
          replyContent = `### Possible Causes (Hypotheses under Investigation)
- **Hypothesis 1 (Confidence: 94%)**: Serializer in \`products/serializers.py\` was extended with warehouse fields without updating \`openapi.yaml\`.
- **Hypothesis 2 (Confidence: 78%)**: Type coercion bug in Django REST serializer formatting \`stock_count\` via string representation.

*Important: These are statistical correlations and potential causes, not confirmed root causes. Complete verification checklist step #1 before applying hotfixes.*`
        } else if (
          lower.includes('diff') ||
          lower.includes('spec') ||
          lower.includes('schema') ||
          lower.includes('serializer') ||
          lower.includes('code') ||
          lower.includes('fix')
        ) {
          replyContent = `### Contract Schema Diff: GET /api/products/

| Field | OpenAPI Spec v2.1.0 | Actual API Response | Status |
|---|---|---|---|
| \`id\` | \`string (uuid)\` | \`string (uuid)\` | 🟢 Match |
| \`name\` | \`string\` | \`string\` | 🟢 Match |
| \`price\` | \`number (float)\` | \`number (float)\` | 🟢 Match |
| \`stock_count\` | \`integer\` | \`string ("42")\` | 🔴 Type Mismatch |
| \`sku\` | *Not defined* | \`string ("SKU-8821")\` | 🟡 Undeclared Field |
| \`warehouse_id\` | *Not defined* | \`string ("wh_us_east_1")\` | 🟡 Undeclared Field |

\`\`\`python
# products/serializers.py
class ProductSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(max_length=255)
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    stock_count = serializers.IntegerField()  # Fix: was serialized as string
    sku = serializers.CharField(max_length=64)  # Declare in openapi.yaml
    warehouse_id = serializers.CharField(max_length=32)  # Declare in openapi.yaml
\`\`\`

**Source**: CrimsonPulse Contract Validator vs \`openapi.yaml\` (v2.1.0).
**Remediation**: Cast \`stock_count\` to \`IntegerField\` and sync \`openapi.yaml\` definitions.`
        } else if (lower.includes('action') || lower.includes('remediat') || lower.includes('step')) {
          replyContent = `### Recommended Actions for Contract Remediation
1. **Validation Step**: Verify schema diff against \`openapi.yaml\` spec v2.1.0.
2. **Serializer Patch**: Cast \`stock_count\` to \`serializers.IntegerField()\` in \`products/serializers.py\`.
3. **Spec Alignment**: Declare \`sku\` and \`warehouse_id\` in \`openapi.yaml\` under \`ProductItem\`.
4. **CI Enforcement**: Add \`prism\` / \`spectral\` contract linter to GitHub Actions build.`
        } else {
          replyContent = `### Analysis of "${text}"
- **Correlated Endpoint**: \`GET /api/products/\`
- **Observed Violation**: Schema contract drift (\`stock_count\`, \`sku\`, \`warehouse_id\`).
- **Suspected Cause**: Django serializer update without OpenAPI spec sync (Confidence: 94%).
- **Next Action**: Execute checklist item #3 to update serializer type coercion.`
        }
      } else if (incId === 'inc_03') {
        // Payment 5xx Increase
        if (
          lower.includes('evidence') ||
          lower.includes('telemetry') ||
          lower.includes('rate') ||
          lower.includes('error')
        ) {
          replyContent = `### Observed Telemetry Evidence (Verified Facts)
- **Error Rate Drift**: 5xx error rate at 2.14% vs 0.45% baseline (423 occurrences) \`[Demo Metric: 5xx +375%]\`.
- **Gateway Status**: Upstream payment gateway (Stripe) reported intermittent 502 Bad Gateway responses \`[Demo Log: Payment Gateway]\`.
- **Queue Depth**: Celery \`payments_high\` worker queue backlog reached 184 jobs \`[Demo Metric: Queue Backlog]\`.`
        } else if (lower.includes('root cause') || lower.includes('cause') || lower.includes('why')) {
          replyContent = `### Possible Causes (Hypotheses under Investigation)
- **Hypothesis 1 (Confidence: 91%)**: Upstream payment gateway experiencing transient 502 Bad Gateway responses during charge authorization.
- **Hypothesis 2 (Confidence: 68%)**: Missing exponential backoff causing Celery payment worker starvation.

*Important: Statistical correlations under active investigation. Complete verification checklist step #1 before rolling changes.*`
        } else if (lower.includes('retry') || lower.includes('policy') || lower.includes('code') || lower.includes('config')) {
          replyContent = `### Recommended Celery Retry Policy

\`\`\`python
# payments/tasks.py
@shared_task(bind=True, max_retries=5, default_retry_delay=2)
def process_payment_confirmation(self, transaction_id):
    try:
        return payment_gateway.confirm_charge(transaction_id)
    except GatewayTransientError as exc:
        countdown = min(120, (2 ** self.request.retries) + random.uniform(0.5, 1.5))
        raise self.retry(exc=exc, countdown=countdown)
\`\`\`

**Remediation**: Enables exponential backoff with jitter, relieving Celery worker queue contention during upstream gateway incidents.`
        } else {
          replyContent = `### Recommended Actions for Payment Recovery
1. **Validation**: Check payment gateway status page for European zone incidents.
2. **Circuit Breaker**: Enable circuit breaker threshold (15% error rate) on payments client.
3. **Worker Policy**: Deploy exponential backoff with jitter on Celery retry tasks.
4. **Queue Drain**: Monitor \`payments_high\` queue drain rate.`
        }
      } else if (incId === 'inc_04') {
        // Auth Token Expiry Flood
        if (lower.includes('user') || lower.includes('affected') || lower.includes('session')) {
          replyContent = `### Affected Session Analysis
- **Total Failed Refreshes**: ~2,105 failed refresh attempts \`[Demo Metric: 401 Surge]\`.
- **Unique Users Affected**: ~1,480 unique user accounts.
- **Token Expiry TTL**: 1 hour — all pre-rotation tokens will naturally cycle out within 15 hours.
- **Root Cause Verified**: Deploy v1.8.3 rotated signing key and removed previous key from \`/.well-known/jwks.json\` prematurely.`
        } else if (lower.includes('evidence') || lower.includes('telemetry') || lower.includes('jwks')) {
          replyContent = `### Observed Telemetry Evidence (Verified Facts)
- **Failure Spike**: 401 Unauthorized rate on \`/api/auth/refresh\` jumped from 0.3% to 1.24% \`[Demo Metric: 401 +313%]\`.
- **JWKS Endpoint**: \`/.well-known/jwks.json\` is serving only 1 key (\`kid: "key-2026-11"\`) instead of required key-ring pair \`[Demo Log: JWKS]\`.
- **Deployment Correlation**: Deploy v1.8.3 (commit \`e7b2f91\` by Sofia Petrov) occurred 9 hours ago.`
        } else {
          replyContent = `### Recommended Actions for Auth Token Rotation
1. **Immediate Patch**: Add previous public key (\`kid: "key-2026-08"\`) back into JWKS endpoint with 24-hour TTL.
2. **Middleware**: Configure auth middleware to support multi-key verification rings.
3. **SOP Update**: Require 48-hour key retention overlap in future rotation procedures.`
        }
      } else if (incId === 'inc_05') {
        // Search Index Degradation
        if (
          lower.includes('evidence') ||
          lower.includes('telemetry') ||
          lower.includes('cluster') ||
          lower.includes('metric')
        ) {
          replyContent = `### Observed Telemetry Evidence (Verified Facts)
- **Latency Drift**: P95 latency doubled from 320ms to 680ms (P99: 1,100ms) \`[Demo Metric: P95 +112%]\`.
- **Lucene Segment Merges**: Active segment merge I/O at 185 MB/s on data nodes \`[Demo Log: Elasticsearch]\`.
- **Thread Pool Queue**: Search thread pool queue at 88% capacity with 23 rejected executions \`[Demo Metric: Thread Pool]\`.`
        } else if (
          lower.includes('command') ||
          lower.includes('throttle') ||
          lower.includes('curl') ||
          lower.includes('code')
        ) {
          replyContent = `### Elasticsearch Segment Merge Throttle Command

\`\`\`bash
curl -X PUT "https://es-cluster.internal:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "transient": {
    "indices.store.throttle.max_bytes_per_sec": "40mb",
    "index.merge.scheduler.max_thread_count": "1"
  }
}
'
\`\`\`

**Effect**: Restricts merge disk I/O, allowing search query worker threads to access disk without starvation.`
        } else {
          replyContent = `### Recommended Actions for Search Performance Recovery
1. **I/O Throttle**: Throttle Lucene segment merge rate to 40 MB/s via cluster settings.
2. **Replica Scaling**: Scale Kubernetes search pods from 3 to 6 replicas.
3. **Job Deferral**: Pause non-critical bulk indexing jobs until segment merge backlog clears.`
        }
      } else {
        // inc_01: Orders Latency Spike
        if (lower.includes('evidence') || lower.includes('telemetry') || lower.includes('data')) {
          replyContent = `### Observed Telemetry Evidence (Verified Facts)
- **Metric Drift**: P95 latency at 2,100ms vs 180ms baseline \`[Demo Metric: P95 +1066%]\`.
- **Log Evidence**: pg_stat_statements logs show 847 executions of \`REFRESH MATERIALIZED VIEW\` averaging 9.4s \`[Demo Log: pg_stat_statements]\`.
- **Trace Timeline**: Database connection hold time jumped from 62ms to 9,400ms across worker threads.
- **Verification Status**: Hypotheses remain pending verification checklist step #1.`
        } else if (lower.includes('root cause') || lower.includes('cause') || lower.includes('why')) {
          replyContent = `### Possible Causes (Hypotheses under Investigation)
- **Hypothesis 1 (Confidence: 88%)**: PostgreSQL connection pool exhaustion due to missing compound index \`(product_id, updated_at)\` in deploy v2.4.1.
- **Hypothesis 2 (Confidence: 64%)**: Payment gateway timeout cascade from DB lock contention.

*Important: I do not claim an unverified root cause without confirmation. Please execute EXPLAIN ANALYZE on the orders query to confirm.*`
        } else if (lower.includes('query') || lower.includes('slow') || lower.includes('sql')) {
          replyContent = `### Slow Query Performance Log
Extracted from \`pg_stat_statements\` on \`orders_analytics\`:

\`\`\`sql
REFRESH MATERIALIZED VIEW orders_analytics AS
SELECT o.id, o.created_at, o.total, p.name, p.category
FROM orders o
JOIN products p ON o.product_id = p.id
JOIN inventory i ON p.id = i.product_id
WHERE o.created_at > NOW() - INTERVAL '30 days'
ORDER BY o.created_at DESC;
\`\`\`

| Execution Metric | Baseline | Observed Peak | Deviation |
|---|---|---|---|
| Avg Duration | 62 ms | 9,400 ms | +15,061% |
| Total Executions | — | 847 calls | Saturation |
| Rows Scanned | 1,200 | 2,400,000 | Sequential Scan |

**Source**: \`pg_stat_statements\` catalog (Database Host: \`db-primary.production\`).
**Remediation**: Execute \`CREATE INDEX CONCURRENTLY idx_inventory_product_date ON inventory(product_id, updated_at);\` `
        } else if (lower.includes('action') || lower.includes('fix') || lower.includes('remediat')) {
          replyContent = `### Recommended Actions
1. **Validation Step**: Run \`SELECT * FROM pg_stat_activity WHERE state != 'idle'\` to confirm connection count.
2. **Remediation**: Execute \`CREATE INDEX CONCURRENTLY idx_inventory_product_date ON inventory(product_id, updated_at);\`
3. **Mitigation**: Increase \`MAX_CONNECTIONS\` from 20 to 50 in database router config.`
        } else {
          replyContent = `### Analysis of "${text}"
- **Correlated Endpoint**: \`${selectedIncident?.endpoint}\`
- **Observed Metric**: Current error rate is 1.82% (primarily 504 timeouts).
- **Suspected Cause**: Database worker contention (Confidence: 88%).
- **Next Action**: Check remediation checklist item #3 to resolve sequential scans.`
        }
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
    }, 1100)
  }

  const toggleChecklist = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    )
  }

  const filteredEvidence = useMemo(() => {
    if (evidenceFilter === 'all') return evidenceCards
    return evidenceCards.filter((e) => {
      if (evidenceFilter === 'trace') return e.type === 'log' || e.type === 'correlation'
      return e.type === evidenceFilter
    })
  }, [evidenceCards, evidenceFilter])

  const hypotheses = useMemo(() => {
    if (selectedIncident && mockHypotheses[selectedIncident.id]) {
      return mockHypotheses[selectedIncident.id]
    }
    return [
      {
        id: 'hyp_gen',
        title: 'Connection or resource pool contention',
        confidence: 75,
        status: 'suspected' as const,
        explanation: 'Correlated telemetry indicates potential worker or resource contention under observed load.',
        supportingEvidenceIds: ['ev_gen_01'],
      },
    ]
  }, [selectedIncident])

  const suggestedQuestions = useMemo(() => {
    switch (selectedIncident?.id) {
      case 'inc_02':
        return [
          'Show contract schema diff',
          'What fields are mismatched?',
          'What are the recommended actions?',
          'Show serializer fix',
        ]
      case 'inc_03':
        return [
          'Show payment error rate',
          'What are the suspected causes?',
          'What are the recommended actions?',
          'Show retry configuration',
        ]
      case 'inc_04':
        return [
          'Show JWKS key configuration',
          'How many users are affected?',
          'What are the recommended actions?',
          'Show key rotation fix',
        ]
      case 'inc_05':
        return [
          'Show Elasticsearch cluster metrics',
          'What are the suspected causes?',
          'What are the recommended actions?',
          'Show segment merge throttle command',
        ]
      case 'inc_01':
      default:
        return [
          'What is the observed evidence?',
          'What are the suspected causes?',
          'What are the recommended actions?',
          'Show me the slow query log',
        ]
    }
  }, [selectedIncident?.id])

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-cp-text sm:text-3xl flex items-center gap-2.5">
            <Sparkles className="h-7 w-7 text-cp-crimson" />
            AI Incident Investigator
          </h1>
          <p className="text-sm text-cp-text-secondary">
            Triangulates observed telemetry facts, evaluates probable causes with confidence ratings, and generates verified remediation steps
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-cp-text-secondary">
          <span className="flex items-center gap-1.5 rounded-full border border-cp-border bg-cp-card px-3 py-1">
            <Cpu className="h-3.5 w-3.5 text-cp-crimson" />
            Telemetry Reasoning Engine v4.2
          </span>
        </div>
      </div>

      {/* 3-Panel Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 min-h-[720px]">
        {/* PANEL 1: Incident Selector (3 cols) */}
        <div className="lg:col-span-3 rounded-xl border border-cp-border bg-cp-card p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-cp-text-secondary uppercase">
              Select Incident ({incidents.length})
            </h3>
            <span className="text-[10px] text-cp-text-secondary">Live telemetry link</span>
          </div>

          <div className="space-y-2 overflow-y-auto flex-1 max-h-[640px]">
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

        {/* PANEL 2: Conversation & Investigation (5 cols) */}
        <div className="lg:col-span-5 rounded-xl border border-cp-border bg-cp-card flex flex-col h-[740px]">
          {/* Chat Header */}
          <div className="p-4 border-b border-cp-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cp-crimson/15 text-cp-crimson">
                <Cpu className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-cp-text">
                  Thread: {selectedIncident?.title || 'Incident Investigation'}
                </h3>
                <span className="text-[11px] font-mono text-cp-crimson">
                  {selectedIncident?.endpoint}
                </span>
              </div>
            </div>
            <span className="rounded bg-cp-elevated px-2 py-0.5 text-[10px] text-cp-text-secondary font-mono border border-cp-border">
              Evidence-First
            </span>
          </div>

          {/* Messages Stream */}
          {isLoadingInvestigation ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center text-cp-text-secondary">
              <Loader2 className="h-8 w-8 animate-spin text-cp-crimson" />
              <div>
                <p className="text-sm font-medium text-cp-text">Loading Investigation Context...</p>
                <p className="text-xs font-mono text-cp-text-secondary mt-1">
                  Correlating telemetry for {selectedIncident?.title}
                </p>
              </div>
            </div>
          ) : (
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
                      className={`max-w-[88%] rounded-xl p-3.5 text-xs leading-relaxed ${
                        isAssistant
                          ? 'border border-cp-border bg-cp-elevated text-cp-text border-l-2 border-l-cp-crimson'
                          : 'bg-cp-crimson text-white'
                      }`}
                    >
                      {isAssistant ? (
                        <MarkdownRenderer content={m.content} />
                      ) : (
                        <div className="whitespace-pre-wrap font-sans">{m.content}</div>
                      )}
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
                  <span>Triangulating telemetry metrics, logs, and deployment diffs...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Suggested Quick Questions */}
          <div className="px-4 py-2 border-t border-cp-border/50 flex flex-wrap gap-1.5 bg-cp-secondary/30">
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                onClick={() => handleSendMessage(q)}
                disabled={isLoadingInvestigation || isTyping}
                className="rounded-full border border-cp-border bg-cp-secondary px-2.5 py-1 text-[11px] text-cp-text-secondary hover:text-cp-text hover:border-cp-crimson disabled:opacity-50 transition-colors"
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
              disabled={isLoadingInvestigation}
              placeholder="Ask for evidence, hypotheses, or remediation actions..."
              className="flex-1 rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-xs text-cp-text focus:outline-none focus:border-cp-crimson disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isTyping || isLoadingInvestigation}
              className="inline-flex items-center justify-center rounded-lg bg-cp-crimson px-4 py-2 text-xs font-semibold text-white hover:bg-cp-red disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* PANEL 3: Structured Findings & Actions (4 cols) */}
        <div className="lg:col-span-4 rounded-xl border border-cp-border bg-cp-card flex flex-col h-[740px] overflow-hidden">
          {/* Top Tabs */}
          <div className="flex border-b border-cp-border bg-cp-secondary/40 text-xs">
            <button
              onClick={() => setActiveRightTab('evidence')}
              className={`flex-1 py-3 px-2 text-center font-semibold transition-colors border-b-2 ${
                activeRightTab === 'evidence'
                  ? 'border-cp-crimson text-cp-crimson bg-cp-card'
                  : 'border-transparent text-cp-text-secondary hover:text-cp-text'
              }`}
            >
              Evidence ({evidenceCards.length})
            </button>
            <button
              onClick={() => setActiveRightTab('hypotheses')}
              className={`flex-1 py-3 px-2 text-center font-semibold transition-colors border-b-2 ${
                activeRightTab === 'hypotheses'
                  ? 'border-cp-crimson text-cp-crimson bg-cp-card'
                  : 'border-transparent text-cp-text-secondary hover:text-cp-text'
              }`}
            >
              Causes ({hypotheses.length})
            </button>
            <button
              onClick={() => setActiveRightTab('actions')}
              className={`flex-1 py-3 px-2 text-center font-semibold transition-colors border-b-2 ${
                activeRightTab === 'actions'
                  ? 'border-cp-crimson text-cp-crimson bg-cp-card'
                  : 'border-transparent text-cp-text-secondary hover:text-cp-text'
              }`}
            >
              Actions ({checklist.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoadingInvestigation ? (
              <div className="flex h-full items-center justify-center p-8 text-center text-cp-text-secondary">
                <Loader2 className="h-6 w-6 animate-spin text-cp-crimson" />
              </div>
            ) : (
              <>
                {/* TAB 1: OBSERVED EVIDENCE */}
                {activeRightTab === 'evidence' && (
                  <div className="space-y-3">
                    {/* Demo telemetry identification notice */}
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px] text-cp-text-secondary">
                      <span className="font-semibold text-amber-400">Demo Telemetry Evidence: </span>
                      Observations synthesized from centralized demo dataset.{' '}
                      <span className="text-cp-healthy font-medium">'Verified Fact'</span> is reserved for findings
                      backed by an identified telemetry source.
                    </div>

                    {/* Evidence Sub-filter */}
                    <div className="flex flex-wrap gap-1">
                      {(['all', 'metric', 'log', 'trace', 'deployment'] as EvidenceFilterType[]).map((f) => (
                        <button
                          key={f}
                          onClick={() => setEvidenceFilter(f)}
                          className={`rounded px-2 py-0.5 text-[10px] font-mono capitalize transition-colors ${
                            evidenceFilter === f
                              ? 'bg-cp-crimson text-white font-bold'
                              : 'bg-cp-secondary text-cp-text-secondary hover:text-cp-text'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2.5">
                      {filteredEvidence.map((ev) => {
                        let typeBadge = 'bg-blue-500/15 text-blue-400'
                        let chip = `[Demo ${ev.type.toUpperCase()}]`
                        if (ev.type === 'metric') {
                          typeBadge = 'bg-purple-500/15 text-purple-400'
                          chip = '[Demo Metric]'
                        } else if (ev.type === 'log') {
                          typeBadge = 'bg-amber-500/15 text-amber-400'
                          chip = '[Demo Log]'
                        } else if (ev.type === 'deployment') {
                          typeBadge = 'bg-blue-500/15 text-blue-400'
                          chip = '[Demo Deploy]'
                        } else if (ev.type === 'correlation') {
                          typeBadge = 'bg-emerald-500/15 text-emerald-400'
                          chip = '[Demo Correlation]'
                        } else if (ev.type === 'pattern') {
                          typeBadge = 'bg-cyan-500/15 text-cyan-400'
                          chip = '[Demo Pattern]'
                        }

                        return (
                          <div
                            key={ev.id}
                            className="rounded-lg border border-cp-border/70 bg-cp-secondary/60 p-3 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-cp-text flex items-center gap-1.5">
                                {ev.type === 'metric' && <Activity className="h-3.5 w-3.5 text-purple-400" />}
                                {ev.type === 'log' && <Terminal className="h-3.5 w-3.5 text-amber-400" />}
                                {ev.type === 'deployment' && <GitCommit className="h-3.5 w-3.5 text-blue-400" />}
                                {ev.type === 'correlation' && <Layers className="h-3.5 w-3.5 text-emerald-400" />}
                                {ev.type === 'pattern' && <FileText className="h-3.5 w-3.5 text-cyan-400" />}
                                {ev.title}
                              </span>
                              <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${typeBadge}`}>
                                {ev.type}
                              </span>
                            </div>
                            <p className="text-cp-text-secondary leading-relaxed">{ev.content}</p>
                            <div className="flex flex-wrap items-center justify-between gap-1 pt-1.5 text-[10px] font-mono border-t border-cp-border/40">
                              <span className="text-cp-crimson font-medium">{chip}</span>
                              {ev.verified && ev.source ? (
                                <span className="text-cp-healthy flex items-center gap-1 font-sans">
                                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                                  <span>
                                    Verified Fact • <span className="text-cp-text-secondary">{ev.source}</span>
                                  </span>
                                </span>
                              ) : (
                                <span className="text-amber-400 flex items-center gap-1 font-sans">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  <span>
                                    Inferred Hypothesis •{' '}
                                    <span className="text-cp-text-secondary">
                                      {ev.source || 'Simulated Model Inference'}
                                    </span>
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      {filteredEvidence.length === 0 && (
                        <p className="text-xs text-cp-text-secondary text-center py-6">
                          No evidence items match the selected filter.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: POSSIBLE CAUSES (HYPOTHESES) */}
                {activeRightTab === 'hypotheses' && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                      <p className="font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                        Unverified Hypotheses
                      </p>
                      <p className="mt-1 text-[11px] text-amber-300/80 leading-normal">
                        AI models score potential causes based on statistical correlation. These are not confirmed root
                        causes until verified by checklist execution.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {hypotheses.map((hyp, i) => (
                        <div
                          key={hyp.id}
                          className="rounded-lg border border-cp-border bg-cp-secondary/60 p-3.5 text-xs space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-cp-text">
                              Hypothesis {i + 1}: {hyp.title}
                            </span>
                            <span className="shrink-0 rounded bg-cp-crimson/15 px-2 py-0.5 font-mono text-[11px] font-bold text-cp-crimson">
                              {hyp.confidence}% Confidence
                            </span>
                          </div>

                          <p className="text-cp-text-secondary leading-relaxed">{hyp.explanation}</p>

                          <div className="rounded bg-cp-elevated p-2 text-[10px] font-mono text-cp-text-secondary flex items-center justify-between">
                            <span>Supporting Evidence:</span>
                            <span className="text-cp-text font-bold">
                              {hyp.supportingEvidenceIds.join(', ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 3: RECOMMENDED ACTIONS */}
                {activeRightTab === 'actions' && (
                  <div className="space-y-3">
                    <div className="text-xs text-cp-text-secondary">
                      Complete these prioritized steps to verify the hypothesis and deploy remediation:
                    </div>

                    <div className="space-y-2">
                      {checklist.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => toggleChecklist(item.id)}
                          className="flex items-start gap-2.5 cursor-pointer rounded-lg border border-cp-border/50 bg-cp-secondary/40 p-2.5 hover:bg-cp-elevated transition-colors text-xs"
                        >
                          {item.completed ? (
                            <CheckSquare className="h-4 w-4 text-cp-healthy shrink-0 mt-0.5" />
                          ) : (
                            <Square className="h-4 w-4 text-cp-text-secondary shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span
                                className={`leading-tight ${
                                  item.completed ? 'line-through text-cp-text-secondary' : 'text-cp-text font-medium'
                                }`}
                              >
                                {item.label}
                              </span>
                              <span
                                className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-bold ${
                                  item.priority === 'high'
                                    ? 'bg-cp-critical/15 text-cp-critical'
                                    : item.priority === 'medium'
                                    ? 'bg-cp-warning/15 text-cp-warning'
                                    : 'bg-blue-400/15 text-blue-400'
                                }`}
                              >
                                {item.priority}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
export default AIInvestigatorPage
