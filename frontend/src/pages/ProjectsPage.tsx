import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Globe,
  Layers,
  BarChart3,
  AlertTriangle,
  Trash2,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatNumber, formatPercentage, generateId } from '@/utils/helpers'
import { SearchInput } from '@/components/shared/SearchInput'
import { HealthBadge } from '@/components/shared/HealthBadge'
import { Modal } from '@/components/shared/Modal'
import { useAppStore } from '@/store/appStore'
import type { Project, EnvironmentType } from '@/types'

const environmentColors: Record<EnvironmentType, { bg: string; text: string; label: string }> = {
  production: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Production' },
  staging: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Staging' },
  development: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Development' },
}

const initialProjects: Project[] = [
  {
    id: 'proj-nexus',
    name: 'Nexus Commerce API',
    slug: 'nexus-commerce-api',
    description: 'Core e-commerce API powering the Nexus platform',
    environment: 'production',
    baseUrl: 'https://api.nexus.io',
    endpointCount: 12,
    totalRequests: 458000,
    errorRate: 0.38,
    health: 'healthy',
    apiKey: 'cp_live_nexus_a3b8c9d2e1f0',
    createdAt: '2026-08-15T10:30:00Z',
    updatedAt: '2026-11-06T14:22:00Z',
  },
  {
    id: 'proj-pulse',
    name: 'Pulse Auth Service',
    slug: 'pulse-auth-service',
    description: 'Authentication and authorization microservice',
    environment: 'production',
    baseUrl: 'https://auth.pulse.io',
    endpointCount: 6,
    totalRequests: 312000,
    errorRate: 0.12,
    health: 'healthy',
    apiKey: 'cp_live_pulse_x7y6z5w4v3u2',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-11-06T13:45:00Z',
  },
  {
    id: 'proj-datastream',
    name: 'DataStream Pipeline',
    slug: 'datastream-pipeline',
    description: 'Real-time data processing and streaming pipeline',
    environment: 'staging',
    baseUrl: 'https://staging.datastream.io',
    endpointCount: 8,
    totalRequests: 89000,
    errorRate: 0.45,
    health: 'degraded',
    apiKey: 'cp_staging_ds_m1n2o3p4q5r6',
    createdAt: '2026-10-10T12:15:00Z',
    updatedAt: '2026-11-06T11:30:00Z',
  },
  {
    id: 'proj-mercury',
    name: 'Mercury Gateway',
    slug: 'mercury-gateway',
    description: 'API gateway and load balancer for Mercury services',
    environment: 'production',
    baseUrl: 'https://gw.mercury.io',
    endpointCount: 15,
    totalRequests: 1200000,
    errorRate: 0.52,
    health: 'degraded',
    apiKey: 'cp_live_mercury_h8i9j0k1l2m3',
    createdAt: '2026-07-20T09:00:00Z',
    updatedAt: '2026-11-06T15:10:00Z',
  },
  {
    id: 'proj-forge',
    name: 'Forge Analytics',
    slug: 'forge-analytics',
    description: 'Analytics engine for internal dashboards and reporting',
    environment: 'development',
    baseUrl: 'https://dev.forge.io',
    endpointCount: 4,
    totalRequests: 23000,
    errorRate: 0.08,
    health: 'healthy',
    apiKey: 'cp_dev_forge_s4t5u6v7w8x9',
    createdAt: '2026-10-28T14:45:00Z',
    updatedAt: '2026-11-06T10:00:00Z',
  },
]

const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be under 100 characters'),
  description: z.string().max(500).optional(),
  baseUrl: z.string().min(1, 'Base URL is required').url('Must be a valid URL'),
  environment: z.enum(['development', 'staging', 'production']),
})

type CreateProjectForm = z.infer<typeof createProjectSchema>

function EnvironmentBadge({ environment }: { environment: EnvironmentType }) {
  const config = environmentColors[environment]
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', config.bg, config.text)}>
      {config.label}
    </span>
  )
}

function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-cp-text-secondary">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="rounded-lg border border-cp-border bg-cp-secondary px-4 py-2 text-sm font-medium text-cp-text transition-colors hover:bg-cp-elevated"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="rounded-lg bg-cp-critical px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cp-critical/80"
        >
          Delete
        </button>
      </div>
    </Modal>
  )
}

