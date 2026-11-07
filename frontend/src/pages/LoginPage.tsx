import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Activity, Eye, EyeOff, Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

/* ------------------------------------------------------------------ */
/* Validation schema                                                   */
/* ------------------------------------------------------------------ */

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

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
          API Intelligence,{' '}
          <span className="text-cp-crimson">Reimagined</span>
        </h2>
        <p className="mt-4 text-cp-text-secondary leading-relaxed">
          Detect anomalies, investigate incidents, and keep your services
          reliable — all powered by AI.
        </p>

        {/* Decorative pulse lines */}
        <div className="mt-10 flex justify-center">
          <svg
            viewBox="0 0 200 40"
            fill="none"
            className="w-48 opacity-60"
          >
            <path
              d="M0 20 Q25 20 40 10 T80 20 T120 15 T160 22 T200 18"
              stroke="#E63946"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M0 25 Q30 25 50 30 T90 22 T130 28 T170 20 T200 24"
              stroke="#941B2A"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Login Page                                                          */
/* ------------------------------------------------------------------ */

export default function LoginPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)

    // Simulate auth delay
    await new Promise((resolve) => setTimeout(resolve, 1200))

    // Store user in localStorage
    const user = {
      id: 'usr-1',
      name: data.email.split('@')[0],
      email: data.email,
      role: 'owner' as const,
      createdAt: new Date().toISOString(),
    }
    localStorage.setItem('cp_user', JSON.stringify(user))
    localStorage.setItem('cp_auth', 'true')

    setIsLoading(false)
    navigate('/dashboard')
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
            <h1 className="text-2xl font-bold text-cp-text">Welcome back</h1>
            <p className="mt-2 text-sm text-cp-text-secondary">
              Sign in to your CrimsonPulse account
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
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
                  autoComplete="current-password"
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

            {/* Remember me + forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-cp-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-cp-border bg-cp-card text-cp-crimson accent-cp-crimson focus:ring-cp-crimson"
                />
                Remember me
              </label>
              <a
                href="#"
                className="text-sm text-cp-crimson hover:text-cp-red transition-colors"
              >
                Forgot password?
              </a>
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
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Register link */}
          <p className="mt-6 text-center text-sm text-cp-text-secondary">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-medium text-cp-crimson transition-colors hover:text-cp-red"
            >
              Sign up
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
