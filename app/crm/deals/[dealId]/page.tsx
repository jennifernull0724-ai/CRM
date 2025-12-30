import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { auth } from '@/lib/auth'
import { loadCrmDealDetail } from '@/lib/crm/dealDetail'
import { BID_DOCUMENT_CATEGORIES } from '@/lib/crm/bidDocuments'
import { prisma } from '@/lib/prisma'

import { BidDocumentsPanel } from './_components/bid-documents-panel'

export default async function CrmDealDetailPage({ params }: { params: { dealId: string } }) {
  const session = await auth()

  if (!session?.user?.companyId) {
    redirect('/login?from=/crm/deals')
  }

  const normalizedRole = (session.user.role ?? 'user').toLowerCase()
  if (normalizedRole !== 'user') {
    redirect('/crm')
  }

  const [detail, emailAccounts] = await Promise.all([
    loadCrmDealDetail(session.user.companyId, session.user.id, params.dealId),
    prisma.emailAccount.findMany({
      where: {
        companyId: session.user.companyId,
        userId: session.user.id,
        deauthorizedAt: null,
      },
      select: {
        id: true,
        provider: true,
        displayName: true,
        emailAddress: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  if (!detail) {
    notFound()
  }

  const sentStamp = detail.sentToEstimatingAt
    ? `Sent to Estimating · ${formatDistanceToNow(detail.sentToEstimatingAt, { addSuffix: true })}`
    : null

  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Deal Detail</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-900">{detail.name}</h1>
            <p className="text-sm text-slate-500">Single-owner CRM workspace · strictly scoped to your deals.</p>
          </div>
          <Link href="/crm/deals" className="text-sm font-semibold text-slate-500 hover:text-slate-800">
            Back to deals
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Status</p>
                <p className="text-xl font-semibold text-slate-900">{detail.stage}</p>
                {sentStamp ? (
                  <span className="mt-1 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {sentStamp}
                  </span>
                ) : (
                  <span className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    Waiting on Send to Estimating
                  </span>
                )}
              </div>
              <div className="text-right text-sm text-slate-500">
                <p>Created {detail.createdAt.toLocaleDateString()}</p>
                <p>Updated {formatDistanceToNow(detail.updatedAt, { addSuffix: true })}</p>
              </div>
            </header>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Contact</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{detail.contact.name}</p>
                <div className="mt-2 space-y-1 text-sm text-slate-600">
                  <p>{detail.contact.email ?? 'No email'}</p>
                  <p>{detail.contact.phone ?? detail.contact.mobile ?? 'No phone'}</p>
                  <p>{detail.contact.jobTitle ?? 'No title'}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Description</p>
                <p className="mt-2 text-sm text-slate-600">{detail.description ?? 'No description provided.'}</p>
              </div>
            </div>
          </section>

          <BidDocumentsPanel
            dealId={detail.id}
            documents={detail.bidDocuments}
            categories={BID_DOCUMENT_CATEGORIES}
            emailAccounts={emailAccounts}
          />
        </div>
      </div>
    </div>
  )
}
