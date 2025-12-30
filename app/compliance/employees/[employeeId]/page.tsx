import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { planAllowsFeature, type PlanKey } from '@/lib/billing/planTiers'
import { listCompliancePresets } from '@/lib/compliance/presets'
import { getComplianceSignedUrl } from '@/lib/s3'
import {
  createCertificationAction,
  uploadComplianceDocumentAction,
  createSnapshotAction,
  createInspectionSnapshotAction,
} from '../actions'

const STATUS_STYLES: Record<string, string> = {
  PASS: 'bg-emerald-100 text-emerald-700',
  FAIL: 'bg-rose-100 text-rose-700',
  INCOMPLETE: 'bg-amber-100 text-amber-700',
  EXPIRED: 'bg-rose-100 text-rose-700',
}

export default async function ComplianceEmployeeDetailPage({ params }: { params: { employeeId: string } }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.companyId) {
    throw new Error('Missing company context')
  }

  const planKey = (session.user.planKey as PlanKey) ?? 'starter'
  const isAdvanced = planAllowsFeature(planKey, 'advanced_compliance')

  const employee = await prisma.complianceEmployee.findFirst({
    where: { id: params.employeeId, companyId: session.user.companyId },
    include: {
      company: {
        select: { name: true },
      },
      certifications: {
        orderBy: { updatedAt: 'desc' },
        include: {
          images: {
            orderBy: { version: 'desc' },
          },
        },
      },
      documents: {
        orderBy: { version: 'desc' },
      },
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      snapshots: {
        orderBy: { createdAt: 'desc' },
        include: { qrToken: true },
      },
    },
  })

  if (!employee) {
    notFound()
  }

  const certifications = await Promise.all(
    employee.certifications.map(async (cert) => ({
      ...cert,
      images: await Promise.all(
        cert.images.map(async (image) => ({
          ...image,
          url: await getComplianceSignedUrl(image.objectKey),
        }))
      ),
    }))
  )

  const documents = await Promise.all(
    employee.documents.map(async (doc) => ({
      ...doc,
      url: await getComplianceSignedUrl(doc.objectKey),
    }))
  )

  const presets = await listCompliancePresets(session.user.companyId)
  const qrToken = employee.qrToken

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">Employee</p>
            <h1 className="text-3xl font-semibold text-slate-900">
              {employee.firstName} {employee.lastName}
            </h1>
            <p className="text-slate-600">{employee.title} · #{employee.employeeId}</p>
            {employee.email ? (
              <a href={`mailto:${employee.email}`} className="text-sm text-indigo-600 hover:underline">
                {employee.email}
              </a>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[employee.complianceStatus]}`}>
                {employee.complianceStatus}
              </span>
              <span>Last verification: {employee.lastVerifiedAt ? employee.lastVerifiedAt.toISOString() : 'Never'}</span>
              <span>Compliance hash: {employee.complianceHash ?? '—'}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3 text-sm">
            <Link
              href={`/compliance/employees/${employee.id}/print/summary`}
              className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
            >
              Print compliance packet
            </Link>
            <Link
              href={`/verify/employee/${qrToken}`}
              className="text-indigo-600 hover:underline"
            >
              Public QR verification
            </Link>
            <p className="text-xs text-slate-500">QR resolves immediately and upgrades as new snapshots are created.</p>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Certifications</h2>
            <p className="text-sm text-slate-600">Proof images mandatory for PASS. Supplemental PDFs allowed but do not unlock compliance.</p>
          </div>
          <form action={createCertificationAction} encType="multipart/form-data" className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4 md:w-96">
            <input type="hidden" name="employeeId" value={employee.id} />
            <p className="text-sm font-semibold text-slate-700">Add certification</p>
            <label className="text-xs uppercase text-slate-500">Preset</label>
            <select name="presetKey" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="">Custom</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.baseKey}>
                  {preset.category} · {preset.name}
                </option>
              ))}
            </select>
            <label className="text-xs uppercase text-slate-500">Custom name</label>
            <input name="customName" placeholder="Optional" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <label className="text-xs uppercase text-slate-500">Category</label>
            <select name="category" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" required>
              <option value="BASE">BASE</option>
              <option value="RAILROAD">RAILROAD</option>
              <option value="CONSTRUCTION">CONSTRUCTION</option>
              <option value="ENVIRONMENTAL">ENVIRONMENTAL</option>
            </select>
            <label className="text-xs uppercase text-slate-500">Issue date</label>
            <input type="date" name="issueDate" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
            <label className="text-xs uppercase text-slate-500">Expiration date</label>
            <input type="date" name="expiresAt" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" name="required" defaultChecked className="rounded" /> Required
            </label>
            <label className="text-xs uppercase text-slate-500">Proof files (PDF or images)</label>
            <input type="file" name="proofFiles" accept="image/*,application/pdf" multiple required />
            <p className="text-xs text-slate-500">All proofs upload atomically and become immutable.</p>
            <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Record certification</button>
          </form>
        </div>
        <div className="mt-6 space-y-6">
          {certifications.map((cert) => (
            <div key={cert.id} className="rounded-xl border border-slate-100 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{cert.customName ?? cert.presetKey}</p>
                  <div className="text-sm text-slate-500">
                    {cert.category} · {cert.required ? 'Required' : 'Optional'}
                  </div>
                  <div className="text-sm text-slate-600">
                    Issue {cert.issueDate.toISOString().split('T')[0]} · Exp {cert.expiresAt.toISOString().split('T')[0]}
                  </div>
                </div>
                <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[cert.status] ?? 'bg-slate-100 text-slate-700'}`}>
                  {cert.status}
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {cert.images.map((image) => (
                  <a key={image.id} href={image.url} target="_blank" className="group flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                    {image.mimeType.startsWith('image/') ? (
                      <img src={image.url} alt={image.filename} className="h-16 w-16 rounded object-cover" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded bg-slate-100 text-slate-600">PDF</div>
                    )}
                    <div className="text-xs text-slate-600">
                      <div className="font-semibold text-slate-900">v{image.version}</div>
                      <div>{image.filename}</div>
                      <div className="font-mono text-[11px] text-slate-500">{image.sha256.slice(0, 16)}…</div>
                      <div className="text-[11px] uppercase text-slate-500">{image.mimeType}</div>
                    </div>
                  </a>
                ))}
                {cert.images.length === 0 && <p className="text-sm text-rose-600">No proof uploaded. Certification locked in INCOMPLETE state.</p>}
              </div>
            </div>
          ))}
          {certifications.length === 0 && <p className="text-sm text-slate-500">No certifications recorded.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Documents</h2>
            <p className="text-sm text-slate-600">Immutable, versioned PDFs (hash visible).</p>
          </div>
          <form action={uploadComplianceDocumentAction} encType="multipart/form-data" className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4 md:w-96">
            <input type="hidden" name="employeeId" value={employee.id} />
            <label className="text-xs uppercase text-slate-500">Title</label>
            <input name="title" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
            <label className="text-xs uppercase text-slate-500">PDF</label>
            <input type="file" name="file" accept="application/pdf" required />
            <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Upload document</button>
          </form>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Hash</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-t border-slate-100">
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
              {documents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">
                    No documents uploaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Snapshots & QR verification</h2>
            <p className="text-sm text-slate-600">Snapshots freeze the record for inspectors. Hash is embedded into each PDF.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={createSnapshotAction}>
              <input type="hidden" name="employeeId" value={employee.id} />
              <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Manual verification snapshot</button>
            </form>
            {isAdvanced && (
              <form action={createInspectionSnapshotAction}>
                <input type="hidden" name="employeeId" value={employee.id} />
                <button type="submit" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800">Inspection trigger snapshot</button>
              </form>
            )}
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {employee.snapshots.map((snap) => (
            <div key={snap.id} className="rounded-xl border border-slate-100 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{snap.createdAt.toISOString()}</p>
                  <p className="font-mono text-xs text-slate-500">{snap.snapshotHash}</p>
                </div>
                {snap.qrToken ? (
                  <Link href={`/verify/employee/${snap.qrToken.token}`} className="text-indigo-600 hover:underline">
                    View public snapshot
                  </Link>
                ) : (
                  <span className="text-xs text-slate-500">QR token detached</span>
                )}
              </div>
            </div>
          ))}
          {employee.snapshots.length === 0 && <p className="text-sm text-slate-500">No snapshots recorded yet.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Activity log</h2>
        <div className="mt-4 space-y-3">
          {employee.activities.map((activity) => (
            <div key={activity.id} className="rounded-lg border border-slate-100 p-3">
              <div className="text-sm font-semibold text-slate-900">{activity.type}</div>
              <div className="text-xs text-slate-500">{activity.createdAt.toISOString()}</div>
              {activity.metadata && (
                <pre className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-600">{JSON.stringify(activity.metadata, null, 2)}</pre>
              )}
            </div>
          ))}
          {employee.activities.length === 0 && <p className="text-sm text-slate-500">No activity recorded.</p>}
        </div>
      </section>
    </div>
  )
}
