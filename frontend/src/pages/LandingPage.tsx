import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Compass,
  BrainCircuit,
  AlertTriangle,
  Sparkles,
  FileCheck,
  Radio,
  ArrowRight,
  Terminal,
  MessageSquare,
  ChevronRight,
  Activity,
  Shield,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/utils/cn'

/* ------------------------------------------------------------------ */
/* Animation helpers                                                   */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' },
  }),
}

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
}

/* ------------------------------------------------------------------ */
/* Tiny sub‑components                                                 */
/* ------------------------------------------------------------------ */

function CrimsonLogo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('flex items-center gap-1.5 select-none', className)}>
      <Activity className="h-6 w-6 text-cp-crimson" />
      <span className="text-lg font-bold tracking-tight text-cp-text">
        CRIMSONPULSE
      </span>
      <span className="rounded bg-cp-crimson/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cp-crimson">
        AI
      </span>
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/* Navbar                                                              */
/* ------------------------------------------------------------------ */

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How it Works', href: '#how-it-works' },
    { label: 'SDK', href: '#sdk' },
    { label: 'Pricing', href: '#pricing' },
  ]

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-cp-bg/90 backdrop-blur-md border-b border-cp-border/60 shadow-lg shadow-black/20'
          : 'bg-transparent'
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <CrimsonLogo />

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm text-cp-text-secondary transition-colors hover:text-cp-text"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop auth buttons */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-cp-text-secondary transition-colors hover:text-cp-text"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-cp-crimson px-4 py-2 text-sm font-medium text-white transition-all hover:bg-cp-red hover:shadow-lg hover:shadow-cp-crimson/25"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-cp-text"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-cp-secondary border-b border-cp-border px-6 pb-4"
        >
          {navLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="block py-2 text-sm text-cp-text-secondary hover:text-cp-text"
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <div className="mt-3 flex flex-col gap-2">
            <Link to="/login" className="text-sm text-cp-text-secondary hover:text-cp-text">
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-cp-crimson px-4 py-2 text-center text-sm font-medium text-white"
            >
              Get Started
            </Link>
          </div>
        </motion.div>
      )}
    </nav>
  )
}

/* ------------------------------------------------------------------ */
/* Hero – right‑side dashboard preview                                 */
/* ------------------------------------------------------------------ */

