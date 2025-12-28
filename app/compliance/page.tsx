import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { planAllowsFeature, type PlanKey } from '@/lib/billing/planTiers'
import { listCompliancePresets } from '@/lib/compliance/presets'
import { updatePresetAction } from './actions'
import type { CompliancePreset, ComplianceCategory } from '@prisma/client'

function groupPresets(presets: CompliancePreset[]) {
  return presets.reduce<Record<string, CompliancePreset[]>>((acc, preset) => {
    const key = preset.category
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(preset)
    return acc
  }, {})
}

const PRESET_CATEGORY_ORDER: ComplianceCategory[] = ['BASE', 'RAILROAD', 'CONSTRUCTION', 'ENVIRONMENTAL']

export default async function ComplianceDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.companyId) {
    throw new Error('Missing company context')
  }

  const planKey = (session.user.planKey as PlanKey) ?? 'starter'
  const isAdvanced = planAllowsFeature(planKey, 'advanced_compliance')

  const [employees, snapshots, presets, lastSnapshot, lastExport, recentSnapshots] = await Promise.all([
    prisma.complianceEmployee.findMany({
      where: { companyId: session.user.companyId },
      include: {
        certifications: {
          select: {
            id: true,
            required: true,
            status: true,
            expiresAt: true,
          },
        },
      },
    }),
    prisma.complianceSnapshot.count({
      where: { employee: { companyId: session.user.companyId } },
    }),
    listCompliancePresets(session.user.companyId),
    prisma.complianceSnapshot.findFirst({
      where: { employee: { companyId: session.user.companyId } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.complianceActivity.findFirst({
      where: {
        employee: { companyId: session.user.companyId },
        type: 'COMPLIANCE_EXPORTED',
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.complianceSnapshot.findMany({
      where: { employee: { companyId: session.user.companyId } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        employee: {
          select: { firstName: true, lastName: true, employeeId: true },
        },
        qrToken: true,
      },
    }),
  ])

  const totals = employees.reduce(
    (acc, employee) => {
      acc[employee.complianceStatus] = (acc[employee.complianceStatus] ?? 0) + 1
      const now = Date.now()
      employee.certifications.forEach((cert) => {
        if (cert.required && cert.status !== 'PASS') {
          acc.missing += 1
        }
        if (cert.status === 'PASS') {
          const daysUntilExpiry = (cert.expiresAt.getTime() - now) / (1000 * 60 * 60 * 24)
          if (daysUntilExpiry <= 30) {
            acc.expiring += 1
          }
        }
      })
      return acc
    },
    { PASS: 0, FAIL: 0, INCOMPLETE: 0, missing: 0, expiring: 0 } as Record<string, number>
  )

  const groupedPresets = groupPresets(presets)

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm uppercase tracking-wide text-slate-500">Compliance</p>
        <h1 className="text-3xl font-semibold text-slate-900">Governance cockpit</h1>
        <p className="text-slate-600 mt-2">
          Regulator-grade evidence locker. Owners and admins only. Plan level: <span className="font-medium">{planKey.toUpperCase()}</span>.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        {[{ label: 'Employees in scope', value: employees.length }, { label: 'Pass', value: totals.PASS }, { label: 'Fail', value: totals.FAIL }, { label: 'Incomplete', value: totals.INCOMPLETE }].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="text-3xl font-semibold text-slate-900">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-600">Risk monitoring</p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Missing required certs</span>
              <span className="font-semibold text-rose-600">{totals.missing}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Expiring (30d)</span>
              <span className="font-semibold text-amber-600">{totals.expiring}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Snapshots</span>
              <span className="font-semibold text-slate-900">{snapshots}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <p className="text-sm font-semibold text-emerald-700">Retention & governance</p>
          <ul className="mt-4 space-y-2 text-sm text-emerald-900">
            <li>Last snapshot: {lastSnapshot ? lastSnapshot.createdAt.toISOString() : '—'}</li>
            <li>Last export: {lastExport ? lastExport.createdAt.toISOString() : '—'}</li>
            <li>Retention: 7 years (immutable)</li>
          </ul>
          {isAdvanced ? (
            <p className="mt-4 text-xs text-emerald-700">Enterprise governance controls active.</p>
          ) : (
            <p className="mt-4 text-xs text-emerald-700">Upgrade to Enterprise for dashboards, historical snapshots, and exports.</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-600">Quick links</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-800">
            <li><a className="text-indigo-600 hover:underline" href="/compliance/employees">Employee roster</a></li>
            <li><a className="text-indigo-600 hover:underline" href="/compliance/documents">Document library</a></li>
            {isAdvanced ? (
              <li><a className="text-indigo-600 hover:underline" href="/api/compliance/export?format=json">Download JSON export</a></li>
            ) : (
              <li className="text-slate-400">Exports unlock on Enterprise</li>
            )}
          </ul>
        </div>
      </section>

      {isAdvanced && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500">Enterprise dashboard</p>
              <h2 className="text-xl font-semibold text-slate-900">Historical snapshots</h2>
              <p className="text-sm text-slate-500">Inspectors see immutable payloads; QR tokens included for audit binders.</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Hash</th>
                  <th className="px-4 py-3">QR token</th>
                </tr>
              </thead>
              <tbody>
                {recentSnapshots.map((snapshot) => (
                  <tr key={snapshot.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{snapshot.employee.firstName} {snapshot.employee.lastName}</div>
                      <div className="text-xs text-slate-500">#{snapshot.employee.employeeId}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{snapshot.createdAt.toISOString()}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{snapshot.snapshotHash}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{snapshot.qrToken?.token ?? '—'}</td>
                  </tr>
                ))}
                {recentSnapshots.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-400">No snapshots yet. Run a manual verification.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">Certification presets</p>
            <h2 className="text-xl font-semibold text-slate-900">Global preset registry</h2>
            <p className="text-sm text-slate-500">Rename, reorder, or disable presets ("Other" rows locked by policy).</p>
          </div>
        </div>
        <div className="mt-6 space-y-6">
          {PRESET_CATEGORY_ORDER.filter((category) => groupedPresets[category]?.length).map((category) => {
            const items = groupedPresets[category] ?? []
            return (
              <div key={category} className="rounded-xl border border-slate-100 p-4">
                <p className="text-sm font-semibold text-slate-600 mb-3">{category}</p>
                <div className="divide-y divide-slate-100">
                  {items.map((preset) => (
                    <form
                      key={preset.id}
                      action={updatePresetAction}
                      className="flex flex-col gap-4 py-3 md:flex-row md:items-center"
                    >
                      <input type="hidden" name="presetId" value={preset.id} />
                      <div className="flex-1">
                        <input
                          name="name"
                          defaultValue={preset.name}
                          disabled={preset.locked}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          name="enabled"
                          defaultChecked={preset.enabled}
                          disabled={preset.isOther}
                          className="rounded"
                        />
                        <span>{preset.enabled ? 'Enabled' : 'Disabled'}</span>
                      </label>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span>Order</span>
                        <input
                          type="number"
                          name="order"
                          defaultValue={preset.order}
                          className="w-16 rounded border border-slate-200 px-2 py-1"
                        />
                      </div>
                      <button
                        type="submit"
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Save
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
