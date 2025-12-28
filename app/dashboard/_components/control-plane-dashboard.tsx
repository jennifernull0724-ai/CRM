import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { planAllowsFeature, type PlanKey } from '@/lib/billing/planTiers'
import type { ControlPlaneData } from '@/lib/dashboard/controlPlane'
import { StandardSettingsPanel } from '@/app/dashboard/_components/standard-settings-panel'
import {
  inviteUserAction,
  updateInviteToggleAction,
  updateUserRoleAction,
  setUserDisabledAction,
  reassignDispatchOwnerAction,
  closeWorkOrderAction,
  approveComplianceOverrideAction,
  updateCompliancePoliciesAction,
} from '@/app/dashboard/actions'
import {
  createEmployeeAction,
  createCertificationAction,
  uploadCertificationImageAction,
  uploadComplianceDocumentAction,
  createSnapshotAction,
  createInspectionSnapshotAction,
  setEmployeeActiveStateAction,
} from '@/app/compliance/employees/actions'
import { updatePresetAction } from '@/app/compliance/actions'

const numberFormatter = new Intl.NumberFormat('en-US')
const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

type Props = {
  variant: 'owner' | 'admin'
  data: ControlPlaneData
  planKey: PlanKey
  viewer: {
    id: string
    name: string
    email: string
    role: 'owner' | 'admin'
  }
}

function SectionCard({ title, helper, children }: { title: string; helper?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
        {helper ? <p className="text-sm text-slate-500">{helper}</p> : null}
      </div>
      {children}
    </section>
  )
}

