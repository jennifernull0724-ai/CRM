"use client"

import { FormEvent, useState } from 'react'
import Link from 'next/link'

const topics = [
  'Enterprise Rollout',
  'Pricing & Procurement',
  'Security & Compliance Review',
  'Integration Planning',
  'Other',
]

type FormState = 'idle' | 'submitting' | 'success' | 'error'

export default function ContactSalesPage() {
  const [formState, setFormState] = useState<FormState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormState('submitting')
    setErrorMessage(null)

    const formData = new FormData(event.currentTarget)
    const payload = {
      name: (formData.get('name') as string) || '',
      company: (formData.get('company') as string) || '',
      email: (formData.get('email') as string) || '',
      phone: (formData.get('phone') as string) || '',
      topic: (formData.get('topic') as string) || 'Enterprise Rollout',
      message: (formData.get('message') as string) || '',
    }

    try {
      const response = await fetch('/api/forms/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({ message: 'Unable to submit request.' }))
        throw new Error(data.message || 'Unable to submit request.')
      }

      event.currentTarget.reset()
      setFormState('success')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to submit request.')
      setFormState('error')
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <Link href="/pricing" className="text-sm text-orange-500 hover:text-orange-400">
          ← Back to pricing
        </Link>

        <header className="mt-6 space-y-4">
          <p className="text-xs uppercase tracking-[0.4em] text-orange-400">Sales</p>
          <h1 className="text-4xl font-bold">Contact Sales</h1>
          <p className="text-gray-400 max-w-2xl">
            Connect directly with the team that manages Growth, Pro, and Enterprise rollouts. We will review your
            requirements, security checkpoints, and procurement steps before scheduling deployment.
          </p>
        </header>

        <section className="mt-10 rounded-2xl border border-gray-800 bg-gray-900/60 p-8">
          {formState === 'success' && (
            <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200" role="status">
              Thank you. A member of the sales team will follow up shortly.
            </div>
          )}

          {formState === 'error' && errorMessage ? (
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200" role="alert">
              {errorMessage}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-2">
                  Company *
                </label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  required
                  className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                  Phone (optional)
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-gray-300 mb-2">
                Topic *
              </label>
              <select
                id="topic"
                name="topic"
                required
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                defaultValue="Enterprise Rollout"
              >
                {topics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                Message *
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                required
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-500 px-6 py-4 text-lg font-semibold text-gray-900 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={formState === 'submitting'}
            >
              {formState === 'submitting' ? 'Sending…' : 'Contact Sales'}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
