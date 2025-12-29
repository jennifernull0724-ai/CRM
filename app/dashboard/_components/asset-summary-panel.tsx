import Link from 'next/link'
import type { AssetDashboardSummary } from '@/lib/assets/registry'

type Props = {
  summary: AssetDashboardSummary
  role: 'owner' | 'admin'
}

export function AssetSummaryPanel({ summary, role }: Props) {
  const tiles = [
    { label: 'Total assets', value: summary.total, helper: 'Cataloged' },
    { label: 'In service', value: summary.inService, helper: 'Assignable' },
    { label: 'Maintenance', value: summary.maintenance, helper: 'Temporarily held' },
    { label: 'Out of service', value: summary.outOfService, helper: 'Visible w/ warning' },
    { label: 'Assigned to active jobs', value: summary.activelyAssigned, helper: 'Scheduled or running' },
  ]

  const title = role === 'owner' ? 'Owner asset readiness' : 'Admin asset readiness'
  const helper =
    role === 'owner'
      ? 'Fleet visibility is scoped to your company. Dispatch can only assign what you publish here.'
      : 'Audit each assignment before dispatch hands a unit to the field.'

  const manageHref = role === 'owner' ? '/dashboard/assets' : '/dashboard/admin/assets'

  return (
    <section className="mx-auto max-w-6xl px-4 pb-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Assets & fleet</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-600">{helper}</p>
          </div>
          <Link
            href={manageHref}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Manage asset registry
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{tile.label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{tile.value}</p>
              <p className="text-xs text-slate-500">{tile.helper}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Dispatch cannot edit registry data. Assets marked out of service still appear for assignments with a warning only.
        </p>
      </div>
    </section>
  )
}
