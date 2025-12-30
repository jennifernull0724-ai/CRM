import { formatDistanceToNow } from 'date-fns'
import type { ControlPlaneData } from '@/lib/dashboard/controlPlane'
import type { PlanKey } from '@/lib/billing/planTiers'
import {
  inviteUserAction,
  updateInviteToggleAction,
  updateUserRoleAction,
  setUserDisabledAction,
} from '@/app/dashboard/actions'

const numberFormatter = new Intl.NumberFormat('en-US')

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  estimator: 'Estimator',
  user: 'User (Sales)',
  dispatch: 'Dispatch',
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  INVITE_CREATED: 'INVITE_SENT',
  ROLE_CHANGED: 'ROLE_ASSIGNED',
}

function formatRoleLabel(value: string): string {
  return ROLE_LABELS[value.toLowerCase()] ?? value
}

function formatAuditAction(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action.replace(/_/g, ' ')
}

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

export function ControlPlaneDashboard({ variant, data }: Props) {
  const {
    analytics,
    governance,
    compliancePolicies,
    workOrders,
    companyDocuments,
  } = data

  const governanceUsers = Array.isArray(governance.users) ? governance.users : []
  const governanceAuditLogs = Array.isArray(governance.auditLogs) ? governance.auditLogs : []

  const dispatchStatusMap = analytics.dispatch.summaries.reduce<Record<string, number>>((acc, summary) => {
    acc[summary.status] = summary.count
    return acc
  }, {})

  const complianceStatusMap = analytics.compliance.statuses.reduce<Record<string, number>>((acc, summary) => {
    acc[summary.status] = summary.count
    return acc
  }, {})

  const workOrderStats = [
    { label: 'Draft', value: analytics.workOrders.summaries.find((entry) => entry.status === 'DRAFT')?.count ?? 0 },
    { label: 'Scheduled', value: analytics.workOrders.summaries.find((entry) => entry.status === 'SCHEDULED')?.count ?? 0 },
    { label: 'In progress', value: analytics.workOrders.summaries.find((entry) => entry.status === 'IN_PROGRESS')?.count ?? 0 },
    { label: 'Completed', value: analytics.workOrders.summaries.find((entry) => entry.status === 'COMPLETED')?.count ?? 0 },
    { label: 'Cancelled', value: analytics.workOrders.summaries.find((entry) => entry.status === 'CANCELLED')?.count ?? 0 },
    { label: 'Compliance blocked', value: analytics.workOrders.blocked.count },
  ]

  const invitesAllowedRoles = variant === 'owner' ? ['owner', 'admin', 'estimator', 'dispatch', 'user'] : ['estimator', 'dispatch', 'user']
  const editableAdminRoles = ['estimator', 'dispatch', 'user']

  const headerTitle = variant === 'owner' ? 'Owner Control Plane' : 'Admin Control Plane'
  const headerSubtitle =
    variant === 'owner'
      ? 'Dashboards are the lens only: analytics plus access governance.'
      : 'Read-only analytics with invite/role/disable controls.'

  const governanceUserRows = governanceUsers.map((user) => {
    const normalizedRole = user.role.toLowerCase()
    const roleOptions = variant === 'owner' ? ['owner', 'admin', ...editableAdminRoles] : editableAdminRoles
    const canEditRole = variant === 'owner' || editableAdminRoles.includes(normalizedRole)

    return (
      <tr key={user.id} className="odd:bg-white even:bg-slate-50/40">
        <td className="px-3 py-2">
          <p className="font-semibold text-slate-800">{user.name}</p>
          <p className="text-xs text-slate-500">{user.email}</p>
        </td>
        <td className="px-3 py-2">
          {canEditRole ? (
            <form action={updateUserRoleAction} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input type="hidden" name="userId" value={user.id} />
              <select name="role" defaultValue={normalizedRole} className="rounded-lg border border-slate-200 px-2 py-1 text-xs">
                {roleOptions.map((roleOption) => (
                  <option key={roleOption} value={roleOption}>
                    {formatRoleLabel(roleOption)}
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
    )
  })

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">System command</p>
        <h1 className="text-3xl font-bold text-slate-900">{headerTitle}</h1>
        <p className="text-slate-600">{headerSubtitle}</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Contacts" helper={`${numberFormatter.format(analytics.contacts.activeLast14Days)} active · 14d`}>
          {numberFormatter.format(analytics.contacts.total)}
        </SummaryCard>
        <SummaryCard
          title="Pipeline value"
          helper={`${numberFormatter.format(analytics.deals.pipeline.reduce((sum, stage) => sum + stage.deals, 0))} deals`}
        >
          ${numberFormatter.format(analytics.deals.pipeline.reduce((sum, stage) => sum + stage.value, 0))}
        </SummaryCard>
        <SummaryCard title="Dispatch queue" helper={`${dispatchStatusMap.QUEUED ?? 0} queued`}>
          {numberFormatter.format(dispatchStatusMap.IN_PROGRESS ?? 0)} active
        </SummaryCard>
        <SummaryCard title="Compliance pass" helper={`${analytics.compliance.expiringByWindow.within30} expiring · 30d`}>
          {numberFormatter.format(complianceStatusMap.PASS ?? 0)}
        </SummaryCard>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Estimating & dispatch</p>
            <h2 className="text-2xl font-semibold text-slate-900">Queue telemetry · read-only</h2>
          </div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Estimate statuses</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {analytics.estimates.statuses.map((status) => (
                <div key={status.status} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <p className="text-xs uppercase text-slate-500">{status.status.replace(/_/g, ' ')}</p>
                  <p className="text-2xl font-semibold text-slate-900">{numberFormatter.format(status.count)}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Dispatch queue snapshot</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <MetricTile label="Queued" value={dispatchStatusMap.QUEUED ?? 0} />
              <MetricTile label="Pending assignment" value={dispatchStatusMap.PENDING_ASSIGNMENT ?? 0} />
              <MetricTile label="In progress" value={dispatchStatusMap.IN_PROGRESS ?? 0} />
              <MetricTile label="Compliance blocks" value={analytics.dispatch.blocked} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Work order oversight</p>
            <h2 className="text-2xl font-semibold text-slate-900">Statuses only · no transitions</h2>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {workOrderStats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</p>
              <p className="text-xl font-semibold text-slate-900">{numberFormatter.format(stat.value)}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Work order</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Dispatch</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Assignments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workOrders.map((order) => (
                <tr key={order.id} className="odd:bg-white even:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{order.title}</p>
                    <p className="text-xs text-slate-500">Created {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}</p>
                    {order.complianceBlocked ? (
                      <p className="text-xs font-semibold text-rose-600">Blocked · {order.blockReason ?? 'Compliance hold'}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{order.status.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <p className="text-sm font-semibold">{order.dispatchStatus ?? 'n/a'}</p>
                    <p className="text-xs text-slate-500">Priority: {order.dispatchPriority ?? 'standard'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {order.assignments.length ? (
                      <ul className="text-xs">
                        {order.assignments.map((assignment) => (
                          <li key={assignment.id} className="rounded bg-slate-100 px-2 py-1">
                            {assignment.employeeName}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500">No active assignments</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Compliance posture</p>
            <h2 className="text-2xl font-semibold text-slate-900">Observational only</h2>
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Workforce health</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {['PASS', 'FAIL', 'INCOMPLETE'].map((status) => (
                <li key={status} className="flex justify-between">
                  <span>{status}</span>
                  <span className="font-semibold">{numberFormatter.format(complianceStatusMap[status] ?? 0)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Policies</p>
            <p className="mt-2 text-sm text-slate-700">
              {compliancePolicies.retentionYears} year retention · {compliancePolicies.expirationGraceDays}-day expiration grace window.
            </p>
            <p className="mt-2 text-xs text-slate-500">Policy edits live in /compliance/settings.</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Company documents</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {companyDocuments.map((doc) => (
                <li key={doc.category} className="flex justify-between">
                  <span>{doc.category}</span>
                  <span className={`font-semibold ${doc.expired ? 'text-rose-600' : 'text-slate-900'}`}>
                    {doc.documentCount} · {doc.expired ? 'Expired' : 'Current'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Access governance</p>
            <h2 className="text-2xl font-semibold text-slate-900">Invite · role · disable</h2>
          </div>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Invites</p>
                  <p className="text-xs text-slate-500">Owner toggle</p>
                </div>
                {variant === 'owner' ? (
                  <div className="flex items-center gap-2 text-xs">
                    <form action={updateInviteToggleAction}>
                      <input type="hidden" name="enabled" value="true" />
                      <button
                        type="submit"
                        className={`rounded-lg px-3 py-1 font-semibold ${governance.invitesEnabled ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}
                      >
                        On
                      </button>
                    </form>
                    <form action={updateInviteToggleAction}>
                      <input type="hidden" name="enabled" value="false" />
                      <button
                        type="submit"
                        className={`rounded-lg px-3 py-1 font-semibold ${!governance.invitesEnabled ? 'bg-rose-600 text-white' : 'bg-white text-slate-700'}`}
                      >
                        Off
                      </button>
                    </form>
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-amber-600">Owner only</p>
                )}
              </div>
            </div>
            <form action={inviteUserAction} className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-700">Invite user</p>
              <div>
                <label className="text-xs text-slate-500">Email</label>
                <input name="email" type="email" required className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Role</label>
                <select name="role" defaultValue="" required className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <option value="" disabled>
                    Select role
                  </option>
                  {invitesAllowedRoles.map((roleOption) => (
                    <option key={roleOption} value={roleOption}>
                      {formatRoleLabel(roleOption)}
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
                  {governanceUserRows}
                </tbody>
              </table>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-sm font-semibold text-slate-700">Recent access events</p>
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                {governanceAuditLogs.slice(0, 5).map((log) => (
                  <li key={log.id} className="rounded border border-slate-100 bg-slate-50 p-2">
                    <p className="font-semibold text-slate-800">{formatAuditAction(log.action)}</p>
                    <p>{log.actorName ?? 'System'} → {log.targetEmail ?? 'unknown target'}</p>
                    <p className="text-[11px] text-slate-500">{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function SummaryCard({ title, helper, children }: { title: string; helper: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-xs uppercase text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{children}</p>
      <p className="text-sm text-slate-500">{helper}</p>
    </div>
  )
}

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{numberFormatter.format(value)}</p>
    </div>
  )
}
