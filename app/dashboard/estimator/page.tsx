import Link from 'next/link'
import { requireEstimatorContext } from '@/lib/estimating/auth'
import { loadEstimatingDashboard, type EstimatingDashboardPayload } from '@/lib/estimating/dashboard'
import { EstimatingAnalyticsPanel } from './_components/estimating-analytics'
import { PipelineBoard } from './_components/pipeline-board'
import { CreateEstimateForm } from './_components/create-estimate-form'

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

export const dynamic = 'force-dynamic'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export default async function EstimatorDashboard({ searchParams }: PageProps) {
  const { companyId, userId, role } = await requireEstimatorContext()
  const selectedEstimateId = typeof searchParams?.estimateId === 'string' ? searchParams.estimateId : null

  const payload = await loadEstimatingDashboard({
    companyId,
    viewer: { role, userId },
    selectedEstimateId,
  })

  const normalizedPipelines: Record<string, EstimatingDashboardPayload['pipelines'][keyof EstimatingDashboardPayload['pipelines']]> = {
    ...payload.pipelines,
    REVISION_REQUIRED: payload.pipelines.RETURNED_TO_USER ?? [],
  }

  const highlightId = selectedEstimateId ?? payload.selectedEstimate?.estimate.id ?? null

  return (
    <div className="space-y-8 px-6 pb-12 pt-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Estimator Dashboard</p>
        <h1 className="text-3xl font-bold text-slate-900">Control plane for pricing readiness</h1>
        <p className="text-slate-600">
          Monitor queues, approvals, and dispatch handoffs here. Editing lives inside the estimating workbench.
        </p>
      </header>

      <EstimatingAnalyticsPanel analytics={payload.analytics} />

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <PipelineBoard pipelines={normalizedPipelines} selectedEstimateId={highlightId} />
        <div className="space-y-6">
          <CreateEstimateForm contacts={payload.contacts} deals={payload.deals} />
          <DispatchVisibilityCard selected={payload.selectedEstimate} />
        </div>
      </section>
    </div>
  )
}

type DispatchVisibilityCardProps = {
  selected: EstimatingDashboardPayload['selectedEstimate']
}

function DispatchVisibilityCard({ selected }: DispatchVisibilityCardProps) {
  if (!selected) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Dispatch handoff</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-900">Select an estimate to inspect</h3>
        <p className="mt-2 text-sm text-slate-600">
          Choose a row from the pipeline board or open the workbench to review lifecycle controls and dispatch requests.
        </p>
        <Link className="mt-4 inline-flex items-center text-sm font-semibold text-blue-600" href="/estimating">
          Open workbench ↗
        </Link>
      </section>
    )
  }

  const { estimate, revision, dispatchRequestId } = selected

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Dispatch handoff</p>
      <h3 className="mt-1 text-lg font-semibold text-slate-900">{estimate.quoteNumber}</h3>
      <dl className="mt-3 space-y-2 text-sm text-slate-700">
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Status</dt>
          <dd className="font-semibold text-slate-900">{estimate.status}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Revision</dt>
          <dd className="font-semibold text-slate-900">v{revision.revisionNumber}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Grand total</dt>
          <dd className="font-semibold text-slate-900">{currency.format(revision.grandTotal)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Dispatch request</dt>
          <dd className="font-semibold text-slate-900">{dispatchRequestId ?? 'Not queued'}</dd>
        </div>
      </dl>
      <Link className="mt-4 inline-flex items-center text-sm font-semibold text-blue-600" href={`/estimating/${estimate.id}`}>
        Open estimate ↗
      </Link>
    </section>
  )
}
