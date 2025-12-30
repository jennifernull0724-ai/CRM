import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWorkOrderDetail, type DispatchWorkOrder } from '@/lib/dispatch/workOrders'
import { listAssignableAssets } from '@/lib/assets/registry'
import { loadDispatchEmailComposerData, type DispatchEmailComposerData } from '@/lib/dispatch/emailComposer'
import { AssetAssignmentPanel } from '@/app/dispatch/_components/asset-assignment-panel'
import { EmployeeAssignmentPanel } from '@/app/dispatch/_components/employee-assignment-panel'
import {
  assignAssetToWorkOrderAction,
  assignEmployeeToWorkOrderAction,
  removeAssetFromWorkOrderAction,
  removeEmployeeAssignmentAction,
  uploadWorkOrderDocumentAction,
  updateWorkOrderNotesAction,
  sendWorkOrderEmailAction,
  transitionDispatchWorkOrderStatusAction,
} from '@/app/dispatch/actions'
import { TERMINAL_WORK_ORDER_STATUSES, WORK_ORDER_STATUS_FLOW } from '@/lib/dispatch/workOrderLifecycle'
import { formatGapCounts } from '@/lib/dispatch/compliance'

export const dynamic = 'force-dynamic'

export default async function DispatchWorkOrderDetailPage({ params }: { params: { workOrderId: string } }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.companyId) {
    redirect(`/login?from=/dispatch/work-orders/${params.workOrderId}`)
  }

  const [workOrder, assets, emailComposerData] = await Promise.all([
    getWorkOrderDetail(params.workOrderId, session.user.companyId),
    listAssignableAssets(session.user.companyId),
    loadDispatchEmailComposerData(session.user.companyId),
  ])

  if (!workOrder) {
    notFound()
  }

  const isLocked = TERMINAL_WORK_ORDER_STATUSES.includes(workOrder.status)
  const nextStatuses = WORK_ORDER_STATUS_FLOW[workOrder.status] ?? []
  const sendEmailAction = async (formData: FormData) => {
    await sendWorkOrderEmailAction(workOrder.id, formData)
  }

  return (
    <div className="space-y-8 px-4 pb-12 pt-8 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dispatch/work-orders" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
          ← Back to work orders
        </Link>
        <Link
          href={`/api/work-orders/${workOrder.id}/pdf`}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
        >
          Generate PDF
        </Link>
      </div>

      <WorkOrderOverview workOrder={workOrder} />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <WorkOrderNotesForm workOrder={workOrder} disabled={isLocked} />
          <AssignmentsList workOrder={workOrder} disabled={isLocked} />
          <AssetsList workOrder={workOrder} disabled={isLocked} />
          <DocumentLibrary workOrder={workOrder} />
          <ActivityTimeline workOrder={workOrder} />
        </div>
        <div className="space-y-8">
          <StatusPanel workOrder={workOrder} nextStatuses={nextStatuses} disabled={isLocked} />
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Crew assignment</p>
            <p className="text-xs text-slate-500">Search active compliance employees. Override reasons required when gaps exist.</p>
            <div className="mt-4">
              <EmployeeAssignmentPanel
                workOrderId={workOrder.id}
                disabled={isLocked}
                assignEmployeeAction={assignEmployeeToWorkOrderAction}
              />
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Asset assignment</p>
            <p className="text-xs text-slate-500">Only in-service assets can be attached to work orders.</p>
            <div className="mt-4">
              <AssetAssignmentPanel
                workOrderId={workOrder.id}
                disabled={isLocked}
                assets={assets}
                assignAssetAction={assignAssetToWorkOrderAction}
              />
            </div>
          </div>
          <DocumentUploadCard workOrderId={workOrder.id} disabled={isLocked} />
          <EmailComposer
            workOrder={workOrder}
            composer={emailComposerData}
            sendEmailAction={sendEmailAction}
          />
        </div>
      </div>
    </div>
  )
}

