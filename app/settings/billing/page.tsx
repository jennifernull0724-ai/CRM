import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PLAN_TIERS, formatSeatLimit } from '@/lib/billing/planTiers'

export default async function SettingsBillingPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?from=/settings/billing')
  }

  const planKey = session.user.planKey
  const plan = PLAN_TIERS[planKey]

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <header>
          <p className="text-sm uppercase tracking-wide text-slate-500">Settings</p>
          <h1 className="text-3xl font-bold text-slate-900">Billing</h1>
          <p className="text-slate-600">
            Plan enforcement is live. Seat counts below must match `PLAN_TIERS`. Upgrades happen via `/upgrade` (Stripe Checkout
            with promotion codes enabled). Starter never touches Stripe.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <p className="text-sm uppercase tracking-wide text-slate-500">Current plan</p>
          <h2 className="text-2xl font-semibold text-slate-900">{plan.name}</h2>
          <p className="text-slate-600">{plan.priceLabel}</p>
          <p className="text-xs text-slate-500">
            Stripe customer + subscription IDs will appear here once the webhook writes them to the Company record.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <p className="text-sm font-semibold text-slate-500">Seat limits</p>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
            {Object.entries(plan.seatLimits).map(([role, limit]) => (
              <div key={role} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                <span className="capitalize">{role}</span>
                <span className="font-semibold text-slate-900">{formatSeatLimit(limit)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <p className="text-sm font-semibold text-slate-500">Actions</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/upgrade"
              className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
            >
              Upgrade / manage subscription
            </Link>
            <button
              type="button"
              className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
              disabled
            >
              Open Stripe customer portal
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Replace the disabled button with a real link once the customer portal endpoint exists. Keep promotion codes enabled
            for Growth/Pro/Enterprise tiers per system command.
          </p>
        </section>
      </div>
    </div>
  )
}
