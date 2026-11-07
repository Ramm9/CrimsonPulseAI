import { useState, useEffect } from 'react'
import {
  Plug,
  Copy,
  Check,
  Key,
  Trash2,
  Plus,
  RefreshCw,
  Terminal,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  FileCode,
  Layers,
} from 'lucide-react'
import { integrationService } from '@/services/integrationService'
import type { ApiKey } from '@/types'
import { Tabs } from '@/components/shared/Tabs'
import { Modal } from '@/components/shared/Modal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatRelativeTime } from '@/utils/helpers'
import { useAppStore } from '@/store/appStore'

export function IntegrationsPage() {
  const { addToast } = useAppStore()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [activeTab, setActiveTab] = useState('python_sdk')
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({})

  // Generate Key Modal
  const [keyModalOpen, setKeyModalOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)

  // Revoke Key state
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null)

  useEffect(() => {
    async function loadKeys() {
      const keys = await integrationService.getApiKeys()
      setApiKeys(keys)
    }
    loadKeys()
  }, [])

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedMap((prev) => ({ ...prev, [key]: true }))
    setTimeout(() => {
      setCopiedMap((prev) => ({ ...prev, [key]: false }))
    }, 2000)
    addToast({
      id: Math.random().toString(),
      type: 'success',
      title: 'Copied',
      message: 'Code snippet copied to clipboard',
    })
  }

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKeyName.trim()) return

    const key = await integrationService.generateApiKey(newKeyName.trim())
    setNewlyCreatedKey(key.key)
    const refreshed = await integrationService.getApiKeys()
    setApiKeys(refreshed)
    setNewKeyName('')
    addToast({
      id: Math.random().toString(),
      type: 'success',
      title: 'API Key Created',
      message: `Key '${key.name}' generated. Copy the secret now.`,
    })
  }

  const handleRevokeKey = async () => {
    if (!keyToRevoke) return
    await integrationService.revokeApiKey(keyToRevoke.id)
    const refreshed = await integrationService.getApiKeys()
    setApiKeys(refreshed)
    setKeyToRevoke(null)
    addToast({
      id: Math.random().toString(),
      type: 'info',
      title: 'Key Revoked',
      message: 'The selected API key has been revoked',
    })
  }

  const tabs = [
    { id: 'python_sdk', label: 'Python / Django SDK' },
    { id: 'openapi_import', label: 'OpenAPI Specification' },
    { id: 'manual_registration', label: 'Manual Discovery' },
  ]

  const installCode = `pip install apisentinel-sdk`

  const settingsCode = `# settings.py
API_SENTINEL = {
    "ENABLED": True,
    "PROJECT_KEY": "cpk_live_948f21e0ab4147",
    "ENVIRONMENT": "production",
    "SAMPLE_RATE": 1.0,
    "CAPTURE_HEADERS": True,
}`

  const middlewareCode = `# settings.py
MIDDLEWARE = [
    'apisentinel.middleware.APIMonitorMiddleware',
    # ... your existing middleware stack
]`

  const verifyCode = `python manage.py apisentinel verify`

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-cp-text sm:text-3xl flex items-center gap-2.5">
            <Plug className="h-7 w-7 text-cp-crimson" />
            Connect your application to CrimsonPulse AI
          </h1>
          <p className="text-sm text-cp-text-secondary">
            Integrate our high-performance Python telemetry middleware into your Django & FastAPI clusters
          </p>
        </div>
      </div>

      {/* Integration Status Banner */}
      <div className="rounded-xl border border-cp-border bg-cp-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cp-healthy/15 text-cp-healthy">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-cp-text">Telemetry Pipeline Connected</span>
                <span className="h-2 w-2 rounded-full bg-cp-healthy animate-pulse" />
              </div>
              <p className="text-xs text-cp-text-secondary">
                Last heartbeat received <strong>2 minutes ago</strong> from Production cluster
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono">
            <div>
              <span className="text-cp-text-secondary block">Active Environments:</span>
              <span className="text-cp-text font-bold">Production, Staging</span>
            </div>
            <div>
              <span className="text-cp-text-secondary block">SDK Version:</span>
              <span className="text-cp-healthy font-bold">v1.2.3</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* TAB 1: PYTHON / DJANGO SDK */}
      {activeTab === 'python_sdk' && (
        <div className="space-y-6">
          {/* Step 1: Install */}
          <div className="rounded-xl border border-cp-border bg-cp-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-cp-text flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cp-crimson text-white text-[10px] font-bold">
                  1
                </span>
                Install the Python SDK
              </h3>
              <button
                onClick={() => copyText('install', installCode)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cp-border bg-cp-elevated px-2.5 py-1 text-xs text-cp-text hover:bg-cp-border transition-colors"
              >
                {copiedMap['install'] ? <Check className="h-3.5 w-3.5 text-cp-healthy" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedMap['install'] ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="rounded-lg border border-cp-border bg-[#0D0E12] p-3 font-mono text-xs text-cp-text overflow-x-auto">
              {installCode}
            </pre>
          </div>

          {/* Step 2: Settings */}
          <div className="rounded-xl border border-cp-border bg-cp-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-cp-text flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cp-crimson text-white text-[10px] font-bold">
                  2
                </span>
                Configure API_SENTINEL settings
              </h3>
              <button
                onClick={() => copyText('settings', settingsCode)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cp-border bg-cp-elevated px-2.5 py-1 text-xs text-cp-text hover:bg-cp-border transition-colors"
              >
                {copiedMap['settings'] ? <Check className="h-3.5 w-3.5 text-cp-healthy" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedMap['settings'] ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="rounded-lg border border-cp-border bg-[#0D0E12] p-3 font-mono text-xs text-cp-text overflow-x-auto">
              {settingsCode}
            </pre>
          </div>

          {/* Step 3: Middleware */}
          <div className="rounded-xl border border-cp-border bg-cp-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-cp-text flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cp-crimson text-white text-[10px] font-bold">
                  3
                </span>
                Register APIMonitorMiddleware
              </h3>
              <button
                onClick={() => copyText('middleware', middlewareCode)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cp-border bg-cp-elevated px-2.5 py-1 text-xs text-cp-text hover:bg-cp-border transition-colors"
              >
                {copiedMap['middleware'] ? <Check className="h-3.5 w-3.5 text-cp-healthy" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedMap['middleware'] ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="rounded-lg border border-cp-border bg-[#0D0E12] p-3 font-mono text-xs text-cp-text overflow-x-auto">
              {middlewareCode}
            </pre>
          </div>

          {/* Step 4: Verify */}
          <div className="rounded-xl border border-cp-border bg-cp-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-cp-text flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cp-crimson text-white text-[10px] font-bold">
                  4
                </span>
                Verify Connection
              </h3>
              <button
                onClick={() => copyText('verify', verifyCode)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cp-border bg-cp-elevated px-2.5 py-1 text-xs text-cp-text hover:bg-cp-border transition-colors"
              >
                {copiedMap['verify'] ? <Check className="h-3.5 w-3.5 text-cp-healthy" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedMap['verify'] ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="rounded-lg border border-cp-border bg-[#0D0E12] p-3 font-mono text-xs text-cp-text overflow-x-auto">
              {verifyCode}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 2: OPENAPI IMPORT */}
      {activeTab === 'openapi_import' && (
        <div className="rounded-xl border border-dashed border-cp-border bg-cp-card p-12 text-center">
          <FileCode className="mx-auto h-12 w-12 text-cp-crimson" />
          <h3 className="mt-4 text-base font-semibold text-cp-text">Import OpenAPI / Swagger Spec</h3>
          <p className="mt-1 text-xs text-cp-text-secondary max-w-md mx-auto">
            Upload your OpenAPI v3.0 JSON or YAML schema to automate baseline discovery and continuous contract validation.
          </p>
          <button
            onClick={() => {
              addToast({
                id: Math.random().toString(),
                type: 'info',
                title: 'OpenAPI Wizard',
                message: 'Navigate to Contract Validation page to upload and compare schemas',
              })
            }}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-cp-crimson px-4 py-2 text-xs font-semibold text-white hover:bg-cp-red transition-colors"
          >
            Open Specification Manager
          </button>
        </div>
      )}

      {/* TAB 3: MANUAL REGISTRATION */}
      {activeTab === 'manual_registration' && (
        <div className="rounded-xl border border-cp-border bg-cp-card p-6 space-y-4 max-w-xl">
          <h3 className="text-base font-semibold text-cp-text">Manual Route Registration</h3>
          <p className="text-xs text-cp-text-secondary">
            Manually register private internal endpoints not captured by discovery middleware.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-cp-text-secondary mb-1">Method</label>
              <select className="w-full rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-xs text-cp-text">
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>PATCH</option>
                <option>DELETE</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-cp-text-secondary mb-1">Endpoint Path</label>
              <input
                type="text"
                placeholder="/api/v1/internal/healthz"
                className="w-full rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-xs font-mono text-cp-text"
              />
            </div>
            <button
              onClick={() => {
                addToast({
                  id: Math.random().toString(),
                  type: 'success',
                  title: 'Endpoint Registered',
                  message: 'Endpoint manually added to discovery map',
                })
              }}
              className="rounded-lg bg-cp-crimson px-4 py-2 text-xs font-semibold text-white hover:bg-cp-red"
            >
              Add Endpoint
            </button>
          </div>
        </div>
      )}

      {/* API Keys Management Section */}
      <div className="rounded-xl border border-cp-border bg-cp-card p-5 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-cp-text flex items-center gap-2">
              <Key className="h-4 w-4 text-cp-crimson" /> API Ingest Keys
            </h3>
            <p className="text-xs text-cp-text-secondary">
              Authentication keys used by the SDK to transmit telemetry packets to CrimsonPulse AI
            </p>
          </div>

          <button
            onClick={() => {
              setNewlyCreatedKey(null)
              setKeyModalOpen(true)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cp-crimson px-3.5 py-2 text-xs font-semibold text-white hover:bg-cp-red transition-colors self-start sm:self-auto"
          >
            <Plus className="h-3.5 w-3.5" /> Generate Ingest Key
          </button>
        </div>

        {/* API Keys Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-cp-border bg-cp-secondary/80 text-cp-text-secondary uppercase">
              <tr>
                <th className="py-2.5 px-4">Key Label</th>
                <th className="py-2.5 px-4">Secret Prefix</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Created</th>
                <th className="py-2.5 px-4 text-right">Last Used</th>
                <th className="py-2.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cp-border/40 font-mono">
              {apiKeys.map((k) => (
                <tr key={k.id} className="hover:bg-cp-elevated/40">
                  <td className="py-3 px-4 font-sans font-semibold text-cp-text">{k.name}</td>
                  <td className="py-3 px-4 text-cp-text-secondary">{k.key}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-sans font-bold capitalize ${
                        k.status === 'active'
                          ? 'bg-cp-healthy/15 text-cp-healthy'
                          : 'bg-cp-critical/15 text-cp-critical'
                      }`}
                    >
                      {k.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-cp-text-secondary font-sans">
                    {formatRelativeTime(k.createdAt)}
                  </td>
                  <td className="py-3 px-4 text-right text-cp-text-secondary font-sans">
                    {k.lastUsed ? formatRelativeTime(k.lastUsed) : 'Never'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {k.status === 'active' && (
                      <button
                        onClick={() => setKeyToRevoke(k)}
                        className="rounded p-1 text-cp-text-secondary hover:text-cp-critical hover:bg-cp-card transition-colors"
                        title="Revoke key"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Key Modal */}
      <Modal
        open={keyModalOpen}
        onClose={() => setKeyModalOpen(false)}
        title="Generate Telemetry Ingest Key"
      >
        {newlyCreatedKey ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-cp-healthy/40 bg-cp-healthy/10 p-3 text-xs text-cp-healthy">
              <strong>Key generated successfully!</strong> Store this key safely. You will not be able to see it again.
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={newlyCreatedKey}
                className="w-full rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 font-mono text-xs text-cp-text"
              />
              <button
                onClick={() => copyText('new_key', newlyCreatedKey)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cp-elevated px-3 py-2 text-xs font-semibold text-cp-text hover:bg-cp-border border border-cp-border"
              >
                {copiedMap['new_key'] ? <Check className="h-4 w-4 text-cp-healthy" /> : <Copy className="h-4 w-4" />}
                {copiedMap['new_key'] ? 'Copied' : 'Copy'}
              </button>
            </div>
            <button
              onClick={() => setKeyModalOpen(false)}
              className="w-full rounded-lg bg-cp-crimson py-2 text-xs font-semibold text-white hover:bg-cp-red"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleGenerateKey} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-cp-text-secondary mb-1">
                Key Label / Environment
              </label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. EU-West Production Worker"
                className="w-full rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-sm text-cp-text focus:outline-none focus:border-cp-crimson"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setKeyModalOpen(false)}
                className="rounded-lg border border-cp-border bg-cp-elevated px-4 py-2 text-xs font-semibold text-cp-text"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-cp-crimson px-4 py-2 text-xs font-semibold text-white hover:bg-cp-red"
              >
                Generate Key
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Revoke Key Dialog */}
      <ConfirmDialog
        open={Boolean(keyToRevoke)}
        onClose={() => setKeyToRevoke(null)}
        onConfirm={handleRevokeKey}
        title="Revoke Ingest Key?"
        message={`Are you sure you want to revoke '${keyToRevoke?.name}'? Telemetry sent with this key will be rejected immediately.`}
        confirmText="Revoke Key"
        variant="danger"
      />
    </div>
  )
}
export default IntegrationsPage

