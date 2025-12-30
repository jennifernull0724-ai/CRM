import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDownloadUrl } from '@/lib/s3'
import { loadCrmEstimateReadonly } from '@/lib/crm/estimates'
import { emailApprovedEstimateFromCrmAction } from '@/app/crm/deals/actions'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export default async function CrmEstimateViewer({ params }: { params: { dealId: string } }) {
  const session = await auth()
  if (!session?.user?.companyId) {
    redirect(`/login?from=/crm/deals/${params.dealId}/estimate`)
  }

  const role = (session.user.role ?? 'user').toLowerCase()
  if (role !== 'user') {
    redirect('/crm')
  }

  const [view, accounts] = await Promise.all([
    loadCrmEstimateReadonly(session.user.companyId, session.user.id, params.dealId),
    prisma.emailAccount.findMany({
      where: { companyId: session.user.companyId, userId: session.user.id, deauthorizedAt: null },
      select: { id: true, provider: true, emailAddress: true, displayName: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  if (!view) {
    notFound()
  }

  const downloadUrl = await getDownloadUrl(view.document.storageKey, 180)
  const grandTotal = view.revision.manualOverrideTotal ?? view.revision.grandTotal
  const defaultSubject = `${view.estimate.quoteNumber} – Approved estimate`
  const defaultBody = `Hi ${view.contact.name},\n\nAttached is the approved estimate ${view.estimate.quoteNumber}. Let me know if you have any questions.`

  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">CRM · Estimate viewer</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">{view.estimate.quoteNumber}</h1>
            <p className="text-sm text-slate-500">Strictly read-only. Download or email the approved PDF only.</p>
          </div>
          <Link href="/crm/deals" className="text-sm font-semibold text-slate-500 hover:text-slate-800">
            Back to deals
          </Link>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Deal</p>
                  <h2 className="text-2xl font-semibold text-slate-900">{view.deal.name}</h2>
                  <p className="text-sm text-slate-500">Stage · {view.deal.stage}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-2 text-right">
                  <p className="text-xs text-slate-500">Status</p>
                  <p className="text-sm font-semibold text-slate-900">{view.estimate.status}</p>
                  <p className="text-xs text-slate-500">Rev v{view.revision.revisionNumber}</p>
                </div>
              </div>
              <dl className="mt-6 grid gap-4 sm:grid-cols-2 text-sm text-slate-600">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Project</dt>
                  <dd className="text-slate-900">{view.revision.projectName}</dd>
                  <dd className="text-xs text-slate-500">{view.revision.projectLocation ?? 'No location'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Industry</dt>
                  <dd className="text-slate-900">{view.revision.industry}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Contact</dt>
                  <dd className="text-slate-900">{view.contact.name}</dd>
                  <dd className="text-xs text-slate-500">{view.contact.email ?? 'No email'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Last updated</dt>
                  <dd className="text-slate-900">{view.revision.updatedAt.toLocaleString()}</dd>
                </div>
              </dl>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">Subtotal</p>
                  <p className="text-lg font-semibold text-slate-900">{currency.format(view.revision.subtotal)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">Adjustments</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {currency.format((view.revision.markupAmount ?? 0) + (view.revision.overheadAmount ?? 0))}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">Grand total</p>
                  <p className="text-lg font-semibold text-slate-900">{currency.format(grandTotal)}</p>
                </div>
              </div>
              {view.revision.overrideReason ? (
                <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
                  Override reason: {view.revision.overrideReason}
                </p>
              ) : null}
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-900"
                >
                  Download approved PDF
                </a>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Email PDF</p>
              {accounts.length === 0 ? (
                <p className="mt-2 text-sm text-red-600">Connect an email account before sending.</p>
              ) : (
                <form action={emailApprovedEstimateFromCrmAction} className="mt-4 space-y-3 text-sm">
                  <input type="hidden" name="dealId" value={view.deal.id} />
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Email account
                    <select
                      name="accountId"
                      required
                      defaultValue={accounts[0]?.id ?? ''}
                      className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.displayName ?? account.emailAddress} · {account.provider}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    To
                    <input
                      name="to"
                      defaultValue={view.contact.email ?? ''}
                      required
                      className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    CC
                    <input name="cc" className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm" />
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    BCC
                    <input name="bcc" className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm" />
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Subject
                    <input
                      name="subject"
                      required
                      defaultValue={defaultSubject}
                      className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Message
                    <textarea
                      name="body"
                      rows={6}
                      required
                      defaultValue={defaultBody}
                      className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <button
                    type="submit"
                    className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Email approved PDF
                  </button>
                </form>
              )}
            </section>
            <section className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Guardrails</p>
              <ul className="mt-3 list-disc space-y-1 pl-4">
                <li>Viewer is read-only. Open estimating workbench for edits.</li>
                <li>Only approved revisions appear here.</li>
                <li>Emails must include the primary contact.</li>
              </ul>
            </section>
          </div>
        </section>
      </div>
    </div>
  )
}
