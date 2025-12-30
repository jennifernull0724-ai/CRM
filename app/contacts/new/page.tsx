import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { ContactCreateSheet } from '@/components/contacts/contact-create-sheet'

export const dynamic = 'force-dynamic'

export default async function NewContactPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.companyId) {
    redirect('/login?from=/contacts/new')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Contacts</p>
          <h1 className="mt-3 text-3xl font-semibold">Universal intake</h1>
          <p className="mt-3 text-sm text-slate-400">
            This form is the authoritative path for new records. Email is required, ownership defaults to the creator, company labels are derived from the domain,
            and creation activity is logged server-side.
          </p>
          <div className="mt-8">
            <ContactCreateSheet presentation="panel" source="contacts:new" />
          </div>
          <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
            <span>Need to import in bulk? Use the uploader on the contacts index.</span>
            <Link href="/contacts" className="text-emerald-300 hover:text-emerald-200">
              Return to contacts
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
