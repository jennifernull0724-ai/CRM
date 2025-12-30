import Link from 'next/link'
import { MarketingFooter } from '@/components/public/marketing-footer'
import { MarketingHeader } from '@/components/public/marketing-header'

export const metadata = {
  title: 'T-REX AI OS Pricing | Operational Plans for Regulated Teams',
  description:
    'Transparent pricing for CRM, estimating, dispatch, and compliance. Built for construction, railroad, and environmental operations.',
  alternates: {
    canonical: 'https://trexaios.com/pricing',
  },
  robots: {
    index: true,
    follow: true,
  },
} satisfies import('next').Metadata

type Tier = {
  name: string
  badge?: string
  price: string
  subtext?: string
  seats: string
  included: string[]
  notIncluded: string[]
  primaryCtaLabel: string
  primaryCtaHref: string
  secondaryCtaLabel?: string
  secondaryCtaHref?: string
  ctaVariant: 'primary' | 'secondary'
}

type ComparisonRow = {
  tier: string
  price: string
  seats: string
  crm: string
  estimating: string
  compliance: string
  dispatch: string
  analytics: string
}

const tiers: Tier[] = [
  {
    name: 'Starter',
    badge: 'Free trial',
    price: '$0',
    subtext: 'Launch-ready CRM for small crews',
    seats: 'Up to 3 internal seats',
    included: [
      'Operational CRM workspace',
      'Contact enrichment + attention scoring',
      'Tasks, notes, and activity logging',
      'Basic analytics + pipeline exports',
    ],
    notIncluded: ['Estimating PDFs', 'Dispatch board', 'Compliance snapshots'],
    primaryCtaLabel: 'Start 14-day trial',
    primaryCtaHref: '/signup',
    ctaVariant: 'primary',
  },
  {
    name: 'Growth',
    badge: 'Most popular',
    price: '$1,200/mo',
    subtext: 'Scaling teams that need estimating handoff',
    seats: '10 seats · add more anytime',
    included: [
      'Everything in Starter',
      'Estimator workspace + presets',
      'Deal routing to dispatch',
      'Embedded email + timeline logging',
    ],
    notIncluded: ['Enterprise compliance automations'],
    primaryCtaLabel: 'Buy Growth',
    primaryCtaHref: '/upgrade?plan=growth',
    secondaryCtaLabel: 'Talk to sales',
    secondaryCtaHref: '/request-demo',
    ctaVariant: 'secondary',
  },
  {
    name: 'Pro',
    price: '$2,800/mo',
    subtext: 'Multi-division contractors with heavy compliance',
    seats: '25 seats · advanced controls',
    included: [
      'Everything in Growth',
      'Compliance locker + QR verification',
      'Dispatch orchestration + crew gaps',
      'Advanced analytics with audit trails',
    ],
    notIncluded: [],
    primaryCtaLabel: 'Buy Pro',
    primaryCtaHref: '/upgrade?plan=pro',
    secondaryCtaLabel: 'Request alignment call',
    secondaryCtaHref: '/request-demo',
    ctaVariant: 'secondary',
  },
  {
    name: 'Enterprise',
    badge: 'Custom',
    price: 'Custom',
    subtext: 'National operators and regulated rail programs',
    seats: 'Unlimited seats + dedicated pods',
    included: [
      'Everything in Pro',
      'Dedicated compliance desk',
      'Private data residency + SSO',
      'Platform APIs and integrations',
    ],
    notIncluded: [],
    primaryCtaLabel: 'Contact enterprise team',
    primaryCtaHref: '/request-demo',
    ctaVariant: 'primary',
  },
]

const comparisonRows: ComparisonRow[] = [
  { tier: 'Starter', price: '$0', seats: '3', crm: 'Full', estimating: 'View only', compliance: 'Dashboard', dispatch: 'Not included', analytics: 'Standard' },
  {
    tier: 'Growth',
    price: '$1,200/mo',
    seats: '10',
    crm: 'Full',
    estimating: 'Included',
    compliance: 'Snapshots',
    dispatch: 'Crew readiness',
    analytics: 'Advanced',
  },
  {
    tier: 'Pro',
    price: '$2,800/mo',
    seats: '25',
    crm: 'Full',
    estimating: 'Included',
    compliance: 'Locker + QR',
    dispatch: 'Full board',
    analytics: 'Executive',
  },
  {
    tier: 'Enterprise',
    price: 'Custom',
    seats: 'Unlimited',
    crm: 'Full',
    estimating: 'Custom workflows',
    compliance: 'Enterprise presets',
    dispatch: 'Global orchestration',
    analytics: 'Custom models',
  },
]

