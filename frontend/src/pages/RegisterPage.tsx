import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Activity, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/utils/cn'
import { authService } from '@/services/authService'

/* ------------------------------------------------------------------ */
/* Validation schema                                                   */
/* ------------------------------------------------------------------ */

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/\d/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

type RegisterFormData = z.infer<typeof registerSchema>

/* ------------------------------------------------------------------ */
/* Branded Side Panel                                                  */
/* ------------------------------------------------------------------ */

function BrandedPanel() {
  return (
    <div className="relative hidden flex-1 items-center justify-center overflow-hidden bg-cp-secondary lg:flex">
      {/* Background pattern */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(41,44,53,0.4) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />
      {/* Crimson glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-cp-crimson/8 blur-[100px]" />

      <div className="relative z-10 max-w-md px-12 text-center">
        <Link to="/" className="mb-8 inline-flex items-center gap-2">
          <Activity className="h-8 w-8 text-cp-crimson" />
          <span className="text-2xl font-bold tracking-tight text-cp-text">
            CRIMSONPULSE
          </span>
          <span className="rounded bg-cp-crimson/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-cp-crimson">
            AI
          </span>
        </Link>
        <h2 className="mt-6 text-3xl font-bold text-cp-text leading-tight">
          Start monitoring in{' '}
          <span className="text-cp-crimson">minutes</span>
        </h2>
        <p className="mt-4 text-cp-text-secondary leading-relaxed">
          Designed for modern engineering teams using CrimsonPulse AI to keep
          their APIs fast, reliable, and observable.
        </p>

        {/* Technical Highlights */}
        <div className="mt-10 grid grid-cols-3 gap-4">
          {[
            { value: 'Async', label: 'Telemetry dispatch' },
            { value: 'Zero-Secret', label: 'Client scrubbing' },
            { value: 'OpenAPI', label: 'Contract drift' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-sm font-bold font-mono text-cp-text">{s.value}</p>
              <p className="text-[11px] text-cp-text-secondary">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Register Page                                                       */
/* ------------------------------------------------------------------ */

export default function RegisterPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    setAuthError(null)

    try {
      await authService.register({
        name: data.name,
        email: data.email,
        password: data.password,
      })
      setIsLoading(false)
      navigate('/dashboard')
    } catch (err: any) {
      setIsLoading(false)
      setAuthError(err.message || 'Registration failed. Please try again.')
    }
  }

  return (
    <div className="flex min-h-screen bg-cp-bg">
      {/* Left branded panel */}
      <BrandedPanel />

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <Link
            to="/"
            className="mb-8 flex items-center justify-center gap-2 lg:hidden"
          >
            <Activity className="h-7 w-7 text-cp-crimson" />
            <span className="text-xl font-bold tracking-tight text-cp-text">
              CRIMSONPULSE
            </span>
            <span className="rounded bg-cp-crimson/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cp-crimson">
              AI
            </span>
          </Link>

          <div className="text-center lg:text-left">
            <h1 className="text-2xl font-bold text-cp-text">Create your account</h1>
            <p className="mt-2 text-sm text-cp-text-secondary">
              Get started with CrimsonPulse AI for free
            </p>
          </div>

          {authError && (
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-400">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
              <div className="flex-1 leading-snug">{authError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            {/* Full name */}
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-medium text-cp-text"
              >
                Full name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Jane Doe"
                className={cn(
                  'w-full rounded-lg border bg-cp-card px-4 py-2.5 text-sm text-cp-text placeholder:text-cp-text-secondary/50 outline-none transition-all focus:ring-2 focus:ring-cp-crimson/40',
                  errors.name
                    ? 'border-cp-critical focus:ring-cp-critical/40'
                    : 'border-cp-border focus:border-cp-crimson/50'
                )}
                {...register('name')}
              />
              {errors.name && (
                <p className="mt-1.5 text-xs text-cp-critical">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-cp-text"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                className={cn(
                  'w-full rounded-lg border bg-cp-card px-4 py-2.5 text-sm text-cp-text placeholder:text-cp-text-secondary/50 outline-none transition-all focus:ring-2 focus:ring-cp-crimson/40',
                  errors.email
                    ? 'border-cp-critical focus:ring-cp-critical/40'
                    : 'border-cp-border focus:border-cp-crimson/50'
                )}
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-cp-critical">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-cp-text"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={cn(
                    'w-full rounded-lg border bg-cp-card px-4 py-2.5 pr-10 text-sm text-cp-text placeholder:text-cp-text-secondary/50 outline-none transition-all focus:ring-2 focus:ring-cp-crimson/40',
                    errors.password
                      ? 'border-cp-critical focus:ring-cp-critical/40'
                      : 'border-cp-border focus:border-cp-crimson/50'
                  )}
                  {...register('password')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cp-text-secondary hover:text-cp-text"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-cp-critical">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium text-cp-text"
              >
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={cn(
                    'w-full rounded-lg border bg-cp-card px-4 py-2.5 pr-10 text-sm text-cp-text placeholder:text-cp-text-secondary/50 outline-none transition-all focus:ring-2 focus:ring-cp-crimson/40',
                    errors.confirmPassword
                      ? 'border-cp-critical focus:ring-cp-critical/40'
                      : 'border-cp-border focus:border-cp-crimson/50'
                  )}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cp-text-secondary hover:text-cp-text"
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs text-cp-critical">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-cp-crimson py-2.5 text-sm font-semibold text-white shadow-lg shadow-cp-crimson/25 transition-all hover:bg-cp-red hover:shadow-xl hover:shadow-cp-crimson/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="mt-6 text-center text-sm text-cp-text-secondary">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-cp-crimson transition-colors hover:text-cp-red"
            >
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