function WorkOrderOverview({ workOrder }: { workOrder: DispatchWorkOrder }) {
  const latestActivityAt = workOrder.activities[0]?.createdAt
  const pdfCount = workOrder.pdfs.length

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Work order</p>
          <h1 className="text-2xl font-semibold text-slate-900">{workOrder.title || 'Untitled work order'}</h1>
          <p className="text-sm text-slate-500">ID #{workOrder.id}</p>
        </div>
        <div className="text-right text-sm">
          <span className="rounded-full border border-slate-300 px-3 py-1 font-semibold text-slate-800">{workOrder.status}</span>
          {workOrder.dispatchPriority ? <p className="text-xs text-slate-500">Priority {workOrder.dispatchPriority}</p> : null}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Contact</p>
          <Link href={`/contacts/${workOrder.contact.id}`} className="text-sm font-semibold text-slate-900 hover:underline">
            {workOrder.contact.name}
          </Link>
          <p className="text-xs text-slate-500">{workOrder.contact.company ?? 'No company'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Dispatch status</p>
          <p className="text-sm font-semibold text-slate-900">{workOrder.dispatchStatus ?? 'Not linked'}</p>
          {workOrder.dispatchPriority ? <p className="text-xs text-slate-500">Priority {workOrder.dispatchPriority}</p> : null}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Compliance</p>
          <p className={`text-sm font-semibold ${workOrder.complianceBlocked ? 'text-rose-600' : 'text-emerald-700'}`}>
            {workOrder.complianceBlocked ? 'Blocked' : 'Clear'}
          </p>
          {workOrder.complianceBlocked && workOrder.blockReason ? <p className="text-xs text-rose-500">{workOrder.blockReason}</p> : null}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Recent activity</p>
          <p className="text-sm font-semibold text-slate-900">
            {latestActivityAt ? formatDistanceToNow(new Date(latestActivityAt), { addSuffix: true }) : 'No activity yet'}
          </p>
          <p className="text-xs text-slate-500">{workOrder.activities[0]?.actorName ?? 'System'}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Manual entry</p>
          <p className="text-sm font-semibold text-slate-900">{workOrder.manualEntry ? 'Yes' : 'No'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Assets attached</p>
          <p className="text-sm font-semibold text-slate-900">{workOrder.assets.length}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Documents</p>
          <p className="text-sm font-semibold text-slate-900">{workOrder.documents.length}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">PDF versions</p>
          <p className="text-sm font-semibold text-slate-900">{pdfCount}</p>
        </div>
      </div>
    </section>
  )
}

function WorkOrderNotesForm({ workOrder, disabled }: { workOrder: DispatchWorkOrder; disabled: boolean }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Field notes & access</p>
          <p className="text-xs text-slate-500">Update instructions, access codes, and on-site POC details.</p>
        </div>
        {disabled ? <span className="text-xs font-semibold text-slate-500">Read-only (completed/cancelled)</span> : null}
      </div>
      <form action={updateWorkOrderNotesAction} className="mt-4 grid gap-4 md:grid-cols-2">
        <input type="hidden" name="workOrderId" value={workOrder.id} />
        <label className="text-sm font-semibold text-slate-700 md:col-span-2">
          Operations notes
          <textarea
            name="operationsNotes"
            defaultValue={workOrder.operationsNotes ?? ''}
            disabled={disabled}
            rows={4}
            placeholder="Scope reminders, staging notes, etc."
            className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm disabled:bg-slate-100"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Gate / access code
          <input
            type="text"
            name="gateAccessCode"
            defaultValue={workOrder.gateAccessCode ?? ''}
            disabled={disabled}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          On-site POC
          <input
            type="text"
            name="onsitePocName"
            defaultValue={workOrder.onsitePocName ?? ''}
            disabled={disabled}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          POC phone
          <input
            type="text"
            name="onsitePocPhone"
            defaultValue={workOrder.onsitePocPhone ?? ''}
            disabled={disabled}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700 md:col-span-2">
          Special instructions
          <textarea
            name="specialInstructions"
            defaultValue={workOrder.specialInstructions ?? ''}
            disabled={disabled}
            rows={4}
            placeholder="Cover any one-off compliance or customer directives."
            className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm disabled:bg-slate-100"
          />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={disabled}
            className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Save notes
          </button>
        </div>
      </form>
    </section>
  )
}

