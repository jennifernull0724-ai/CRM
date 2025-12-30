import Link from 'next/link'
import { redirect } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { getServerSession } from 'next-auth'
import type { WorkOrderDiscipline } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { loadDispatchBoard } from '@/lib/dispatch/workOrders'
import { listDispatchContactOptions } from '@/lib/dispatch/contacts'
import { createManualWorkOrderAction } from '@/app/dispatch/actions'

export const dynamic = 'force-dynamic'

const DISCIPLINE_LABELS: Record<WorkOrderDiscipline, string> = {
  CONSTRUCTION: 'Construction',
  RAILROAD: 'Railroad',
  ENVIRONMENTAL: 'Environmental',
}

export default async function DispatchWorkOrdersPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.companyId) {
    redirect('/login?from=/dispatch/work-orders')
  }

  const [orders, contactOptions] = await Promise.all([
    loadDispatchBoard(session.user.companyId),
    listDispatchContactOptions(session.user.companyId, 100),
  ])

  return (
    <div className="space-y-8 px-4 pb-12 pt-8 lg:px-10">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Dispatch execution</p>
        <h1 className="text-3xl font-bold text-slate-900">Work orders</h1>
        <p className="text-slate-600">Convert approved requests, open manual jobs, and drill directly into work order detail.</p>
      </header>

      <ManualWorkOrderForm contacts={contactOptions} />

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Company work orders</p>
            <p className="text-xs text-slate-500">Showing the 25 most recent orders across all statuses.</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">{orders.length} listed</span>
        </div>

        {orders.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">No work orders found. Convert a dispatch request or create one manually.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {orders.map((order) => (
              <article key={order.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/dispatch/work-orders/${order.id}`} className="text-sm font-semibold text-slate-900 hover:underline">
                      {order.title || 'Untitled work order'}
                    </Link>
                    <p className="text-xs text-slate-500">#{order.id}</p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700">{order.status}</span>
                    {order.dispatchPriority ? <p className="text-[11px] text-slate-500">Priority {order.dispatchPriority}</p> : null}
                  </div>
                </div>

                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Contact</dt>
                    <dd className="font-semibold text-slate-900">{order.contact.name}</dd>
                    <p className="text-xs text-slate-500">{order.contact.company ?? 'No company'}</p>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Assignments</dt>
                    <dd className="font-semibold text-slate-900">{order.assignments.length || 'Unassigned'}</dd>
                    <p className="text-xs text-slate-500">{order.assignments.length ? 'Active crew members' : 'Pending scheduling'}</p>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Compliance</dt>
                    <dd className={`font-semibold ${order.complianceBlocked ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {order.complianceBlocked ? 'Blocked' : 'Clear'}
                    </dd>
                    {order.complianceBlocked && order.blockReason ? <p className="text-xs text-rose-500">{order.blockReason}</p> : null}
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Last activity</dt>
                    <dd className="font-semibold text-slate-900">
                      {order.activities[0]?.createdAt ? formatDistanceToNow(new Date(order.activities[0].createdAt), { addSuffix: true }) : 'No activity yet'}
                    </dd>
                    <p className="text-xs text-slate-500">{order.activities[0]?.actorName ?? 'System event'}</p>
                  </div>
                </dl>

                <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Dispatch status</p>
                    <p className="font-semibold text-slate-900">{order.dispatchStatus ?? 'Not linked'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Assets assigned</p>
                    <p className="font-semibold text-slate-900">{order.assets.length}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <Link
                    href={`/dispatch/work-orders/${order.id}`}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:border-slate-400"
                  >
                    Open detail
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ManualWorkOrderForm({
  contacts,
}: {
  contacts: Array<{ id: string; name: string; email: string | null; company: string | null }>
}) {
  const hasContacts = contacts.length > 0

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Manual work order</p>
          <p className="text-xs text-slate-500">Use when dispatch needs to stand up a work order without an estimate.</p>
        </div>
      </div>

      {!hasContacts ? (
        <p className="mt-4 text-sm text-slate-500">Add a contact first before creating a manual work order.</p>
      ) : (
        <form action={createManualWorkOrderAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Contact
            <select name="contactId" required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="">Select a contact</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name} {contact.company ? `· ${contact.company}` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Discipline
            <select name="discipline" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              {Object.entries(DISCIPLINE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700 md:col-span-2">
            Work order title
            <input
              type="text"
              name="title"
              required
              maxLength={160}
              placeholder="Signal maintenance overnight"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Create manual work order
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
