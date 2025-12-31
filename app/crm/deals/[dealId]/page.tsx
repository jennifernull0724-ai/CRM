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
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Link href="/crm/deals" className="hover:text-slate-900">
            Deals
          </Link>
          <span className="text-slate-300">/</span>
          <Link href={`/contacts/${detail.contact.id}`} className="hover:text-slate-900">
            {detail.contact.name}
          </Link>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-900">{detail.name}</span>
        </div>

        {/* Deal Header */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-slate-900">{detail.name}</h1>
              <p className="mt-1 text-sm text-slate-600">{detail.description || 'No description provided'}</p>
              <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
                <span>Created {detail.createdAt.toLocaleDateString()}</span>
                <span className="text-slate-300">·</span>
                <span>Updated {formatDistanceToNow(detail.updatedAt, { addSuffix: true })}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{detail.stage}</p>
                {sentStamp ? (
                  <span className="mt-1 inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    {sentStamp}
                  </span>
                ) : (
                  <span className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    Draft
                  </span>
                )}
              </div>
              <Link
                href={`/contacts/${detail.contact.id}`}
                className="rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
              >
                → Open Contact Profile
              </Link>
            </div>
          </div>

          {/* Contact Card - Prominent */}
          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3.31 0-6 1.79-6 4v1h12v-1c0-2.21-2.69-4-6-4z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-blue-900">Deal Contact</p>
                <Link
                  href={`/contacts/${detail.contact.id}`}
                  className="text-lg font-semibold text-blue-700 hover:text-blue-800"
                >
                  {detail.contact.name}
                </Link>
                <div className="mt-1 space-y-0.5 text-sm text-blue-700">
                  {detail.contact.email && <p>{detail.contact.email}</p>}
                  {(detail.contact.phone || detail.contact.mobile) && (
                    <p>{detail.contact.phone ?? detail.contact.mobile}</p>
                  )}
                  {detail.contact.jobTitle && <p>{detail.contact.jobTitle}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Deal Details</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-600">Status</span>
                <span className="font-semibold text-slate-900">{detail.stage}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-600">Owner</span>
                <span className="font-semibold text-slate-900">You</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Submitted to Estimating</span>
                <span className="font-semibold text-slate-900">
                  {detail.sentToEstimatingAt ? 'Yes' : 'Not yet'}
                </span>
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
