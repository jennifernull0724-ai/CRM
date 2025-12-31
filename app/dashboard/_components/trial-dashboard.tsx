import Link from 'next/link'
import type { TrialDashboardData } from '@/lib/dashboard/trialDashboard'

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })
const timeFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' })

type TrialDashboardProps = {
  data: TrialDashboardData
  trialEndsAt: Date | null
}

export function TrialDashboard({ data, trialEndsAt }: TrialDashboardProps) {
  const accessContactHref = data.latestContact.id ? `/contacts/${data.latestContact.id}` : '/contacts'

  return (
    <div className="space-y-8 px-6 pb-12 pt-8">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Starter (Trial)</p>
          <h1 className="text-3xl font-bold text-slate-900">Build your CRM</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Everything starts with a contact. Add contacts, log tasks and notes, send emails, and create deals today. Upgrading keeps every record intact.
          </p>
          <p className="text-sm font-semibold text-slate-800">
            {trialEndsAt ? `Trial access ends ${dateFormatter.format(trialEndsAt)}` : 'Trial access active — no expiry set'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800" href="/upgrade">
            Upgrade — no data loss
          </Link>
        </div>
      </section>

      <PrimaryActionStrip accessContactHref={accessContactHref} />

      <QuickAccessSection accessContactHref={accessContactHref} data={data} />

      <PersonalSnapshot data={data} accessContactHref={accessContactHref} />

      <RecentActivity events={data.activity} />

      <LockedInsights />
    </div>
  )
}

function PrimaryActionStrip({ accessContactHref }: { accessContactHref: string }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] lg:grid-cols-[1fr_1fr_auto] items-center">
        <div className="flex flex-wrap gap-2">
          <ActionButton label="Add contact" href="/contacts/new" tone="primary" helper="Start every workflow" />
          <ActionButton label="Create task" href={accessContactHref} helper="Attach to a contact" />
          <ActionButton label="Create deal / estimate" href="/crm/deals/new" helper="Keep pipeline moving" />
        </div>
        <div className="flex justify-end">
          <ActionButton label="Upgrade to Pro (Yearly)" href="/upgrade" tone="ghost" helper="No data will be lost" />
        </div>
      </div>
    </section>
  )
}

function MetricCard({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{formatNumber(value)}</p>
      <p className="text-xs text-slate-600">{helper}</p>
    </div>
  )
}

