import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import type { ContactCommandSnapshot } from '@/lib/dashboard/contactSnapshots'
import type { UntouchedContact } from '@/lib/analytics/contactAnalytics'

type Props = {
  variant: 'admin' | 'owner'
  data: ContactCommandSnapshot
}

type UntouchedWithDate = Omit<UntouchedContact, 'lastActivityAt'> & { lastActivityAt: Date | null }

const numberFormatter = new Intl.NumberFormat('en-US')
const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
})

function formatRelative(date: Date | null): string {
  if (!date) return 'No recorded activity'
  return formatDistanceToNow(date, { addSuffix: true })
}

export function ContactAnalyticsCommand({ variant, data }: Props) {
  const title = variant === 'owner' ? 'Owner Contact Health' : 'Admin Contact Health'
  const subtitle =
    variant === 'owner'
      ? 'Company-wide contact accountability sourced directly from the analytics APIs.'
      : 'Monitor contact load, activities, and communication from a single read-only board.'
  const untouched: UntouchedWithDate[] = data.untouched.map((entry) => ({
    ...entry,
    lastActivityAt: entry.lastActivityAt ? new Date(entry.lastActivityAt) : null,
  }))
  const overview = data.overview
  const activityByUser = data.activityByUser
  const taskPerformance = data.taskPerformance
  const emailActivity = data.emailActivity
  const attachments = data.attachments

  const overviewTiles = [
    { label: 'Total contacts', value: overview.totalContacts },
    { label: 'Active contacts', value: overview.activeContacts },
    { label: 'Archived contacts', value: overview.archivedContacts },
    { label: 'Contacts with open tasks', value: overview.contactsWithOpenTasks },
    { label: 'Contacts with overdue tasks', value: overview.contactsWithOverdueTasks },
    { label: 'Contacts touched · 7d', value: overview.contactsTouchedLast7Days },
    { label: 'Contacts touched · 30d', value: overview.contactsTouchedLast30Days },
    { label: 'Contacts with no activity', value: overview.contactsWithNoActivity },
    { label: 'Untouched · 30d window', value: untouched.length },
  ]

  const activityEmpty = activityByUser.length === 0
  const untouchedEmpty = untouched.length === 0

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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Contact health overview</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">Live metrics from analytics API</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {overviewTiles.map((tile) => (
            <div key={tile.label} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{tile.label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{numberFormatter.format(tile.value)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Activity by user</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">Ownership accountability</p>
          </div>
        </div>
        {activityEmpty ? (
          <p className="mt-6 text-sm text-slate-500">No owned contacts yet.</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-right">Contacts owned</th>
                  <th className="px-4 py-3 text-right">Touched · 7d</th>
                  <th className="px-4 py-3 text-right">Tasks completed</th>
                  <th className="px-4 py-3 text-right">Emails sent</th>
                  <th className="px-4 py-3 text-right">Calls logged</th>
                  <th className="px-4 py-3 text-right">Meetings logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activityByUser.map((row) => (
                  <tr key={row.userId} className="odd:bg-white even:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.userName}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{numberFormatter.format(row.contactsOwned)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{numberFormatter.format(row.contactsTouchedLast7Days)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{numberFormatter.format(row.tasksCompleted)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{numberFormatter.format(row.emailsSent)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{numberFormatter.format(row.callsLogged)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{numberFormatter.format(row.meetingsLogged)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Task performance</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">Follow-through metrics</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Open tasks</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{numberFormatter.format(taskPerformance.openTasks)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Overdue tasks</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{numberFormatter.format(taskPerformance.overdueTasks)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Completion rate</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{percentFormatter.format(taskPerformance.completionRate)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Avg completion time</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{taskPerformance.averageCompletionTimeHours.toFixed(1)}h</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Communication volume</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">Email accountability</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Emails sent</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{numberFormatter.format(emailActivity.emailsSent)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Emails received</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{numberFormatter.format(emailActivity.emailsReceived)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Emails with attachments</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{numberFormatter.format(emailActivity.emailsWithAttachments)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Inline images sent</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{numberFormatter.format(emailActivity.inlineImagesSent)}</p>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Attachment usage</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">Files & images sent</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total attachments</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{numberFormatter.format(attachments.totalAttachments)}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">PDFs</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{numberFormatter.format(attachments.pdfs)}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Images</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{numberFormatter.format(attachments.images)}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Other files</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{numberFormatter.format(attachments.otherFiles)}</p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Untouched contacts</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">30-day inactivity window</p>
          </div>
        </div>
        {untouchedEmpty ? (
          <p className="mt-6 text-sm text-slate-500">No contacts need attention.</p>
        ) : (
          <ul className="mt-6 divide-y divide-slate-100">
            {untouched.map((contact) => (
              <li key={contact.contactId} className="flex flex-col gap-2 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <Link className="text-base font-semibold text-slate-900" href={`/contacts/${contact.contactId}`}>
                    {contact.name}
                  </Link>
                  <p className="text-sm text-slate-500">{contact.company ?? 'No company on record'}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Owner: {contact.ownerName}</p>
                </div>
                <p className="text-sm text-slate-500">{formatRelative(contact.lastActivityAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
