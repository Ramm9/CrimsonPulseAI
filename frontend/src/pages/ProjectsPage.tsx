import { useState, useMemo, useEffect } from 'react'
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
  FileCode,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatNumber, formatPercentage } from '@/utils/helpers'
import { SearchInput } from '@/components/shared/SearchInput'
import { HealthBadge } from '@/components/shared/HealthBadge'
import { Modal } from '@/components/shared/Modal'
import { useAppStore } from '@/store/appStore'
import { projectService } from '@/services/projectService'
import type { Project, EnvironmentType } from '@/types'

const environmentColors: Record<EnvironmentType, { bg: string; text: string; label: string }> = {
  production: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Production' },
  staging: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Staging' },
  development: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Development' },
}

const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  description: z.string().optional(),
  baseUrl: z.string().url('Must be a valid URL (e.g. https://api.example.com)'),
  environment: z.enum(['production', 'staging', 'development']),
})

type CreateProjectForm = z.infer<typeof createProjectSchema>

function EnvironmentBadge({ environment }: { environment: EnvironmentType }) {
  const config = environmentColors[environment]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        config.bg,
        config.text
      )}
    >
      {config.label}
    </span>
  )
}

function DeleteConfirmModal({
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

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [envFilter, setEnvFilter] = useState<EnvironmentType | 'all'>('all')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [showOnboardingGuide, setShowOnboardingGuide] = useState(true)

  useEffect(() => {
    async function loadProjects() {
      try {
        setLoading(true)
        const data = await projectService.getProjects()
        setProjects(data)
      } catch (err) {
        console.error('Failed to load projects:', err)
      } finally {
        setLoading(false)
      }
    }
    loadProjects()
  }, [])

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

  const onCreateProject = async (data: CreateProjectForm) => {
    try {
      const created = await projectService.createProject({
        name: data.name,
        description: data.description ?? '',
        environment: data.environment,
        baseUrl: data.baseUrl,
      })
      setProjects((prev) => [created, ...prev])
      setCreateModalOpen(false)
      reset()
      addToast({
        type: 'success',
        title: 'Project Created',
        message: `${data.name} has been created successfully.`,
      })
      navigate(`/projects/${created.id}`)
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to create project',
      })
    }
  }

  const onDeleteProject = async () => {
    if (!deleteTarget) return
    try {
      await projectService.deleteProject(deleteTarget.id)
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      addToast({
        type: 'success',
        title: 'Project Deleted',
        message: `${deleteTarget.name} has been permanently deleted.`,
      })
      setDeleteTarget(null)
    } catch {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete project',
      })
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cp-text sm:text-3xl">Projects</h1>
          <p className="mt-1 text-sm text-cp-text-secondary">
            Manage your API projects, monitor ingress health, and configure telemetry collectors
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/contracts')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cp-border bg-cp-card px-3.5 py-2.5 text-xs font-semibold text-cp-text hover:bg-cp-elevated transition-colors"
          >
            <FileCode className="h-4 w-4 text-cp-text-secondary" />
            Import OpenAPI Spec
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-cp-crimson px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cp-red"
          >
            <Plus className="h-4 w-4" />
            Create Project
          </button>
        </div>
      </div>

      {/* First-Project Onboarding Card (Guided Quickstart) */}
      {showOnboardingGuide && (
        <div className="relative overflow-hidden rounded-xl border border-cp-border bg-cp-card p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5 text-cp-text font-semibold text-sm">
              <Sparkles className="h-4 w-4 text-cp-crimson" />
              <span>Developer Quickstart: Onboard an API Service in 3 Steps</span>
            </div>
            <button
              onClick={() => setShowOnboardingGuide(false)}
              className="text-xs text-cp-text-secondary hover:text-cp-text"
            >
              Dismiss
            </button>
          </div>

          <p className="mt-1 text-xs text-cp-text-secondary">
            Follow this quick integration path to begin live telemetry ingestion and AI anomaly tracking:
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-cp-border/70 bg-cp-secondary p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 font-mono text-xs font-semibold text-cp-crimson">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cp-crimson text-white text-[10px]">
                  1
                </span>
                Install SDK
              </div>
              <p className="text-[11px] text-cp-text-secondary">
                Add the Python monitoring client to your dependencies:
              </p>
              <pre className="rounded bg-cp-card p-1.5 font-mono text-[11px] text-cp-text border border-cp-border">
                pip install crimsonpulse-sdk
              </pre>
            </div>

            <div className="rounded-lg border border-cp-border/70 bg-cp-secondary p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 font-mono text-xs font-semibold text-cp-crimson">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cp-crimson text-white text-[10px]">
                  2
                </span>
                Configure Middleware
              </div>
              <p className="text-[11px] text-cp-text-secondary">
                Set <code className="text-cp-text">CAPTURE_HEADERS = False</code> in settings.py to prevent token leakage.
              </p>
              <button
                onClick={() => navigate('/integrations')}
                className="inline-flex items-center gap-1 text-[11px] text-cp-crimson hover:underline font-medium"
              >
                View SDK Settings snippet <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="rounded-lg border border-cp-border/70 bg-cp-secondary p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 font-mono text-xs font-semibold text-cp-crimson">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cp-crimson text-white text-[10px]">
                  3
                </span>
                Register Endpoints
              </div>
              <p className="text-[11px] text-cp-text-secondary">
                Automatic runtime discovery or pre-seed endpoints via OpenAPI import:
              </p>
              <button
                onClick={() => navigate('/contracts')}
                className="inline-flex items-center gap-1 text-[11px] text-cp-crimson hover:underline font-medium"
              >
                Upload OpenAPI 3.0 spec <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      )}

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
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-cp-card animate-pulse border border-cp-border" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-xl border border-cp-border bg-cp-card p-12 text-center">
          <Layers className="mx-auto h-10 w-10 text-cp-text-secondary/40" />
          <h3 className="mt-3 text-base font-semibold text-cp-text">No Projects Found</h3>
          <p className="mt-1 text-xs text-cp-text-secondary max-w-sm mx-auto">
            {search || envFilter !== 'all'
              ? 'No projects matched your search criteria. Try adjusting your filters.'
              : 'Get started by creating your first project or importing an OpenAPI specification.'}
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-cp-crimson px-4 py-2 text-xs font-semibold text-white hover:bg-cp-red transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Create Project
          </button>
        </div>
      ) : (
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
                    title="Delete project"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <p className="mt-3 line-clamp-2 text-xs text-cp-text-secondary">
                  {project.description || 'No description provided.'}
                </p>

                <div className="mt-3 flex items-center gap-1.5 text-xs font-mono text-cp-text-secondary">
                  <Globe className="h-3.5 w-3.5 shrink-0 text-cp-text-secondary/60" />
                  <span className="truncate">{project.baseUrl}</span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-cp-border pt-3 text-xs">
                  <div className="flex items-center gap-1 text-cp-text-secondary">
                    <Layers className="h-3.5 w-3.5" />
                    <span className="font-mono text-cp-text">{project.endpointCount}</span>
                    <span>endpoints</span>
                  </div>
                  <div className="flex items-center gap-1 text-cp-text-secondary">
                    <BarChart3 className="h-3.5 w-3.5" />
                    <span className="font-mono text-cp-text">{formatNumber(project.totalRequests)}</span>
                    <span>reqs</span>
                  </div>
                  <div className="flex items-center gap-1 text-cp-text-secondary">
                    <AlertTriangle className="h-3.5 w-3.5 text-cp-warning" />
                    <span
                      className={cn(
                        'font-mono',
                        project.errorRate > 0.5 ? 'text-cp-critical' : 'text-cp-text'
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
      )}

      {/* Create Project Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Project"
      >
        <form onSubmit={handleSubmit(onCreateProject)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-cp-text">Project Name</label>
            <input
              {...register('name')}
              placeholder="e.g. Nexus Commerce API"
              className={cn(
                'mt-1.5 w-full rounded-lg border bg-cp-secondary px-3 py-2 text-sm text-cp-text placeholder:text-cp-text-secondary/50',
                'focus:outline-none focus:ring-1 transition-colors',
                errors.name
                  ? 'border-cp-critical focus:ring-cp-critical/30'
                  : 'border-cp-border focus:border-cp-crimson/50 focus:ring-cp-crimson/30'
              )}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-cp-critical">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-cp-text">Description</label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Brief description of the service..."
              className="mt-1.5 w-full rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-sm text-cp-text placeholder:text-cp-text-secondary/50 focus:border-cp-crimson/50 focus:outline-none focus:ring-1 focus:ring-cp-crimson/30 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-cp-text">Base URL</label>
            <input
              {...register('baseUrl')}
              placeholder="https://api.example.com"
              className={cn(
                'mt-1.5 w-full rounded-lg border bg-cp-secondary px-3 py-2 text-sm font-mono text-cp-text placeholder:text-cp-text-secondary/50',
                'focus:outline-none focus:ring-1 transition-colors',
                errors.baseUrl
                  ? 'border-cp-critical focus:ring-cp-critical/30'
                  : 'border-cp-border focus:border-cp-crimson/50 focus:ring-cp-crimson/30'
              )}
            />
            {errors.baseUrl && (
              <p className="mt-1 text-xs text-cp-critical">{errors.baseUrl.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-cp-text">Environment</label>
            <select
              {...register('environment')}
              className="mt-1.5 w-full rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-sm text-cp-text focus:border-cp-crimson/50 focus:outline-none focus:ring-1 focus:ring-cp-crimson/30 transition-colors"
            >
              <option value="development">Development</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </select>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="rounded-lg border border-cp-border bg-cp-secondary px-4 py-2 text-sm font-medium text-cp-text transition-colors hover:bg-cp-elevated"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-cp-crimson px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cp-red disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={onDeleteProject}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? All associated telemetry and incidents will be permanently removed.`}
      />
    </div>
  )
}
