import Link from 'next/link'
import { requireEstimatorContext } from '@/lib/estimating/auth'
import { loadEstimatingPipeline, PIPELINE_STATUSES } from '@/lib/estimating/pipeline'
import { EstimateIndustry as EstimateIndustryEnum } from '@prisma/client'
import type { EstimateIndustry as EstimateIndustryType, EstimateStatus } from '@prisma/client'

function parseDate(value: string | string[] | undefined): Date | null {
  if (!value || Array.isArray(value)) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function parseEnum<T extends string>(value: string | string[] | undefined, allowed: readonly T[]): T | null {
  if (!value || Array.isArray(value)) return null
  return allowed.includes(value as T) ? (value as T) : null
}

export default async function EstimatingPipelinePage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const { companyId } = await requireEstimatorContext()

  const status = parseEnum<EstimateStatus>(searchParams.status, PIPELINE_STATUSES)
  const industry = parseEnum<EstimateIndustryType>(searchParams.industry, [
    EstimateIndustryEnum.RAILROAD,
    EstimateIndustryEnum.CONSTRUCTION,
    EstimateIndustryEnum.ENVIRONMENTAL,
  ] as const)
  const contactId = typeof searchParams.contactId === 'string' ? searchParams.contactId : null
  const createdFrom = parseDate(searchParams.createdFrom)
  const createdTo = parseDate(searchParams.createdTo)
  const updatedFrom = parseDate(searchParams.updatedFrom)
  const updatedTo = parseDate(searchParams.updatedTo)

  const buckets = await loadEstimatingPipeline(companyId, {    status,
    industry,
    contactId,
    createdFrom,
    createdTo,
    updatedFrom,
    updatedTo,
  })

  const hasAny = PIPELINE_STATUSES.some((key) => buckets[key].length)
  if (!hasAny) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Estimating Pipeline</h1>
        <p className="text-sm text-slate-600">No estimates match the current filters.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Estimating Pipeline</h1>
          <p className="text-sm text-slate-600">Server-derived buckets with company-scoped data.</p>
        </div>
      </div>

      <div className="grid gap-6">
        {PIPELINE_STATUSES.map((statusKey) => (
          <section key={statusKey} className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="text-sm font-semibold text-slate-800">{statusKey.replace('_', ' ')}</div>
              <div className="text-xs text-slate-500">{buckets[statusKey].length} estimate(s)</div>
            </header>
            <div className="divide-y divide-slate-100">
              {buckets[statusKey].map((row) => (
                <div key={row.id} className="px-4 py-3 hover:bg-slate-50">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-slate-900">{row.projectName}</div>
                      <div className="text-xs text-slate-600">Quote {row.quoteNumber} · Rev {row.revisionNumber}</div>
                      <div className="text-xs text-slate-600">Status: {row.status}</div>
                      <div className="text-xs text-slate-600">Contact: {row.contactName}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right">
                      <div className="text-xs font-medium text-slate-700">{row.industry}</div>
                      <div className="text-xs text-slate-600">Total: {row.total === null ? '—' : `$${row.total.toFixed(2)}`}</div>
                      <div className="text-[11px] text-slate-500">Updated {row.updatedAt.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-indigo-600">
                    <Link href={`/estimating/${row.id}`}>View details</Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
