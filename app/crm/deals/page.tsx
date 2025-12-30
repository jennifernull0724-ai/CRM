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
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">CRM Deals</p>
            <h1 className="text-2xl font-semibold text-slate-900">Pipeline, scoped to creator</h1>
            <p className="text-sm text-slate-500">List view only. Every row is a deal you created. No kanban, no charts, no shared metrics.</p>
          </div>
          <Link href="/crm/deals/new" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Create deal
          </Link>
        </header>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-3 text-left">Name / ID</th>
                <th className="px-6 py-3 text-left">Contact</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Last updated</th>
                <th className="px-6 py-3 text-left">Owner</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    You have not created any deals yet.
                  </td>
                </tr>
              ) : (
                deals.map((deal) => (
                  <tr key={deal.id} className="border-b border-slate-100 text-slate-600">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">
                        <Link href={`/crm/deals/${deal.id}`} className="text-slate-900 hover:text-slate-600">
                          {deal.name}
                        </Link>
                      </div>
                      <p className="text-xs text-slate-400">#{deal.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-900">{deal.contactName}</p>
                      <p className="text-xs text-slate-500">{deal.contactEmail ?? 'No email'}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-900">
                      <p className="font-semibold">{deal.stage}</p>
                      {deal.sentToEstimatingAt ? (
                        <p className="mt-1 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                          Sent {formatDistanceToNow(new Date(deal.sentToEstimatingAt), { addSuffix: true })}
                        </p>
                      ) : (
                        <p className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Awaiting send
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {formatDistanceToNow(new Date(deal.updatedAt), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 text-slate-900">You</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-col gap-2">
                        {canSubmit(deal.stage) ? (
                          <form action={bindSubmitAction(submitDealToEstimatingAction)}>
                            <input type="hidden" name="dealId" value={deal.id} />
                            <button className="w-full rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-900">
                              Send to Estimating
                            </button>
                          </form>
                        ) : (
                          <span className="text-xs text-slate-400">Submitted</span>
                        )}
                        {deal.hasApprovedEstimate ? (
                          <Link
                            href={`/crm/deals/${deal.id}/estimate`}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                          >
                            View approved estimate
                          </Link>
                        ) : null}
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
