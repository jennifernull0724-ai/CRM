import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { fetchContactAnalytics } from '@/lib/analytics/apiClient'
import type {
  MySummaryMetrics,
  MyTaskSnapshot,
  MyMentionEntry,
  MyStaleContact,
} from '@/lib/analytics/contactAnalytics'

const mentionTimestamp = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

type MentionResponse = Omit<MyMentionEntry, 'createdAt'> & { createdAt: string }
type StaleContactResponse = Omit<MyStaleContact, 'lastActivityAt'> & { lastActivityAt: string | null }

type Props = {
  variant: 'user' | 'estimator'
}

type DashboardData = {
  summary: MySummaryMetrics
  tasks: MyTaskSnapshot
  mentions: MyMentionEntry[]
  stale: MyStaleContact[]
}

async function loadDashboardData(): Promise<DashboardData> {
  const [summary, tasks, mentionResponse, staleResponse] = await Promise.all([
    fetchContactAnalytics<MySummaryMetrics>('/api/analytics/contacts/my-summary'),
    fetchContactAnalytics<MyTaskSnapshot>('/api/analytics/contacts/my-tasks'),
    fetchContactAnalytics<MentionResponse[]>('/api/analytics/contacts/my-mentions'),
    fetchContactAnalytics<StaleContactResponse[]>('/api/analytics/contacts/my-stale?days=14'),
  ])

  const mentions: MyMentionEntry[] = mentionResponse.map((mention) => ({
    ...mention,
    createdAt: new Date(mention.createdAt),
  }))

  const stale: MyStaleContact[] = staleResponse.map((contact) => ({
    ...contact,
    lastActivityAt: contact.lastActivityAt ? new Date(contact.lastActivityAt) : null,
  }))

  return { summary, tasks, mentions, stale }
}

function formatRelative(input: Date | null): string {
  if (!input) return 'No activity yet'
  return formatDistanceToNow(input, { addSuffix: true })
}

export async function MyContactDashboard({ variant }: Props) {
  let data: DashboardData | null = null
  let error: string | null = null

  try {
    data = await loadDashboardData()
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unable to load analytics'
  }

  const title = variant === 'estimator' ? 'Estimator Contact Radar' : 'My Contact Radar'
  const subtitle =
    variant === 'estimator'
      ? 'Every metric is scoped to the contacts you own. No pipeline guessing, no placeholders.'
      : 'Live task pressure, untouched contacts, and @mentions from the contacts you own.'

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
          <h1 className="text-xl font-semibold">Dashboard unavailable</h1>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const { summary, tasks, mentions, stale } = data
  const attentionIsClear =
    summary.myContactsWithNoActivity === 0 &&
    summary.myContactsWithOpenTasks === 0 &&
    summary.myOverdueTasks === 0 &&
    stale.length === 0

  const taskTiles = [
    { label: 'Tasks due today', value: tasks.tasksDueToday },
    { label: 'Tasks overdue', value: tasks.tasksOverdue },
    { label: 'Tasks due this week', value: tasks.tasksDueThisWeek },
  ]

  const attentionTiles = [
    { label: 'Contacts with no activity', value: summary.myContactsWithNoActivity },
    { label: 'Contacts with open tasks', value: summary.myContactsWithOpenTasks },
    { label: 'My overdue tasks', value: summary.myOverdueTasks },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8 space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Contact analytics</p>
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        <p className="text-slate-600">{subtitle}</p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Tasks snapshot</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">Today&apos;s workload</p>
          </div>
          <Link className="text-sm font-semibold text-blue-600 hover:text-blue-700" href="/contacts">
            View contacts
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {taskTiles.map((tile) => (
            <div key={tile.label} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{tile.label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{tile.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Contacts attention</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">Signals from owned contacts</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {attentionTiles.map((tile) => (
            <div key={tile.label} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{tile.label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{tile.value}</p>
            </div>
          ))}
        </div>
        {attentionIsClear ? (
          <p className="mt-4 text-sm text-slate-500">No contacts need attention.</p>
        ) : null}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Stale contacts</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">No-touch window · 14 days</p>
            </div>
          </div>
          {stale.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">No contacts need attention.</p>
          ) : (
            <ul className="mt-6 divide-y divide-slate-100">
              {stale.map((contact) => (
                <li key={contact.contactId} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link className="text-base font-semibold text-slate-900" href={`/contacts/${contact.contactId}`}>
                      {contact.name}
                    </Link>
                    <p className="text-sm text-slate-500">{contact.company ?? 'No company'}</p>
                  </div>
                  <p className="text-sm text-slate-500">{formatRelative(contact.lastActivityAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Mentions & accountability</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">Recent @mentions</p>
            </div>
            <span className="text-sm text-slate-500">{summary.myRecentMentions} in the last 14 days</span>
          </div>
          {mentions.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">No one has mentioned you yet.</p>
          ) : (
            <ul className="mt-6 space-y-4">
              {mentions.map((mention) => (
                <li key={`${mention.contactId}-${mention.createdAt.toISOString()}`} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <Link className="text-base font-semibold text-slate-900" href={`/contacts/${mention.contactId}`}>
                      {mention.contactName}
                    </Link>
                    <p className="text-xs text-slate-500">{mentionTimestamp.format(mention.createdAt)}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{mention.noteExcerpt || 'No excerpt available.'}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">Mentioned by {mention.mentionedBy}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
