import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  PLAN_TIERS,
  FEATURE_LABELS,
  RESTRICTION_LABELS,
  formatSeatLimit,
  getTotalSeats,
  type PlanKey,
} from '@/lib/billing/planTiers'
import { CheckoutButton } from '@/components/checkout-button'

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: { plan?: PlanKey }
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?from=/upgrade')
  }

  const paidPlans: PlanKey[] = ['growth', 'pro', 'enterprise']
  const requestedPlan = searchParams.plan
  const selectedPlan = paidPlans.includes(requestedPlan as PlanKey) ? (requestedPlan as PlanKey) : 'growth'
  const plan = PLAN_TIERS[selectedPlan]

  const totalSeats = getTotalSeats(plan.seatLimits)
  const currentPlan = session.user.planKey
  const alreadyOnPlan = currentPlan === selectedPlan

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        <div>
          <Link href="/pricing" className="text-sm text-slate-400 hover:text-white">
            ← Back to pricing
          </Link>
          <h1 className="text-4xl font-bold mt-4">Upgrade your workspace</h1>
          <p className="text-slate-300 mt-2">
            Tiers, seat limits, and restrictions are enforced in middleware, API routes, and Stripe checkout.
            Promotion codes are always enabled for paid plans.
          </p>
        </div>

        <div className="flex gap-3 text-sm">
          {paidPlans.map((planKey) => (
            <Link
              key={planKey}
              href={`/upgrade?plan=${planKey}`}
              className={`px-4 py-2 rounded-full border transition-colors ${
                selectedPlan === planKey ? 'bg-blue-600 border-blue-500' : 'border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              {PLAN_TIERS[planKey].name}
            </Link>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 grid md:grid-cols-2 gap-8">
          <div>
            <p className="text-sm uppercase text-slate-400">Selected plan</p>
            <h2 className="text-3xl font-semibold mt-2">{plan.name}</h2>
            <p className="text-xl text-blue-300 mt-2">{plan.priceLabel}</p>
            <p className="text-sm text-slate-400 mt-4">
              {Number.isFinite(totalSeats) ? `${totalSeats} total seats` : 'Unlimited seats'} • owner {formatSeatLimit(plan.seatLimits.owner)} / admin {formatSeatLimit(plan.seatLimits.admin)} /
              estimator {formatSeatLimit(plan.seatLimits.estimator)}
            </p>
            <p className="text-sm text-slate-400">
              user {formatSeatLimit(plan.seatLimits.user)} / field {formatSeatLimit(plan.seatLimits.field)}
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-200 mb-2">Included features</p>
                <ul className="space-y-2 text-slate-300 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span>{FEATURE_LABELS[feature]}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {plan.restrictions.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-200 mb-2">Still restricted</p>
                  <ul className="space-y-2 text-slate-400 text-sm">
                    {plan.restrictions.map((restriction) => (
                      <li key={restriction} className="flex items-center gap-2">
                        <span>•</span>
                        <span>{RESTRICTION_LABELS[restriction]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
              <p className="text-sm font-semibold text-slate-200">Checkout</p>
              {alreadyOnPlan ? (
                <p className="text-sm text-emerald-400 mt-2">
                  You are already on this plan. Select a different tier to change seats or capabilities.
                </p>
              ) : (
                <>
                  <p className="text-sm text-slate-400 mt-2">
                    Stripe Checkout launches in a new tab with promotion codes enabled. Starter workspaces never hit Stripe.
                  </p>
                  <div className="mt-4">
                    <CheckoutButton planKey={selectedPlan} />
                  </div>
                </>
              )}
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-2 text-sm text-slate-300">
              <p className="font-semibold text-slate-100">Enforcement snapshot</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Middleware blocks restricted routes and expired starter writes.</li>
                <li>API routes validate seat counts, features, and read-only state.</li>
                <li>Paid upgrades clear starter expiry metadata on activation.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
