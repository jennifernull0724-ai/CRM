'use client'

import { useMemo, useState } from 'react'
import type { AssetStatus } from '@prisma/client'

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

type Props = {
  workOrderId: string
  disabled: boolean
  assets: AssetOption[]
  assignAssetAction: (formData: FormData) => Promise<void>
}

const STATUS_BADGES: Record<AssetStatus, string> = {
  IN_SERVICE: 'bg-emerald-100 text-emerald-700',
  OUT_OF_SERVICE: 'bg-rose-100 text-rose-700',
  MAINTENANCE: 'bg-amber-100 text-amber-700',
}

const STATUS_LABELS: Record<AssetStatus, string> = {
  IN_SERVICE: 'In service',
  OUT_OF_SERVICE: 'Out of service',
  MAINTENANCE: 'Maintenance hold',
}

export function AssetAssignmentPanel({ workOrderId, disabled, assets, assignAssetAction }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return assets
    }
    return assets.filter((asset) => {
      const haystack = `${asset.assetName} ${asset.assetType} ${asset.subType ?? ''} ${asset.assetNumber}`.toLowerCase()
      return haystack.includes(normalized)
    })
  }, [assets, query])

  const visible = filtered.slice(0, 8)

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-700" htmlFor={`asset-search-${workOrderId}`}>
          Search assets
        </label>
        <input
          id={`asset-search-${workOrderId}`}
          type="search"
          disabled={disabled}
          placeholder="Name, unit number, or type"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
        />
        {disabled ? (
          <p className="text-xs text-slate-500">Work order is locked (completed or cancelled). Asset assignments are read-only.</p>
        ) : (
          <p className="text-xs text-slate-500">Dispatch can assign multiple assets. Out-of-service assets will show a warning only.</p>
        )}
      </div>

      <ul className="mt-4 space-y-3">
        {visible.length === 0 ? (
          <li className="text-xs text-slate-500">No assets match that search.</li>
        ) : (
          visible.map((asset) => (
            <li key={asset.id} className="rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{asset.assetName}</p>
                  <p className="text-xs text-slate-500">
                    {asset.assetType}
                    {asset.subType ? ` · ${asset.subType}` : ''} · Asset {asset.assetNumber}
                  </p>
                  {asset.location ? (
                    <p className="text-xs text-slate-500">Staged at {asset.location}</p>
                  ) : null}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGES[asset.status]}`}>
                  {STATUS_LABELS[asset.status]}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
                <p>{asset.activeAssignments ? `${asset.activeAssignments} active assignment${asset.activeAssignments === 1 ? '' : 's'}` : 'Available'}</p>
                {asset.status !== 'IN_SERVICE' ? (
                  <p className="font-semibold text-rose-600">
                    {asset.status === 'MAINTENANCE' ? 'Maintenance hold' : 'Out of service'}
                  </p>
                ) : null}
              </div>
              <form action={assignAssetAction} className="mt-3">
                <input type="hidden" name="workOrderId" value={workOrderId} />
                <input type="hidden" name="assetId" value={asset.id} />
                <button
                  type="submit"
                  disabled={disabled || asset.status !== 'IN_SERVICE'}
                  className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Assign asset
                </button>
              </form>
              {asset.status !== 'IN_SERVICE' ? (
                <p className="mt-2 text-[11px] text-rose-600">
                  Only in-service assets can be assigned. Update status from the asset registry.
                </p>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
