import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { UserShell } from '@/components/shells/user-shell'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function DocumentsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  if (!session.user.companyId) {
    redirect('/signup')
  }

  // Load user's documents uploaded to contacts
  const documents = await prisma.contactDocument.findMany({
    where: {
      companyId: session.user.companyId,
      uploadedById: session.user.id,
    },
    include: {
      contact: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { uploadedAt: 'desc' },
    take: 50,
  })

  return (
    <UserShell companyLogoUrl={null} userName={session.user.name ?? session.user.email ?? undefined}>
      <div className="space-y-8 px-6 pb-12 pt-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">Documents</h1>
          <p className="text-sm text-slate-600">Files uploaded to your contacts</p>
        </header>

        {documents.length === 0 ? (
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
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">File Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Uploaded</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <a 
                        href={doc.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                        {doc.fileName}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <Link 
                        href={`/contacts/${doc.contact.id}`}
                        className="text-sm text-slate-900 hover:text-blue-600"
                      >
                        {doc.contact.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
          <div className="flex gap-3">
            <svg className="h-5 w-5 flex-shrink-0 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900">Contact-Anchored Documents</p>
              <p className="mt-1 text-sm text-blue-700">
                All document uploads must be associated with a contact. This ensures files are organized by relationship, not scattered in folders.
              </p>
            </div>
          </div>
        </div>
      </div>
    </UserShell>
  )
}
