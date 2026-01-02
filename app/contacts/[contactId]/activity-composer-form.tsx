"use client"

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

const TYPES = ['NOTE_ADDED', 'TASK_CREATED', 'TASK_COMPLETED', 'EMAIL_SENT', 'CALL_LOGGED', 'MEETING_LOGGED', 'SOCIAL_LOGGED', 'CUSTOM_ACTIVITY_LOGGED']

export function ActivityComposerForm({ contactId }: { contactId: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const type = String(formData.get('type') || '')
    const subject = String(formData.get('subject') || '').trim()
    const description = String(formData.get('description') || '').trim()

    if (!type || !subject) {
      setError('Type and subject are required.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, type, subject, description: description || undefined }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Unable to create activity')
      }

      event.currentTarget.reset()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create activity')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit}>
      <label className="text-xs font-semibold text-slate-600">
        Type
        <select
          name="type"
          className="mt-1 h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          defaultValue={TYPES[0]}
        >
          {TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs font-semibold text-slate-600">
        Subject
        <input
          name="subject"
          className="mt-1 h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          required
        />
      </label>

      <label className="text-xs font-semibold text-slate-600">
        Description
        <textarea
          name="description"
          className="mt-1 min-h-[80px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
      </label>

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : 'Log activity'}
        </button>
      </div>
    </form>
  )
}
