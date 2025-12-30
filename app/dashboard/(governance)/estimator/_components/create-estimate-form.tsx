import { createEstimateAction } from '@/app/dashboard/(governance)/estimator/actions'
import { RichTextInput } from '@/components/rich-text-input'
import type { ContactOption, DealOption } from '@/lib/estimating/dashboard'

const INDUSTRY_OPTIONS = [
  { value: 'rail', label: 'Rail' },
  { value: 'construction', label: 'Construction' },
  { value: 'environmental', label: 'Environmental' },
]

type Props = {
  contacts: ContactOption[]
  deals: DealOption[]
}

export function CreateEstimateForm({ contacts, deals }: Props) {
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Create estimate</p>
      <h2 className="mt-1 text-2xl font-semibold text-slate-900">Execution-ready pricing</h2>
      <p className="mt-2 text-sm text-slate-600">
        Every estimate starts with a contact, scope, and industry. Presets lock the pricing model so field crews can execute without
        surprises.
      </p>
      <form action={createEstimateAction} className="mt-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-600">
            Contact
            <select name="contactId" required defaultValue="" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="" disabled>
                Select contact
              </option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                  {contact.email ? ` · ${contact.email}` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Link deal (optional)
            <select name="dealId" defaultValue="" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="">No linked deal</option>
              {deals.map((deal) => (
                <option key={deal.id} value={deal.id}>
                  {deal.name} · {deal.stage}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-600">
            Project name
            <input name="projectName" required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-slate-600">
            Project location
            <input name="projectLocation" placeholder="City / facility / milepost" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
        </div>
        <label className="text-sm text-slate-600">
          Industry
          <select name="industry" required defaultValue="" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <option value="" disabled>
              Select industry
            </option>
            {INDUSTRY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <RichTextInput name="scopeOfWork" label="Scope of work" required placeholder="Detail crew tasks, sequence, and deliverables." />
        <RichTextInput name="assumptions" label="Assumptions" placeholder="Shift windows, access expectations, client responsibilities." />
        <RichTextInput name="exclusions" label="Exclusions" placeholder="Out-of-scope work, materials by others, permitting." />
        <button type="submit" className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white">
          Create estimate
        </button>
      </form>
    </section>
  )
}