export default function ProjectsPage() {
  const navigate = useNavigate()
  const addToast = useAppStore((s) => s.addToast)

  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [search, setSearch] = useState('')
  const [envFilter, setEnvFilter] = useState<EnvironmentType | 'all'>('all')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectForm>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: '',
      description: '',
      baseUrl: '',
      environment: 'development',
    },
  })

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
      const matchesEnv = envFilter === 'all' || p.environment === envFilter
      return matchesSearch && matchesEnv
    })
  }, [projects, search, envFilter])

  const onCreateProject = (data: CreateProjectForm) => {
    const newProject: Project = {
      id: `proj-${generateId()}`,
      name: data.name,
      slug: data.name.toLowerCase().replace(/\s+/g, '-'),
      description: data.description ?? '',
      environment: data.environment,
      baseUrl: data.baseUrl,
      endpointCount: 0,
      totalRequests: 0,
      errorRate: 0,
      health: 'unknown',
      apiKey: `cp_${data.environment.slice(0, 4)}_${generateId()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setProjects((prev) => [newProject, ...prev])
    setCreateModalOpen(false)
    reset()
    addToast({
      type: 'success',
      title: 'Project Created',
      message: `${data.name} has been created successfully.`,
    })
  }

  const onDeleteProject = () => {
    if (!deleteTarget) return
    setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id))
    addToast({
      type: 'success',
      title: 'Project Deleted',
      message: `${deleteTarget.name} has been permanently deleted.`,
    })
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cp-text">Projects</h1>
          <p className="mt-1 text-sm text-cp-text-secondary">
            Manage your API projects and monitor their health
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-cp-crimson px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cp-crimson/80"
        >
          <Plus className="h-4 w-4" />
          Create Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search projects..."
          className="w-full sm:w-72"
        />
        <select
          value={envFilter}
          onChange={(e) => setEnvFilter(e.target.value as EnvironmentType | 'all')}
          className="rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-sm text-cp-text transition-colors focus:border-cp-crimson/50 focus:outline-none focus:ring-1 focus:ring-cp-crimson/30"
        >
          <option value="all">All Environments</option>
          <option value="production">Production</option>
          <option value="staging">Staging</option>
          <option value="development">Development</option>
        </select>
      </div>

      {/* Project Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filteredProjects.map((project) => (
            <motion.div
              key={project.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={() => navigate(`/projects/${project.id}`)}
              className="group cursor-pointer rounded-xl border border-cp-border bg-cp-card p-5 transition-all hover:border-cp-crimson/30 hover:bg-cp-elevated"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-cp-text group-hover:text-cp-crimson transition-colors truncate">
                    {project.name}
                  </h3>
                  <div className="mt-1.5 flex items-center gap-2">
                    <EnvironmentBadge environment={project.environment} />
                    <HealthBadge status={project.health} />
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteTarget(project)
                  }}
                  className="rounded-lg p-1.5 text-cp-text-secondary opacity-0 transition-all hover:bg-cp-card hover:text-cp-critical group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-sm text-cp-text-secondary">
                <Globe className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate font-mono text-sm">{project.baseUrl}</span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-cp-border pt-4">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 text-cp-text-secondary">
                    <Layers className="h-3 w-3" />
                    <span className="text-xs">Endpoints</span>
                  </div>
                  <span className="mt-0.5 text-sm font-semibold text-cp-text font-mono">
                    {project.endpointCount}
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 text-cp-text-secondary">
                    <BarChart3 className="h-3 w-3" />
                    <span className="text-xs">Requests</span>
                  </div>
                  <span className="mt-0.5 text-sm font-semibold text-cp-text font-mono">
                    {formatNumber(project.totalRequests)}
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 text-cp-text-secondary">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="text-xs">Errors</span>
                  </div>
                  <span
                    className={cn(
                      'mt-0.5 text-sm font-semibold font-mono',
                      project.errorRate > 1 ? 'text-cp-critical' : project.errorRate > 0.4 ? 'text-cp-warning' : 'text-cp-healthy'
                    )}
                  >
                    {formatPercentage(project.errorRate)}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredProjects.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-cp-border bg-cp-card py-16">
          <Layers className="h-12 w-12 text-cp-text-secondary/40" />
          <h3 className="mt-4 text-lg font-medium text-cp-text">No projects found</h3>
          <p className="mt-1 text-sm text-cp-text-secondary">
            {search ? 'Try a different search term' : 'Create your first project to get started'}
          </p>
        </div>
      )}

      {/* Create Project Modal */}
      <Modal open={createModalOpen} onClose={() => { setCreateModalOpen(false); reset() }} title="Create Project" size="lg">
        <form onSubmit={handleSubmit(onCreateProject)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-cp-text mb-1.5">
              Name <span className="text-cp-crimson">*</span>
            </label>
            <input
              {...register('name')}
              className="w-full rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-sm text-cp-text placeholder:text-cp-text-secondary/60 focus:border-cp-crimson/50 focus:outline-none focus:ring-1 focus:ring-cp-crimson/30"
              placeholder="My API Project"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-cp-critical">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-cp-text mb-1.5">Description</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-sm text-cp-text placeholder:text-cp-text-secondary/60 focus:border-cp-crimson/50 focus:outline-none focus:ring-1 focus:ring-cp-crimson/30 resize-none"
              placeholder="Brief description of the project..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-cp-text mb-1.5">
              Base URL <span className="text-cp-crimson">*</span>
            </label>
            <input
              {...register('baseUrl')}
              className="w-full rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-sm text-cp-text font-mono placeholder:text-cp-text-secondary/60 focus:border-cp-crimson/50 focus:outline-none focus:ring-1 focus:ring-cp-crimson/30"
              placeholder="https://api.example.com"
            />
            {errors.baseUrl && (
              <p className="mt-1 text-xs text-cp-critical">{errors.baseUrl.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-cp-text mb-1.5">Environment</label>
            <select
              {...register('environment')}
              className="w-full rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-sm text-cp-text focus:border-cp-crimson/50 focus:outline-none focus:ring-1 focus:ring-cp-crimson/30"
            >
              <option value="development">Development</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setCreateModalOpen(false); reset() }}
              className="rounded-lg border border-cp-border bg-cp-secondary px-4 py-2 text-sm font-medium text-cp-text transition-colors hover:bg-cp-elevated"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-cp-crimson px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cp-crimson/80 disabled:opacity-50"
            >
              Create Project
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={onDeleteProject}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone and all associated data will be permanently removed.`}
      />
    </div>
  )
}
