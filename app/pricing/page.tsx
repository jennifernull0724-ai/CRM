import Link from 'next/link'
import {
  PLAN_TIERS,
  FEATURE_LABELS,
  RESTRICTION_LABELS,
  getTotalSeats,
} from '@/lib/billing/planTiers'

export default function PricingPage() {
  const plans = [
    PLAN_TIERS.starter,
    PLAN_TIERS.growth,
    PLAN_TIERS.pro,
    PLAN_TIERS.enterprise,
  ]

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-white">
              T-REX AI OS
            </Link>
            <div className="flex gap-4">
              <Link
                href="/login"
                className="text-gray-300 hover:text-white px-4 py-2"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Start trial
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          Pricing with zero feature drift
        </h1>
        <p className="text-xl text-gray-400 mb-8">
          One canonical pricing table powers the product, checkout, and enforcement.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`bg-gray-800 rounded-lg border-2 p-8 ${
                plan.key === 'growth'
                  ? 'border-blue-500 relative'
                  : 'border-gray-700'
              }`}
            >
              {plan.key === 'growth' && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="text-3xl font-bold text-blue-400 mb-4">
                  {plan.priceLabel}
                </div>
                <div className="text-sm text-gray-400">
                  {(() => {
                    const totalSeats = getTotalSeats(plan.seatLimits)
                    return Number.isFinite(totalSeats)
                      ? `${totalSeats} total seats`
                      : 'Unlimited seats'
                  })()}
                </div>
              </div>

              <div className="mb-6">
                <div className="text-sm font-medium text-gray-300 mb-3">Features</div>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-400">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>{FEATURE_LABELS[feature]}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {plan.restrictions.length > 0 && (
                <div className="mb-6">
                  <div className="text-sm font-medium text-gray-300 mb-3">Restrictions</div>
                  <ul className="space-y-2">
                    {plan.restrictions.map((restriction) => (
                      <li key={restriction} className="flex items-start gap-2 text-sm text-gray-500">
                        <span className="mt-0.5">•</span>
                        <span>{RESTRICTION_LABELS[restriction]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-8">
                {plan.key === 'starter' ? (
                  <Link
                    href="/signup"
                    className="block w-full bg-gray-700 text-white py-3 px-4 rounded-lg text-center font-medium hover:bg-gray-600 transition-colors"
                  >
                    Start 14-day controlled access
                  </Link>
                ) : (
                  <Link
                    href={`/upgrade?plan=${plan.key}`}
                    className="block w-full bg-blue-600 text-white py-3 px-4 rounded-lg text-center font-medium hover:bg-blue-700 transition-colors"
                  >
                    Launch secure checkout
                  </Link>
                )}
              </div>

              <div className="mt-4 text-center">
                <div className="text-xs text-gray-500">
                  {plan.stripeEligible ? 'Stripe subscription • promo codes enabled' : 'No credit card required'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                What happens after the 14-day trial?
              </h3>
              <p className="text-gray-400">
                Your account becomes read-only. You can view your data but cannot make changes until you upgrade to a paid plan.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                Can I upgrade or downgrade anytime?
              </h3>
              <p className="text-gray-400">
                Yes. You can upgrade to a higher plan anytime. Downgrades take effect at the end of your billing period.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                What&apos;s included in compliance module?
              </h3>
              <p className="text-gray-400">
                Employee management, certification tracking, QR code verification, document storage, and audit-ready activity logs. Available on Pro and Enterprise plans only.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                Is there a setup fee?
              </h3>
              <p className="text-gray-400">
                No setup fees. Paid plans are annual subscriptions billed through Stripe Checkout with promotion codes enabled.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
