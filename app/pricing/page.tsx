import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingFooter } from '@/components/public/marketing-footer'
import { MarketingHeader } from '@/components/public/marketing-header'

export const metadata: Metadata = {
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
}

type Tier = {
  name: string
  badge?: string
  price: string
  subtext?: string
  export default function PricingPage() {
    return (
      <div className="min-h-screen bg-[#f5f6f9] text-[#0b1220]">
        <MarketingHeader />
        <main>
          <section className="bg-[#050d1a] px-4 py-16 text-white">
            <div className="mx-auto max-w-4xl text-center space-y-4">
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">Simple, Transparent Pricing</p>
              <h1 className="text-4xl font-semibold">Choose the plan that matches your operation.</h1>
              <p className="text-sm text-white/80">
                Every tier is backed by the same enforcement engine inside T-REX AI OS. Seats and features are enforced server-side.
              </p>
            </div>
          </section>

          <section className="bg-white px-4 py-16">
            <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-4">
              {tiers.map((tier) => (
                <article key={tier.name} className="flex h-full flex-col border border-[#c9ceda] p-6">
                  <header className="space-y-2">
                    {tier.badge ? (
                      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6d768a]">{tier.badge}</span>
                    ) : null}
                    <h2 className="text-xl font-semibold text-[#050d1a]">{tier.name}</h2>
                    <p className="text-3xl font-semibold text-[#d5530d]">{tier.price}</p>
                    {tier.subtext ? <p className="text-sm text-[#4c566a]">{tier.subtext}</p> : null}
                    <p className="text-sm font-medium text-[#0b1220]">{tier.seats}</p>
                  </header>

                  <div className="mt-6 space-y-2 text-sm text-[#0b1220]">
                    <p className="text-xs uppercase tracking-[0.3em] text-[#6d768a]">Included</p>
                    <ul className="space-y-2">
                      {tier.included.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="text-[#0a1528]">■</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {tier.notIncluded.length ? (
                    <div className="mt-6 space-y-2 text-sm text-[#4c566a]">
                      <p className="text-xs uppercase tracking-[0.3em] text-[#9ba2b3]">Not included</p>
                      <ul className="space-y-2">
                        {tier.notIncluded.map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <span>—</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="mt-auto pt-6">
                    <Link
                      href={tier.ctaHref}
                      className={tier.ctaVariant === 'primary'
                        ? 'block w-full rounded-md bg-[#d5530d] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#b5440b]'
                        : 'block w-full rounded-md border border-[#0b1220] px-4 py-3 text-center text-sm font-semibold text-[#0b1220] transition hover:bg-[#0b1220] hover:text-white'}
                    >
                      {tier.ctaLabel}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="bg-[#f0f2f6] px-4 py-16">
            <div className="mx-auto max-w-5xl space-y-6">
              <div className="hidden overflow-hidden border border-[#c9ceda] bg-white md:block">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-[#050d1a] text-xs uppercase tracking-[0.3em] text-white">
                      <tr>
                        <th className="px-6 py-4 font-medium">Tier</th>
                        <th className="px-4 py-4 font-medium">Price</th>
                        <th className="px-4 py-4 font-medium">Seats</th>
                        <th className="px-4 py-4 font-medium">CRM</th>
                        <th className="px-4 py-4 font-medium">Estimating</th>
                        <th className="px-4 py-4 font-medium">Compliance</th>
                        <th className="px-4 py-4 font-medium">Dispatch</th>
                        <th className="px-4 py-4 font-medium">Analytics</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonRows.map((row) => (
                        <tr key={row.tier} className="border-t border-[#d7dbe2] text-[#0b1220]">
                          <td className="px-6 py-4 font-semibold">{row.tier}</td>
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
              <div className="grid gap-4 md:hidden">
                {comparisonRows.map((row) => (
                  <article key={row.tier} className="space-y-3 border border-[#d7dbe2] bg-white p-4 text-sm">
                    <header>
                      <p className="text-xs uppercase tracking-[0.3em] text-[#6d768a]">{row.tier}</p>
                      <p className="text-lg font-semibold text-[#050d1a]">{row.price}</p>
                      <p className="text-xs text-[#4c566a]">Seats: {row.seats}</p>
                    </header>
                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-[#6d768a]">CRM</span>
                      <span>{row.crm}</span>
                      <span className="text-[#6d768a]">Estimating</span>
                      <span>{row.estimating}</span>
                      <span className="text-[#6d768a]">Compliance</span>
                      <span>{row.compliance}</span>
                      <span className="text-[#6d768a]">Dispatch</span>
                      <span>{row.dispatch}</span>
                      <span className="text-[#6d768a]">Analytics</span>
                      <span>{row.analytics}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-white px-4 py-16">
            <div className="mx-auto max-w-4xl space-y-4 border border-[#c9ceda] p-8">
              <h3 className="text-2xl font-semibold text-[#050d1a]">How plans are enforced</h3>
              <p className="text-sm text-[#4c566a]">Plain-language commitments so you know exactly what happens at each tier.</p>
              <ul className="space-y-3 text-sm text-[#0b1220]">
                {enforcementNotes.map((note) => (
                  <li key={note} className="flex items-start gap-2">
                    <span className="text-[#d5530d]">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="bg-[#050d1a] px-4 py-16 text-white">
            <div className="mx-auto max-w-5xl text-center space-y-4">
              <h4 className="text-3xl font-semibold">Need alignment before purchase?</h4>
              <p className="text-sm text-white/80">Launch the Starter trial for instant CRM access or talk with sales for Growth, Pro, or Enterprise.</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link href="/signup" className="rounded-md bg-[#d5530d] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#b5440b]">
                  Start Free Trial
                </Link>
                <Link href="/contact-sales" className="rounded-md border border-white/60 px-6 py-3 text-sm font-semibold text-white transition hover:border-white">
                  Contact Sales
                </Link>
              </div>
            </div>
          </section>
        </main>
        <MarketingFooter />
      </div>
    )
  }
  return (
    <main className="bg-slate-950 text-slate-100">
      <section className="px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <p className="text-xs uppercase tracking-[0.5em] text-emerald-300">Simple, Transparent Pricing</p>
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
                  <span className="inline-flex rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                    {tier.badge}
                  </span>
                ) : null}
                <h2 className="text-xl font-semibold text-white">{tier.name}</h2>
                <p className="text-3xl font-bold text-emerald-300">{tier.price}</p>
                {tier.subtext ? <p className="text-sm text-slate-400">{tier.subtext}</p> : null}
                <p className="text-sm font-medium text-slate-200">{tier.seats}</p>
              </header>

              <div className="space-y-3 text-sm text-slate-200">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Included</p>
                <ul className="space-y-2">
                  {tier.included.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-emerald-300">✓</span>
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
                  href={tier.ctaHref}
                  className={tier.ctaVariant === 'primary'
                    ? 'block rounded-full bg-emerald-400 px-4 py-3 text-center text-sm font-semibold text-slate-900 hover:bg-emerald-300'
                    : 'block rounded-full border border-slate-600 px-4 py-3 text-center text-sm font-semibold text-white hover:border-white'}
                >
                  {tier.ctaLabel}
                </Link>
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
                <span className="text-emerald-300">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-5xl rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-transparent p-10 text-center">
          <h4 className="text-3xl font-semibold text-white">Ready to see T-REX AI OS in action?</h4>
          <p className="mt-3 text-base text-slate-200">Launch the Starter trial for instant CRM access or request a guided walkthrough for Growth, Pro, or Enterprise.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/signup" className="rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-emerald-300">
              Start Free Trial
            </Link>
            <Link href="/request-demo" className="rounded-full border border-slate-600 px-6 py-3 text-sm font-semibold text-white hover:border-white">
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
