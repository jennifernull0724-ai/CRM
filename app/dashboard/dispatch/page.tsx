import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import type { AssetStatus, DispatchPresetScope, DispatchPreset, EstimateIndustry, WorkOrderStatus } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { loadDispatchDashboard, type DispatchDashboardData, type DispatchQueueItem } from '@/lib/dispatch/dashboard'
import { loadDispatchBoard, type DispatchAssignment, type DispatchWorkOrder, type DispatchWorkOrderActivity } from '@/lib/dispatch/workOrders'
import { getAssetDashboardSummary, listAssignableAssets } from '@/lib/assets/registry'
import { AssetAssignmentPanel } from '@/app/dashboard/dispatch/_components/asset-assignment-panel'
import { EmployeeAssignmentPanel } from '@/app/dashboard/dispatch/_components/employee-assignment-panel'
import {
  assignAssetToWorkOrderAction,
  removeAssetFromWorkOrderAction,
  addPresetToWorkOrderAction,
  removePresetFromWorkOrderAction,
  updateWorkOrderPresetNotesAction,
  acceptDispatchRequestAction,
  createWorkOrderFromDispatchAction,
  createManualWorkOrderAction,
  assignEmployeeToWorkOrderAction,
  removeEmployeeAssignmentAction,
} from '@/app/dashboard/dispatch/actions'
import { listDispatchPresets } from '@/lib/dispatch/presets'
import { listDispatchContactOptions, type DispatchContactOption } from '@/lib/dispatch/contacts'
import { ContactCreateSheet } from '@/components/contacts/contact-create-sheet'

const DISPATCH_ROLES = ['dispatch', 'admin', 'owner']
const INDUSTRY_LABELS: Record<EstimateIndustry, string> = {
  RAIL: 'Railroad',
  CONSTRUCTION: 'Construction',
  ENVIRONMENTAL: 'Environmental',
}
const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const COMPLIANCE_BADGES: Record<string, string> = {
  PASS: 'bg-emerald-100 text-emerald-700',
  INCOMPLETE: 'bg-amber-100 text-amber-700',
  FAIL: 'bg-rose-100 text-rose-700',
  EXPIRED: 'bg-rose-100 text-rose-700',
}
const DISCIPLINE_CHOICES = [
  { value: 'CONSTRUCTION', label: 'Construction' },
  { value: 'RAILROAD', label: 'Railroad' },
  { value: 'ENVIRONMENTAL', label: 'Environmental' },
]

export default async function DispatchDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?from=/dashboard/dispatch')
  }

  if (!session.user.companyId) {
    redirect('/signup')
  }

  const role = session.user.role.toLowerCase()

  if (!DISPATCH_ROLES.includes(role)) {
    redirect('/dashboard')
  }

  const [dashboard, orders, assignableAssets, summary, presetCatalog, contactOptions] = await Promise.all([
    loadDispatchDashboard(session.user.companyId),
    loadDispatchBoard(session.user.companyId),
    listAssignableAssets(session.user.companyId),
    getAssetDashboardSummary(session.user.companyId),
    listDispatchPresets(session.user.companyId),
    listDispatchContactOptions(session.user.companyId),
  ])

  const ACTIVE_WORKFLOW_STATUSES: WorkOrderStatus[] = ['SCHEDULED', 'IN_PROGRESS']
  const openOrders = orders.filter((order) => ACTIVE_WORKFLOW_STATUSES.includes(order.status))

  const assetOptions: AssetOption[] = assignableAssets.map((asset) => ({
    id: asset.id,
    assetName: asset.assetName,
    assetType: asset.assetType,
    subType: asset.subType,
    assetNumber: asset.assetNumber,
    status: asset.status,
    location: asset.location,
    activeAssignments: asset.activeAssignments,
  }))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Dispatch execution</p>
        <h1 className="text-3xl font-bold text-slate-900">Work order asset control</h1>
        <p className="text-slate-600">
          Assign equipment and vehicles without leaving dispatch. Assignments log instantly and appear on generated PDFs.
        </p>
      </header>

      <ManualWorkOrderForm contacts={contactOptions} />

      <section className="mt-8 space-y-5">
        <DispatchWidgetGrid widgets={dashboard.widgets} />
        <div className="grid gap-4 lg:grid-cols-2">
          <ClosedJobsCard closed={dashboard.widgets.closedJobs} />
          <ComplianceOverridesCard data={dashboard.widgets.complianceOverrides} />
        </div>
      </section>

      <DispatchQueueSection queue={dashboard.queue} />

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total assets" value={summary.total} helper="Company scoped" />
        <StatTile label="In service" value={summary.inService} helper="Available now" />
        <StatTile label="Out of service" value={summary.outOfService} helper="Visible with warning" />
        <StatTile label="Assigned to open jobs" value={summary.activelyAssigned} helper="Open / in progress" />
      </section>

      <section className="mt-8 space-y-6">
        {openOrders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
            No scheduled or in-progress work orders.
          </div>
        ) : (
          openOrders.map((order) => (
            <WorkOrderCard
              key={order.id}
              order={order}
              assetOptions={assetOptions}
              presetCatalog={presetCatalog}
              assignEmployeeAction={assignEmployeeToWorkOrderAction}
              removeEmployeeAssignmentAction={removeEmployeeAssignmentAction}
            />
          ))
        )}
      </section>
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

