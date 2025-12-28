'use client'

import { useState } from 'react'
import type { PlanKey } from '@/lib/billing/planTiers'

interface CheckoutButtonProps {
  planKey: Exclude<PlanKey, 'starter'>
}

export function CheckoutButton({ planKey }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const launchCheckout = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey }),
      })

      const payload = await response.json()

      if (!response.ok) {
        setError(payload.error || 'Unable to start checkout. Please try again.')
        setLoading(false)
        return
      }

      if (payload.url) {
        window.location.href = payload.url as string
        return
      }

      setError('Checkout URL missing. Contact support.')
    } catch (error) {
      console.error('Stripe checkout error', error)
      setError('Network error. Please retry.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={launchCheckout}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Redirecting...' : 'Secure Stripe Checkout'}
      </button>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  )
}
