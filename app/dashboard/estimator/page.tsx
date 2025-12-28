import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { formatDistanceToNow } from 'date-fns'
import { authOptions } from '@/lib/auth'
import { loadEstimatingDashboard, type EstimateWorkspaceData } from '@/lib/estimating/dashboard'
import type { StandardBrandingInfo } from '@/lib/dashboard/standardSettings'
import { CreateEstimateForm } from './_components/create-estimate-form'
import { PipelineBoard } from './_components/pipeline-board'
import { EstimatingAnalyticsPanel } from './_components/estimating-analytics'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function formatStatus(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

type PageProps = {
  searchParams?: { estimateId?: string }
}

export default async function EstimatorDashboardPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.companyId) {
    redirect('/login?from=/dashboard/estimator')
  }

  const { estimateId } = searchParams ?? {}
  const payload = await loadEstimatingDashboard({
    companyId: session.user.companyId,
    selectedEstimateId: estimateId,
  })

  const headerStats = [
    { label: 'Active estimates', value: payload.analytics.totalEstimates },
    { label: 'Preset families', value: payload.presets.length },
    { label: 'Live contacts', value: payload.contacts.length },
    { label: 'Deals monitored', value: payload.deals.length },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-2xl shadow-slate-900/20 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Estimator control tower</p>
          <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Pipeline, approvals, handoff</h1>
              <p className="mt-1 text-sm text-slate-200">
                Every card, email, and PDF finalizes here. Live data is sourced from Prisma + server actions, no placeholders left.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {headerStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-right">
                  <p className="text-[0.65rem] uppercase tracking-wider text-slate-300">{stat.label}</p>
                  <p className="text-lg font-semibold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <SelectedEstimateWorkspace data={payload.selectedEstimate} branding={payload.settings.branding} />

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <PipelineBoard pipelines={payload.pipelines} selectedEstimateId={payload.selectedEstimate?.estimate.id ?? null} />
          <div className="space-y-6">
            <CreateEstimateForm contacts={payload.contacts} deals={payload.deals} />
            <EstimatingAnalyticsPanel analytics={payload.analytics} />
          </div>
        </div>
      </div>
    </div>
  )
}

function HtmlPreview({ label, html }: { label: string; html: string | null }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      {html ? (
        <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p className="mt-2 text-sm text-slate-400">No content provided.</p>
      )}
    </div>
  )
}

function SelectedEstimateWorkspace({
  data,
  branding,
}: {
  data: EstimateWorkspaceData | null
  branding: StandardBrandingInfo
}) {
  if (!data) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-200 bg-white/80 p-8 text-center text-slate-600">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Active workspace</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Select any estimate from the pipelines</h2>
        <p className="mt-2 text-sm text-slate-500">
          Choose a quote from the tables below to load revisions, line items, approvals, PDFs, and dispatch readiness in real-time.
        </p>
      </section>
    )
  }

  const { estimate, revision, lineItems, revisionHistory } = data
  const totalDisplay = currency.format(revision.manualOverrideTotal ?? revision.grandTotal)
  const hasManualOverride = revision.manualOverrideTotal !== null && revision.manualOverrideTotal !== undefined
  const markupText = hasManualOverride
    ? `${currency.format(revision.manualOverrideTotal ?? 0)} override`
    : currency.format(revision.grandTotal)
  const visibleLineItems = lineItems.slice(0, 6)

  const summary = [
    { label: 'Status', value: formatStatus(estimate.status) },
    { label: 'Revision', value: `v${revision.revisionNumber}` },
    { label: 'Grand total', value: totalDisplay },
    {
      label: 'Markup %',
      value:
        revision.markupPercent !== null && revision.markupPercent !== undefined ? `${revision.markupPercent.toFixed(1)}%` : '—',
    },
    {
      label: 'Overhead %',
      value:
        revision.overheadPercent !== null && revision.overheadPercent !== undefined
          ? `${revision.overheadPercent.toFixed(1)}%`
          : '—',
    },
    { label: 'Line items', value: lineItems.length.toString() },
    { label: 'Dispatch', value: data.dispatchRequestId ? 'Queued' : 'Not sent' },
    { label: 'Last touch', value: formatDistanceToNow(new Date(revision.updatedAt), { addSuffix: true }) },
  ]

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active workspace</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">{estimate.quoteNumber}</h2>
          <p className="text-sm text-slate-600">
            {estimate.contact.name} · {revision.projectName}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-white">{formatStatus(estimate.status)}</span>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-slate-600">{revision.industry}</span>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-slate-600">{markupText}</span>
          </div>
        </div>
        {branding.pdfLogoUrl ? (
          <div className="flex flex-col items-center gap-2 text-xs text-slate-500">
            <img src={branding.pdfLogoUrl} alt="PDF logo" className="h-14 w-auto rounded-2xl border border-slate-100 bg-white p-3" />
            <span>PDF branding</span>
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="text-[0.65rem] uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Line items</p>
            <p className="text-xs text-slate-400">Sorted by preset enforcement</p>
          </div>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Preset</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Qty · Unit</th>
                  <th className="px-4 py-3">Unit cost</th>
                  <th className="px-4 py-3">Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleLineItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{item.presetLabel}</td>
                    <td className="px-4 py-3 text-slate-600">{item.description}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{currency.format(item.unitCost)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{currency.format(item.lineTotal)}</td>
                  </tr>
                ))}
                {!visibleLineItems.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">
                      No line items yet. Add presets from the workspace.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {lineItems.length > visibleLineItems.length && (
            <p className="mt-2 text-xs text-slate-500">{lineItems.length - visibleLineItems.length} additional items hidden.</p>
          )}
        </div>
        <div className="space-y-4">
          <HtmlPreview label="Scope of work" html={revision.scopeOfWork} />
          <HtmlPreview label="Assumptions" html={revision.assumptions} />
          <HtmlPreview label="Exclusions" html={revision.exclusions} />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Revision log</p>
        <ol className="mt-3 space-y-3 text-sm text-slate-700">
          {revisionHistory.map((entry) => (
            <li key={entry.id} className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">v{entry.revisionNumber}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{formatStatus(entry.status)}</p>
                </div>
                <div className="text-xs text-slate-500">
                  <span className="mr-2">Created {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}</span>
                  {entry.submittedAt ? <span className="mr-2">Submitted {formatDistanceToNow(new Date(entry.submittedAt), { addSuffix: true })}</span> : null}
                  {entry.approvedAt ? <span>Approved {formatDistanceToNow(new Date(entry.approvedAt), { addSuffix: true })}</span> : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