function DispatchWidgetGrid({ widgets }: { widgets: DispatchDashboardData['widgets'] }) {
  const cards = [
    { label: 'New dispatch requests', value: widgets.newRequests, helper: 'Approved quotes waiting' },
    { label: 'Open work orders', value: widgets.openWorkOrders, helper: 'Draft + scheduled' },
    { label: 'Active jobs', value: widgets.activeJobs, helper: 'In progress' },
    { label: 'Compliance overrides', value: widgets.complianceOverrides.total, helper: 'Acknowledged in 90 days' },
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
          <p className="text-xs text-slate-500">Acknowledged assignment overrides visible to compliance.</p>
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
                {entry.overrideAt ? formatDistanceToNow(entry.overrideAt, { addSuffix: true }) : 'Recently'}
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
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Dispatch intake queue</p>
          <p className="text-xs text-slate-500">Approved estimates waiting for assignment. Accept or create work orders.</p>
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
  return (
    <article className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Quote {item.quoteNumber}</p>
          <p className="text-xs text-slate-500">Revision {item.revisionNumber} · {item.projectName ?? 'Untitled project'}</p>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">
            {formatDistanceToNow(item.queuedAt, { addSuffix: true })}
          </p>
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

      <div className="mt-4 flex flex-wrap gap-3">
        <form action={acceptDispatchRequestAction} className="flex-1 min-w-[200px]">
          <input type="hidden" name="dispatchRequestId" value={item.id} />
          <button
            type="submit"
            disabled={item.hasWorkOrder}
            className="w-full rounded-xl border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          >
            Accept request
          </button>
        </form>
        <form action={createWorkOrderFromDispatchAction} className="flex-1 min-w-[200px]">
          <input type="hidden" name="dispatchRequestId" value={item.id} />
          <button
            type="submit"
            disabled={item.hasWorkOrder}
            className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Create work order
          </button>
        </form>
      </div>
    </article>
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

type AssetOption = {
  id: string
  assetName: string
  assetType: string
  subType: string | null
  assetNumber: string
  status: AssetStatus
  location: string | null
  activeAssignments: number
}

type WorkOrderCardProps = {
  order: DispatchWorkOrder
  assetOptions: AssetOption[]
  presetCatalog: DispatchPreset[]
  assignEmployeeAction: (formData: FormData) => Promise<void>
  removeEmployeeAssignmentAction: (formData: FormData) => Promise<void>
}

function WorkOrderCard({ order, assetOptions, presetCatalog, assignEmployeeAction, removeEmployeeAssignmentAction }: WorkOrderCardProps) {
  const activeAssets = order.assets.filter((asset) => !asset.removedAt)
  const removedAssets = order.assets.filter((asset) => asset.removedAt)
  const isLocked = order.status === 'COMPLETED' || order.status === 'CANCELLED'
  const availablePresetOptions = presetCatalog.filter((preset) => (preset.enabled || preset.isOther) && !order.presets.some((entry) => entry.presetId === preset.id))

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-slate-900">{order.title}</p>
          <p className="text-sm text-slate-500">{order.contact.name} · {order.contact.email}</p>
          <p className="text-xs text-slate-500">
            Created {formatDistanceToNow(order.createdAt, { addSuffix: true })} · Status {formatWorkOrderStatus(order.status)}
          </p>
          {order.blockReason ? (
            <p className="text-xs font-semibold text-rose-600">Blocked: {order.blockReason}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href={`/api/work-orders/${order.id}/pdf`}
            target="_blank"
            className="rounded-full bg-slate-900 px-4 py-2 font-semibold text-white"
          >
            Download work order PDF
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <EmployeeAssignmentPanel
            workOrderId={order.id}
            disabled={isLocked}
            assignEmployeeAction={assignEmployeeAction}
          />

          <AssetAssignmentPanel
            workOrderId={order.id}
            disabled={isLocked}
            assets={assetOptions}
            assignAssetAction={assignAssetToWorkOrderAction}
          />

          <AuthorizedScopePanel
            order={order}
            disabled={isLocked}
            availablePresets={availablePresetOptions}
          />
        </div>

        <div className="space-y-4">
          <CrewAssignmentSummary
            assignments={order.assignments}
            isLocked={isLocked}
            removeAssignmentAction={removeEmployeeAssignmentAction}
          />

          <div className="rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Assets assigned</p>
              {isLocked ? (
                <span className="text-xs font-semibold text-slate-500">Read-only · locked</span>
              ) : null}
            </div>
            {activeAssets.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">No assets assigned.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {activeAssets.map((asset) => (
                  <li key={asset.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{asset.assetName}</p>
                        <p className="text-xs text-slate-500">{asset.assetType} · Asset {asset.assetNumber}</p>
                        <p className="text-xs text-slate-500">Status at assignment · {asset.statusAtAssignment}</p>
                      </div>
                      <form action={removeAssetFromWorkOrderAction}>
                        <input type="hidden" name="assignmentId" value={asset.id} />
                        <button
                          type="submit"
                          disabled={isLocked}
                          className="rounded-lg bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                        >
                          Remove
                        </button>
                      </form>
                    </div>
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
                      Assigned {formatDistanceToNow(asset.assignedAt, { addSuffix: true })}
                      {asset.assignedByName ? ` · by ${asset.assignedByName}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {removedAssets.length ? (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Removed assets</p>
                <ul className="mt-2 space-y-2 text-xs text-slate-500">
                  {removedAssets.map((asset) => (
                    <li key={asset.id}>
                      {asset.assetName} (Asset {asset.assetNumber}) · removed {asset.removedAt ? formatDistanceToNow(asset.removedAt, { addSuffix: true }) : 'earlier'}
                      {asset.removedByName ? ` by ${asset.removedByName}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-100 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">Activity timeline</p>
          <span className="text-xs uppercase tracking-wide text-slate-400">Immutable record</span>
        </div>
        <ActivityTimeline activities={order.activities} />
      </div>
    </article>
  )
}

function CrewAssignmentSummary({
  assignments,
  isLocked,
  removeAssignmentAction,
}: {
  assignments: DispatchAssignment[]
  isLocked: boolean
  removeAssignmentAction: (formData: FormData) => Promise<void>
}) {
  return (
    <div className="rounded-2xl border border-slate-100 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">Assigned crew</p>
        {isLocked ? <span className="text-xs font-semibold text-slate-500">Read-only · locked</span> : null}
      </div>
      {assignments.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">No employees assigned to this work order yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {assignments.map((assignment) => {
            const gapSummary = assignment.gapSummary ?? { missing: [], expiring: [] }
            const missing = gapSummary.missing ?? []
            const expiring = gapSummary.expiring ?? []
            const badgeClass = COMPLIANCE_BADGES[assignment.complianceStatus ?? ''] ?? 'bg-slate-200 text-slate-800'

            return (
              <li key={assignment.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{assignment.employeeName}</p>
                    <p className="text-xs text-slate-500">{assignment.employeeRole} · {assignment.employeeTitle || 'Role not set'}</p>
                    <p className="text-xs text-slate-500">{assignment.employeeEmail ?? 'No email on file'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-right">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${badgeClass}`}>
                      {assignment.complianceStatus ?? 'UNSET'}
                    </span>
                    {assignment.overrideAcknowledged ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                        Override
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
                  Assigned {formatDistanceToNow(assignment.assignedAt, { addSuffix: true })}
                  {assignment.assignedByName ? ` · by ${assignment.assignedByName}` : ''}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-slate-500">
                  <span>Missing {missing.length}</span>
                  <span>Expiring {expiring.length}</span>
                </div>
                {assignment.overrideAcknowledged && assignment.overrideReason ? (
                  <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                    Override reason: {assignment.overrideReason}
                  </p>
                ) : null}
                {assignment.overrideAcknowledged && missing.length ? (
                  <div className="mt-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-600">Missing certifications</p>
                    <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
                      {missing.map((gap) => (
                        <li key={gap.id}>{gap.label}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {!isLocked ? (
                  <form action={removeAssignmentAction} className="mt-3">
                    <input type="hidden" name="assignmentId" value={assignment.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-500"
                    >
                      Remove
                    </button>
                  </form>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ManualWorkOrderForm({ contacts }: { contacts: DispatchContactOption[] }) {
  const hasContacts = contacts.length > 0

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Manual work order intake</p>
          <p className="text-xs text-slate-500">Create execution-only work orders. Contact link is mandatory and immutable.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/work-orders/export"
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-500"
          >
            Crew export (CSV)
          </a>
          <ContactCreateSheet triggerLabel="New contact" source="dispatch:manual-work-order" variant="ghost" size="sm" />
        </div>
      </div>

      <form action={createManualWorkOrderAction} className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 md:col-span-2">
          Contact
          <select
            name="contactId"
            required
            disabled={!hasContacts}
            defaultValue=""
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-800 focus:border-slate-900 focus:outline-none disabled:bg-slate-100"
          >
            <option value="" disabled>
              {hasContacts ? 'Select contact' : 'Create a contact first'}
            </option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name} {contact.company ? `· ${contact.company}` : ''} {contact.email ? `(${contact.email})` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Discipline
          <select
            name="discipline"
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-800 focus:border-slate-900 focus:outline-none"
            defaultValue="CONSTRUCTION"
          >
            {DISCIPLINE_CHOICES.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 md:col-span-3">
          Work order title
          <input
            name="title"
            required
            placeholder="Scope summary"
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-800 focus:border-slate-900 focus:outline-none"
          />
        </label>

        <div className="md:col-span-3 flex flex-col gap-2 text-xs text-slate-500">
          <p>Dispatch can only select saved contacts. Inline creation enforces Name + Email / Phone.</p>
          <button
            type="submit"
            disabled={!hasContacts}
            className="w-full rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 md:w-auto"
          >
            Create work order
          </button>
        </div>
      </form>
    </section>
  )
}

const SCOPE_LABELS: Record<DispatchPresetScope, string> = {
  BASE: 'Base',
  CONSTRUCTION: 'Construction',
  RAILROAD: 'Railroad',
  ENVIRONMENTAL: 'Environmental',
}

const SCOPE_SEQUENCE: DispatchPresetScope[] = ['BASE', 'CONSTRUCTION', 'RAILROAD', 'ENVIRONMENTAL']

function AuthorizedScopePanel({
  order,
  disabled,
  availablePresets,
}: {
  order: DispatchWorkOrder
  disabled: boolean
  availablePresets: DispatchPreset[]
}) {
  const groupedOptions = availablePresets.reduce<Record<DispatchPresetScope, DispatchPreset[]>>((acc, preset) => {
    if (!acc[preset.scope]) {
      acc[preset.scope] = []
    }
    acc[preset.scope].push(preset)
    return acc
  }, {
    BASE: [],
    CONSTRUCTION: [],
    RAILROAD: [],
    ENVIRONMENTAL: [],
  } as Record<DispatchPresetScope, DispatchPreset[]>)

  return (
    <div className="rounded-2xl border border-slate-100 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">Authorized Scope &amp; Execution Items</p>
        {disabled ? <span className="text-xs font-semibold text-slate-500">Read-only · locked</span> : null}
      </div>

      {order.presets.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">No presets attached. Attach at least the base scope items to authorize execution.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {order.presets.map((preset) => (
            <li key={preset.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <input type="checkbox" checked readOnly className="h-4 w-4 rounded border-slate-300 text-slate-900" />
                  {preset.name}
                  <span className="text-xs font-medium text-slate-500">{SCOPE_LABELS[preset.scope]}</span>
                  {preset.locked ? <span className="text-[10px] uppercase tracking-wide text-amber-600">Locked</span> : null}
                  {!preset.enabled ? <span className="text-[10px] uppercase tracking-wide text-rose-600">Catalog disabled</span> : null}
                </label>
                <form action={removePresetFromWorkOrderAction}>
                  <input type="hidden" name="workOrderPresetId" value={preset.id} />
                  <button
                    type="submit"
                    disabled={disabled}
                    className="rounded-lg bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                  >
                    Remove
                  </button>
                </form>
              </div>
              <form action={updateWorkOrderPresetNotesAction} className="mt-3 space-y-2">
                <input type="hidden" name="workOrderPresetId" value={preset.id} />
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor={`preset-notes-${preset.id}`}>
                  Notes
                </label>
                <textarea
                  id={`preset-notes-${preset.id}`}
                  name="notes"
                  defaultValue={preset.overriddenNotes ?? preset.defaultNotes ?? ''}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 shadow-sm focus:border-slate-900 focus:outline-none"
                  rows={3}
                  disabled={disabled}
                />
                <button
                  type="submit"
                  disabled={disabled}
                  className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Save notes
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-slate-100 pt-3">
        <form action={addPresetToWorkOrderAction} className="space-y-2">
          <input type="hidden" name="workOrderId" value={order.id} />
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor={`preset-select-${order.id}`}>
            Add preset
          </label>
          <select
            id={`preset-select-${order.id}`}
            name="presetId"
            defaultValue=""
            disabled={disabled || availablePresets.length === 0}
            className="w-full rounded-xl border border-slate-200 bg-white p-2 text-sm text-slate-800 focus:border-slate-900 focus:outline-none"
          >
            <option value="" disabled>
              Select preset
            </option>
            {SCOPE_SEQUENCE.map((scope) =>
              groupedOptions[scope].length ? (
                <optgroup key={scope} label={SCOPE_LABELS[scope]}>
                  {groupedOptions[scope].map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </optgroup>
              ) : null
            )}
          </select>
          <button
            type="submit"
            disabled={disabled || availablePresets.length === 0}
            className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Attach preset
          </button>
          {availablePresets.length === 0 ? (
            <p className="text-xs text-slate-500">All enabled presets are already attached.</p>
          ) : null}
        </form>
      </div>
    </div>
  )
}

function formatWorkOrderStatus(status: WorkOrderStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'Draft'
    case 'SCHEDULED':
      return 'Scheduled'
    case 'IN_PROGRESS':
      return 'In progress'
    case 'COMPLETED':
      return 'Completed'
    case 'CANCELLED':
      return 'Cancelled'
    default:
      return status
  }
}

function describeActivity(activity: DispatchWorkOrderActivity): string {
  if (activity.type === 'STATUS_CHANGED' && activity.previousStatus && activity.newStatus) {
    return `Status changed from ${formatWorkOrderStatus(activity.previousStatus)} to ${formatWorkOrderStatus(activity.newStatus)}`
  }

  if (activity.type === 'ASSET_ASSIGNED') {
    const name = readMetadataString(activity.metadata, 'assetName') ?? 'Asset'
    return `${name} assigned`
  }

  if (activity.type === 'ASSET_REMOVED') {
    const name = readMetadataString(activity.metadata, 'assetName') ?? 'Asset'
    return `${name} removed`
  }

  if (activity.type === 'COMPLIANCE_OVERRIDE') {
    return 'Compliance override approved'
  }

  if (activity.type === 'PDF_GENERATED') {
    return 'Work order PDF generated'
  }

  if (activity.type === 'DISPATCH_PRESET_ADDED') {
    const name = readMetadataString(activity.metadata, 'presetName') ?? 'Preset'
    return `${name} authorized`
  }

  if (activity.type === 'DISPATCH_PRESET_REMOVED') {
    const name = readMetadataString(activity.metadata, 'presetName') ?? 'Preset'
    return `${name} removed from scope`
  }

  if (activity.type === 'DISPATCH_PRESET_NOTE_UPDATED') {
    const name = readMetadataString(activity.metadata, 'presetName') ?? 'Preset'
    return `${name} notes updated`
  }

  const fallback = activity.type.replace(/_/g, ' ').toLowerCase()
  return fallback.charAt(0).toUpperCase() + fallback.slice(1)
}

function readMetadataString(metadata: Record<string, unknown> | null, key: string): string | null {
  if (!metadata || !(key in metadata)) {
    return null
  }

  const value = metadata[key]
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return null
}

function ActivityTimeline({ activities }: { activities: DispatchWorkOrderActivity[] }) {
  if (!activities.length) {
    return <p className="mt-3 text-xs text-slate-500">No recorded activity yet.</p>
  }

  return (
    <ol className="mt-3 space-y-3">
      {activities.map((activity) => (
        <li key={activity.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <p className="font-semibold text-slate-900">{describeActivity(activity)}</p>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">
            {activity.actorName ? `By ${activity.actorName} · ` : ''}
            {formatDistanceToNow(activity.createdAt, { addSuffix: true })}
          </p>
        </li>
      ))}
    </ol>
  )
}
