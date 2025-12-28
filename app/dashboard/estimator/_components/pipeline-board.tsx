import Link from 'next/link'
import type { PipelineEstimateRow } from '@/lib/estimating/dashboard'
import { formatDistanceToNow } from 'date-fns'

const STATUS_META: Record<string, { label: string; helper: string }> = {
  DRAFT: { label: 'Draft estimates', helper: 'Pricing in progress' },
  AWAITING_APPROVAL: { label: 'Awaiting approval', helper: 'Estimator submitted' },
  APPROVED: { label: 'Approved estimates', helper: 'Ready for dispatch handoff' },
  REVISION_REQUIRED: { label: 'Returned to user', helper: 'Needs revisions' },
  SENT_TO_DISPATCH: { label: 'Sent to dispatch', helper: 'Queued for work orders' },
}

type Props = {
  pipelines: Record<string, PipelineEstimateRow[]>
  selectedEstimateId?: string | null
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function PipelineBoard({ pipelines, selectedEstimateId }: Props) {
  return (
    <div className="space-y-6">
      {Object.entries(STATUS_META).map(([status, meta]) => {
        const rows = pipelines[status] ?? []
        return (
          <section key={status} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{meta.label}</p>
                <p className="text-sm text-slate-500">{meta.helper}</p>
              </div>
              <span className="text-sm font-semibold text-slate-700">{rows.length} active</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="pb-2 pr-4">Quote</th>
                    <th className="pb-2 pr-4">Contact</th>
                    <th className="pb-2 pr-4">Project</th>
                    <th className="pb-2 pr-4">Industry</th>
                    <th className="pb-2 pr-4">Total</th>
                    <th className="pb-2 pr-4">Revision</th>
                    <th className="pb-2">Last updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.id} className={row.id === selectedEstimateId ? 'bg-amber-50/50' : undefined}>
                      <td className="py-3 pr-4 font-semibold text-slate-800">
                        <Link href={`/dashboard/estimator?estimateId=${row.id}`} className="hover:underline">
                          {row.quoteNumber}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-slate-700">{row.contact.name}</td>
                      <td className="py-3 pr-4 text-slate-700">{row.projectName}</td>
                      <td className="py-3 pr-4 text-slate-600">{row.industry}</td>
                      <td className="py-3 pr-4 font-semibold text-slate-900">{currency.format(row.total)}</td>
                      <td className="py-3 pr-4 text-slate-600">v{row.revisionNumber}</td>
                      <td className="py-3 text-slate-500">{formatDistanceToNow(new Date(row.lastUpdated), { addSuffix: true })}</td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-sm text-slate-400">
                        No estimates in this state.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </div>
  )
}
