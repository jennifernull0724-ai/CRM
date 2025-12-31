import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { formatDistanceToNow } from 'date-fns'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { listContactsForCompany, type ContactListFilters } from '@/lib/contacts/listContacts'
import { ContactCreateSheet } from '@/components/contacts/contact-create-sheet'
import { BulkImportPanel } from '@/app/contacts/_components/bulk-import-panel'

const LAST_ACTIVITY_WINDOWS = [
  { value: '', label: 'Any activity' },
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '60', label: 'Last 60 days' },
]

type SearchParams = Record<string, string | string[] | undefined>

function toBoolean(param?: string | string[]) {
  if (Array.isArray(param)) return param[0] === 'true'
  return param === 'true'
}

function toStringValue(param?: string | string[]) {
  if (Array.isArray(param)) return param[0]
  return param ?? ''
}

function toNumberValue(param?: string | string[]) {
  const raw = toStringValue(param)
  if (!raw) return undefined
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : undefined
}

function buildFilters(searchParams: SearchParams): ContactListFilters {
  return {
    search: toStringValue(searchParams.search) || undefined,
    archived: searchParams.archived === 'true' ? true : false,
    hasOpenTasks: toBoolean(searchParams.hasOpenTasks),
    hasOverdueTasks: toBoolean(searchParams.hasOverdueTasks),
    hasCalls: toBoolean(searchParams.hasLoggedCalls),
    hasMeetings: toBoolean(searchParams.hasMeetings),
    lastActivityWindowDays: toNumberValue(searchParams.lastActivityDays) ?? null,
    sort: searchParams.sort === 'activity' ? 'activity' : 'attention',
    page: toNumberValue(searchParams.page) ?? 1,
    perPage: toNumberValue(searchParams.perPage) ?? 25,
  }
}

export default async function ContactsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.companyId) {
    redirect('/login?from=/contacts')
  }

  const filters = buildFilters(searchParams)
  const { contacts, pagination } = await listContactsForCompany(session.user.companyId, filters, {
    userId: session.user.id,
    role: session.user.role ?? 'user',
  })

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <section className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.5em] text-slate-500">Contacts</p>
              <h1 className="text-4xl font-semibold leading-tight text-slate-900">Company contacts</h1>
              <p className="text-sm text-slate-600">Shared contact list for the workspace. Filters and searches apply server-side.</p>
            </div>
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.5em] text-slate-500">Create</p>
              <ContactCreateSheet triggerLabel="New contact" source="contacts:index" variant="solid" />
              <p className="text-xs text-slate-600">Ownership defaults to creator; audit logging is enforced.</p>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[2fr,1fr]">
          <form className="rounded-lg border border-slate-200 bg-white p-5 text-sm" method="GET">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs uppercase tracking-wide text-slate-700">
                Search (name · email · company)
                <input
                  name="search"
                  defaultValue={toStringValue(searchParams.search)}
                  placeholder="ex: bridge, @rrco.com"
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
              <label className="text-xs uppercase tracking-wide text-slate-700">
                Last activity
                <select
                  name="lastActivityDays"
                  defaultValue={toStringValue(searchParams.lastActivityDays)}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {LAST_ACTIVITY_WINDOWS.map((window) => (
                    <option key={window.value} value={window.value}>
                      {window.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <ToggleChip defaultChecked={toBoolean(searchParams.hasOpenTasks)} name="hasOpenTasks" label="Has open tasks" />
              <ToggleChip defaultChecked={toBoolean(searchParams.hasOverdueTasks)} name="hasOverdueTasks" label="Has overdue tasks" />
              <ToggleChip defaultChecked={toBoolean(searchParams.hasLoggedCalls)} name="hasLoggedCalls" label="Has logged calls" />
              <ToggleChip defaultChecked={toBoolean(searchParams.hasMeetings)} name="hasMeetings" label="Has meetings" />
              <ToggleChip defaultChecked={toBoolean(searchParams.archived)} name="archived" label="Show archived" value="true" />
            </div>

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <label className="text-xs uppercase tracking-wide text-slate-700">
                Sort
                <select
                  name="sort"
                  defaultValue={toStringValue(searchParams.sort) || 'attention'}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="attention">Needs attention</option>
                  <option value="activity">Last activity</option>
                </select>
              </label>
              <div className="flex flex-col gap-2 text-xs text-slate-600 md:text-right">
                <p>
                  {pagination.total} contacts · page {pagination.page} of {pagination.pages}
                </p>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Apply filters
                  </button>
                  <Link
                    href="/contacts"
                    className="rounded-lg border border-slate-300 px-6 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                  >
                    Reset
                  </Link>
                </div>
              </div>
            </div>
          </form>

          <BulkImportPanel />
        </section>

        <section className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Owner</th>
                <th className="px-4 py-3 text-left">Last activity</th>
                <th className="px-4 py-3 text-left">Open tasks</th>
                <th className="px-4 py-3 text-left">Overdue</th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No contacts match the current filters.
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-slate-200 text-slate-700 hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">
                        <Link href={`/contacts/${contact.id}`} className="hover:underline">
                          {contact.firstName} {contact.lastName}
                        </Link>
                      </div>
                      <p className="text-xs text-slate-400">{contact.email}</p>
                      <p className="text-xs text-amber-300">{contact.attention.primaryReason}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-300">{contact.companyLabel}</td>
                    <td className="px-4 py-4 text-slate-300">{contact.owner?.name ?? 'Unassigned'}</td>
                    <td className="px-4 py-4 text-slate-300">
                      {contact.lastActivityAt ? formatDistanceToNow(new Date(contact.lastActivityAt), { addSuffix: true }) : 'Never'}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-100">
                        {contact.openTasksCount}
                        {contact.overdueTaskCount > 0 ? ` • ${contact.overdueTaskCount} overdue` : ''}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            contact.overdueTaskCount > 0
                              ? 'bg-rose-400 shadow-[0_0_12px_rgba(248,113,113,0.8)]'
                              : 'bg-slate-600'
                          }`}
                        />
                        <span className="text-xs text-slate-400">
                          {contact.overdueTaskCount > 0 ? 'Action required' : 'Clear'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}

function ToggleChip({ name, label, defaultChecked, value = 'true' }: { name: string; label: string; defaultChecked?: boolean; value?: string }) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-2 ${
        defaultChecked ? 'border-emerald-400 bg-emerald-400/10 text-emerald-200' : 'border-slate-600 bg-slate-900/50 text-slate-300'
      }`}
    >
      <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="h-4 w-4 rounded border border-slate-500 text-emerald-400 focus:ring-emerald-400" />
    </label>
  )
}
