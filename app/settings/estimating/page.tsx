export default function SettingsEstimatingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        <header>
          <p className="text-sm uppercase tracking-wide text-slate-500">Settings</p>
          <h1 className="text-3xl font-bold text-slate-900">Estimating</h1>
          <p className="text-slate-600">
            Templates, presets, logos, and default assumptions live here. Once the estimating workspace ships, tie those data
            sources into this configuration page.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <p className="text-sm font-semibold text-slate-500">Templates</p>
          <p className="text-sm text-slate-600">CRUD UI for proposal + email templates coming soon.</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <p className="text-sm font-semibold text-slate-500">Preset library</p>
          <p className="text-sm text-slate-600">
            Surface all labor/equipment/material presets with enable/disable + reordering functionality.
          </p>
        </section>
      </div>
    </div>
  )
}