function QuickAccessSection({ accessContactHref, data }: { accessContactHref: string; data: TrialDashboardData }) {
  const tiles = [
    { label: 'Contacts', count: data.quick.contacts, helper: 'Company-wide list', href: '/contacts', primary: true },
    { label: 'Latest contact', count: data.latestContact.name ? null : 0, helper: data.latestContact.name ?? 'None yet', href: accessContactHref },
    { label: 'Deals / Estimates', count: data.quick.deals, helper: 'Your pipeline', href: '/crm/deals' },
    { label: 'Tasks', count: data.quick.tasks, helper: 'Assigned to you', href: '/crm/tasks' },
    { label: 'Emails (7d)', count: data.quick.emails7d, helper: 'Outbound only', href: accessContactHref },
  ]

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">CRM quick access</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">Contact-first navigation</p>
          <p className="text-sm text-slate-600">Everything starts with a contact. Jump to your most recent and keep working.</p>
        </div>
        <Link className="text-sm font-semibold text-blue-600 hover:text-blue-700" href="/contacts">
          View all contacts
        </Link>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className={`rounded-2xl border ${tile.primary ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white'} p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
          >
            <div className="flex items-center justify-between">
              <p className={`text-sm font-semibold ${tile.primary ? 'text-white' : 'text-slate-900'}`}>{tile.label}</p>
              {tile.count !== null ? <span className={`text-xs font-mono ${tile.primary ? 'text-slate-200' : 'text-slate-700'}`}>{tile.count}</span> : null}
            </div>
            <p className={`text-sm ${tile.primary ? 'text-slate-100' : 'text-slate-700'}`}>{tile.helper}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}

function PersonalSnapshot({ data, accessContactHref }: { data: TrialDashboardData; accessContactHref: string }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Personal activity snapshot</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">Only your work, server-scoped</p>
        </div>
        <span className="text-xs text-slate-500">Server loaders · user scoped</span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <MetricCard label="Open tasks" value={data.tasks.open} helper="Assigned to you" />
        <MetricCard label="Overdue tasks" value={data.tasks.snapshot.tasksOverdue} helper="Past due" />
        <MetricCard label="Recent notes" value={data.recentNotes.length} helper="Latest saved" />
        <MetricCard label="Emails sent (7d)" value={data.quick.emails7d} helper="Outbound only" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <NotesTable notes={data.recentNotes} fallbackHref={accessContactHref} />
        <ActivityAside events={data.activity} />
      </div>
    </section>
  )
}

function NotesTable({ notes, fallbackHref }: { notes: TrialDashboardData['recentNotes']; fallbackHref: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">Recent notes</p>
        <Link className="text-xs font-semibold text-blue-600 hover:text-blue-700" href={fallbackHref}>
          Open contact workspace
        </Link>
      </div>
      {notes.length === 0 ? (
        <EmptyState label="No notes yet" actionLabel="Add contact" href="/contacts/new" helper="Log your first note on a contact." />
      ) : (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Excerpt</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {notes.map((note) => (
                <tr key={note.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {note.contactId ? (
                      <Link className="text-blue-700 hover:underline" href={`/contacts/${note.contactId}`}>
                        {note.contactName}
                      </Link>
                    ) : (
                      note.contactName
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{note.excerpt || 'No content'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{timeFormatter.format(note.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ActivityAside({ events }: { events: TrialDashboardData['activity'] }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">Today&apos;s activity</p>
        <span className="text-xs text-slate-500">Live, user-only</span>
      </div>
      {events.length === 0 ? (
        <EmptyState label="No activity yet" actionLabel="Add contact" href="/contacts/new" helper="Start with a contact, then log a note or task." />
      ) : (
        <ul className="mt-3 space-y-3">
          {events.map((event) => (
            <li key={event.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{event.subject}</p>
                <span className="text-xs text-slate-500">{timeFormatter.format(event.createdAt)}</span>
              </div>
              <p className="text-xs uppercase tracking-wide text-slate-500">{event.type}</p>
              {event.contactId ? (
                <Link className="text-xs text-blue-600 underline decoration-dotted" href={`/contacts/${event.contactId}`}>
                  {event.contactName ?? 'Contact'}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function RecentActivity({ events }: { events: TrialDashboardData['activity'] }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Recent activity</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">Notes, tasks, emails, contact touches</p>
        </div>
        <Link className="text-sm font-semibold text-blue-600 hover:text-blue-700" href="/activity">
          View all activity
        </Link>
      </div>
      {events.length === 0 ? (
        <EmptyState label="No activity yet" actionLabel="Add contact" href="/contacts/new" helper="Add a contact and start logging work." />
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">{event.type}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{event.subject}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {event.contactId ? (
                      <Link className="text-blue-700 hover:underline" href={`/contacts/${event.contactId}`}>
                        {event.contactName ?? 'Contact'}
                      </Link>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{timeFormatter.format(event.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function LockedInsights() {
  const items = [
    {
      title: 'Advanced analytics',
      body: 'Rollups across contacts, deals, and pipeline forecasting stay locked. Unlock in Growth/Pro.',
    },
    {
      title: 'Exports & automations',
      body: 'Data exports, bulk automations, and advanced filters are gated. All data persists when you upgrade.',
    },
    {
      title: 'Multi-user access',
      body: 'Invite teammates and split ownership with Pro. Trial remains single-seat but keeps everything you create.',
    },
  ]

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Locked insights</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">Upgrade to unlock analytics</p>
          <p className="text-sm text-slate-600">These are muted in trial. Upgrading keeps every record and setting.</p>
        </div>
        <Link className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800" href="/upgrade">
          Upgrade — keep all data
        </Link>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-base font-semibold text-slate-900">{item.title}</p>
            <p className="text-sm text-slate-700">{item.body}</p>
            <Link className="mt-3 inline-flex text-sm font-semibold text-slate-900 hover:text-slate-700" href="/upgrade">
              Unlock with Growth/Pro →
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}

function EmptyState({ label, helper, actionLabel, href }: { label: string; helper: string; actionLabel: string; href: string }) {
  return (
    <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-600">
      <p className="font-semibold text-slate-800">{label}</p>
      <p className="text-slate-600">{helper}</p>
      <Link className="mt-2 inline-flex text-xs font-semibold text-blue-600 hover:text-blue-700" href={href}>
        {actionLabel}
      </Link>
    </div>
  )
}

function ActionButton({ label, href, helper, tone = 'default' }: { label: string; href: string; helper: string; tone?: 'primary' | 'ghost' | 'default' }) {
  const styles = {
    primary: 'bg-slate-900 text-white shadow-sm hover:bg-slate-800',
    ghost: 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
    default: 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
  }

  return (
    <Link
      href={href}
      className={`flex flex-col rounded-2xl px-4 py-3 text-left transition ${styles[tone]}`}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xs text-slate-600">{helper}</span>
    </Link>
  )
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.max(0, value ?? 0))
}
