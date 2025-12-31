'use client'

import { useState } from 'react'
import type { PlanKey } from '@/lib/billing/planTiers'

interface CheckoutButtonProps {
  planKey: Exclude<PlanKey, 'starter'>
  seatSelectable?: boolean
  defaultSeatCount?: number
  minSeatCount?: number
}

export function CheckoutButton({ planKey, seatSelectable = false, defaultSeatCount = 1, minSeatCount = 1 }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [seatCount, setSeatCount] = useState<number>(Math.max(minSeatCount, defaultSeatCount))

  const launchCheckout = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey, seatCount }),
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
      {seatSelectable && (
        <div className="mb-3">
          <label className="text-sm font-medium text-slate-200">
            Seat quantity (yearly)
            <input
              type="number"
              min={minSeatCount}
              value={seatCount}
              onChange={(e) => setSeatCount(Math.max(minSeatCount, Number(e.target.value) || minSeatCount))}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </label>
          <p className="mt-1 text-xs text-slate-400">Pro seats bill yearly. Additional seats: $250/seat/year.</p>
        </div>
      )}
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
