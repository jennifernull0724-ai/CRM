import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { auth } from '@/lib/auth'
import { getCrmDeals } from '@/lib/crm/deals'
import { submitDealToEstimatingAction } from '@/app/crm/deals/actions'

function bindSubmitAction(action: typeof submitDealToEstimatingAction) {
  return async (formData: FormData) => {
    'use server'
    await action(formData)
  }
}

function canSubmit(stage: string) {
  const normalized = stage?.toUpperCase?.() ?? ''
  return normalized === 'OPEN' || normalized === 'RETURNED'
}

export default async function CrmDealsPage() {
  const session = await auth()

  if (!session?.user?.companyId) {
    redirect('/login?from=/crm/deals')
  }

  const deals = await getCrmDeals(session.user.companyId, session.user.id)

  return (
    <div className="px-6 py-8">
      {/* Contact-First Info Banner */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-2xl">💡</div>
          <div>
            <p className="text-sm font-semibold text-blue-900">Deals are anchored to contacts</p>
            <p className="text-sm text-blue-700">
              Every deal belongs to a contact. All deal activity logs to the{' '}
              <Link href="/contacts" className="underline hover:text-blue-900">
                contact timeline
              </Link>
              . Work from contact profiles for full context.
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Your Deals</h1>
            <p className="text-sm text-slate-600">Deals you created, scoped to your contacts</p>
          </div>
          <Link href="/crm/deals/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Create deal
          </Link>
        </header>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-6 py-3 text-left">Deal</th>
                <th className="px-6 py-3 text-left">Contact</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Last updated</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <p className="text-sm text-slate-600">No deals created yet.</p>
                    <Link href="/crm/deals/new" className="mt-2 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700">
                      Create your first deal →
                    </Link>
                  </td>
                </tr>
              ) : (
                deals.map((deal) => (
                  <tr key={deal.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <Link href={`/crm/deals/${deal.id}`} className="font-semibold text-blue-600 hover:text-blue-700">
                        {deal.name}
                      </Link>
                      <p className="text-xs text-slate-500">#{deal.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-6 py-4">
                      {deal.contactId ? (
                        <Link href={`/contacts/${deal.contactId}`} className="text-sm text-blue-600 hover:text-blue-700">
                          {deal.contactName}
                        </Link>
                      ) : (
                        <span className="text-sm text-slate-600">{deal.contactName}</span>
                      )}
                      <p className="text-xs text-slate-500">{deal.contactEmail ?? 'No email'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-900">{deal.stage}</p>
                      {deal.sentToEstimatingAt ? (
                        <span className="mt-1 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Sent {formatDistanceToNow(new Date(deal.sentToEstimatingAt), { addSuffix: true })}
                        </span>
                      ) : (
                        <span className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDistanceToNow(new Date(deal.updatedAt), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        {canSubmit(deal.stage) ? (
                          <form action={bindSubmitAction(submitDealToEstimatingAction)}>
                            <input type="hidden" name="dealId" value={deal.id} />
                            <button className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                              Send to Estimating
                            </button>
                          </form>
                        ) : (
                          <span className="text-xs text-slate-500">Submitted</span>
                        )}
                        {deal.hasApprovedEstimate && (
                          <Link
                            href={`/crm/deals/${deal.id}/estimate`}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                          >
                            View estimate
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
