import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingFooter } from '@/components/public/marketing-footer'
import { MarketingHeader } from '@/components/public/marketing-header'

const trustSignals = [
  'Built for regulated industries',
  'Audit-defensible by design',
  'Used by operators, not marketers',
  'Contacts → Dispatch continuity',
  'Zero speculative features',
]

const industrySections = [
  {
    title: 'Construction',
    challenge: 'Fragmented workflows, lost documentation, poor visibility.',
    response: 'T-REX ties CRM, estimating, and dispatch to the same record so every handoff is documented and auditable.',
  },
  {
    title: 'Railroad',
    challenge: 'Authority coordination, compliance pressure, and operational handoffs.',
    response: 'Subdivision context, QR verification, and immutable logs keep inspectors, contractors, and owners aligned.',
  },
  {
    title: 'Environmental',
    challenge: 'Documentation overload, audit exposure, and reporting burden.',
    response: 'Permit-driven workflows and preserved evidence make regulators see one version of the truth.',
  },
]

const operationalCoverage = [
  {
    name: 'CRM',
    lines: [
      'Contacts, companies, and deals stay on one record.',
      'Ownership, notes, and documents remain accountable.',
    ],
  },
  {
    name: 'Estimating',
    lines: [
      'Controlled presets and revisions document every change.',
      'Approvals, signatures, and PDFs stay versioned.',
    ],
  },
  {
    name: 'Dispatch',
    lines: [
      'Work orders inherit context from CRM and estimating.',
      'Crews, equipment, and execution logs stay traceable.',
    ],
  },
  {
    name: 'Compliance',
    lines: [
      'Certifications, QR verification, and snapshots are immutable.',
      'Audit history mirrors the field reality in one place.',
    ],
  },
]

const flowSteps = ['Contact', 'Deal', 'Estimate', 'Approval', 'Dispatch', 'Compliance Proof']

