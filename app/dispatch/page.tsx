import Link from 'next/link'
import { cookies, headers } from 'next/headers'
import { formatDistanceToNow } from 'date-fns'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import type { EstimateIndustry } from '@prisma/client'
import { acceptDispatchRequestAction, createWorkOrderFromDispatchAction } from '@/app/dispatch/actions'
import { authOptions } from '@/lib/auth'
import { StandardSettingsQuickLinks } from '@/app/dashboard/_components/standard-settings-quick-links'
import type { DispatchDashboardBundle } from '@/lib/dashboard/dispatch'
import type { DispatchDashboardData, DispatchQueueItem } from '@/lib/dispatch/dashboard'
import type { DispatchWorkOrder } from '@/lib/dispatch/workOrders'
import type { DispatchRoleMetrics } from '@/lib/dispatch/analytics'
import type { StandardSettingsSnapshot } from '@/lib/dashboard/standardSettings'
import { resolveRoleDestination } from '@/lib/auth/roleDestinations'

const DISPATCH_ROLES = ['dispatch', 'admin', 'owner']
const INDUSTRY_LABELS: Record<EstimateIndustry, string> = {
  RAIL: 'Railroad',
  CONSTRUCTION: 'Construction',
  ENVIRONMENTAL: 'Environmental',
}
const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export const dynamic = 'force-dynamic'

type DispatchDashboardResponse = DispatchDashboardBundle & {
  standardSettings: StandardSettingsSnapshot
}

export default async function DispatchDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?from=/dispatch')
  }

  if (!session.user.companyId) {
    redirect('/signup')
  }

  const role = session.user.role.toLowerCase()

  if (!DISPATCH_ROLES.includes(role)) {
    redirect(resolveRoleDestination(role))
  }

  const payload = await fetchDispatchDashboard()
  const { dashboard, orders, summary, roleMetrics, standardSettings } = payload
  const normalizedRole = role as 'dispatch' | 'admin' | 'owner'

  return (
    <div className="space-y-8 px-4 pb-12 pt-8 lg:px-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Dispatch execution</p>
        <h1 className="text-3xl font-bold text-slate-900">Operational intelligence</h1>
        <p className="text-slate-600">Read-only telemetry for queue health, work orders, overrides, and settings access. Mutations live in module detail views.</p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/dispatch/work-orders"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300"
        >
          Open work orders console
          <span aria-hidden>→</span>
        </Link>
      </div>

      <StandardSettingsQuickLinks snapshot={standardSettings} role={normalizedRole} />

      <DispatchRoleMetricsPanel metrics={roleMetrics} />

      <section className="space-y-6">
        <DispatchWidgetGrid widgets={dashboard.widgets} />
        <div className="grid gap-4 lg:grid-cols-2">
          <ClosedJobsCard closed={dashboard.widgets.closedJobs} />
          <ComplianceOverridesCard data={dashboard.widgets.complianceOverrides} />
        </div>
      </section>

      <DispatchQueueSection queue={dashboard.queue} />

      <WorkOrderDigest orders={orders} />

      <AssetSummarySection summary={summary} />
    </div>
  )
}

function DispatchRoleMetricsPanel({ metrics }: { metrics: DispatchRoleMetrics }) {
  const primaryTiles = [
    { label: 'Open work orders', value: metrics.openWorkOrders, helper: 'Scheduled + in progress' },
    { label: 'Pending dispatch requests', value: metrics.pendingDispatchRequests, helper: 'Queued intake items' },
  ]

  return (
    <div className="rounded-[32px] bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6 text-white shadow-xl ring-1 ring-white/10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-white/60">Dispatch analytics</p>
          <p className="text-2xl font-semibold">Role metrics snapshot</p>
          <p className="text-sm text-white/70">Server-side aggregates only. Financial totals and compliance scoring are intentionally excluded.</p>
        </div>
        <span className="rounded-full border border-white/30 px-4 py-1 text-xs font-semibold text-white/80">Server aggregated</span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {primaryTiles.map((tile) => (
          <AnalyticsMetricTile key={tile.label} label={tile.label} value={tile.value} helper={tile.helper} />
        ))}
        <RecentlyClosedTile last7={metrics.recentlyClosed.last7} last30={metrics.recentlyClosed.last30} />
      </div>
    </div>
  )
}

function AnalyticsMetricTile({
  label,
  value,
  helper,
}: {
  label: string
  value: number
  helper: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner">
      <p className="text-xs uppercase tracking-wide text-white/70">{label}</p>
      <p className="mt-3 text-4xl font-semibold text-white">{value}</p>
      <p className="text-xs text-white/60">{helper}</p>
    </div>
  )
}

