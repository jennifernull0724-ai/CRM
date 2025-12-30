import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { formatDistanceToNow } from 'date-fns'
import type { AssetStatus } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { listCompanyAssets, getAssetDashboardSummary } from '@/lib/assets/registry'
import { upsertAssetAction } from '@/app/dashboard/(governance)/assets/actions'

const STATUS_LABELS: Record<AssetStatus, string> = {
  IN_SERVICE: 'In service',
  OUT_OF_SERVICE: 'Out of service',
  MAINTENANCE: 'Maintenance hold',
}

const STATUS_CLASSES: Record<AssetStatus, string> = {
  IN_SERVICE: 'bg-emerald-100 text-emerald-700',
  OUT_OF_SERVICE: 'bg-rose-100 text-rose-700',
  MAINTENANCE: 'bg-amber-100 text-amber-700',
}

const SUBTYPE_PRESETS = [
  'Bucket Truck',
  'Hi-Rail Truck',
  'Vacuum Excavator',
  'Signal Truck',
  'Service Truck',
  'Lowboy Trailer',
  'Hydro Excavator',
  'Support Vehicle',
]

export default async function AssetRegistryPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?from=/dashboard/assets')
  }

  if (!session.user.companyId) {
    redirect('/signup')
  }

  const role = session.user.role.toLowerCase()

  if (!['owner', 'admin'].includes(role)) {
    redirect('/dashboard')
  }

  const [assets, summary] = await Promise.all([
    listCompanyAssets(session.user.companyId),
    getAssetDashboardSummary(session.user.companyId),
  ])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Asset registry</p>
        <h1 className="text-3xl font-bold text-slate-900">Company-controlled fleet list</h1>
        <p className="text-slate-600">
          Only owners and admins can edit assets. Dispatch can assign but never mutate these records.
        </p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'Total assets', value: summary.total, helper: 'Cataloged across company' },
            { label: 'In service', value: summary.inService, helper: 'Assignable today' },
            { label: 'Maintenance hold', value: summary.maintenance, helper: 'Awaiting green tag' },
            { label: 'Out of service', value: summary.outOfService, helper: 'Visible w/ warning' },
            { label: 'Assigned to open jobs', value: summary.activelyAssigned, helper: 'Scheduled or active work' },
          ].map((tile) => (
            <SummaryTile key={tile.label} label={tile.label} value={tile.value} helper={tile.helper} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Add asset</h2>
        <p className="text-sm text-slate-500">Owners and admins publish fleet items. Dispatch assignments only reference this catalog.</p>
        <form action={upsertAssetAction} className="mt-4 grid gap-4 md:grid-cols-3">
          <input name="name" placeholder="Asset name" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
          <input name="assetNumber" placeholder="Asset number / unit" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input name="assetType" placeholder="Primary type (e.g. Hi-rail)" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input name="subType" placeholder="Subtype (optional)" list="asset-subtypes" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <select name="status" required defaultValue="IN_SERVICE" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input name="location" placeholder="Current location (optional)" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
          <textarea name="notes" placeholder="Notes / restrictions" rows={3} className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-3" />
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white md:col-span-3">
            Save asset
          </button>
        </form>
      </section>
      <datalist id="asset-subtypes">
        {SUBTYPE_PRESETS.map((preset) => (
          <option key={preset} value={preset} />
        ))}
      </datalist>

      <section className="space-y-4">
        {assets.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500">
            No assets recorded yet.
          </div>
        ) : (
          assets.map((asset) => (
            <article key={asset.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{asset.assetName}</p>
                  <p className="text-sm text-slate-500">
                    {asset.assetType}
                    {asset.subType ? ` · ${asset.subType}` : ''} · Asset {asset.assetNumber}
                  </p>
                  {asset.location ? (
                    <p className="text-xs text-slate-500">Staged at {asset.location}</p>
                  ) : null}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASSES[asset.status]}`}>
                  {STATUS_LABELS[asset.status]}
                </span>
              </div>
              <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">
                Registered {formatDistanceToNow(asset.createdAt, { addSuffix: true })}
                {asset.createdBy?.name ? ` · by ${asset.createdBy.name}` : ''}
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-[2fr_1fr]">
                <details className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-800">Edit asset</summary>
                  <form action={upsertAssetAction} className="mt-3 grid gap-3">
                    <input type="hidden" name="assetId" value={asset.id} />
                    <input name="name" defaultValue={asset.assetName} required className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    <input name="assetNumber" defaultValue={asset.assetNumber} required className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    <input name="assetType" defaultValue={asset.assetType} required className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    <input name="subType" defaultValue={asset.subType ?? ''} list="asset-subtypes" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    <select name="status" defaultValue={asset.status} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <input
                      name="location"
                      defaultValue={asset.location ?? ''}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Primary location"
                    />
                    <textarea
                      name="notes"
                      defaultValue={asset.notes ?? ''}
                      rows={3}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Notes"
                    />
                    <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
                      Update asset
                    </button>
                  </form>
                </details>

                <div className="rounded-2xl border border-slate-100 p-4">
                  <p className="text-sm font-semibold text-slate-700">Active assignments</p>
                  {asset.activeAssignments.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">Not assigned to any open work orders.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {asset.activeAssignments.map((assignment) => (
                        <li key={assignment.assignmentId} className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          <p className="font-semibold text-slate-800">{assignment.workOrderTitle}</p>
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">{assignment.workOrderStatus}</p>
                          <p className="text-[11px] text-slate-500">
                            Assigned {formatDistanceToNow(assignment.assignedAt, { addSuffix: true })}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  )
}

function SummaryTile({ label, value, helper }: { label: string; value: number; helper?: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
    </div>
  )
}
