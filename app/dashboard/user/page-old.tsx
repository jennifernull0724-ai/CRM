import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { resolveRoleDestination } from '@/lib/auth/roleDestinations'
import { normalizeRole } from '@/lib/analytics/contactAnalytics'
import { loadMyContactRadarSnapshot } from '@/lib/dashboard/contactSnapshots'
import { loadStandardSettings, mapStandardSettingsToSnapshot } from '@/lib/dashboard/standardSettings'
import { loadUserActivityTimeline, type UserActivityTimelineEntry } from '@/lib/dashboard/userOverview'
import { UserShell } from '@/components/shells/user-shell'
import { StandardSettingsQuickLinks } from '@/app/dashboard/_components/standard-settings-quick-links'

export default async function UserDashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login?from=/dashboard/user')
  }

  if (!session.user.companyId) {
    redirect('/signup')
  }

  const rawRole = (session.user.role as string | undefined) ?? 'user'
  if (rawRole.toLowerCase() !== 'user') {
    redirect(resolveRoleDestination(rawRole))
  }

  const normalizedRole = normalizeRole(rawRole)

  const [dashboard, analytics, standardSettingsRecord, contactRadar, timeline] = await Promise.all([
    loadUserDashboardData(session.user.id, session.user.companyId),
    loadUserPersonalAnalytics(session.user.id, session.user.companyId),
    loadStandardSettings(session.user.companyId),
    loadMyContactRadarSnapshot({ companyId: session.user.companyId, userId: session.user.id, role: normalizedRole }),
    loadUserActivityTimeline(session.user.id, session.user.companyId),
  ])

  const standardSettings = mapStandardSettingsToSnapshot(standardSettingsRecord)
  const timelineEvents: TimelineEvent[] = timeline.map((event) => ({
    ...event,
    createdAt: new Date(event.createdAt),
  }))
  const mentionEntries: MentionEntry[] = contactRadar.mentions.slice(0, 4).map((mention) => ({
    ...mention,
    createdAt: new Date(mention.createdAt),
  }))
  const inactiveContacts: InactiveContact[] = contactRadar.stale.slice(0, 4).map((contact) => ({
    ...contact,
    lastActivityAt: contact.lastActivityAt ? new Date(contact.lastActivityAt) : null,
  }))

  const draftEstimates = dashboard.estimates.filter((est) => est.status === 'DRAFT')
  const awaitingEstimates = dashboard.estimates.filter((est) => est.status === 'AWAITING_APPROVAL')
  const approvedEstimates = dashboard.estimates.filter((est) => est.status === 'APPROVED')
  const dispatchEstimates = dashboard.estimates.filter((est) => est.status === 'SENT_TO_DISPATCH')

  return (
    <UserShell companyLogoUrl={null} userName={session.user.name ?? session.user.email ?? undefined}>
      <div className="space-y-8 px-6 pb-12 pt-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">Your Dashboard</h1>
          <p className="text-sm text-slate-600">Personal execution workspace for your contacts and deals</p>
        </header>

        <StandardSettingsQuickLinks snapshot={standardSettings} role="user" />

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <ActivityTimelineCard events={timelineEvents} />
          <div className="space-y-6">
            <TaskPressureCard tasks={contactRadar.tasks} />
            <InactiveContactsCard contacts={inactiveContacts} count={contactRadar.summary.myContactsWithNoActivity} />
          </div>
        </section>

      <RecentMentionsCard mentions={mentionEntries} totalMentions={contactRadar.summary.myRecentMentions} />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricTile label="Active quotes" value={dashboard.metrics.activeQuotes} helper="Draft + awaiting approval" />
        <MetricTile label="Awaiting approval" value={dashboard.metrics.awaitingApproval} helper="Submitted, pending approver" />
        <MetricTile label="Sent to dispatch" value={dashboard.metrics.sentToDispatch} helper="Approved and queued" />
        <MetricTile label="Open work orders" value={dashboard.metrics.openWorkOrders} helper="Read-only execution status" />
      </section>

      <PersonalAnalyticsCard analytics={analytics} />

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Pipeline control</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">Estimates you own</p>
          </div>
          <Link className="text-sm font-semibold text-blue-600 hover:text-blue-700" href="/deals">
            Go to deals
          </Link>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          <EstimateColumn title="Draft" items={draftEstimates} empty="No drafts" />
          <EstimateColumn title="Awaiting approval" items={awaitingEstimates} empty="Nothing awaiting" />
          <EstimateColumn title="Approved" items={approvedEstimates} empty="No approvals yet" />
          <EstimateColumn title="Sent to dispatch" items={dispatchEstimates} empty="Nothing queued" />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Dispatch visibility</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">Read-only execution status</p>
          </div>
        </div>
        {dashboard.dispatchRecords.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No dispatch records for your estimates.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Estimate</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Work orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {dashboard.dispatchRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{record.id}</td>
                    <td className="px-4 py-3 text-slate-900">{record.estimateName ?? 'N/A'}</td>
                    <td className="px-4 py-3 text-slate-700">{record.status}</td>
                    <td className="px-4 py-3 text-slate-700">{record.workOrders.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Contacts</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">Owned contacts only</p>
          </div>
          <Link className="text-sm font-semibold text-blue-600 hover:text-blue-700" href="/contacts">
            Manage contacts
          </Link>
        </div>
        {dashboard.contacts.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">You have not created any contacts yet.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {dashboard.contacts.map((contact) => (
              <div key={contact.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <Link className="text-base font-semibold text-slate-900" href={`/contacts/${contact.id}`}>
                      {contact.name}
                    </Link>
                    <p className="text-sm text-slate-500">{contact.email || 'No email'}</p>
                  </div>
                  <p className="text-xs text-slate-500">{contact.lastActivityAt ? new Date(contact.lastActivityAt).toLocaleDateString() : 'No activity'}</p>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {contact.recentActivities.length === 0 ? (
                    <li className="text-slate-500">No activity yet.</li>
                  ) : (
                    contact.recentActivities.map((activity) => (
                      <li key={activity.id} className="flex items-center justify-between">
                        <span className="font-medium text-slate-800">{activity.type}</span>
                        <span className="text-xs text-slate-500">{new Date(activity.createdAt).toLocaleDateString()}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <MyContactDashboard variant="user" analytics={contactRadar} />
    </div>
  )
}

type TimelineEvent = Omit<UserActivityTimelineEntry, 'createdAt'> & { createdAt: Date }

type MentionEntry = {
  contactId: string
  contactName: string
  mentionedBy: string
  noteExcerpt: string
  createdAt: Date
}

type InactiveContact = {
  contactId: string
  name: string
  company: string | null
  lastActivityAt: Date | null
}

type PersonalAnalyticsProps = {
  analytics: Awaited<ReturnType<typeof loadUserPersonalAnalytics>>
}

type MetricTileProps = {
  label: string
  value: number
  helper: string
}

type EstimateColumnProps = {
  title: string
  items: UserDashboardData['estimates']
  empty: string
}

function PersonalAnalyticsCard({ analytics }: PersonalAnalyticsProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Personal analytics</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">Your approvals and conversion</p>
        </div>
        <div className="text-sm text-slate-500">Server-side · user-scoped</div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-6">
        <AnalyticsTile label="Deals created" value={analytics.dealsCreated} />
        <AnalyticsTile label="Estimates approved" value={analytics.estimatesApproved} />
        <AnalyticsTile label="Sent to dispatch" value={analytics.estimatesSentToDispatch} />
        <AnalyticsTile label="Conversion rate" value={`${analytics.conversionRate}%`} hint="Approved → Dispatch" />
        <AnalyticsTile label="Avg approval turnaround" value={`${formatHours(analytics.avgApprovalHours)}h`} hint="Submitted → Approved" />
        <AnalyticsTile label="Work orders from my dispatches" value={analytics.workOrdersFromMyDispatches} hint="Dispatch-attributed" />
      </div>
    </section>
  )
}

function AnalyticsTile({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{typeof value === 'number' ? formatNumber(value) : value}</p>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

function MetricTile({ label, value, helper }: MetricTileProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{formatNumber(value)}</p>
      <p className="text-sm text-slate-500">{helper}</p>
    </div>
  )
}

function EstimateColumn({ title, items, empty }: EstimateColumnProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <span className="text-xs text-slate-500">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">{item.dealName}</p>
              <p className="text-xs text-slate-500">{item.contactName}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{item.status}</span>
                {item.dispatchStatus ? <span className="font-semibold text-slate-700">Dispatch: {item.dispatchStatus}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ActivityTimelineCard({ events }: { events: TimelineEvent[] }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Today&apos;s activity timeline</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">Everything you touched today</p>
        </div>
        <span className="text-sm text-slate-500">Server loaders · read-only</span>
      </div>
      {events.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No activity recorded yet today.</p>
      ) : (
        <ul className="mt-6 divide-y divide-slate-100">
          {events.map((event) => (
            <li key={event.id} className="flex gap-4 py-4">
              <div className="w-16 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {timelineTimeFormatter.format(event.createdAt)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">{event.subject}</p>
                <p className="mt-1 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">{event.type}</span>
                  {event.contactId ? (
                    <>
                      {' '}
                      ·{' '}
                      <Link className="text-slate-700 underline decoration-dotted" href={`/contacts/${event.contactId}`}>
                        {event.contactName ?? 'Contact'}
                      </Link>
                    </>
                  ) : null}
                  {event.dealName ? <> · {event.dealName}</> : null}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function TaskPressureCard({ tasks }: { tasks: MyContactRadarSnapshot['tasks'] }) {
  const tiles = [
    { label: 'Due today', value: tasks.tasksDueToday },
    { label: 'Overdue', value: tasks.tasksOverdue },
    { label: 'Due this week', value: tasks.tasksDueThisWeek },
  ]

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Tasks due & overdue</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">Personal pressure check</p>
        </div>
        <span className="text-sm text-slate-500">{tasks.tasksOverdue} overdue</span>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{tile.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{tile.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function InactiveContactsCard({ count, contacts }: { count: number; contacts: InactiveContact[] }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Contacts with no activity</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">Stale in the last 14 days</p>
        </div>
        <span className="text-sm text-slate-500">{count} flagged</span>
      </div>
      {contacts.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No owned contacts are idle right now.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {contacts.map((contact) => (
            <li key={contact.contactId} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <Link className="text-sm font-semibold text-slate-900" href={`/contacts/${contact.contactId}`}>
                  {contact.name}
                </Link>
                <span className="text-xs text-slate-500">{formatRelativeTime(contact.lastActivityAt)}</span>
              </div>
              <p className="text-xs text-slate-500">{contact.company ?? 'No company recorded'}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function RecentMentionsCard({ mentions, totalMentions }: { mentions: MentionEntry[]; totalMentions: number }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Recent mentions</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">Accountability feed</p>
        </div>
        <span className="text-sm text-slate-500">{totalMentions} in the last 14 days</span>
      </div>
      {mentions.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No @mentions include you yet.</p>
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
  )
}

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const hoursFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
const timelineTimeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
const mentionTimestamp = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' })
const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
const RELATIVE_TIME_DIVISORS: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
  { unit: 'year', ms: 1000 * 60 * 60 * 24 * 365 },
  { unit: 'month', ms: 1000 * 60 * 60 * 24 * 30 },
  { unit: 'week', ms: 1000 * 60 * 60 * 24 * 7 },
  { unit: 'day', ms: 1000 * 60 * 60 * 24 },
  { unit: 'hour', ms: 1000 * 60 * 60 },
  { unit: 'minute', ms: 1000 * 60 },
]

function formatNumber(value: number): string {
  return numberFormatter.format(Math.max(0, value ?? 0))
}

function formatHours(value: number): string {
  return hoursFormatter.format(Math.max(0, value ?? 0))
}

function formatRelativeTime(date: Date | null): string {
  if (!date) {
    return 'No activity yet'
  }
  const diff = date.getTime() - Date.now()
  for (const bucket of RELATIVE_TIME_DIVISORS) {
    if (Math.abs(diff) >= bucket.ms || bucket.unit === 'minute') {
      return relativeFormatter.format(Math.round(diff / bucket.ms), bucket.unit)
    }
  }
  return 'Just now'
}
