import type { EstimatingAnalytics } from '@/lib/estimating/dashboard'
import { formatDistanceToNow } from 'date-fns'

type Props = {
  analytics: EstimatingAnalytics
}

export function EstimatingAnalyticsPanel({ analytics }: Props) {
  const cards = [
    { label: 'Total estimates', value: analytics.totalEstimates.toString() },
    { label: 'Approved', value: analytics.approvedEstimates.toString() },
    { label: 'Returned', value: analytics.returnedEstimates.toString() },
    { label: 'Sent to dispatch', value: analytics.sentToDispatch.toString() },
    { label: 'Revision avg', value: analytics.revisionFrequency.toFixed(1) },
    { label: 'Approval turnaround', value: `${analytics.approvalTurnaroundHours.toFixed(1)} hrs` },
    { label: 'Estimate → dispatch', value: `${(analytics.conversionRate * 100).toFixed(0)}%` },
  ]

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estimating analytics</p>
          <h2 className="text-2xl font-semibold text-slate-900">Risk + approval telemetry</h2>
        </div>
        <p className="text-xs text-slate-500">Derived from real estimates, drill-down ready.</p>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="text-2xl font-semibold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 p-4">
          <p className="text-sm font-semibold text-slate-700">Status distribution</p>
          <div className="mt-4 space-y-3">
            {Object.entries(analytics.totalsByStatus).map(([status, count]) => (
              <div key={status}>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{status.replaceAll('_', ' ')}</span>
                  <span>{count}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-slate-900" style={{ width: `${analytics.totalEstimates ? Math.min(100, (count / analytics.totalEstimates) * 100) : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 p-4">
          <p className="text-sm font-semibold text-slate-700">Awaiting approvals</p>
          <ul className="mt-3 space-y-3 text-sm text-slate-600">
            {analytics.awaitingApprovals.length ? (
              analytics.awaitingApprovals.map((item) => (
                <li key={item.id} className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{item.quoteNumber}</span>
                  <span className="text-xs text-slate-500">{formatDistanceToNow(new Date(item.lastUpdated), { addSuffix: true })}</span>
                </li>
              ))
            ) : (
              <li className="text-xs text-slate-400">Queue is clear.</li>
            )}
          </ul>
          <p className="mt-4 text-sm font-semibold text-slate-700">Returned for edits</p>
          <ul className="mt-3 space-y-3 text-sm text-slate-600">
            {analytics.returnedQueue.length ? (
              analytics.returnedQueue.map((item) => (
                <li key={item.id} className="flex items-center justify-between">
                  <span>{item.quoteNumber}</span>
                  <span className="text-xs text-slate-500">{formatDistanceToNow(new Date(item.lastUpdated), { addSuffix: true })}</span>
                </li>
              ))
            ) : (
              <li className="text-xs text-slate-400">No estimates currently returned.</li>
            )}
          </ul>
        </div>
      </div>
      <div className="mt-6">
        <p className="text-sm font-semibold text-slate-700">Recent approvals</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {analytics.recentApprovals.length ? (
            analytics.recentApprovals.map((approval) => (
              <div key={`${approval.id}-${approval.revisionNumber}`} className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm">
                <p className="font-semibold text-emerald-800">{approval.quoteNumber}</p>
                <p className="text-xs text-emerald-700">v{approval.revisionNumber} · {formatDistanceToNow(new Date(approval.approvedAt), { addSuffix: true })}</p>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400">No approvals logged yet.</p>
          )}
        </div>
      </div>
    </section>
  )
}
