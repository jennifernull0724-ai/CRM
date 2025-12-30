import { notFound } from 'next/navigation'
import { EstimateStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireEstimatorContext } from '@/lib/estimating/auth'
import { listEstimatingPresets, groupPresetsByIndustry } from '@/lib/estimating/presets'
import {
  saveEstimateLineItemAction,
  deleteEstimateLineItemAction,
  setEstimatePricingAction,
  submitEstimateAction,
  approveEstimateAction,
  returnEstimateToUserAction,
  sendEstimateToDispatchAction,
} from '@/app/dashboard/estimator/actions'

async function logEstimateView(companyId: string, actorId: string, estimateId: string) {
  await prisma.accessAuditLog.create({
    data: {
      companyId,
      actorId,
      action: 'ESTIMATE_VIEWED',
      metadata: {
        estimateId,
        timestamp: new Date().toISOString(),
      },
    },
  })
}

export default async function EstimateDetailPage({ params }: { params: { estimateId: string } }) {
  const { companyId, userId } = await requireEstimatorContext()
  const estimateId = params.estimateId

  const [record, presets] = await Promise.all([
    prisma.estimate.findFirst({
      where: { id: estimateId, companyId },
      include: {
        contact: { select: { firstName: true, lastName: true, email: true } },
        currentRevision: {
          include: {
            lineItems: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
          },
        },
      },
    }),
    listEstimatingPresets(companyId),
  ])

  if (!record || !record.currentRevision) {
    notFound()
  }

  await logEstimateView(companyId, userId, record.id)

  const contactName = `${record.contact.firstName} ${record.contact.lastName}`.trim()
  const revision = record.currentRevision
  const lineItems = revision.lineItems.map((item) => ({
    ...item,
    quantity: Number(item.quantity),
    unitCost: Number(item.unitCost),
    lineTotal: Number(item.lineTotal),
    presetCategory: item.presetCategory ?? item.presetIndustry,
  }))
  const groupedPresets = groupPresetsByIndustry(presets)
  const subtotal = revision.subtotal ? Number(revision.subtotal) : 0
  const markupPercent = revision.markupPercent ? Number(revision.markupPercent) : null
  const markupAmount = revision.markupAmount ? Number(revision.markupAmount) : null
  const overheadPercent = revision.overheadPercent ? Number(revision.overheadPercent) : null
  const overheadAmount = revision.overheadAmount ? Number(revision.overheadAmount) : null
  const grandTotal = revision.grandTotal ? Number(revision.grandTotal) : 0
  const manualOverrideTotal = revision.manualOverrideTotal ? Number(revision.manualOverrideTotal) : null
  const locked = revision.locked || record.status === 'APPROVED' || record.status === 'SENT_TO_DISPATCH'
  const status = record.status

  const canSubmit = status === 'DRAFT' || status === EstimateStatus.RETURNED_TO_USER
  const canApprove = status === 'AWAITING_APPROVAL'
  const canReturn = status === 'AWAITING_APPROVAL'
  const canDispatch = status === 'APPROVED'
  const isDispatched = status === 'SENT_TO_DISPATCH'

  const formatCurrency = (value: number | null) => (value === null ? '—' : `$${value.toFixed(2)}`)

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-8">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">Estimate</p>
        <h1 className="text-2xl font-semibold text-slate-900">{record.quoteNumber}</h1>
        <p className="text-sm text-slate-600">Status: {record.status} · Revision {revision.revisionNumber}</p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Header</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Project Name</dt>
            <dd className="text-sm text-slate-900">{revision.projectName}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Project Location</dt>
            <dd className="text-sm text-slate-900">{revision.projectLocation ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Industry</dt>
            <dd className="text-sm text-slate-900">{revision.industry}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Contact</dt>
            <dd className="text-sm text-slate-900">{contactName}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Lifecycle</h2>
            <p className="text-xs text-slate-600">Server-enforced transitions only.</p>
            <p className="text-xs text-slate-500">Status: {status} · Revision {revision.revisionNumber}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{status}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Rev {revision.revisionNumber}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 rounded border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-700">Left Toggle — Return to User</p>
            <p className="text-xs text-slate-600">Allowed only while awaiting approval.</p>
            <form action={returnEstimateToUserAction} className="space-y-2">
              <input type="hidden" name="estimateId" value={record.id} />
              <label className="block text-xs text-slate-600">
                Reason (optional)
                <textarea
                  name="reason"
                  placeholder="Provide context for the requester"
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  disabled={!canReturn}
                />
              </label>
              <button
                type="submit"
                disabled={!canReturn}
                className="rounded bg-amber-600 px-3 py-2 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-amber-200"
              >
                Return to User
              </button>
            </form>
          </div>

          <div className="space-y-2 rounded border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-700">Right Toggle — Send to Dispatch</p>
            <p className="text-xs text-slate-600">Requires approval; queues dispatch intake.</p>
            <form action={sendEstimateToDispatchAction} className="space-y-2">
              <input type="hidden" name="estimateId" value={record.id} />
              <button
                type="submit"
                disabled={!canDispatch || isDispatched}
                className="rounded bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-emerald-200"
              >
                {isDispatched ? 'Sent to Dispatch' : 'Send to Dispatch'}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <form action={submitEstimateAction}>
            <input type="hidden" name="estimateId" value={record.id} />
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-indigo-200"
            >
              Submit for Approval
            </button>
          </form>

          <form action={approveEstimateAction}>
            <input type="hidden" name="estimateId" value={record.id} />
            <button
              type="submit"
              disabled={!canApprove}
              className="rounded bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Approve
            </button>
          </form>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Scope</h2>
        <div className="mt-2 space-y-3 text-sm text-slate-800">
          <div>
            <p className="text-xs text-slate-500">Scope of Work</p>
            <p className="whitespace-pre-wrap text-sm text-slate-900">{revision.scopeOfWork}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Assumptions</p>
            <p className="whitespace-pre-wrap text-sm text-slate-900">{revision.assumptions ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Exclusions</p>
            <p className="whitespace-pre-wrap text-sm text-slate-900">{revision.exclusions ?? '—'}</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Line Items (Revision {revision.revisionNumber})</h2>
          {locked ? <span className="text-xs text-slate-500">Revision locked</span> : null}
        </div>

        <div className="mt-3 divide-y divide-slate-100 border border-slate-100">
          {lineItems.length === 0 ? (
            <div className="p-3 text-xs text-slate-600">No line items added.</div>
          ) : (
            lineItems.map((item) => (
              <div key={item.id} className="space-y-2 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.presetLabel}</p>
                    <p className="text-xs text-slate-500">Preset · {item.presetCategory}</p>
                  </div>
                  <div className="text-right text-sm font-semibold text-slate-900">{formatCurrency(item.lineTotal)}</div>
                </div>
                <div className="grid gap-2 text-sm text-slate-800 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-slate-500">Description</p>
                    <p className="whitespace-pre-wrap">{item.description}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Quantity</p>
                    <p>
                      {item.quantity} {item.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Unit Cost</p>
                    <p>{formatCurrency(item.unitCost)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Notes</p>
                    <p className="whitespace-pre-wrap">{item.notes ?? '—'}</p>
                  </div>
                </div>

                {!locked ? (
                  <div className="rounded-md bg-slate-50 p-3">
                    <div className="grid gap-3 sm:grid-cols-6">
                      <form action={saveEstimateLineItemAction} className="contents">
                        <input type="hidden" name="estimateId" value={record.id} />
                        <input type="hidden" name="lineItemId" value={item.id} />
                        <label className="col-span-2 text-xs font-medium text-slate-600">
                          Preset
                          <select
                            name="presetId"
                            defaultValue={item.presetId}
                            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                          >
                            {(['BASE', 'RAILROAD', 'CONSTRUCTION', 'ENVIRONMENTAL'] as const).map((industry) => (
                              <optgroup key={industry} label={industry}>
                                {(groupedPresets[industry] ?? []).map((preset) => (
                                  <option key={preset.id} value={preset.id}>
                                    {preset.label}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs font-medium text-slate-600">
                          Qty
                          <input
                            name="quantity"
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue={item.quantity}
                            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                        </label>
                        <label className="text-xs font-medium text-slate-600">
                          Unit
                          <input
                            name="unit"
                            type="text"
                            defaultValue={item.unit}
                            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                        </label>
                        <label className="text-xs font-medium text-slate-600">
                          Unit Cost
                          <input
                            name="unitCost"
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue={item.unitCost}
                            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                        </label>
                        <label className="col-span-2 text-xs font-medium text-slate-600 sm:col-span-3">
                          Description (override optional)
                          <textarea
                            name="description"
                            defaultValue={item.description}
                            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                        </label>
                        <label className="col-span-2 text-xs font-medium text-slate-600 sm:col-span-3">
                          Notes
                          <textarea
                            name="notes"
                            defaultValue={item.notes ?? ''}
                            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="submit"
                            className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
                          >
                            Save
                          </button>
                        </div>
                      </form>

                      <div className="flex items-end">
                        <form action={deleteEstimateLineItemAction} className="w-full">
                          <input type="hidden" name="lineItemId" value={item.id} />
                          <button
                            type="submit"
                            className="w-full rounded border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>

        {!locked ? (
          <div className="mt-4 rounded-md border border-dashed border-slate-300 p-4">
            <h3 className="text-sm font-semibold text-slate-800">Add Line Item (preset required)</h3>
            <p className="text-xs text-slate-600">Defaults come from the preset; override fields are optional before approval.</p>
            <form action={saveEstimateLineItemAction} className="mt-3 grid gap-3 sm:grid-cols-6">
              <input type="hidden" name="estimateId" value={record.id} />
              <label className="col-span-2 text-xs font-medium text-slate-600">
                Preset
                <select
                  name="presetId"
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  required
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select preset
                  </option>
                  {(['BASE', 'RAILROAD', 'CONSTRUCTION', 'ENVIRONMENTAL'] as const).map((industry) => (
                    <optgroup key={industry} label={industry}>
                      {(groupedPresets[industry] ?? []).map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                Qty
                <input
                  name="quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={1}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Unit (override)
                <input
                  name="unit"
                  type="text"
                  placeholder="Defaults from preset"
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Unit Cost (override)
                <input
                  name="unitCost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Defaults from preset"
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                />
              </label>
              <label className="col-span-2 text-xs font-medium text-slate-600 sm:col-span-3">
                Description (override)
                <textarea
                  name="description"
                  placeholder="Defaults from preset"
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                />
              </label>
              <label className="col-span-2 text-xs font-medium text-slate-600 sm:col-span-3">
                Notes
                <textarea
                  name="notes"
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                />
              </label>
              <div className="flex items-center">
                <button
                  type="submit"
                  className="rounded bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Add line item
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Pricing</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 text-sm text-slate-800">
            <div className="flex justify-between"><span className="text-slate-600">Subtotal</span><span className="font-semibold">{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Markup</span><span className="font-semibold">{markupPercent === null ? '—' : `${markupPercent}% (${formatCurrency(markupAmount ?? 0)})`}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Overhead</span><span className="font-semibold">{overheadPercent === null ? '—' : `${overheadPercent}% (${formatCurrency(overheadAmount ?? 0)})`}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Grand Total</span><span className="font-semibold">{formatCurrency(manualOverrideTotal ?? grandTotal)}</span></div>
            {manualOverrideTotal !== null ? (
              <p className="text-xs text-slate-500">Manual override applied: {formatCurrency(manualOverrideTotal)} {revision.overrideReason ? `(${revision.overrideReason})` : ''}</p>
            ) : null}
          </div>

          {!locked ? (
            <form action={setEstimatePricingAction} className="grid gap-2 text-xs text-slate-700">
              <input type="hidden" name="estimateId" value={record.id} />
              <label className="flex flex-col gap-1">
                Markup %
                <input
                  name="markupPercent"
                  type="number"
                  step="0.01"
                  defaultValue={markupPercent ?? ''}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                Overhead %
                <input
                  name="overheadPercent"
                  type="number"
                  step="0.01"
                  defaultValue={overheadPercent ?? ''}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                Manual Override Total (optional)
                <input
                  name="manualOverrideTotal"
                  type="number"
                  step="0.01"
                  defaultValue={manualOverrideTotal ?? ''}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                Override Reason
                <input
                  name="overrideReason"
                  type="text"
                  defaultValue={revision.overrideReason ?? ''}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                />
              </label>
              <div>
                <button
                  type="submit"
                  className="rounded bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Save pricing
                </button>
              </div>
            </form>
          ) : (
            <p className="text-xs text-slate-500">Pricing locked for this revision.</p>
          )}
        </div>
      </section>
    </div>
  )
}
