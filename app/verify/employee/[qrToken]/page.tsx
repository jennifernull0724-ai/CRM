import { notFound } from 'next/navigation'
import { getSnapshotByToken } from '@/lib/compliance/snapshots'

export default async function VerifyEmployeePage({ params }: { params: { qrToken: string } }) {
  const record = await getSnapshotByToken(params.qrToken)

  if (!record) {
    notFound()
  }

  const payload = record.snapshot.payload as any

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
            {payload.certifications.map((cert: any) => (
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
                  {cert.images.map((image: any) => (
                    <div key={image.id} className="font-mono">Image v{image.version} · hash {image.sha256}</div>
                  ))}
                  {cert.images.length === 0 && <p className="text-rose-600">No proof on record (FAILED)</p>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-slate-200 pt-4 text-xs text-slate-500">
          <p>QR token: {record.token}</p>
          <p>Snapshot immutable. Recompute SHA-256 to verify authenticity.</p>
        </footer>
      </div>
    </div>
  )
}
