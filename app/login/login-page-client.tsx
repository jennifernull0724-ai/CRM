'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { AuthorityPanel } from '@/components/auth/authority-panel'

export function LoginPageClient() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        router.push('/app')
      }
    } catch (submitError) {
      console.error('Login error', submitError)
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
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
            <p className="text-xs uppercase tracking-[0.4em] text-[#6d768a]">Secure Access</p>
            <h2 className="text-3xl font-semibold text-[#050d1a]">System sign-in</h2>
            <p className="text-sm text-[#4c566a]">Credentials are issued by your workspace administrators.</p>
          </header>
          <div className="rounded-sm border border-[#d7dbe2] bg-white p-6 shadow-[0_25px_60px_rgba(5,13,26,0.18)]">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-sm border border-[#d5530d] bg-[#2b0d04] px-4 py-3 text-sm text-white/90">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-[#0b1220]">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
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
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="w-full border border-[#c9ceda] bg-white px-4 py-3 text-sm text-[#0b1220] outline-none transition focus:border-[#0b1220] focus:ring-2 focus:ring-[#0b1220]"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <Link href="/forgot-password" className="font-semibold text-[#0b1220] underline">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-sm bg-[#d5530d] py-3 text-sm font-semibold text-white transition hover:bg-[#b6440b] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
          <div className="space-y-3">
            <Link
              href="/signup"
              className="inline-flex w-full items-center justify-center rounded-sm border border-[#0b1220] px-4 py-3 text-sm font-semibold text-[#0b1220]"
            >
              Create account
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
