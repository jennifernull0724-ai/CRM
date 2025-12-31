import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { UserShell } from '@/components/shells/user-shell'
import Link from 'next/link'

export default async function DocumentsPage() {
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
          <h1 className="text-2xl font-semibold text-slate-900">Documents</h1>
          <p className="text-sm text-slate-600">Files uploaded to your contacts</p>
        </header>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-2xl">📎</div>
            <div>
              <p className="text-sm font-semibold text-blue-900">Documents live in contact profiles</p>
              <p className="text-sm text-blue-700">
                All files must be associated with a contact. Upload documents from individual{' '}
                <Link href="/contacts" className="underline hover:text-blue-900">
                  contact profiles
                </Link>.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <svg className="mx-auto h-16 w-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h2 className="mt-6 text-xl font-semibold text-slate-900">No Documents Yet</h2>
          <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
            Upload documents from contact profiles. All files are linked to specific contacts.
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
      </div>
    </UserShell>
  )
}
