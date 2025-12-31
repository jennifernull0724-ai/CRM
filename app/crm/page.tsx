import Link from 'next/link'

const WORKSPACE_LINKS = [
  { href: '/contacts', label: 'Contacts', helper: 'All company contacts visible to all roles.' },
  { href: '/crm/deals', label: 'Deals', helper: 'Table view scoped to deals you created.' },
  { href: '/crm/tasks', label: 'Tasks', helper: 'Due + overdue work from your pipeline.' },
]

const EXECUTION_RULES = [
  'You may only edit contacts and deals you own.',
  'Server actions enforce createdById / ownerId on every query.',
  'Analytics live outside CRM surfaces to prevent leakage.',
  'Never attempt to open a record you did not create.',
]

export default function CrmHomePage() {
  return (
    <div className="space-y-10 px-6 pb-12 pt-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">CRM Home</p>
        <h1 className="text-3xl font-semibold text-slate-900">Work your records only</h1>
        <p className="text-sm text-slate-600">
          This surface is isolation-first. No dashboards, no cross-company analytics — just the contacts, deals, and tasks you own.
        </p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Workspace shortcuts</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">Go straight to scoped grids</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {WORKSPACE_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition hover:bg-white">
              <p className="text-base font-semibold text-slate-900">{link.label}</p>
              <p className="text-sm text-slate-500">{link.helper}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Operating rules</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-900">Ownership parity</h2>
        <p className="mt-2 text-sm text-slate-600">View awareness is fine. Actions require ownership.</p>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-sm text-slate-700">
          {EXECUTION_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