function AssignmentsList({ workOrder, disabled }: { workOrder: DispatchWorkOrder; disabled: boolean }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Crew assignments</p>
          <p className="text-xs text-slate-500">Override acknowledgements automatically logged in activity.</p>
        </div>
        {disabled ? <span className="text-xs font-semibold text-slate-500">Read-only (completed/cancelled)</span> : null}
      </div>
      {workOrder.assignments.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No employees assigned.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {workOrder.assignments.map((assignment) => {
            const gaps = assignment.gapSummary ? formatGapCounts(assignment.gapSummary) : { missing: 0, expiring: 0 }
            return (
              <li key={assignment.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{assignment.employeeName}</p>
                    <p className="text-xs text-slate-500">{assignment.employeeRole} · {assignment.employeeTitle || 'Role not set'}</p>
                  </div>
                  <div className="text-right text-xs">
                    <span className={`rounded-full px-3 py-1 font-semibold ${assignment.overrideAcknowledged ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {assignment.overrideAcknowledged ? 'Override' : assignment.complianceStatus ?? 'UNSET'}
                    </span>
                    <p className="text-[11px] text-slate-500">Assigned {formatDistanceToNow(new Date(assignment.assignedAt), { addSuffix: true })}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Missing {gaps.missing} · Expiring {gaps.expiring}
                  {assignment.overrideReason ? ` · Reason: ${assignment.overrideReason}` : ''}
                </p>
                <form action={removeEmployeeAssignmentAction} className="mt-3 inline-block">
                  <input type="hidden" name="assignmentId" value={assignment.id} />
                  <button
                    type="submit"
                    disabled={disabled}
                    className="text-xs font-semibold text-rose-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    Remove assignment
                  </button>
                </form>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function AssetsList({ workOrder, disabled }: { workOrder: DispatchWorkOrder; disabled: boolean }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Assets attached</p>
          <p className="text-xs text-slate-500">Assignments track audit state and removal timestamps.</p>
        </div>
        {disabled ? <span className="text-xs font-semibold text-slate-500">Read-only (completed/cancelled)</span> : null}
      </div>
      {workOrder.assets.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No assets have been assigned.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {workOrder.assets.map((asset) => (
            <li key={asset.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{asset.assetName}</p>
                  <p className="text-xs text-slate-500">{asset.assetType} · {asset.assetNumber}</p>
                </div>
                <span className="text-xs font-semibold text-slate-500">{asset.statusAtAssignment}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Assigned {formatDistanceToNow(new Date(asset.assignedAt), { addSuffix: true })}
                {asset.removedAt ? ` · Removed ${formatDistanceToNow(new Date(asset.removedAt), { addSuffix: true })}` : ''}
              </p>
              {!asset.removedAt ? (
                <form action={removeAssetFromWorkOrderAction} className="mt-2 inline-block">
                  <input type="hidden" name="assignmentId" value={asset.id} />
                  <button
                    type="submit"
                    disabled={disabled}
                    className="text-xs font-semibold text-rose-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    Remove asset
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function DocumentLibrary({ workOrder }: { workOrder: DispatchWorkOrder }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Documents & PDFs</p>
          <p className="text-xs text-slate-500">Latest uploads and generated PDFs for this work order.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Documents</p>
          {workOrder.documents.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No documents uploaded.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {workOrder.documents.map((document) => (
                <li key={document.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                  <div>
                    <p className="font-semibold text-slate-900">{document.fileName}</p>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">{formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}</p>
                  </div>
                  <Link
                    href={`/api/work-orders/${workOrder.id}/documents/${document.id}`}
                    className="text-xs font-semibold text-slate-700 hover:underline"
                  >
                    Download
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">PDF versions</p>
          {workOrder.pdfs.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No PDFs generated yet.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {workOrder.pdfs.map((pdf) => (
                <li key={pdf.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                  <div>
                    <p className="font-semibold text-slate-900">Version v{pdf.version}</p>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">{formatDistanceToNow(new Date(pdf.createdAt), { addSuffix: true })}</p>
                  </div>
                  <span className="text-xs text-slate-500">{(pdf.fileSize / 1024).toFixed(0)} KB</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

function ActivityTimeline({ workOrder }: { workOrder: DispatchWorkOrder }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Activity timeline</p>
          <p className="text-xs text-slate-500">Most recent 12 activity entries.</p>
        </div>
      </div>
      {workOrder.activities.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No activity logged yet.</p>
      ) : (
        <ul className="mt-4 space-y-3 text-sm">
          {workOrder.activities.map((activity) => (
            <li key={activity.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900">{activity.type}</p>
                <p className="text-xs text-slate-500">{formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}</p>
              </div>
              <p className="text-xs text-slate-500">{activity.actorName ?? 'System event'}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function StatusPanel({
  workOrder,
  nextStatuses,
  disabled,
}: {
  workOrder: DispatchWorkOrder
  nextStatuses: string[]
  disabled: boolean
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Status transitions</p>
      <p className="text-xs text-slate-500">Move the work order through the approved lifecycle.</p>
      {nextStatuses.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No further transitions are available.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {nextStatuses.map((status) => (
            <form key={status} action={transitionDispatchWorkOrderStatusAction} className="flex items-center gap-3">
              <input type="hidden" name="workOrderId" value={workOrder.id} />
              <input type="hidden" name="nextStatus" value={status} />
              <button
                type="submit"
                disabled={disabled}
                className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                Set to {status.replace('_', ' ').toLowerCase()}
              </button>
            </form>
          ))}
        </div>
      )}
    </section>
  )
}

function DocumentUploadCard({ workOrderId, disabled }: { workOrderId: string; disabled: boolean }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Upload document</p>
      <p className="text-xs text-slate-500">Attach safety plans, customer documents, or approvals (25MB max).</p>
      <form action={uploadWorkOrderDocumentAction} className="mt-4 space-y-3" encType="multipart/form-data">
        <input type="hidden" name="workOrderId" value={workOrderId} />
        <input
          type="file"
          name="document"
          required
          disabled={disabled}
          className="w-full text-sm"
        />
        <button
          type="submit"
          disabled={disabled}
          className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          Upload document
        </button>
      </form>
    </section>
  )
}

function EmailComposer({
  workOrder,
  composer,
  sendEmailAction,
}: {
  workOrder: DispatchWorkOrder
  composer: DispatchEmailComposerData
  sendEmailAction: (formData: FormData) => Promise<void>
}) {
  const hasAccounts = composer.accounts.length > 0
  const defaultAccountId = composer.accounts[0]?.id

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Email dispatch packet</p>
      <p className="text-xs text-slate-500">Send the latest notes with an optional PDF attachment.</p>
      {!hasAccounts ? (
        <p className="mt-4 text-sm text-rose-600">Connect an email account in settings before sending dispatch emails.</p>
      ) : (
        <form action={sendEmailAction} className="mt-4 space-y-3" encType="multipart/form-data">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            From account
            <select name="accountId" defaultValue={defaultAccountId} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              {composer.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.displayName ?? account.emailAddress}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            To
            <input
              type="email"
              name="to"
              defaultValue={workOrder.contact.email ?? ''}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            CC
            <input type="text" name="cc" placeholder="Optional" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            BCC
            <input type="text" name="bcc" placeholder="Optional" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Subject
            <input
              type="text"
              name="subject"
              required
              defaultValue={`Work order ${workOrder.title || workOrder.id}`}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            HTML body
            <textarea
              name="bodyHtml"
              required
              rows={6}
              defaultValue={`<p>Hi ${workOrder.contact.name || 'team'},</p><p>Sharing the latest work order packet. Let us know if you need changes.</p>`}
              className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Plain text fallback
            <textarea
              name="bodyText"
              rows={4}
              defaultValue={`Hi ${workOrder.contact.name || 'team'},\n\nSharing the latest work order packet.`}
              className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" name="includePdf" defaultChecked />
            Include freshly generated PDF
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Attachments (optional, ≤5 files / 25MB total)
            <input type="file" name="attachments" multiple className="mt-1 w-full text-sm" />
          </label>
          <button
            type="submit"
            className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Send email
          </button>
        </form>
      )}
    </section>
  )
}
