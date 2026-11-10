import { useState, useEffect } from 'react'
import {
  FileCheck,
  Upload,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  Layers,
  ArrowRight,
  Plus,
  Clock,
  Code2,
} from 'lucide-react'
import { contractService } from '@/services/contractService'
import type { ContractSpec, ContractViolation } from '@/types'
import { MethodBadge } from '@/components/shared/MethodBadge'
import { Tabs } from '@/components/shared/Tabs'
import { Modal } from '@/components/shared/Modal'
import { formatRelativeTime } from '@/utils/helpers'
import { useAppStore } from '@/store/appStore'

export function ContractsPage() {
  const { addToast, currentProject } = useAppStore()
  const [specs, setSpecs] = useState<ContractSpec[]>([])
  const [violations, setViolations] = useState<ContractViolation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('violations')

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [specName, setSpecName] = useState('')
  const [specVersion, setSpecVersion] = useState('')
  const [specContent, setSpecContent] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [specList, violationList] = await Promise.all([
          contractService.getSpecs(currentProject || undefined),
          contractService.getViolations(),
        ])
        setSpecs(specList)
        setViolations(violationList)
      } catch (err) {
        console.error('Failed to load contract data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [currentProject])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!specName || !specVersion) return

    await contractService.uploadSpec({
      name: specName,
      version: specVersion,
    })

    setUploadModalOpen(false)
    setSpecName('')
    setSpecVersion('')
    setSpecContent('')
    addToast({
      id: Math.random().toString(),
      type: 'success',
      title: 'Spec Uploaded',
      message: `OpenAPI specification ${specName} v${specVersion} registered successfully`,
    })

    // Refresh specs
    const refreshed = await contractService.getSpecs()
    setSpecs(refreshed)
  }

  const tabs = [
    { id: 'violations', label: 'Violations & Drift', count: violations.length },
    { id: 'specifications', label: 'Registered Specs', count: specs.length },
    { id: 'schema_registry', label: 'Schema Models' },
  ]

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-cp-text sm:text-3xl flex items-center gap-2.5">
            <FileCheck className="h-7 w-7 text-cp-crimson" />
            API Contract Validation
          </h1>
          <p className="text-sm text-cp-text-secondary">
            Continuous OpenAPI contract enforcement, breaking change prevention, and payload drift analysis
          </p>
        </div>

        <button
          onClick={() => setUploadModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-cp-crimson px-4 py-2 text-xs font-semibold text-white hover:bg-cp-red transition-colors"
        >
          <Upload className="h-4 w-4" /> Upload Specification
        </button>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* TAB 1: VIOLATIONS */}
      {activeTab === 'violations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-cp-text-secondary">
              Active schema contract mismatches detected in recent runtime traffic
            </span>
            <span className="rounded bg-cp-critical/10 px-2 py-0.5 text-xs font-bold text-cp-critical">
              {violations.length} Drift Warnings
            </span>
          </div>

          <div className="space-y-4">
            {violations.map((v) => {
              const isBreaking = v.type === 'breaking_change'
              return (
                <div
                  key={v.id}
                  className={`rounded-xl border bg-cp-card p-5 ${
                    isBreaking ? 'border-cp-critical/40 border-l-4 border-l-cp-critical' : 'border-cp-border'
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2.5">
                      <MethodBadge method={v.method} />
                      <span className="font-mono text-sm font-semibold text-cp-text">{v.endpoint}</span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-mono uppercase font-bold ${
                          isBreaking
                            ? 'bg-cp-critical/15 text-cp-critical'
                            : 'bg-cp-warning/15 text-cp-warning'
                        }`}
                      >
                        {v.type.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-xs text-cp-text-secondary font-mono">
                      Detected {formatRelativeTime(v.detectedAt)}
                    </span>
                  </div>

                  <div className="mt-3 text-xs text-cp-text-secondary">
                    Field: <code className="text-cp-crimson font-mono font-bold">{v.field}</code>
                  </div>

                  {/* Side-by-side Expected vs Observed payload code comparison */}
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Expected (OpenAPI Spec) */}
                    <div className="rounded-lg border border-cp-healthy/30 bg-[#0C120E] p-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-cp-healthy mb-2">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Expected in OpenAPI Specification
                        </span>
                      </div>
                      <pre className="font-mono text-xs text-cp-text overflow-x-auto p-2 bg-cp-card/50 rounded">
                        {v.expected}
                      </pre>
                    </div>

                    {/* Observed (Runtime Telemetry) */}
                    <div className="rounded-lg border border-cp-critical/30 bg-[#160D0F] p-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-cp-critical mb-2">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" /> Observed in Live Traffic
                        </span>
                      </div>
                      <pre className="font-mono text-xs text-cp-text overflow-x-auto p-2 bg-cp-card/50 rounded">
                        {v.observed}
                      </pre>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 2: SPECIFICATIONS */}
      {activeTab === 'specifications' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {specs.map((spec) => (
            <div
              key={spec.id}
              className="rounded-xl border border-cp-border bg-cp-card p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-cp-crimson">v{spec.version}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    spec.status === 'valid'
                      ? 'bg-cp-healthy/15 text-cp-healthy'
                      : 'bg-cp-warning/15 text-cp-warning'
                  }`}
                >
                  {spec.status === 'valid' ? 'Valid' : 'Violations Found'}
                </span>
              </div>

              <div>
                <h4 className="text-base font-semibold text-cp-text">{spec.name}</h4>
                <p className="text-xs text-cp-text-secondary mt-1">
                  Registered {formatRelativeTime(spec.uploadedAt)}
                </p>
              </div>

              <div className="border-t border-cp-border/50 pt-3 flex items-center justify-between text-xs text-cp-text-secondary">
                <span>Mapped Endpoints:</span>
                <span className="font-mono font-bold text-cp-text">{spec.endpointCount}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: SCHEMA REGISTRY */}
      {activeTab === 'schema_registry' && (
        <div className="rounded-xl border border-cp-border bg-cp-card p-5 space-y-4">
          <h3 className="text-base font-semibold text-cp-text">Registered Data Models</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-cp-border/60 bg-cp-secondary p-4">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-bold text-cp-text">UserModel</span>
                <span className="text-cp-text-secondary">4 fields</span>
              </div>
              <pre className="mt-2 text-xs font-mono text-cp-text-secondary">
{`{
  "id": "integer (required)",
  "name": "string (required)",
  "email": "string [email] (required)",
  "role": "string [enum]"
}`}
              </pre>
            </div>

            <div className="rounded-lg border border-cp-border/60 bg-cp-secondary p-4">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-bold text-cp-text">OrderPayload</span>
                <span className="text-cp-text-secondary">5 fields</span>
              </div>
              <pre className="mt-2 text-xs font-mono text-cp-text-secondary">
{`{
  "order_id": "string [uuid]",
  "items": "array[Item]",
  "total_amount": "number (required)",
  "currency": "string",
  "status": "string [enum]"
}`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Upload Specification Modal */}
      <Modal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload OpenAPI Specification"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-cp-text-secondary mb-1">
              Specification Name
            </label>
            <input
              type="text"
              value={specName}
              onChange={(e) => setSpecName(e.target.value)}
              placeholder="e.g. Commerce Core API"
              className="w-full rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-sm text-cp-text focus:outline-none focus:border-cp-crimson"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-cp-text-secondary mb-1">
              Version Tag
            </label>
            <input
              type="text"
              value={specVersion}
              onChange={(e) => setSpecVersion(e.target.value)}
              placeholder="e.g. 2.4.0"
              className="w-full rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-sm font-mono text-cp-text focus:outline-none focus:border-cp-crimson"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-cp-text-secondary mb-1">
              OpenAPI JSON / YAML Content
            </label>
            <textarea
              value={specContent}
              onChange={(e) => setSpecContent(e.target.value)}
              placeholder='{"openapi": "3.0.0", "info": { "title": "API", "version": "1.0" }, "paths": {...}}'
              rows={6}
              className="w-full rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-xs font-mono text-cp-text focus:outline-none focus:border-cp-crimson"
            />
          </div>

          <div className="rounded-lg bg-cp-elevated p-3 text-xs text-cp-text-secondary">
            Note: OpenAPI contract validation simulation parses and registers schema models for runtime comparison.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setUploadModalOpen(false)}
              className="rounded-lg border border-cp-border bg-cp-elevated px-4 py-2 text-xs font-semibold text-cp-text hover:bg-cp-border"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-cp-crimson px-4 py-2 text-xs font-semibold text-white hover:bg-cp-red"
            >
              Register Specification
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
export default ContractsPage