function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="relative w-full max-w-md lg:max-w-lg"
    >
      {/* Glow */}
      <div className="absolute -inset-8 rounded-3xl bg-cp-crimson/8 blur-3xl" />

      <div className="relative rounded-2xl border border-cp-border bg-cp-card/80 backdrop-blur p-5 shadow-2xl shadow-black/40">
        {/* Header bar */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-cp-healthy animate-pulse" />
            <span className="text-xs font-medium text-cp-text-secondary">
              Live Dashboard
            </span>
          </div>
          <span className="text-[10px] text-cp-text-secondary">production</span>
        </div>

        {/* Metric row */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          {[
            { label: 'Requests', value: '1.2M', color: 'text-cp-text' },
            { label: 'Error Rate', value: '0.12%', color: 'text-cp-healthy' },
            { label: 'P95 Latency', value: '142ms', color: 'text-cp-warning' },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-lg bg-cp-elevated/60 px-3 py-2 border border-cp-border/50"
            >
              <p className="text-[10px] text-cp-text-secondary">{m.label}</p>
              <p className={cn('text-sm font-bold', m.color)}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Pulse line SVG */}
        <div className="rounded-lg bg-cp-bg/60 border border-cp-border/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-medium text-cp-text-secondary">
              Traffic (24h)
            </span>
            <span className="text-[10px] text-cp-crimson font-medium">Live</span>
          </div>
          <svg
            viewBox="0 0 300 60"
            fill="none"
            className="w-full h-auto"
            preserveAspectRatio="none"
          >
            {/* Grid lines */}
            {[15, 30, 45].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="300"
                y2={y}
                stroke="#292C35"
                strokeWidth="0.5"
              />
            ))}
            {/* Area gradient */}
            <defs>
              <linearGradient id="pulseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E63946" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#E63946" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 45 Q15 40 30 38 T60 30 T90 35 T120 25 T150 28 T180 18 T210 22 T240 15 T270 20 T300 12 V60 H0 Z"
              fill="url(#pulseGrad)"
            />
            {/* Line */}
            <path
              d="M0 45 Q15 40 30 38 T60 30 T90 35 T120 25 T150 28 T180 18 T210 22 T240 15 T270 20 T300 12"
              stroke="#E63946"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="600"
                to="0"
                dur="2s"
                fill="freeze"
              />
              <animate
                attributeName="stroke-dasharray"
                values="0 600;600 0"
                dur="2s"
                fill="freeze"
              />
            </path>
            {/* Glow dot at the end */}
            <circle cx="300" cy="12" r="3" fill="#E63946">
              <animate
                attributeName="opacity"
                values="1;0.3;1"
                dur="1.5s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
        </div>

        {/* Recent alerts */}
        <div className="mt-3 space-y-2">
          {[
            {
              severity: 'critical',
              msg: 'POST /api/payments – 500 spike',
              time: '2m ago',
            },
            {
              severity: 'warning',
              msg: 'GET /api/users – latency anomaly',
              time: '14m ago',
            },
          ].map((a, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md bg-cp-bg/50 border border-cp-border/40 px-3 py-1.5"
            >
              <div
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  a.severity === 'critical' ? 'bg-cp-critical' : 'bg-cp-warning'
                )}
              />
              <span className="flex-1 truncate text-[10px] text-cp-text-secondary">
                {a.msg}
              </span>
              <span className="text-[9px] text-cp-text-secondary/60">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Hero Section                                                        */
/* ------------------------------------------------------------------ */

function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-cp-bg pt-20">
      {/* Background pattern */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(41,44,53,0.5) 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Crimson glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-cp-crimson/5 blur-[120px]" />

      <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-12 px-6 lg:flex-row lg:gap-16">
        {/* Left content */}
        <motion.div
          className="flex-1 text-center lg:text-left"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div
            variants={fadeUp}
            custom={0}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-cp-border bg-cp-card/60 px-4 py-1.5"
          >
            <Shield className="h-3.5 w-3.5 text-cp-crimson" />
            <span className="text-xs font-medium text-cp-text-secondary">
              API Intelligence Platform
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-5xl font-bold leading-tight tracking-tight text-cp-text sm:text-6xl lg:text-7xl"
          >
            Every API has a signal.
          </motion.h1>
          <motion.h1
            variants={fadeUp}
            custom={2}
            className="mt-2 text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl"
          >
            <span className="bg-gradient-to-r from-cp-crimson to-cp-red bg-clip-text text-transparent">
              We help you find it.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={3}
            className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-cp-text-secondary lg:mx-0"
          >
            AI-powered API intelligence that detects anomalies, investigates
            incidents, and keeps your services reliable.
          </motion.p>

          <motion.div
            variants={fadeUp}
            custom={4}
            className="mt-8 flex flex-wrap justify-center gap-4 lg:justify-start"
          >
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-cp-crimson px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cp-crimson/25 transition-all hover:bg-cp-red hover:shadow-xl hover:shadow-cp-crimson/30"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-cp-border bg-cp-card/60 px-6 py-3 text-sm font-semibold text-cp-text transition-all hover:border-cp-crimson/40 hover:bg-cp-elevated"
            >
              Explore Dashboard
            </Link>
          </motion.div>
        </motion.div>

        {/* Right – preview */}
        <div className="flex-1 flex justify-center lg:justify-end">
          <DashboardPreview />
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Features Section                                                    */
/* ------------------------------------------------------------------ */

const features = [
  {
    icon: Compass,
    title: 'Automatic Discovery',
    description: 'SDK automatically captures every API endpoint.',
  },
  {
    icon: BrainCircuit,
    title: 'Anomaly Detection',
    description:
      "ML models learn your API's normal behavior and detect deviations.",
  },
  {
    icon: AlertTriangle,
    title: 'Incident Management',
    description:
      'Intelligent grouping, severity classification, and lifecycle tracking.',
  },
  {
    icon: Sparkles,
    title: 'AI Investigation',
    description: 'AI-powered root cause analysis with evidence-based debugging.',
  },
  {
    icon: FileCheck,
    title: 'Contract Validation',
    description:
      'Detect breaking schema changes before they reach production.',
  },
  {
    icon: Radio,
    title: 'Real-time Traffic',
    description: 'Live request monitoring with instant visibility.',
  },
]

function FeaturesSection() {
  return (
    <section id="features" className="relative bg-cp-bg py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          className="text-center"
        >
          <h2 className="text-3xl font-bold text-cp-text sm:text-4xl">
            Built for{' '}
            <span className="text-cp-crimson">API Intelligence</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-cp-text-secondary">
            Everything you need to monitor, understand, and debug your APIs —
            powered by machine learning.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={stagger}
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              className="group rounded-xl border border-cp-border bg-cp-card/60 p-6 transition-all hover:border-cp-crimson/40 hover:bg-cp-elevated/60 hover:shadow-lg hover:shadow-cp-crimson/5"
            >
              <div className="mb-4 inline-flex rounded-lg bg-cp-crimson/10 p-2.5">
                <f.icon className="h-5 w-5 text-cp-crimson" />
              </div>
              <h3 className="text-base font-semibold text-cp-text">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-cp-text-secondary">
                {f.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* How It Works Section                                                */
/* ------------------------------------------------------------------ */

const steps = [
  {
    num: '01',
    title: 'Install the SDK',
    description: 'Add the lightweight SDK to your project with a single command.',
    code: 'pip install apisentinel-sdk',
  },
  {
    num: '02',
    title: 'SDK captures telemetry',
    description:
      'Zero-config middleware automatically captures every API request, response time, status codes, and payloads.',
    code: null,
  },
  {
    num: '03',
    title: 'AI analyzes & alerts',
    description:
      'Our ML pipeline learns your normal patterns and instantly alerts you to anomalies, regressions, and incidents.',
    code: null,
  },
]

function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative bg-cp-secondary/50 py-24"
    >
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          className="text-center"
        >
          <h2 className="text-3xl font-bold text-cp-text sm:text-4xl">
            How It Works
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-cp-text-secondary">
            Get up and running in under 5 minutes.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={stagger}
          className="mt-16 grid gap-8 lg:grid-cols-3"
        >
          {steps.map((s, i) => (
            <motion.div key={s.num} variants={fadeUp} className="relative">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="absolute right-0 top-10 hidden h-px w-8 translate-x-full bg-gradient-to-r from-cp-border to-transparent lg:block" />
              )}

              <div className="rounded-xl border border-cp-border bg-cp-card/60 p-6">
                <span className="text-3xl font-black text-cp-crimson/30">
                  {s.num}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-cp-text">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-cp-text-secondary">
                  {s.description}
                </p>
                {s.code && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-cp-bg border border-cp-border px-4 py-2.5 font-mono text-sm">
                    <Terminal className="h-4 w-4 text-cp-crimson shrink-0" />
                    <code className="text-cp-text">{s.code}</code>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* SDK Section                                                         */
/* ------------------------------------------------------------------ */

function SDKSection() {
  return (
    <section id="sdk" className="relative bg-cp-bg py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
          {/* Left – text */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="flex-1"
          >
            <motion.h2
              variants={fadeUp}
              className="text-3xl font-bold text-cp-text sm:text-4xl"
            >
              Simple{' '}
              <span className="text-cp-crimson">Configuration</span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="mt-4 max-w-lg text-cp-text-secondary leading-relaxed"
            >
              Drop in a few lines of configuration and let the SDK handle
              telemetry capture, batching, and transmission — zero code changes
              required.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-6">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 text-sm font-medium text-cp-crimson transition-colors hover:text-cp-red"
              >
                Get your project key
                <ChevronRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </motion.div>

          {/* Right – code block */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="flex-1 w-full"
          >
            <div className="rounded-xl border border-cp-border bg-cp-card/80 overflow-hidden shadow-2xl shadow-black/30">
              {/* Tab bar */}
              <div className="flex items-center gap-2 border-b border-cp-border bg-cp-secondary/50 px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-cp-critical/60" />
                  <div className="h-3 w-3 rounded-full bg-cp-warning/60" />
                  <div className="h-3 w-3 rounded-full bg-cp-healthy/60" />
                </div>
                <span className="ml-3 text-xs text-cp-text-secondary font-mono">
                  settings.py
                </span>
              </div>
              {/* Code */}
              <div className="p-5 font-mono text-sm leading-7 overflow-x-auto">
                <CodeLine>
                  <span className="text-cp-text-secondary">
                    {'# Django configuration'}
                  </span>
                </CodeLine>
                <CodeLine>
                  <span className="text-[#FF7B72]">API_SENTINEL</span>
                  <span className="text-cp-text-secondary">{' = {'}</span>
                </CodeLine>
                <CodeLine indent={1}>
                  <span className="text-[#A5D6FF]">{'"ENABLED"'}</span>
                  <span className="text-cp-text-secondary">: </span>
                  <span className="text-[#79C0FF]">True</span>
                  <span className="text-cp-text-secondary">,</span>
                </CodeLine>
                <CodeLine indent={1}>
                  <span className="text-[#A5D6FF]">{'"PROJECT_KEY"'}</span>
                  <span className="text-cp-text-secondary">: </span>
                  <span className="text-[#A5D6FF]">
                    {'"YOUR_PROJECT_KEY"'}
                  </span>
                  <span className="text-cp-text-secondary">,</span>
                </CodeLine>
                <CodeLine indent={1}>
                  <span className="text-[#A5D6FF]">{'"ENVIRONMENT"'}</span>
                  <span className="text-cp-text-secondary">: </span>
                  <span className="text-[#A5D6FF]">{'"production"'}</span>
                </CodeLine>
                <CodeLine>
                  <span className="text-cp-text-secondary">{'}'}</span>
                </CodeLine>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function CodeLine({
  children,
  indent = 0,
}: {
  children: React.ReactNode
  indent?: number
}) {
  return (
    <div style={{ paddingLeft: `${indent * 1.5}rem` }}>{children}</div>
  )
}

/* ------------------------------------------------------------------ */
/* AI Investigation Section                                            */
/* ------------------------------------------------------------------ */

function AISection() {
  return (
    <section className="relative bg-cp-secondary/50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center gap-12 lg:flex-row-reverse lg:gap-16">
          {/* Text */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="flex-1"
          >
            <motion.div
              variants={fadeUp}
              className="mb-3 inline-flex items-center gap-2 rounded-full border border-cp-crimson/30 bg-cp-crimson/10 px-3 py-1"
            >
              <Sparkles className="h-3.5 w-3.5 text-cp-crimson" />
              <span className="text-xs font-medium text-cp-crimson">
                AI-Powered
              </span>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="text-3xl font-bold text-cp-text sm:text-4xl"
            >
              AI-Powered Incident Investigation
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="mt-4 max-w-lg text-cp-text-secondary leading-relaxed"
            >
              Ask questions, get answers backed by real evidence. Our AI
              investigator correlates metrics, logs, deployments, and anomalies
              to pinpoint root causes in seconds — not hours.
            </motion.p>
            <motion.ul variants={fadeUp} className="mt-6 space-y-3">
              {[
                'Evidence-based root cause analysis',
                'Automated debug checklists',
                'Deployment correlation & impact analysis',
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-cp-text-secondary"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-cp-crimson" />
                  {item}
                </li>
              ))}
            </motion.ul>
          </motion.div>

          {/* Mock conversation */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="flex-1 w-full"
          >
            <div className="rounded-xl border border-cp-border bg-cp-card/80 p-5 shadow-2xl shadow-black/30">
              <div className="mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-cp-crimson" />
                <span className="text-sm font-medium text-cp-text">
                  AI Investigator
                </span>
              </div>

              <div className="space-y-3">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-xl rounded-br-sm bg-cp-crimson/15 border border-cp-crimson/20 px-4 py-2.5">
                    <p className="text-sm text-cp-text">
                      Why is POST /api/payments returning 500 errors?
                    </p>
                  </div>
                </div>

                {/* AI message */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-xl rounded-bl-sm bg-cp-elevated border border-cp-border px-4 py-3">
                    <p className="text-sm text-cp-text-secondary leading-relaxed">
                      Based on my analysis, the 500 errors started at{' '}
                      <span className="font-medium text-cp-text">14:32 UTC</span>,
                      coinciding with deployment{' '}
                      <span className="font-mono text-cp-crimson text-xs">
                        v2.14.0
                      </span>
                      . The error rate jumped from 0.1% to 12.4%. Root cause:
                      a database connection pool exhaustion triggered by a
                      missing index on the{' '}
                      <span className="font-mono text-xs text-cp-warning">
                        transactions
                      </span>{' '}
                      table.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <span className="rounded bg-cp-critical/15 px-2 py-0.5 text-[10px] font-medium text-cp-critical">
                        3 evidence cards
                      </span>
                      <span className="rounded bg-cp-warning/15 px-2 py-0.5 text-[10px] font-medium text-cp-warning">
                        deployment correlated
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Pricing placeholder (anchor target)                                 */
/* ------------------------------------------------------------------ */

function PricingSection() {
  return (
    <section id="pricing" className="relative bg-cp-bg py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          className="text-center"
        >
          <h2 className="text-3xl font-bold text-cp-text sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-cp-text-secondary">
            Start for free. Scale as you grow.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={stagger}
          className="mt-16 grid gap-6 sm:grid-cols-3"
        >
          {[
            {
              plan: 'Free',
              price: '$0',
              period: 'forever',
              features: [
                '1 project',
                '10K requests / mo',
                '7 day retention',
                'Community support',
              ],
              cta: 'Get Started',
              highlight: false,
            },
            {
              plan: 'Pro',
              price: '$49',
              period: '/ month',
              features: [
                'Unlimited projects',
                '1M requests / mo',
                '90 day retention',
                'AI Investigation',
                'Contract validation',
                'Priority support',
              ],
              cta: 'Start Free Trial',
              highlight: true,
            },
            {
              plan: 'Enterprise',
              price: 'Custom',
              period: '',
              features: [
                'Unlimited everything',
                'Custom retention',
                'SSO & SAML',
                'Dedicated support',
                'SLA guarantee',
                'On-prem option',
              ],
              cta: 'Contact Sales',
              highlight: false,
            },
          ].map((p) => (
            <motion.div
              key={p.plan}
              variants={fadeUp}
              className={cn(
                'rounded-xl border p-6 transition-all',
                p.highlight
                  ? 'border-cp-crimson/50 bg-cp-card/80 shadow-lg shadow-cp-crimson/10 scale-[1.02]'
                  : 'border-cp-border bg-cp-card/40 hover:border-cp-border hover:bg-cp-card/60'
              )}
            >
              {p.highlight && (
                <span className="mb-3 inline-block rounded-full bg-cp-crimson/15 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cp-crimson">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-cp-text">{p.plan}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-cp-text">
                  {p.price}
                </span>
                {p.period && (
                  <span className="text-sm text-cp-text-secondary">
                    {p.period}
                  </span>
                )}
              </div>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-sm text-cp-text-secondary"
                  >
                    <div className="h-1 w-1 rounded-full bg-cp-crimson" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className={cn(
                  'mt-8 block w-full rounded-lg py-2.5 text-center text-sm font-medium transition-all',
                  p.highlight
                    ? 'bg-cp-crimson text-white hover:bg-cp-red shadow-lg shadow-cp-crimson/25'
                    : 'border border-cp-border bg-cp-elevated text-cp-text hover:border-cp-crimson/40'
                )}
              >
                {p.cta}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

const footerLinks = {
  Product: ['Features', 'Pricing', 'SDK', 'Changelog', 'Roadmap'],
  Company: ['About', 'Blog', 'Careers', 'Press'],
  Resources: ['Documentation', 'API Reference', 'Community', 'Status'],
  Legal: ['Privacy', 'Terms', 'Security', 'GDPR'],
}

function Footer() {
  return (
    <footer className="border-t border-cp-border bg-cp-secondary/30">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-1">
            <CrimsonLogo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-cp-text-secondary">
              AI-powered API observability for modern engineering teams.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="text-sm font-semibold text-cp-text">{heading}</h4>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-cp-text-secondary transition-colors hover:text-cp-text"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-cp-border pt-8 text-center text-sm text-cp-text-secondary">
          © 2024 CrimsonPulse AI. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

/* ------------------------------------------------------------------ */
/* Landing Page (composed)                                             */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cp-bg">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <SDKSection />
      <AISection />
      <PricingSection />
      <Footer />
    </div>
  )
}
