import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { UserShell } from '@/components/shells/user-shell'
import Link from 'next/link'

export default async function EmailInboxPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  if (!session.user.companyId) {
    redirect('/signup')
  }

  return (
    <UserShell companyLogoUrl={null} userName={session.user.name ?? session.user.email ?? undefined}>
      <div className="space-y-8 px-6 pb-12 pt-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">Email</h1>
          <p className="text-sm text-slate-600">Send and track emails from contact profiles</p>
        </header>

        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <svg className="mx-auto h-16 w-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h2 className="mt-6 text-xl font-semibold text-slate-900">Email from Contact Profiles</h2>
          <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
            All email activities happen from individual contact profiles. Navigate to a contact to send emails, view history, and track engagement.
          </p>
          <Link 
            href="/contacts" 
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Go to Contacts
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
          <div className="flex gap-3">
            <svg className="h-5 w-5 flex-shrink-0 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900">Contact-First Email</p>
              <p className="mt-1 text-sm text-blue-700">
                Email integration lives within each contact profile. This ensures all communication is tracked to the right person and maintains HubSpot-style contact-first workflow.
              </p>
            </div>
          </div>
        </div>
      </div>
    </UserShell>
  )
}
