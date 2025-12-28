'use client'

import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setStatus('saving')
    setMessage('')

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to start password reset flow')
      }

      setStatus('sent')
      setMessage('If the email exists, a reset link is on the way.')
    } catch (error) {
      console.error('Forgot password error', error)
      setStatus('error')
      setMessage('We could not send the reset email. Try again or contact support.')
    } finally {
      if (status !== 'sent') {
        setStatus('idle')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-gray-800 border border-gray-700 rounded-2xl p-8">
        <p className="text-sm uppercase tracking-wide text-gray-400">Account recovery</p>
        <h1 className="text-3xl font-bold text-white mt-2">Reset your password</h1>
        <p className="text-gray-400 text-sm mt-2">
          Enter the email tied to your workspace. We send a signed, single-use link—no demo shortcuts.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-gray-300">
            Email address
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@company.com"
            />
          </label>

          <button
            type="submit"
            disabled={!email || status === 'saving'}
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {status === 'saving' ? 'Sending link...' : 'Send reset link'}
          </button>
        </form>

        {message && (
          <p className={`mt-4 text-sm ${status === 'error' ? 'text-red-300' : 'text-green-300'}`}>{message}</p>
        )}
      </div>
    </div>
  )
}
