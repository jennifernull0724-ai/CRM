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
    <div className="min-h-screen bg-slate-50">
      {/* HubSpot-style Action Strip - Always Visible */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ActionButton label="Add Contact" href="/contacts/new" icon="plus" />
            <ActionButton label="Create Task" href={accessContactHref} icon="task" />
            <ActionButton label="Create Note" href={accessContactHref} icon="note" />
            <ActionButton label="Send Email" href={accessContactHref} icon="email" />
          </div>
          <div className="flex items-center gap-3">
            {trialEndsAt && (
              <span className="text-xs text-slate-500">Trial ends {dateFormatter.format(trialEndsAt)}</span>
            )}
            <Link 
              href="/upgrade"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Upgrade
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        {/* Personal Work Snapshot - HubSpot Productivity Dashboard */}
        <div className="grid gap-6 md:grid-cols-4">
          <MetricCard 
            label="Tasks due today" 
            value={data.tasks.todayCount} 
            color="blue"
            href="/crm/tasks"
          />
          <MetricCard 
            label="Overdue tasks" 
            value={data.tasks.overdueCount} 
            color={data.tasks.overdueCount > 0 ? "red" : "slate"}
            href="/crm/tasks"
          />
          <MetricCard 
            label="Emails sent (7d)" 
            value={data.emailsSent7d} 
            color="slate"
          />
          <MetricCard 
            label="Recent notes" 
            value={data.recentNotes.length} 
            color="slate"
            href={accessContactHref}
          />
        </div>

        {/* Recent Activity Feed */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Recent Activity</h2>
            <p className="text-sm text-slate-600">Your work from the last 7 days</p>
          </div>
          <ActivityFeed events={data.activity} />
        </div>

        {/* Locked Insights - Upgrade Preview */}
        <LockedInsightsGrid />
      </div>
    </div>
  )
}

function ActionButton({ label, href, icon }: { label: string; href: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300"
    >
      {icon === 'plus' && <span className="text-slate-500">+</span>}
      {icon === 'task' && <span className="text-slate-500">✓</span>}
      {icon === 'note' && <span className="text-slate-500">📝</span>}
      {icon === 'email' && <span className="text-slate-500">✉</span>}
      {label}
    </Link>
  )
}

function MetricCard({ label, value, color, href }: { label: string; value: number; color: 'blue' | 'red' | 'slate'; href?: string }) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    red: 'bg-red-50 border-red-200',
    slate: 'bg-slate-50 border-slate-200',
  }
  
  const textClasses = {
    blue: 'text-blue-900',
    red: 'text-red-900',
    slate: 'text-slate-900',
  }

  const content = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-600">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${textClasses[color]}`}>{value}</p>
    </>
  )

  if (href) {
    return (
      <Link href={href} className={`rounded-lg border p-4 hover:shadow-md transition ${colorClasses[color]}`}>
        {content}
      </Link>
    )
  }

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      {content}
    </div>
  )
}

function ActivityFeed({ events }: { events: TrialDashboardData['activity'] }) {
  if (events.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-sm text-slate-500">No activity yet</p>
        <p className="text-xs text-slate-400">Start by adding a contact</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-100">
      {events.slice(0, 10).map((event) => (
        <div key={event.id} className="px-6 py-4 hover:bg-slate-50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {event.type}
                </span>
                <p className="text-sm font-medium text-slate-900">{event.subject}</p>
              </div>
              {event.contactName && (
                <Link 
                  href={`/contacts/${event.contactId}`}
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  {event.contactName}
                </Link>
              )}
            </div>
            <time className="text-xs text-slate-500">
              {timeFormatter.format(new Date(event.createdAt))}
            </time>
          </div>
        </div>
      ))}
    </div>
  )
}

function LockedInsightsGrid() {
  const insights = [
    { title: 'Pipeline Analytics', description: 'Deal velocity, conversion rates, and forecasting' },
    { title: 'Team Performance', description: 'Activity metrics, leaderboards, and benchmarks' },
    { title: 'Export Reports', description: 'CSV exports, custom reports, and scheduled sends' },
    { title: 'Advanced Automation', description: 'Workflows, triggers, and integration rules' },
  ]

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-100 z-10 pointer-events-none" />
      <div className="grid gap-4 md:grid-cols-2 opacity-50 blur-sm">
        {insights.map((insight) => (
          <div key={insight.title} className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900">{insight.title}</h3>
            <p className="text-sm text-slate-600">{insight.description}</p>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <Link
          href="/upgrade"
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-700"
        >
          Unlock with Upgrade
        </Link>
      </div>
    </div>
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
        <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">No notes yet</p>
          <p className="text-slate-600">Log your first note on a contact.</p>
          <Link className="mt-2 inline-flex text-xs font-semibold text-blue-600 hover:text-blue-700" href="/contacts/new">
            Add contact
          </Link>
        </div>
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

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.max(0, value ?? 0))
}