const enforcementNotes = [
  'Seats and feature gates are enforced server-side for every workspace.',
  'Compliance snapshots, PDFs, and exports remain immutable for 7 years.',
  'Upgrades propagate instantly across CRM, estimating, and dispatch surfaces.',
  'Downgrades preserve historical data but lock advanced editors until re-enabled.',
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <MarketingHeader />
      <main>
        <section className="px-6 py-20 text-center">
          <div className="mx-auto max-w-3xl space-y-6">
            <p className="text-xs uppercase tracking-[0.5em] text-orange-400">Simple, Transparent Pricing</p>
            <h1 className="text-4xl font-semibold text-white sm:text-5xl">Choose the plan that matches your operations</h1>
            <p className="text-base text-slate-300">
              Every tier is backed by the same enforcement engine inside T-REX AI OS. No hidden toggles, no surprise add-ons—just the features you need, clearly scoped by role and seat.
            </p>
          </div>
        </section>

        <section className="px-6 pb-20">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-4">
            {tiers.map((tier) => (
              <article key={tier.name} className="flex h-full flex-col rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-slate-900/20">
                <header className="mb-6 space-y-2">
                  {tier.badge ? (
                    <span className="inline-flex rounded-full bg-orange-500/20 px-3 py-1 text-xs font-semibold text-orange-300">
                      {tier.badge}
                    </span>
                  ) : null}
                  <h2 className="text-xl font-semibold text-white">{tier.name}</h2>
                  <p className="text-3xl font-bold text-orange-400">{tier.price}</p>
                  {tier.subtext ? <p className="text-sm text-slate-400">{tier.subtext}</p> : null}
                  <p className="text-sm font-medium text-slate-200">{tier.seats}</p>
                </header>

                <div className="space-y-3 text-sm text-slate-200">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Included</p>
                  <ul className="space-y-2">
                    {tier.included.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-orange-400">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {tier.notIncluded.length ? (
                  <div className="mt-6 space-y-3 text-sm text-slate-400">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-600">Not included</p>
                    <ul className="space-y-2">
                      {tier.notIncluded.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span>•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-auto pt-8">
                  <Link
                    href={tier.primaryCtaHref}
                    className={
                      tier.ctaVariant === 'primary'
                        ? 'block rounded-full bg-orange-500 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-orange-600'
                        : 'block rounded-full border border-slate-600 px-4 py-3 text-center text-sm font-semibold text-white hover:border-white'
                    }
                  >
                    {tier.primaryCtaLabel}
                  </Link>
                  {tier.secondaryCtaLabel && tier.secondaryCtaHref && (
                    <Link
                      href={tier.secondaryCtaHref}
                      className="mt-3 block rounded-full border border-slate-700 px-4 py-3 text-center text-sm font-medium text-slate-300 hover:border-slate-500 hover:text-white"
                    >
                      {tier.secondaryCtaLabel}
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="px-6 pb-20">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-200">
                <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Tier</th>
                    <th className="px-4 py-4">Price</th>
                    <th className="px-4 py-4">Seats</th>
                    <th className="px-4 py-4">CRM</th>
                    <th className="px-4 py-4">Estimating</th>
                    <th className="px-4 py-4">Compliance</th>
                    <th className="px-4 py-4">Dispatch</th>
                    <th className="px-4 py-4">Analytics</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.tier} className="border-t border-slate-800">
                      <td className="px-6 py-4 font-semibold text-white">{row.tier}</td>
                      <td className="px-4 py-4">{row.price}</td>
                      <td className="px-4 py-4">{row.seats}</td>
                      <td className="px-4 py-4">{row.crm}</td>
                      <td className="px-4 py-4">{row.estimating}</td>
                      <td className="px-4 py-4">{row.compliance}</td>
                      <td className="px-4 py-4">{row.dispatch}</td>
                      <td className="px-4 py-4">{row.analytics}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="px-6 pb-20">
          <div className="mx-auto max-w-4xl rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
            <h3 className="text-2xl font-semibold text-white">How plans are enforced</h3>
            <p className="mt-2 text-sm text-slate-400">Plain-language commitments so you know exactly what happens at each tier.</p>
            <ul className="mt-6 space-y-3 text-sm text-slate-200">
              {enforcementNotes.map((note) => (
                <li key={note} className="flex items-start gap-2">
                  <span className="text-orange-400">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="px-6 pb-24">
          <div className="mx-auto max-w-5xl rounded-3xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-transparent p-10 text-center">
            <h4 className="text-3xl font-semibold text-white">Ready to see T-REX AI OS in action?</h4>
            <p className="mt-3 text-base text-slate-200">Launch the Starter trial for instant CRM access or request a guided walkthrough for Growth, Pro, or Enterprise.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/signup" className="rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-600">
                Start free trial
              </Link>
              <Link href="/request-demo" className="rounded-full border border-slate-600 px-6 py-3 text-sm font-semibold text-white hover:border-white">
                Talk to sales
              </Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  )
}