function RecentlyClosedTile({ last7, last30 }: { last7: number; last30: number }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-wide text-white/70">Recently closed</p>
      <p className="text-sm text-white/60">Rolling completions</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <CompactMetricStat label="7 days" value={last7} />
        <CompactMetricStat label="30 days" value={last30} />
      </div>
    </div>
  )
}

function CompactMetricStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/10 p-3 text-center shadow-sm">
      <p className="text-[10px] uppercase tracking-[0.25em] text-white/60">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-white">{value}</p>
    </div>
  )
}

function StatTile({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{helper}</p>
    </div>
  )
}

function AssetSummarySection({ summary }: { summary: DispatchDashboardBundle['summary'] }) {
  const tiles = [
    { label: 'Total assets', value: summary.total, helper: 'Company scoped' },
    { label: 'In service', value: summary.inService, helper: 'Available now' },
    { label: 'Out of service', value: summary.outOfService, helper: 'Requires attention' },
    { label: 'Assigned to open jobs', value: summary.activelyAssigned, helper: 'Open / in progress' },
  ]

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Asset availability snapshot</p>
          <p className="text-xs text-slate-500">Server-derived counts only. Assignment happens in work order detail.</p>
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <StatTile key={tile.label} label={tile.label} value={tile.value} helper={tile.helper} />
        ))}
      </div>
    </section>
  )
}

function DispatchWidgetGrid({ widgets }: { widgets: DispatchDashboardData['widgets'] }) {
  const cards = [
    { label: 'New dispatch requests', value: widgets.newRequests, helper: 'Approved quotes waiting' },
    { label: 'Open work orders', value: widgets.openWorkOrders, helper: 'Draft + scheduled' },
    { label: 'Active jobs', value: widgets.activeJobs, helper: 'In progress' },
    { label: 'Compliance overrides', value: widgets.complianceOverrides.total, helper: 'All-time override acknowledgements' },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <StatTile key={card.label} label={card.label} value={card.value} helper={card.helper} />
      ))}
    </div>
  )
}

function ClosedJobsCard({ closed }: { closed: DispatchDashboardData['widgets']['closedJobs'] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Closed jobs trend</p>
          <p className="text-xs text-slate-500">Rolling lookback across 30/60/90 days.</p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Healthy</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">30 days</p>
          <p className="text-2xl font-semibold text-slate-900">{closed.last30}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">60 days</p>
          <p className="text-2xl font-semibold text-slate-900">{closed.last60}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">90 days</p>
          <p className="text-2xl font-semibold text-slate-900">{closed.last90}</p>
        </div>
      </div>
    </div>
  )
}

