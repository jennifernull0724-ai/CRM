import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getComplianceSignedUrl } from '@/lib/s3'

type SearchParams = { [key: string]: string | string[] | undefined }

export default async function ComplianceDocumentsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.companyId) {
    throw new Error('Missing company context')
  }

  const employeeFilter = (searchParams.employee as string) || ''
  const documents = await prisma.complianceDocument.findMany({
    where: {
      employee: {
        companyId: session.user.companyId,
        ...(employeeFilter
          ? {
              OR: [
                { id: employeeFilter },
                { employeeId: employeeFilter },
              ],
            }
          : {}),
      },
    },
    include: {
      employee: {
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: [{ employeeId: 'asc' }, { version: 'desc' }],
  })

  const documentsWithUrls = await Promise.all(
    documents.map(async (doc) => ({
      ...doc,
      url: await getComplianceSignedUrl(doc.objectKey),
    }))
  )

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm uppercase tracking-wide text-slate-500">Compliance</p>
        <h1 className="text-3xl font-semibold text-slate-900">Document vault</h1>
        <p className="text-slate-600">Immutable employee compliance packets with visible hashes and signed download links.</p>
      </header>

      <form className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-xs uppercase text-slate-500">Employee ID</label>
        <input
          name="employee"
          defaultValue={employeeFilter}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Filter by employee UUID or external ID"
        />
        <button type="submit" className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Filter</button>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Hash</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {documentsWithUrls.map((doc) => (
                <tr key={doc.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{doc.employee.firstName} {doc.employee.lastName}</div>
                    <div className="text-xs text-slate-500">#{doc.employee.employeeId}</div>
                  </td>
                  <td className="px-4 py-3">v{doc.version}</td>
                  <td className="px-4 py-3">{doc.title}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{doc.sha256}</td>
                  <td className="px-4 py-3">{Math.round(doc.size / 1024)} KB</td>
                  <td className="px-4 py-3 text-right">
                    <a href={doc.url} className="text-indigo-600 hover:underline" target="_blank" rel="noreferrer">
                      Download
                    </a>
                  </td>
                </tr>
              ))}
              {documentsWithUrls.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">No documents found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
