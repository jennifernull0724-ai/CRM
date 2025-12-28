type PageProps = {
  params: Promise<{ dealId: string }>
}

const LINE_ITEM_GROUPS = ['Labor', 'Equipment', 'Materials', 'Subcontractors', 'Railroad', 'Environmental', 'Misc']

export default async function DealWorkspacePage({ params }: PageProps) {
  const { dealId } = await params

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-wide text-slate-500">Deal workspace</p>
          <h1 className="text-3xl font-bold text-slate-900">Deal #{dealId}</h1>
          <div className="mt-4 grid gap-4 md:grid-cols-4 text-sm text-slate-600">
            <div>
              <p className="font-semibold text-slate-500">Contact</p>
              <p className="text-slate-900">(link to contact)</p>
            </div>
            <div>
              <p className="font-semibold text-slate-500">Company</p>
              <p className="text-slate-900">Auto-derived</p>
            </div>
            <div>
              <p className="font-semibold text-slate-500">Owner / estimator</p>
              <p className="text-slate-900">Populate from Prisma</p>
            </div>
            <div>
              <p className="font-semibold text-slate-500">Status</p>
              <p className="text-slate-900">OPEN → IN_ESTIMATING → SUBMITTED → ...</p>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500">Line items</p>
              <h2 className="text-2xl font-semibold text-slate-900">Estimating canvas</h2>
            </div>
            <div className="text-right text-sm text-slate-500">
              <p>Version 1</p>
              <p>Total placeholder</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {LINE_ITEM_GROUPS.map((group) => (
              <div key={group} className="rounded-xl border border-slate-100 p-4">
                <p className="text-sm font-semibold text-slate-600">{group}</p>
                <p className="text-xs text-slate-500">Presets feed this group. Manual entry always allowed.</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-wide text-slate-500">Activity timeline</p>
          <p className="text-slate-600 text-sm mt-2">
            Immutable log for submissions, approvals, line item edits, PDFs, and emails. Wire to `Activity` table ASAP.
          </p>
        </section>
      </div>
    </div>
  )
}
