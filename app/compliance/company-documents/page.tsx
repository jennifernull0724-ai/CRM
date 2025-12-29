import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getComplianceSignedUrl } from '@/lib/s3'
import { addCompanyDocumentVersionAction, createCompanyDocumentAction } from './actions'
import type { CompanyComplianceDocumentCategory } from '@prisma/client'

const CATEGORY_LABELS: Record<CompanyComplianceDocumentCategory, string> = {
  INSURANCE: 'Insurance',
  POLICIES: 'Policies',
  PROGRAMS: 'Programs',
  RAILROAD: 'Railroad-specific',
}

export default async function CompanyComplianceDocumentsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.companyId) {
    throw new Error('Missing company context')
  }

  const documents = await prisma.companyComplianceDocument.findMany({
    where: { companyId: session.user.companyId },
    include: {
      createdBy: { select: { name: true } },
      versions: {
        orderBy: { versionNumber: 'desc' },
        include: {
          uploadedBy: { select: { name: true } },
        },
      },
    },
    orderBy: [{ category: 'asc' }, { title: 'asc' }],
  })

  const documentsWithUrls = await Promise.all(
    documents.map(async (doc) => ({
      ...doc,
      versions: await Promise.all(
        doc.versions.map(async (version) => ({
          ...version,
          url: await getComplianceSignedUrl(version.gcsObjectKey),
        }))
      ),
    }))
  )

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm uppercase tracking-wide text-slate-500">Compliance</p>
        <h1 className="text-3xl font-semibold text-slate-900">Company document vault</h1>
        <p className="text-slate-600">Owner/Admin controlled repository. Every version immutable, hashed, and stored in GCS.</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Add company document</h2>
        <p className="text-sm text-slate-600">Creates the document record and first version atomically.</p>
        <form action={createCompanyDocumentAction} encType="multipart/form-data" className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase text-slate-500">Category</label>
            <select name="category" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" required>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase text-slate-500">Title</label>
            <input name="title" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase text-slate-500">PDF</label>
            <input type="file" name="file" accept="application/pdf" required />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Upload</button>
          </div>
        </form>
      </section>

      {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
        const categoryKey = key as CompanyComplianceDocumentCategory
        const categoryDocs = documentsWithUrls.filter((doc) => doc.category === categoryKey)
        if (!categoryDocs.length) {
          return null
        }
        return (
          <section key={key} className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">{label}</h3>
            {categoryDocs.map((doc) => (
              <div key={doc.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 className="text-xl font-semibold text-slate-900">{doc.title}</h4>
                    <p className="text-sm text-slate-500">Created by {doc.createdBy?.name ?? 'System'} on {doc.createdAt.toISOString()}</p>
                  </div>
                  <form action={addCompanyDocumentVersionAction} encType="multipart/form-data" className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4 md:w-96">
                    <input type="hidden" name="documentId" value={doc.id} />
                    <label className="text-xs uppercase text-slate-500">Upload new version (PDF)</label>
                    <input type="file" name="file" accept="application/pdf" required />
                    <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Add version</button>
                  </form>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Version</th>
                        <th className="px-4 py-3">Uploaded</th>
                        <th className="px-4 py-3">Hash</th>
                        <th className="px-4 py-3">Size</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {doc.versions.map((version) => (
                        <tr key={version.id} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-semibold text-slate-900">v{version.versionNumber}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            <div>{version.uploadedAt.toISOString()}</div>
                            <div className="text-xs text-slate-500">By {version.uploadedBy?.name ?? 'System'}</div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">{version.fileHash}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{Math.round(version.fileSize / 1024)} KB</td>
                          <td className="px-4 py-3 text-right">
                            <a href={version.url} className="text-indigo-600 hover:underline" target="_blank" rel="noreferrer">Download</a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>
        )
      })}

      {documentsWithUrls.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No company-level documents yet.
        </div>
      )}
    </div>
  )
}
