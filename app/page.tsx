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
    <div className="min-h-screen bg-[#f5f6f9]">
      <MarketingHeader />
      <main className="space-y-0">
        <section className="relative isolate overflow-hidden bg-[#050d1a] text-white">
          <div className="absolute inset-0 bg-[url('/useforhero.png')] bg-cover bg-center" aria-hidden />
          <div className="absolute inset-0 bg-[#050d1a]/85" />
          <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 py-24">
            <div className="max-w-3xl space-y-6">
              <p className="text-xs uppercase tracking-[0.5em] text-white/70">Operational System</p>
              <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                Operational control for construction, railroad, and environmental teams.
              </h1>
              <p className="text-lg text-white/80">
                CRM, estimating, dispatch, and compliance—built for regulated work and real execution. Every workflow is enforced server-side; every action is logged.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="rounded-md bg-[#d5530d] px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#b6440b]"
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-md border border-white/60 px-6 py-3 text-center text-sm font-semibold text-white transition hover:border-white"
                >
                  View Pricing
                </Link>
              </div>
            </div>
            <div className="grid gap-6 text-sm text-white/80 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Mandate</p>
                <p className="mt-2 font-semibold">One operating record from contact through compliance.</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Enforcement</p>
                <p className="mt-2 font-semibold">Role-based controls and immutable audit logs by default.</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Audience</p>
                <p className="mt-2 font-semibold">Operators, estimators, dispatch leaders, compliance owners.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[#d7dbe2] bg-white">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-5">
            {trustSignals.map((item) => (
              <p key={item} className="text-sm font-medium text-[#0a1528]">
                {item}
              </p>
            ))}
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto max-w-6xl space-y-10 px-4">
            <header className="max-w-3xl space-y-3">
              <p className="text-xs uppercase tracking-[0.4em] text-[#6d768a]">Problem → Solution</p>
              <h2 className="text-3xl font-semibold text-[#050d1a]">Different industries. Same enforcement expectations.</h2>
            </header>
            <div className="grid gap-6 md:grid-cols-3">
              {industrySections.map((industry) => (
                <article key={industry.title} className="flex h-full flex-col border border-[#d7dbe2] p-6">
                  <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[#0c1c36]">{industry.title}</div>
                  <p className="mt-4 text-sm font-semibold text-[#0b1220]">{industry.challenge}</p>
                  <p className="mt-3 text-sm text-[#4c566a]">{industry.response}</p>
                  <div className="mt-4 h-1 w-12 bg-[#d5530d]" />
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto max-w-6xl space-y-12 px-4">
            <header className="max-w-3xl space-y-3">
              <p className="text-xs uppercase tracking-[0.4em] text-[#6d768a]">Operational Coverage</p>
              <h2 className="text-3xl font-semibold text-[#050d1a]">One operating record spans CRM, estimating, dispatch, and compliance.</h2>
              <p className="text-sm text-[#4c566a]">Each module uses the same enforcement logic, so field teams move from bid to proof without duplicating data or losing audit context.</p>
            </header>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {operationalCoverage.map((area) => (
                <article key={area.name} className="space-y-3 border-b border-[#d7dbe2] pb-6">
                  <h3 className="text-lg font-semibold text-[#050d1a]">{area.name}</h3>
                  {area.lines.map((line) => (
                    <p key={line} className="text-sm text-[#4c566a]">
                      {line}
                    </p>
                  ))}
                </article>
              ))}
            </div>
            <div className="border-t border-[#c9ceda] pt-8">
              <p className="text-xs uppercase tracking-[0.4em] text-[#6d768a]">Operational Flow</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-[#0b1220]">
                {flowSteps.map((step, index) => (
                  <div key={step} className="flex items-center gap-3">
                    <span>{step}</span>
                    {index < flowSteps.length - 1 && (
                      <span aria-hidden className="text-[#d5530d]">
                        →
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#050d1a] py-12 text-white">
          <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">Security & Governance</p>
              <p className="text-base text-white/80 md:max-w-3xl">
                Access controls, audit logs, signed PDFs, and compliance snapshots are enforced server-side so leadership can prove every operational decision without assembling evidence after the fact.
              </p>
            </div>
            <Link
              href="/security"
              className="rounded-md border border-white/60 px-6 py-3 text-center text-sm font-semibold text-white transition hover:border-white"
            >
              View Security & Governance
            </Link>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-[#6d768a]">Pricing</p>
            <p className="text-base text-[#0b1220]">Pick the enforcement level your crews need—no per-seat surprises.</p>
            <Link
              href="/pricing"
              className="rounded-md bg-[#d5530d] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#b6440b]"
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
