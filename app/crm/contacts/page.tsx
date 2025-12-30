import { formatDistanceToNow } from 'date-fns'
import { redirect } from 'next/navigation'

import { auth } from '@/lib/auth'
import { getCrmContacts } from '@/lib/crm/contacts'

export default async function CrmContactsPage() {
  const session = await auth()

  if (!session?.user?.companyId) {
    redirect('/login?from=/crm/contacts')
  }

  const contacts = await getCrmContacts(session.user.companyId, session.user.id)

  return (
    <div className="px-6 py-8">
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-6 py-5">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">CRM Contacts</p>
          <h1 className="text-2xl font-semibold text-slate-900">Owned records only</h1>
          <p className="text-sm text-slate-500">Table view is scoped to contacts where you are the owner. No analytics, no cross-company leakage.</p>
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
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    You have not created or been assigned any contacts yet.
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-slate-100 text-slate-600">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">
                        {contact.firstName} {contact.lastName}
                      </div>
                      <p className="text-xs text-slate-400">#{contact.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-900">{contact.email ?? 'No email'}</p>
                      <p className="text-xs text-slate-500">{contact.phone ?? 'No phone'}</p>
                      <p className="text-xs text-slate-400">{contact.companyLabel}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-900">{contact.status}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {formatDistanceToNow(new Date(contact.updatedAt), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 text-slate-900">You</td>
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
