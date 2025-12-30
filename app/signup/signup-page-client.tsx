'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AuthorityPanel } from '@/components/auth/authority-panel'

export function SignupPageClient() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create account')
        return
      }

      // Auto-login after signup
      const { signIn } = await import('next-auth/react')
      const signInResult = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (signInResult?.error) {
        setError('Account created but login failed. Please try logging in.')
        router.push('/login')
        return
      }

      // Redirect to app router which will send to correct dashboard
      router.push('/app')
    } catch (submitError) {
      console.error('Signup error', submitError)
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }))
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="w-full lg:w-2/5">
        <AuthorityPanel className="h-full" />
      </div>
      <section className="flex w-full flex-1 items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-[420px] space-y-8">
          <header className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-[#6d768a]">Provisioning</p>
            <h2 className="text-3xl font-semibold text-[#050d1a]">Authorized account creation</h2>
            <p className="text-xs text-[#4c566a]">14-day trial · No credit card required</p>
          </header>
          <div className="rounded-sm border border-[#d7dbe2] bg-white p-6 shadow-[0_25px_60px_rgba(5,13,26,0.18)]">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-sm border border-[#d5530d] bg-[#2b0d04] px-4 py-3 text-sm text-white/90">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-semibold text-[#0b1220]">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full border border-[#c9ceda] bg-white px-4 py-3 text-sm text-[#0b1220] outline-none transition focus:border-[#0b1220] focus:ring-2 focus:ring-[#0b1220]"
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-[#0b1220]">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full border border-[#c9ceda] bg-white px-4 py-3 text-sm text-[#0b1220] outline-none transition focus:border-[#0b1220] focus:ring-2 focus:ring-[#0b1220]"
                  placeholder="you@company.com"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-[#0b1220]">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  className="w-full border border-[#c9ceda] bg-white px-4 py-3 text-sm text-[#0b1220] outline-none transition focus:border-[#0b1220] focus:ring-2 focus:ring-[#0b1220]"
                  placeholder="••••••••"
                />
                <p className="text-xs text-[#4c566a]">Minimum 8 characters</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-semibold text-[#0b1220]">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full border border-[#c9ceda] bg-white px-4 py-3 text-sm text-[#0b1220] outline-none transition focus:border-[#0b1220] focus:ring-2 focus:ring-[#0b1220]"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-sm bg-[#d5530d] py-3 text-sm font-semibold text-white transition hover:bg-[#b6440b] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Creating account…' : 'Start 14-day trial'}
              </button>

              <p className="text-xs text-[#4c566a] text-center">
                By creating an account, you agree to our{' '}
                <Link href="/terms" className="font-semibold text-[#0b1220] underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="font-semibold text-[#0b1220] underline">
                  Privacy Policy
                </Link>
              </p>
            </form>
          </div>
          <div className="space-y-3">
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-sm border border-[#0b1220] px-4 py-3 text-sm font-semibold text-[#0b1220]"
            >
              Back to login
            </Link>
            <Link href="/" className="text-sm font-medium text-[#0b1220]/60">
              Return to home
            </Link>
          </div>
          <p className="text-xs text-[#4c566a]">Access is logged. Activity is audited.</p>
        </div>
      </section>
    </div>
  )
}
