'use client'

import { useState, useActionState, useEffect, useRef } from 'react'
import { createContactAction, type ActionState } from '@/app/contacts/actions'
import { deriveCompanyNameFromEmail } from '@/lib/contacts/deriveCompany'

const initialState: ActionState = { success: false }

type Props = {
  triggerLabel?: string
  source?: string
  variant?: 'solid' | 'ghost'
  size?: 'md' | 'sm'
  defaultOpen?: boolean
  presentation?: 'sheet' | 'panel'
}

export function ContactCreateSheet({ triggerLabel = 'New contact', source = 'contacts:index', variant = 'solid', size = 'md', defaultOpen = false, presentation = 'sheet' }: Props) {
  const isPanel = presentation === 'panel'
  const [open, setOpen] = useState(isPanel ? true : defaultOpen)
  const [emailPreview, setEmailPreview] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, pending] = useActionState(createContactAction, initialState)

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset()
      setEmailPreview('')
      if (!isPanel) {
        setOpen(false)
      }
    }
  }, [state.success, isPanel])

  const derivedCompany = emailPreview ? deriveCompanyNameFromEmail(emailPreview) : 'Unknown organization'

  const handleCancel = () => {
    if (isPanel) {
      formRef.current?.reset()
      setEmailPreview('')
      return
    }
    setOpen(false)
  }

  const cardClasses = `rounded-3xl border border-slate-700 bg-slate-900/95 p-6 text-slate-100 shadow-2xl ${isPanel ? 'w-full' : 'w-full max-w-lg'}`

  const formCard = (
    <div className={cardClasses}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Create contact</p>
          <h3 className="text-2xl font-semibold">Universal intake</h3>
          <p className="text-sm text-slate-400">Email is mandatory. Owner defaults to you, company is derived from the domain.</p>
        </div>
        {!isPanel ? (
          <button onClick={() => setOpen(false)} className="rounded-full border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-slate-200">
            Esc
          </button>
        ) : null}
      </div>

      <form ref={formRef} action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="source" value={source} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-300">
            First name
            <input name="firstName" required className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm focus:border-emerald-400 focus:outline-none" />
          </label>
          <label className="text-sm text-slate-300">
            Last name
            <input name="lastName" required className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm focus:border-emerald-400 focus:outline-none" />
          </label>
        </div>
        <label className="text-sm text-slate-300">
          Email
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm focus:border-emerald-400 focus:outline-none"
            onChange={(event) => setEmailPreview(event.target.value)}
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-300">
            Phone
            <input name="phone" className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm focus:border-emerald-400 focus:outline-none" />
          </label>
          <label className="text-sm text-slate-300">
            Mobile
            <input name="mobile" className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm focus:border-emerald-400 focus:outline-none" />
          </label>
        </div>
        <label className="text-sm text-slate-300">
          Job title
          <input name="jobTitle" className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm focus:border-emerald-400 focus:outline-none" />
        </label>

        <div className="rounded-2xl border border-slate-700 bg-slate-950/40 p-4 text-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Derived company</p>
          <p className="text-lg font-semibold text-emerald-300">{derivedCompany}</p>
          <p className="text-xs text-slate-500">Auto-generated from the email domain. Override later from the detail page if needed.</p>
        </div>

        {state.message ? <p className="text-sm text-rose-400">{state.message}</p> : null}

        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={pending}
            className="rounded-2xl bg-emerald-400 px-6 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {pending ? 'Creating…' : 'Create contact'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="text-sm text-slate-400 hover:text-slate-200"
          >
            {isPanel ? 'Reset form' : 'Cancel'}
          </button>
        </div>
      </form>
    </div>
  )

  if (isPanel) {
    return formCard
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
          variant === 'solid'
            ? 'bg-slate-100 text-slate-900 hover:bg-white'
            : 'border border-slate-500 text-slate-100 hover:border-slate-200'
        } ${size === 'sm' ? 'text-xs px-3 py-1.5' : ''}`}
      >
        {triggerLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          {formCard}
        </div>
      ) : null}
    </>
  )
}
