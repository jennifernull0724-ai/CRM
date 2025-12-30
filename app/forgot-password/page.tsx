'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AuthorityPanel } from '@/components/auth/authority-panel'

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
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="w-full lg:w-2/5">
        <AuthorityPanel className="h-full" />
      </div>
      <section className="flex w-full flex-1 items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-[420px] space-y-8">
          <header className="space-y-3">
            <p className="text-xs uppercase tracking-[0.4em] text-[#6d768a]">Account recovery</p>
            <h1 className="text-3xl font-semibold text-[#050d1a]">Password reset</h1>
            <p className="text-sm text-[#4c566a]">
              Enter the email tied to your workspace. We send a signed, single-use link.
            </p>
          </header>
          <div className="rounded-sm border border-[#d7dbe2] bg-white p-6 shadow-[0_25px_60px_rgba(5,13,26,0.18)]">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="reset-email" className="text-sm font-semibold text-[#0b1220]">
                  Email address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full border border-[#c9ceda] bg-white px-4 py-3 text-sm text-[#0b1220] outline-none transition focus:border-[#0b1220] focus:ring-2 focus:ring-[#0b1220]"
                  placeholder="you@company.com"
                />
              </div>

              <button
                type="submit"
                disabled={!email || status === 'saving'}
                className="w-full rounded-sm bg-[#d5530d] py-3 text-sm font-semibold text-white transition hover:bg-[#b6440b] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status === 'saving' ? 'Sending link…' : 'Send reset link'}
              </button>
            </form>

            {message && (
              <p className={`mt-4 text-sm ${status === 'error' ? 'text-[#d5530d]' : 'text-[#0b1220]'}`}>
                {message}
              </p>
            )}
          </div>
          <div className="space-y-3">
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-sm border border-[#0b1220] px-4 py-3 text-sm font-semibold text-[#0b1220]"
            >
              Return to login
            </Link>
            <Link href="/" className="text-sm font-medium text-[#0b1220]/60">
              Back to home
            </Link>
          </div>
          <p className="text-xs text-[#4c566a]">Access is logged. Activity is audited.</p>
        </div>
      </section>
    </div>
  )
}