function ComplianceOverridesCard({ data }: { data: DispatchDashboardData['widgets']['complianceOverrides'] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Compliance overrides</p>
          <p className="text-xs text-slate-500">All-time override acknowledgements visible to compliance.</p>
        </div>
        <p className="text-3xl font-semibold text-slate-900">{data.total}</p>
      </div>
      {data.recent.length === 0 ? (
        <p className="mt-4 text-xs text-slate-500">No override acknowledgements logged in the last few days.</p>
      ) : (
        <ul className="mt-4 space-y-3 text-sm">
          {data.recent.map((entry) => (
            <li key={entry.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
              <p className="font-semibold text-slate-900">{entry.employeeName || 'Employee'}</p>
              <p className="text-xs text-slate-500">{entry.workOrderTitle}</p>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                {entry.overrideAt ? formatDistanceToNow(new Date(entry.overrideAt), { addSuffix: true }) : 'Recently'}
                {entry.reason ? ` · ${entry.reason}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function DispatchQueueSection({ queue }: { queue: DispatchQueueItem[] }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Dispatch intake queue</p>
          <p className="text-xs text-slate-500">Approved estimates waiting for assignment. Use the controls below to accept or convert.</p>
        </div>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">{queue.length} in queue</span>
      </div>

      {queue.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No approved quotes are waiting. New estimates appear here once compliance clears them.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {queue.map((item) => (
            <DispatchQueueCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  )
}

function DispatchQueueCard({ item }: { item: DispatchQueueItem }) {
  const queuedAt = new Date(item.queuedAt)

  return (
    <article className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Quote {item.quoteNumber}</p>
          <p className="text-xs text-slate-500">Revision {item.revisionNumber} · {item.projectName ?? 'Untitled project'}</p>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">{formatDistanceToNow(queuedAt, { addSuffix: true })}</p>
        </div>
        <div className="text-right text-xs">
          <p className="font-semibold text-slate-900">{formatIndustry(item.industry)}</p>
          <p className="text-slate-500">Priority {item.priority}</p>
        </div>
      </div>

      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Contact</dt>
          <dd className="font-semibold text-slate-900">
            <Link href={`/contacts/${item.contact.id}`} className="hover:underline">
              {item.contact.name}
            </Link>
          </dd>
          <p className="text-xs text-slate-500">{item.contact.company ?? 'No account on file'}</p>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Approved total</dt>
          <dd className="font-semibold text-slate-900">{formatCurrency(item.approvedTotal)}</dd>
          <p className="text-xs text-slate-500">Sent by {item.sentByName ?? 'Estimator'}</p>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Email</dt>
          <dd className="text-slate-900">{item.contact.email ?? 'Missing email'}</dd>
          <p className="text-xs text-slate-500">{item.sentByEmail ?? 'No estimator email'}</p>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Status</dt>
          <dd className="font-semibold text-slate-900">{item.hasWorkOrder ? 'Converted to work order' : 'Ready for dispatch'}</dd>
          <p className="text-xs text-slate-500">{item.status}</p>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        {item.status === 'QUEUED' ? (
          <form action={acceptDispatchRequestAction} className="w-full sm:w-auto">
            <input type="hidden" name="dispatchRequestId" value={item.id} />
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:border-slate-400"
            >
              Accept request
            </button>
          </form>
        ) : null}
        {!item.hasWorkOrder ? (
          <form action={createWorkOrderFromDispatchAction} className="w-full sm:w-auto">
            <input type="hidden" name="dispatchRequestId" value={item.id} />
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-800"
            >
              Convert to work order
            </button>
          </form>
        ) : (
          <p className="text-xs font-semibold text-emerald-700">Work order created</p>
        )}
      </div>
    </article>
  )
}

function WorkOrderDigest({ orders }: { orders: DispatchWorkOrder[] }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Active work orders</p>
          <p className="text-xs text-slate-500">Server-side list (≤25). All edits happen inside individual work orders.</p>
        </div>
        <span className="text-xs font-semibold text-slate-500">{orders.length} tracked</span>
      </div>
      {orders.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No work orders have been created yet.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((order) => {
            const latestActivityAt = order.activities[0]?.createdAt ? new Date(order.activities[0].createdAt) : null

            return (
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
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Compliance state</dt>
                    <dd className={`font-semibold ${order.complianceBlocked ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {order.complianceBlocked ? 'Blocked' : 'Clear'}
                    </dd>
                    {order.complianceBlocked && order.blockReason ? <p className="text-xs text-rose-500">{order.blockReason}</p> : null}
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Contact</dt>
                    <dd className="font-semibold text-slate-900">{order.contact.name}</dd>
                    <p className="text-xs text-slate-500">{order.contact.company ?? 'No company'}</p>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Assignments</dt>
                    {order.assignments.length === 0 ? (
                      <dd className="font-semibold text-slate-900">Unassigned</dd>
                    ) : (
                      <dd className="font-semibold text-slate-900">{order.assignments.map((assignment) => assignment.employeeName).join(', ')}</dd>
                    )}
                    <p className="text-xs text-slate-500">Overrides acknowledged in work order detail</p>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Last activity</dt>
                    <dd className="font-semibold text-slate-900">{latestActivityAt ? formatDistanceToNow(latestActivityAt, { addSuffix: true }) : 'No activity yet'}</dd>
                    <p className="text-xs text-slate-500">{order.activities[0]?.actorName ?? 'System event'}</p>
                  </div>
                </dl>
                <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Dispatch status</p>
                    <p className="font-semibold text-slate-900">{order.dispatchStatus ?? 'Not linked'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Assets attached</p>
                    <p className="font-semibold text-slate-900">{order.assets.length}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <Link
                    href={`/dispatch/work-orders/${order.id}`}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:border-slate-400"
                  >
                    Open work order
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function formatIndustry(industry: EstimateIndustry | null): string {
  if (!industry) {
    return 'General'
  }

  return INDUSTRY_LABELS[industry]
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value || 0)
}

async function fetchDispatchDashboard(): Promise<DispatchDashboardResponse> {
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host')
  const protocol = headerList.get('x-forwarded-proto') ?? 'http'

  if (!host) {
    throw new Error('Missing host header for dispatch dashboard request')
  }

  const cookieStore = await cookies()
  const serializedCookies = cookieStore.getAll().map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')
  const response = await fetch(`${protocol}://${host}/api/dashboard/dispatch`, {
    method: 'GET',
    headers: serializedCookies ? { Cookie: serializedCookies } : undefined,
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Unable to load dispatch dashboard analytics')
  }

  return response.json()
}
