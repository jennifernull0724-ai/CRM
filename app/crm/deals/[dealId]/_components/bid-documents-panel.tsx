import { labelForBidDocumentCategory, type BidDocumentCategoryOption } from '@/lib/crm/bidDocuments'
import type { CrmDealDetail } from '@/lib/crm/dealDetail'
import { uploadBidDocumentsAction, emailBidDocumentsAction, type BidDocumentActionState } from '../actions'
const bytesFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

type BidDocumentsPanelProps = {
  dealId: string
  documents: CrmDealDetail['bidDocuments']
  categories: BidDocumentCategoryOption[]
  emailAccounts: Array<{ id: string; provider: string; displayName: string | null; emailAddress: string }>
}

type BidAction = (prev: BidDocumentActionState, formData: FormData) => Promise<BidDocumentActionState>

function bindBidAction(action: BidAction) {
  return async (formData: FormData) => {
    await action({ success: true }, formData)
  }
}

function formatBytes(bytes: number) {
  if (!bytes || bytes < 1024) {
    return `${bytes} B`
  }
  const units = ['KB', 'MB', 'GB'] as const
  let size = bytes / 1024
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size = size / 1024
    unitIndex += 1
  }
  return `${bytesFormatter.format(size)} ${units[unitIndex]}`
}

export function BidDocumentsPanel({ dealId, documents, categories, emailAccounts }: BidDocumentsPanelProps) {
  return (
    <aside className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Bid documents</p>
          <h2 className="text-xl font-semibold text-slate-900">Pre-bid + bid-phase inputs</h2>
          <p className="text-sm text-slate-500">Plans, specs, addenda, sub quotes, maps, and customer PDFs live here. Drag-and-drop to upload multiples.</p>
        </header>

        <form action={bindBidAction(uploadBidDocumentsAction)} encType="multipart/form-data" className="mt-4 space-y-3">
          <input type="hidden" name="dealId" value={dealId} />
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</label>
          <select name="category" className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm" defaultValue="PLANS">
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Files</label>
          <input
            type="file"
            name="files"
            multiple
            required
            className="block w-full cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 px-4 py-10 text-center text-sm text-slate-500 transition hover:border-slate-500"
          />
          <p className="text-xs text-slate-400">Upload as many PDFs, images, or docs as needed. Everything is scoped to this deal only.</p>
          <button type="submit" className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Upload files
          </button>
        </form>

        <div className="mt-6 space-y-3">
          {documents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              No bid documents yet. Upload plans, specs, addenda, or sub quotes to keep estimating unblocked.
            </div>
          ) : (
            <ul className="space-y-3">
              {documents.map((doc) => {
                const category = labelForBidDocumentCategory(doc.category)
                return (
                  <li key={doc.id} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 p-4">
                    <div>
                      <p className="font-semibold text-slate-900">{doc.fileName}</p>
                      <p className="text-xs uppercase tracking-wide text-slate-400">{category.label}</p>
                      <p className="text-xs text-slate-500">
                        Uploaded {doc.uploadedAt.toLocaleString()} by {doc.uploadedBy.name ?? 'Unknown'} · {category.description}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-right text-xs text-slate-500">
                      <span className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600">{formatBytes(doc.fileSize)}</span>
                      <a
                        href={`/api/crm/deals/${dealId}/bid-documents/${doc.id}/download`}
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                      >
                        Download
                      </a>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Batch email</p>
          <h3 className="text-xl font-semibold text-slate-900">Send bid packet</h3>
          <p className="text-sm text-slate-500">Select documents, choose subs/estimators, and email attachments directly. Every send is audited.</p>
        </header>

        {documents.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Upload at least one document to enable batch email.</p>
        ) : emailAccounts.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">Connect a Gmail or Outlook account in Settings → Email to send attachments.</p>
        ) : (
          <form action={bindBidAction(emailBidDocumentsAction)} className="mt-4 space-y-3">
            <input type="hidden" name="dealId" value={dealId} />
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">Include documents</legend>
              <div className="max-h-60 space-y-2 overflow-auto rounded-2xl border border-slate-100 p-3">
                {documents.map((doc) => {
                  const category = labelForBidDocumentCategory(doc.category)
                  return (
                    <label key={doc.id} className="flex items-start gap-2 rounded-xl border border-transparent p-2 text-sm text-slate-600 hover:border-slate-200">
                      <input type="checkbox" name="documentIds" value={doc.id} className="mt-1 rounded" />
                      <div>
                        <p className="font-semibold text-slate-900">{doc.fileName}</p>
                        <p className="text-xs text-slate-500">{category.label} · {formatBytes(doc.fileSize)}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email account</label>
            <select name="accountId" className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm">
              {emailAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.displayName ?? account.emailAddress} · {account.provider}
                </option>
              ))}
            </select>

            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">To</label>
            <input name="to" required className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm" placeholder="addr@example.com, sub@company.com" />

            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">CC</label>
            <input name="cc" className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm" placeholder="Optional" />

            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">BCC</label>
            <input name="bcc" className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm" placeholder="Optional" />

            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</label>
            <input name="subject" required className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm" placeholder="Bid package for ..." />

            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Message</label>
            <textarea name="body" required rows={5} className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm" defaultValue={`Hi team,\n\nAttaching the latest bid package for ${documentPreviewName(documents)}.`} />

            <button type="submit" className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Email selected files
            </button>
          </form>
        )}
      </section>
    </aside>
  )
}

function documentPreviewName(documents: CrmDealDetail['bidDocuments']) {
  if (!documents.length) {
    return 'this deal'
  }
  return documents[0].fileName
}
