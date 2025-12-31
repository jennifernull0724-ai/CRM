import Link from 'next/link'
import { redirect } from 'next/navigation'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createCrmDealAction } from '@/app/crm/deals/actions'

function bindCreateDealAction(action: typeof createCrmDealAction) {
  return async (formData: FormData) => {
    'use server'
    await action(formData)
  }
}

export default async function CrmCreateDealPage() {
  const session = await auth()
  if (!session?.user?.companyId) {
    redirect('/login?from=/crm/deals/new')
  }

  const role = (session.user.role ?? 'user').toLowerCase()
  if (role !== 'user') {
    redirect('/crm')
  }

  const contacts = await prisma.contact.findMany({
    where: { companyId: session.user.companyId, archived: false },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    select: { id: true, firstName: true, lastName: true, email: true },
  })

  return (
    <div className="px-6 py-8">
      <section className="mx-auto max-w-2xl space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">CRM Deals</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Create deal</h1>
          <p className="mt-2 text-sm text-slate-500">Select from any contact in your company. Estimating takes over after submission.</p>
        </div>
        <form action={bindCreateDealAction(createCrmDealAction)} className="space-y-4">
          <label className="block text-sm font-medium text-slate-600">
            Contact
            <select
              name="contactId"
              required
              defaultValue=""
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Select contact
              </option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.firstName} {contact.lastName}
                  {contact.email ? ` · ${contact.email}` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-600">
            Project name
            <input
              type="text"
              name="projectName"
              required
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="ex: Bridge repairs"
            />
          </label>
          <label className="block text-sm font-medium text-slate-600">
            Description
            <textarea
              name="description"
              rows={4}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Context and scope notes (optional)"
            />
          </label>
          <div className="flex items-center justify-between">
            <Link href="/crm/deals" className="text-sm font-semibold text-slate-500 hover:text-slate-700">
              Cancel
            </Link>
            <button type="submit" className="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white">
              Save deal
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