export const metadata: Metadata = {
  title: 'T-REX AI OS | Operational CRM, Estimating, Dispatch & Compliance',
  description:
    'T-REX AI OS is an operational system for construction, railroad, and environmental teams. CRM, estimating, dispatch, and compliance with server-enforced workflows and audit-ready records.',
  alternates: {
    canonical: 'https://trexaios.com',
  },
  openGraph: {
    title: 'T-REX AI OS — Operational Control System',
    description: 'CRM, estimating, dispatch, and compliance built for regulated field operations.',
    type: 'website',
    url: 'https://trexaios.com',
    images: [
      {
        url: '/android-icon-192x192.png',
        width: 192,
        height: 192,
        alt: 'T-REX AI OS system favicon',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'T-REX AI OS',
    description: 'Operational control for construction, railroad, and environmental teams.',
    images: ['/android-icon-192x192.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <MarketingHeader />
      <main className="space-y-0">
        <section className="relative isolate overflow-hidden bg-slate-950 text-white">
          <div className="absolute inset-0 bg-[url('/useforhero.png')] bg-cover bg-center" aria-hidden />
          <div className="absolute inset-0 bg-slate-950/90" />
          <div className="relative mx-auto flex max-w-7xl flex-col gap-12 px-6 py-32">
            <div className="max-w-4xl space-y-8">
              <h1 className="text-5xl font-bold leading-[1.1] tracking-tight text-white md:text-7xl">
                Operational control for construction, railroad, and environmental teams.
              </h1>
              <p className="text-xl leading-relaxed text-slate-300 md:text-2xl">
                CRM, estimating, dispatch, and compliance—built for regulated work and real execution. Every workflow is enforced server-side; every action is logged.
              </p>
              <div className="flex flex-col gap-4 pt-4 sm:flex-row">
                <Link
                  href="/signup"
                  className="rounded-full bg-orange-500 px-8 py-4 text-center text-base font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 hover:shadow-xl"
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-full border-2 border-slate-600 px-8 py-4 text-center text-base font-semibold text-white transition hover:border-orange-500 hover:bg-slate-900/50"
                >
                  View Pricing
                </Link>
              </div>
            </div>
            <div className="grid gap-8 text-base text-slate-200 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-400">Mandate</p>
                <p className="mt-3 text-lg font-semibold leading-snug text-white">One operating record from contact through compliance.</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-400">Enforcement</p>
                <p className="mt-3 text-lg font-semibold leading-snug text-white">Role-based controls and immutable audit logs by default.</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-400">Audience</p>
                <p className="mt-3 text-lg font-semibold leading-snug text-white">Operators, estimators, dispatch leaders, compliance owners.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-800 bg-slate-900/60">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-5">
            {trustSignals.map((item) => (
              <p key={item} className="text-base font-semibold text-orange-400">
                {item}
              </p>
            ))}
          </div>
        </section>

        <section className="bg-slate-950 py-24">
          <div className="mx-auto max-w-7xl space-y-16 px-6">
            <header className="max-w-4xl space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-400">Problem → Solution</p>
              <h2 className="text-4xl font-bold leading-tight text-white md:text-5xl">Different industries. Same enforcement expectations.</h2>
            </header>
            <div className="grid gap-8 md:grid-cols-3">
              {industrySections.map((industry) => (
                <article key={industry.title} className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl shadow-slate-900/50">
                  <div className="text-sm font-bold uppercase tracking-[0.25em] text-orange-400">{industry.title}</div>
                  <p className="mt-6 text-lg font-semibold leading-snug text-white">{industry.challenge}</p>
                  <p className="mt-4 text-base leading-relaxed text-slate-300">{industry.response}</p>
                  <div className="mt-6 h-1 w-16 bg-orange-500" />
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-900/40 py-24">
          <div className="mx-auto max-w-7xl space-y-16 px-6">
            <header className="max-w-4xl space-y-5">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-400">Operational Coverage</p>
              <h2 className="text-4xl font-bold leading-tight text-white md:text-5xl">One operating record spans CRM, estimating, dispatch, and compliance.</h2>
              <p className="text-lg leading-relaxed text-slate-300">Each module uses the same enforcement logic, so field teams move from bid to proof without duplicating data or losing audit context.</p>
            </header>
            <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
              {operationalCoverage.map((area) => (
                <article key={area.name} className="space-y-4 border-b-2 border-slate-800 pb-8">
                  <h3 className="text-2xl font-bold text-orange-400">{area.name}</h3>
                  {area.lines.map((line) => (
                    <p key={line} className="text-base leading-relaxed text-slate-200">
                      {line}
                    </p>
                  ))}
                </article>
              ))}
            </div>
            <div className="border-t-2 border-slate-800 pt-12">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-400">Operational Flow</p>
              <div className="mt-6 flex flex-wrap items-center gap-4 text-lg font-semibold text-slate-100">
                {flowSteps.map((step, index) => (
                  <div key={step} className="flex items-center gap-4">
                    <span>{step}</span>
                    {index < flowSteps.length - 1 && (
                      <span aria-hidden className="text-orange-500">
                        →
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-900/80 py-20 text-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-400">Security & Governance</p>
              <p className="text-xl leading-relaxed text-slate-200 md:max-w-3xl">
                Access controls, audit logs, signed PDFs, and compliance snapshots are enforced server-side so leadership can prove every operational decision without assembling evidence after the fact.
              </p>
            </div>
            <Link
              href="/security"
              className="rounded-full border-2 border-slate-600 px-8 py-4 text-center text-base font-semibold text-white transition hover:border-orange-500 hover:bg-slate-900/50"
            >
              View Security & Governance
            </Link>
          </div>
        </section>

        <section className="bg-slate-950 py-24">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-400">Pricing</p>
            <p className="text-2xl font-semibold text-slate-200">Pick the enforcement level your crews need—no per-seat surprises.</p>
            <Link
              href="/pricing"
              className="mt-4 rounded-full bg-orange-500 px-10 py-5 text-lg font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 hover:shadow-xl"
            >
              View Pricing
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  )
}