export function ControlPlaneDashboard({ variant, data, planKey, viewer }: Props) {
  const { analytics, governance, compliancePolicies, presets, employees, certifications, workOrders, standardSettings } = data
  const workOrderStatusMap = analytics.workOrders.summaries.reduce<Record<string, number>>((acc, summary) => {
    acc[summary.status] = summary.count
    return acc
  }, {})
  const dispatchStatusMap = analytics.dispatch.summaries.reduce<Record<string, number>>((acc, summary) => {
    acc[summary.status] = summary.count
    return acc
  }, {})
  const complianceStatusMap = analytics.compliance.statuses.reduce<Record<string, number>>((acc, summary) => {
    acc[summary.status] = summary.count
    return acc
  }, {})
  const hasEmployees = employees.length > 0
  const hasCertifications = certifications.length > 0
  const dispatchEligibleUsers = governance.users.filter((user) => ['dispatch', 'admin', 'owner'].includes(user.role.toLowerCase()))
  const canBulkPrint = planAllowsFeature(planKey, 'advanced_compliance')
  const queuedQuotes = dispatchStatusMap.QUEUED ?? 0
  const pendingAssignments = dispatchStatusMap.PENDING_ASSIGNMENT ?? 0
  const inProgressDispatch = dispatchStatusMap.IN_PROGRESS ?? 0
  const manualWorkOrders = analytics.workOrders.manualCount
  const unassignedWorkOrders = analytics.workOrders.withoutAssignments
  const complianceBlocks = analytics.compliance.blocks
  const expiringWindows = analytics.compliance.expiringByWindow
  const auditVolume = analytics.compliance.auditVolume
  const complianceMissingProof = analytics.compliance.missingProof
  const expiringCerts = analytics.compliance.expiringCertifications
  const complianceStatusOrder = ['PASS', 'FAIL', 'INCOMPLETE'] as const
  const workOrderStats = [
    { label: 'Open', value: workOrderStatusMap.OPEN ?? 0 },
    { label: 'In progress', value: workOrderStatusMap.IN_PROGRESS ?? 0 },
    { label: 'Closed', value: workOrderStatusMap.CLOSED ?? 0 },
    { label: 'Manual jobs', value: manualWorkOrders },
    { label: 'Unassigned', value: unassignedWorkOrders },
    { label: 'Compliance blocked', value: analytics.workOrders.blocked.count },
  ]
  const inviteRoleOptions = variant === 'owner' ? ['owner', 'admin', 'estimator', 'user', 'dispatch'] : ['estimator', 'user', 'dispatch']
  const canToggleInvites = variant === 'owner'
  const canEditCompliancePolicies = variant === 'owner'
  const editableAdminRoles = ['estimator', 'user', 'dispatch']

  const header =
    variant === 'owner'
      ? {
          title: 'Owner Control Plane',
          subtitle: 'Command revenue, dispatch, and compliance posture from a single immutable board.',
        }
      : {
          title: 'Admin Control Plane',
          subtitle: 'Connect estimating throughput with dispatch blocks, invites, and compliance authority.',
        }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10 space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">System command</p>
          <h1 className="text-3xl font-bold text-slate-900">{header.title}</h1>
          <p className="text-slate-600">{header.subtitle}</p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase text-slate-500">Contacts</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{numberFormatter.format(analytics.contacts.total)}</p>
            <p className="text-sm text-slate-500">{numberFormatter.format(analytics.contacts.activeLast14Days)} active in the last 14 days</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase text-slate-500">Deals pipeline</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{numberFormatter.format(analytics.deals.pipeline.reduce((sum, stage) => sum + stage.deals, 0))}</p>
            <p className="text-sm text-slate-500">{currencyFormatter.format(analytics.deals.pipeline.reduce((sum, stage) => sum + stage.value, 0))} open value</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase text-slate-500">Dispatch queue</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{analytics.dispatch.queueSize}</p>
            <p className="text-sm text-slate-500">{analytics.dispatch.blocked} blocked by compliance</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase text-slate-500">Compliance status</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {analytics.compliance.statuses.find((status) => status.status === 'PASS')?.count ?? 0}/{analytics.compliance.statuses.reduce((sum, item) => sum + item.count, 0)} PASS
            </p>
            <p className="text-sm text-slate-500">{analytics.compliance.expiringByWindow.within30} certs expiring inside 30 days</p>
          </div>
        </div>

        <SectionCard title="Global analytics" helper="Every metric drills into live records. No cached demo data.">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Contacts activity</h3>
              <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/50">
                {analytics.contacts.recent.map((contact) => (
                  <li key={contact.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <Link className="font-medium text-slate-800 hover:text-slate-900" href={`/contacts/${contact.id}`}>
                      {contact.name}
                    </Link>
                    <span className="text-xs text-slate-500">
                      {contact.lastActivityAt ? formatDistanceToNow(new Date(contact.lastActivityAt), { addSuffix: true }) : 'No activity yet'}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-500">
                Activity volume · 7d {numberFormatter.format(analytics.contactActivityVolume.last7Days)} · 30d{' '}
                {numberFormatter.format(analytics.contactActivityVolume.last30Days)}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Pipeline by stage</h3>
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-slate-500">Stage</th>
                      <th className="px-4 py-2 text-right font-medium text-slate-500">Deals</th>
                      <th className="px-4 py-2 text-right font-medium text-slate-500">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.deals.pipeline.map((stage) => (
                      <tr key={stage.stage} className="odd:bg-white even:bg-slate-50/40">
                        <td className="px-4 py-2 text-slate-800">{stage.stage}</td>
                        <td className="px-4 py-2 text-right text-slate-600">{numberFormatter.format(stage.deals)}</td>
                        <td className="px-4 py-2 text-right text-slate-600">{currencyFormatter.format(stage.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Estimating + dispatch" helper="Track revisions, approvals, and queue integrity.">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Estimate states</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {analytics.estimates.statuses.map((status) => (
                  <div key={status.status} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-xs uppercase text-slate-500">{status.status.replace(/_/g, ' ')}</p>
                    <p className="text-2xl font-semibold text-slate-900">{numberFormatter.format(status.count)}</p>
                  </div>
                ))}
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <p className="text-xs uppercase text-slate-500">Revision count</p>
                  <p className="text-2xl font-semibold text-slate-900">{numberFormatter.format(analytics.estimates.revisionCount)}</p>
                </div>
              </div>
              <div className="mt-6">
                <h4 className="text-xs uppercase text-slate-500">Recent revisions</h4>
                <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
                  {analytics.estimates.recentRevisions.map((revision) => (
                    <li key={revision.id} className="px-4 py-3 text-sm">
                      <p className="font-medium text-slate-800">Estimate #{revision.estimateId.slice(-6)}</p>
                      <p className="text-xs text-slate-500">Revision {revision.revisionNumber} · {revision.status.replace(/_/g, ' ')}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Dispatch queue</h3>
              <div className="mb-3 flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="rounded-full border border-slate-200 px-3 py-1">Queued: {numberFormatter.format(queuedQuotes)}</span>
                <span className="rounded-full border border-slate-200 px-3 py-1">
                  Pending assignment: {numberFormatter.format(pendingAssignments)}
                </span>
                <span className="rounded-full border border-slate-200 px-3 py-1">
                  In progress: {numberFormatter.format(inProgressDispatch)}
                </span>
                <span className="rounded-full border border-slate-200 px-3 py-1">
                  Compliance blocks: {numberFormatter.format(analytics.dispatch.blocked)}
                </span>
              </div>
              <div className="mt-2 overflow-hidden rounded-xl border border-slate-100">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Request</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Priority</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Dispatcher</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.dispatch.queue.map((request) => (
                      <tr key={request.id} className="odd:bg-white even:bg-slate-50/40">
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-800">{request.estimateName ?? 'Pending estimate link'}</div>
                          <p className="text-xs text-slate-500">Queued {formatDistanceToNow(new Date(request.queuedAt), { addSuffix: true })}</p>
                          {request.complianceBlocked ? (
                            <p className="text-xs font-semibold text-red-600">Blocked: {request.blockReason ?? 'Compliance hold'}</p>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{request.priority}</td>
                        <td className="px-3 py-2 text-slate-700">{request.dispatcherName ?? 'Unassigned'}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {dispatchEligibleUsers.length ? (
                            <form action={reassignDispatchOwnerAction} className="space-y-1">
                              <input type="hidden" name="dispatchRequestId" value={request.id} />
                              <select
                                name="dispatcherId"
                                defaultValue=""
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                              >
                                <option value="" disabled>
                                  Select owner
                                </option>
                                {dispatchEligibleUsers.map((dispatcher) => (
                                  <option key={dispatcher.id} value={dispatcher.id}>
                                    {dispatcher.name} · {dispatcher.role}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="submit"
                                className="w-full rounded-lg bg-slate-900 px-2 py-1 text-xs font-semibold text-white"
                              >
                                Assign
                              </button>
                            </form>
                          ) : (
                            <p className="text-xs text-slate-500">No dispatch-capable users</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Work order oversight" helper="Owners/admins can close work orders and approve compliance overrides.">
          <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {workOrderStats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-center">
                <p className="text-xs uppercase text-slate-500">{stat.label}</p>
                <p className="text-xl font-semibold text-slate-900">{numberFormatter.format(stat.value)}</p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Work order</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Assignments</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Controls</th>
                </tr>
              </thead>
              <tbody>
                {workOrders.map((order) => (
                  <tr key={order.id} className="odd:bg-white even:bg-slate-50/40">
                    <td className="px-3 py-3 align-top">
                      <p className="font-semibold text-slate-800">{order.title}</p>
                      <p className="text-xs text-slate-500">
                        Created {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                      </p>
                      {order.complianceBlocked ? (
                        <p className="text-xs font-semibold text-red-600">Blocked: {order.blockReason ?? 'Policy hold'}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {order.assignments.length ? (
                        <ul className="space-y-1 text-xs">
                          {order.assignments.map((assignment) => (
                            <li key={assignment.id} className="rounded bg-slate-100 px-2 py-1">
                              {assignment.employeeName}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-slate-500">No active assignments</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      <p className="font-semibold">{order.status}</p>
                      <p className="text-xs text-slate-500">Dispatch: {order.dispatchStatus ?? 'n/a'}</p>
                      <p className="text-xs text-slate-500">Priority: {order.dispatchPriority ?? 'standard'}</p>
                      {order.manualEntry ? <p className="text-xs font-semibold text-amber-600">Manual intake</p> : null}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      <div className="space-y-2">
                        {order.status !== 'CLOSED' ? (
                          <form action={closeWorkOrderAction}>
                            <input type="hidden" name="workOrderId" value={order.id} />
                            <button
                              type="submit"
                              className="w-full rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
                            >
                              Close work order
                            </button>
                          </form>
                        ) : null}
                        {order.complianceBlocked ? (
                          <form action={approveComplianceOverrideAction}>
                            <input type="hidden" name="workOrderId" value={order.id} />
                            <button
                              type="submit"
                              className="w-full rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                            >
                              Approve override
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="User & access governance" helper="Invite, re-role, disable, and audit without leaving the dashboard.">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">CRM invites</p>
                    <p className="text-xs text-slate-500">Global toggle applies instantly</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canToggleInvites ? (
                      <>
                        <form action={updateInviteToggleAction}>
                          <input type="hidden" name="enabled" value="true" />
                          <button
                            type="submit"
                            className={`rounded-lg px-3 py-1 text-xs font-semibold ${governance.invitesEnabled ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}
                          >
                            On
                          </button>
                        </form>
                        <form action={updateInviteToggleAction}>
                          <input type="hidden" name="enabled" value="false" />
                          <button
                            type="submit"
                            className={`rounded-lg px-3 py-1 text-xs font-semibold ${!governance.invitesEnabled ? 'bg-rose-600 text-white' : 'bg-white text-slate-700'}`}
                          >
                            Off
                          </button>
                        </form>
                      </>
                    ) : (
                      <p className="text-xs font-semibold text-amber-600">Owner control</p>
                    )}
                  </div>
                </div>
              </div>
              <form action={inviteUserAction} className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-700">Invite user</p>
                <div>
                  <label className="text-xs text-slate-500">Email</label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="user@company.com"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Role</label>
                  <select name="role" required className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <option value="" disabled>
                      Select role
                    </option>
                    {inviteRoleOptions.map((roleOption) => (
                      <option key={roleOption} value={roleOption}>
                        {roleOption.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                  Send invite
                </button>
              </form>
            </div>
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">User</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Role</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-500">Access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {governance.users.map((user) => (
                      <tr key={user.id} className="odd:bg-white even:bg-slate-50/40">
                        <td className="px-3 py-2">
                          <p className="font-semibold text-slate-800">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </td>
                        <td className="px-3 py-2">
                          {variant === 'owner' || editableAdminRoles.includes(user.role.toLowerCase()) ? (
                            <form action={updateUserRoleAction} className="flex items-center gap-2">
                              <input type="hidden" name="userId" value={user.id} />
                              <select
                                name="role"
                                defaultValue={user.role}
                                className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                              >
                                {(variant === 'owner' ? ['owner', 'admin', ...editableAdminRoles] : editableAdminRoles).map((roleOption) => (
                                  <option key={roleOption} value={roleOption}>
                                    {roleOption.toUpperCase()}
                                  </option>
                                ))}
                              </select>
                              <button type="submit" className="rounded-lg border border-slate-200 px-2 py-1 text-xs">
                                Update
                              </button>
                            </form>
                          ) : (
                            <p className="text-xs font-semibold text-slate-500">Owner managed</p>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <form action={setUserDisabledAction}>
                            <input type="hidden" name="userId" value={user.id} />
                            <input type="hidden" name="disabled" value={(!user.disabled).toString()} />
                            <button
                              type="submit"
                              className={`rounded-lg px-3 py-1 text-xs font-semibold ${user.disabled ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}
                            >
                              {user.disabled ? 'Enable' : 'Disable'}
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-4">
                <p className="text-sm font-semibold text-slate-700">Audit log</p>
                <ul className="mt-3 space-y-2 text-xs text-slate-600">
                  {governance.auditLogs.map((log) => (
                    <li key={log.id} className="rounded border border-slate-100 bg-slate-50 p-2">
                      <p className="font-semibold text-slate-800">{log.action.replace(/_/g, ' ')}</p>
                      <p>{log.actorName ?? 'System'} → {log.targetEmail ?? 'n/a'}</p>
                      <p className="text-[11px] text-slate-500">{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Compliance authority" helper="Create employees, upload certifications, snapshot, and print without leaving the control plane.">
          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="text-xs uppercase text-slate-500">Workforce status</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {complianceStatusOrder.map((status) => (
                  <li key={status} className="flex justify-between">
                    <span>{status}</span>
                    <span className="font-semibold">{numberFormatter.format(complianceStatusMap[status] ?? 0)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="text-xs uppercase text-slate-500">Expiring + proof gaps</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                <li className="flex justify-between">
                  <span>≤ 30 days</span>
                  <span className="font-semibold">{numberFormatter.format(expiringWindows.within30)}</span>
                </li>
                <li className="flex justify-between">
                  <span>31-60 days</span>
                  <span className="font-semibold">{numberFormatter.format(expiringWindows.within60)}</span>
                </li>
                <li className="flex justify-between">
                  <span>61-90 days</span>
                  <span className="font-semibold">{numberFormatter.format(expiringWindows.within90)}</span>
                </li>
                <li className="flex justify-between text-amber-600">
                  <span>Missing proof</span>
                  <span className="font-semibold">{numberFormatter.format(complianceMissingProof)}</span>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="text-xs uppercase text-slate-500">Audit + blocks</p>
              <p className="mt-2 text-sm text-slate-700">Audit events (7d): <span className="font-semibold">{numberFormatter.format(auditVolume.last7Days)}</span></p>
              <p className="text-sm text-slate-700">Audit events (30d): <span className="font-semibold">{numberFormatter.format(auditVolume.last30Days)}</span></p>
              <p className="mt-2 text-sm text-slate-700">Dispatch blocks: <span className="font-semibold">{numberFormatter.format(complianceBlocks)}</span></p>
            </div>
          </div>
          <div className="grid gap-8 xl:grid-cols-3">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-700">Employees</h4>
                <div className="mt-2 max-h-[320px] overflow-y-auto rounded-xl border border-slate-100">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">Employee</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">Status</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((employee) => (
                        <tr key={employee.id} className="odd:bg-white even:bg-slate-50/40">
                          <td className="px-3 py-2">
                            <Link href={`/compliance/employees/${employee.id}`} className="font-semibold text-slate-800 hover:text-slate-900">
                              {employee.firstName} {employee.lastName}
                            </Link>
                            <p className="text-xs text-slate-500">ID: {employee.employeeId}</p>
                          </td>
                          <td className="px-3 py-2 text-xs font-semibold text-slate-700">{employee.complianceStatus}</td>
                          <td className="px-3 py-2">
                            <form action={setEmployeeActiveStateAction}>
                              <input type="hidden" name="employeeId" value={employee.id} />
                              <input type="hidden" name="active" value={(!employee.active).toString()} />
                              <button
                                type="submit"
                                className={`rounded-lg px-3 py-1 text-xs font-semibold ${employee.active ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}
                              >
                                {employee.active ? 'Deactivate' : 'Activate'}
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <form action={createEmployeeAction} className="space-y-3 rounded-xl border border-slate-100 bg-white p-4">
                <p className="text-sm font-semibold text-slate-700">Create employee</p>
                <input name="employeeId" placeholder="External ID" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <input name="firstName" placeholder="First name" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <input name="lastName" placeholder="Last name" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <input name="title" placeholder="Title" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <input name="role" placeholder="Role" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <label className="inline-flex items-center gap-2 text-xs text-slate-500">
                  <input type="checkbox" name="active" defaultChecked /> Active
                </label>
                <button type="submit" className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                  Create
                </button>
              </form>
            </div>

            <div className="space-y-4">
              <form action={createCertificationAction} className="space-y-3 rounded-xl border border-slate-100 bg-white p-4">
                <p className="text-sm font-semibold text-slate-700">Add certification</p>
                <select
                  name="employeeId"
                  required
                  defaultValue=""
                  disabled={!hasEmployees}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="" disabled>
                    {hasEmployees ? 'Select employee' : 'Add employees first'}
                  </option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </option>
                  ))}
                </select>
                <select name="presetKey" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <option value="">Custom name</option>
                  {presets.map((preset) => (
                    <option key={preset.id} value={preset.baseKey}>
                      {preset.name} ({preset.category})
                    </option>
                  ))}
                </select>
                <input name="customName" placeholder="Custom name" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <input type="date" name="issueDate" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <input type="date" name="expiresAt" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <label className="inline-flex items-center gap-2 text-xs text-slate-500">
                  <input type="checkbox" name="required" defaultChecked /> Required cert
                </label>
                <button
                  type="submit"
                  disabled={!hasEmployees}
                  className={`w-full rounded-lg px-4 py-2 text-sm font-semibold text-white ${hasEmployees ? 'bg-emerald-600' : 'bg-slate-300'}`}
                >
                  Save certification
                </button>
              </form>

              <form action={uploadComplianceDocumentAction} className="space-y-3 rounded-xl border border-slate-100 bg-white p-4" encType="multipart/form-data">
                <p className="text-sm font-semibold text-slate-700">Upload compliance document (PDF)</p>
                <select
                  name="employeeId"
                  required
                  defaultValue=""
                  disabled={!hasEmployees}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="" disabled>
                    {hasEmployees ? 'Select employee' : 'Add employees first'}
                  </option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </option>
                  ))}
                </select>
                <input name="title" placeholder="Document title" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <input type="file" name="file" accept="application/pdf" required className="w-full text-sm" />
                <button
                  type="submit"
                  disabled={!hasEmployees}
                  className={`w-full rounded-lg px-4 py-2 text-sm font-semibold text-white ${hasEmployees ? 'bg-slate-900' : 'bg-slate-300'}`}
                >
                  Upload PDF
                </button>
              </form>

              <form action={uploadCertificationImageAction} className="space-y-3 rounded-xl border border-slate-100 bg-white p-4" encType="multipart/form-data">
                <p className="text-sm font-semibold text-slate-700">Upload certification proof</p>
                <select
                  name="certificationId"
                  required
                  defaultValue=""
                  disabled={!hasCertifications}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="" disabled>
                    {hasCertifications ? 'Select certification' : 'No certifications yet'}
                  </option>
                  {certifications.map((cert) => (
                    <option key={cert.id} value={cert.id}>
                      {cert.employeeName} · {cert.label}
                    </option>
                  ))}
                </select>
                <input type="file" name="file" accept="image/*,application/pdf" required className="w-full text-sm" />
                <button
                  type="submit"
                  disabled={!hasCertifications}
                  className={`w-full rounded-lg px-4 py-2 text-sm font-semibold text-white ${hasCertifications ? 'bg-slate-900' : 'bg-slate-300'}`}
                >
                  Upload proof
                </button>
              </form>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <p className="text-sm font-semibold text-slate-700">Snapshots</p>
                <form action={createSnapshotAction} className="mt-3 space-y-3">
                  <select
                    name="employeeId"
                    required
                    defaultValue=""
                    disabled={!hasEmployees}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="" disabled>
                      {hasEmployees ? 'Select employee' : 'Add employees first'}
                    </option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={!hasEmployees}
                    className={`w-full rounded-lg px-4 py-2 text-sm font-semibold text-white ${hasEmployees ? 'bg-slate-900' : 'bg-slate-300'}`}
                  >
                    Snapshot now
                  </button>
                </form>
                <form action={createInspectionSnapshotAction} className="mt-3 space-y-3">
                  <select
                    name="employeeId"
                    required
                    defaultValue=""
                    disabled={!hasEmployees}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="" disabled>
                      {hasEmployees ? 'Inspection snapshot' : 'Add employees first'}
                    </option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={!hasEmployees}
                    className={`w-full rounded-lg px-4 py-2 text-sm font-semibold text-white ${hasEmployees ? 'bg-amber-600' : 'bg-slate-300'}`}
                  >
                    Inspector mode
                  </button>
                </form>
              </div>

              <form method="POST" action="/api/compliance/print/bulk" className="space-y-3 rounded-xl border border-slate-100 bg-white p-4">
                <p className="text-sm font-semibold text-slate-700">Print compliance packets</p>
                <select
                  name="employeeId"
                  multiple
                  size={6}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  disabled={!canBulkPrint || !hasEmployees}
                  required
                >
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={!canBulkPrint || !hasEmployees}
                  className={`w-full rounded-lg px-4 py-2 text-sm font-semibold text-white ${canBulkPrint && hasEmployees ? 'bg-emerald-600' : 'bg-slate-300'}`}
                >
                  Download binder PDF
                </button>
                {!canBulkPrint ? (
                  <p className="text-xs text-slate-500">Enterprise plan unlocks bulk packets.</p>
                ) : null}
                {canBulkPrint && !hasEmployees ? (
                  <p className="text-xs text-slate-500">Add employees before printing packets.</p>
                ) : null}
              </form>

              <form action={updateCompliancePoliciesAction} className="rounded-xl border border-slate-100 bg-white p-4">
                <fieldset className="space-y-3" disabled={!canEditCompliancePolicies}>
                  <p className="text-sm font-semibold text-slate-700">Compliance policies</p>
                  <label className="flex items-center gap-2 text-xs text-slate-500">
                    <input type="checkbox" name="requireImages" defaultChecked={compliancePolicies.requireImages} value="true" />
                    Require proof images
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="text-xs text-slate-500">Expiration grace (days)</label>
                      <input
                        type="number"
                        name="expirationGraceDays"
                        defaultValue={compliancePolicies.expirationGraceDays}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Retention (years)</label>
                      <input
                        type="number"
                        name="retentionYears"
                        defaultValue={compliancePolicies.retentionYears}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3 text-xs text-slate-500">
                    {[30, 60, 90].map((window) => (
                      <label key={window} className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          name={`warning${window}`}
                          defaultChecked={compliancePolicies.expirationWarningWindows.includes(window)}
                          value="true"
                        />
                        Warn @ {window}d
                      </label>
                    ))}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 text-xs text-slate-500">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" name="snapshotOnDispatch" defaultChecked={compliancePolicies.snapshotRules.onDispatchAssignment} value="true" />
                      Snapshot on dispatch assign
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" name="snapshotOnUpload" defaultChecked={compliancePolicies.snapshotRules.onCertificationUpload} value="true" />
                      Snapshot on proof upload
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" name="snapshotManual" defaultChecked={compliancePolicies.snapshotRules.onManualRequest} value="true" />
                      Allow manual snapshots
                    </label>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs text-slate-500">
                    <input type="checkbox" name="requireQr" defaultChecked={compliancePolicies.qrVerification.requireForDispatch} value="true" />
                    Require QR for dispatch
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-slate-500">
                    <input type="checkbox" name="allowExternal" defaultChecked={compliancePolicies.qrVerification.allowExternalVerification} value="true" />
                    Allow external verification
                  </label>
                  <div>
                    <label className="text-xs text-slate-500">QR public fields (comma separated)</label>
                    <input
                      name="qrFields"
                      defaultValue={compliancePolicies.qrVerification.publicFields.join(',')}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className={`w-full rounded-lg px-4 py-2 text-sm font-semibold text-white ${canEditCompliancePolicies ? 'bg-slate-900' : 'bg-slate-300'}`}
                  >
                    Update policies
                  </button>
                </fieldset>
                {!canEditCompliancePolicies ? <p className="mt-2 text-xs text-amber-600">Owner control</p> : null}
              </form>
            </div>
          </div>
          <div className="mt-8 overflow-hidden rounded-xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Employee</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Certification</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Expires</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Proof</th>
                </tr>
              </thead>
              <tbody>
                {expiringCerts.length ? (
                  expiringCerts.map((cert) => (
                    <tr key={cert.id} className="odd:bg-white even:bg-slate-50/40">
                      <td className="px-3 py-2 text-slate-800">{cert.employeeName}</td>
                      <td className="px-3 py-2 text-slate-700">{cert.certificationName}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {new Date(cert.expiresAt).toLocaleDateString()} · {formatDistanceToNow(new Date(cert.expiresAt), { addSuffix: true })}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{cert.missingProof ? 'Missing proof' : 'Documented'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-slate-500">
                      No certifications expiring inside 90 days.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <StandardSettingsPanel viewer={viewer} settings={standardSettings} />

        <SectionCard title="Certification presets" helper="Rename or re-order live presets. 'Other' rows are locked by policy.">
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50 text-sm text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Preset</th>
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-left">Order</th>
                  <th className="px-3 py-2 text-left">Enabled</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {presets.map((preset) => (
                  <tr key={preset.id} className="odd:bg-white even:bg-slate-50/40 text-sm">
                    <td className="px-3 py-2 text-slate-800">{preset.name}</td>
                    <td className="px-3 py-2 text-slate-600">{preset.category}</td>
                    <td className="px-3 py-2 text-slate-600">{preset.order}</td>
                    <td className="px-3 py-2 text-slate-600">{preset.enabled ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-2">
                      <form action={updatePresetAction}>
                        <fieldset className="flex flex-wrap gap-2 text-xs" disabled={!canEditCompliancePolicies}>
                          <input type="hidden" name="presetId" value={preset.id} />
                          <input
                            name="name"
                            defaultValue={preset.name}
                            className="rounded border border-slate-200 px-2 py-1"
                            disabled={preset.locked}
                          />
                          <input
                            name="order"
                            type="number"
                            defaultValue={preset.order}
                            className="w-20 rounded border border-slate-200 px-2 py-1"
                          />
                          <label className="inline-flex items-center gap-1">
                            <input type="checkbox" name="enabled" defaultChecked={preset.enabled} disabled={preset.isOther || preset.locked} />
                            Enabled
                          </label>
                          <button type="submit" className={`rounded px-3 py-1 text-white ${canEditCompliancePolicies ? 'bg-slate-900' : 'bg-slate-300'}`}>
                            Save
                          </button>
                        </fieldset>
                        {!canEditCompliancePolicies ? <p className="mt-1 text-[11px] text-amber-600">Owner control</p> : null}
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
