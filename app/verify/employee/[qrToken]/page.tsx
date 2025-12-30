import { notFound } from 'next/navigation'
import { getSnapshotByToken } from '@/lib/compliance/snapshots'
import { prisma } from '@/lib/prisma'

type SnapshotImage = {
  id: string
  version: number
  sha256: string
}

type SnapshotCertification = {
  id: string
  presetKey: string | null
  customName: string | null
  category: string
  required: boolean
  issueDate: string
  expiresAt: string
  status: string
  images: SnapshotImage[]
}

type SnapshotPayload = {
  employee: {
    firstName: string
    lastName: string
    role: string
    companyName: string
  }
  certifications: SnapshotCertification[]
  failureReasons: { type: string; label: string; entityId?: string | null }[]
}

export default async function VerifyEmployeePage({ params }: { params: { qrToken: string } }) {
  const record = await getSnapshotByToken(params.qrToken)

  if (!record) {
    const employee = await prisma.complianceEmployee.findFirst({
      where: { qrToken: params.qrToken },
      include: { company: { select: { name: true } } },
    })

    if (!employee) {
      notFound()
    }

    return (
      <div className="min-h-screen bg-white text-slate-900">
        <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
          <header className="border-b border-slate-200 pb-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Compliance identity</p>
            <h1 className="text-3xl font-semibold">{employee.firstName} {employee.lastName}</h1>
            <p className="text-slate-600">{employee.role} · Company: {employee.company.name}</p>
            <div className="mt-3 text-sm text-slate-500">
              <p>Status: <span className="font-semibold">INCOMPLETE</span></p>
              <p>QR token: <span className="font-mono text-xs">{employee.qrToken}</span></p>
              <p>No compliance snapshot recorded yet. Inspector view will upgrade automatically once a snapshot exists.</p>
            </div>
          </header>

          <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            <p>This employee has not been snapshotted. Certifications, proofs, and hashes are unavailable until a manual, inspection, print, or export action captures an immutable snapshot.</p>
            <p className="mt-2 text-xs text-slate-500">Owner/Admin can trigger a snapshot from the compliance dashboard.</p>
          </section>
        </div>
      </div>
    )
  }

  const payload = record.snapshot.payload as SnapshotPayload

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        <header className="border-b border-slate-200 pb-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Regulator snapshot</p>
          <h1 className="text-3xl font-semibold">{payload.employee.firstName} {payload.employee.lastName}</h1>
          <p className="text-slate-600">{payload.employee.role} · Company: {payload.employee.companyName}</p>
          <div className="mt-3 text-sm text-slate-500">
            <p>Snapshot hash: <span className="font-mono text-xs">{record.snapshot.snapshotHash}</span></p>
            <p>Issued: {record.snapshot.createdAt.toISOString()}</p>
          </div>
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Certifications ({payload.certifications.length})</h2>
          <div className="space-y-3">
            {payload.certifications.map((cert) => (
              <div key={cert.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold">{cert.customName ?? cert.presetKey}</p>
                    <p className="text-sm text-slate-500">{cert.category} · {cert.required ? 'Required' : 'Optional'}</p>
                    <p className="text-sm text-slate-600">Issue {cert.issueDate} · Exp {cert.expiresAt}</p>
                  </div>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">{cert.status}</span>
                </div>
                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  {cert.images.map((image) => (
                    <div key={image.id} className="font-mono">Image v{image.version} · hash {image.sha256}</div>
                  ))}
                  {cert.images.length === 0 && <p className="text-rose-600">No proof on record (FAILED)</p>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">Failure reasons</h2>
          {payload.failureReasons.length === 0 ? (
            <p className="text-sm text-emerald-700">No failures recorded in this snapshot.</p>
          ) : (
            <ul className="space-y-2 text-sm text-slate-700">
              {payload.failureReasons.map((reason, idx) => (
                <li key={`${reason.type}-${reason.entityId ?? idx}`} className="rounded-lg bg-slate-50 px-3 py-2">
                  <span className="font-semibold">{reason.type}</span>: {reason.label}
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="border-t border-slate-200 pt-4 text-xs text-slate-500">
          <p>QR token: {record.token}</p>
          <p>Snapshot immutable. Recompute SHA-256 to verify authenticity.</p>
        </footer>
      </div>
    </div>
  )
}
