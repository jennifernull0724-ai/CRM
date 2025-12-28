import Link from 'next/link'

export default function NewDealPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <div>
          <p className="text-sm uppercase tracking-wide text-gray-500">Deals</p>
          <h1 className="text-3xl font-bold text-gray-900">Create deal</h1>
          <p className="text-gray-600 mt-2">
            Intake form for OPEN deals. This scaffolding documents the required fields before wiring React Hook Form + API
            handlers.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">
              Contact *
              <span className="mt-1 block text-xs font-normal text-gray-500">Search existing CRM contacts.</span>
            </label>
            <label className="text-sm font-medium text-gray-700">
              Company
              <span className="mt-1 block text-xs font-normal text-gray-500">Auto-derived from contact, editable by owner/admin.</span>
            </label>
          </div>
          <label className="text-sm font-medium text-gray-700">
            Deal name
            <span className="mt-1 block text-xs font-normal text-gray-500">Human-readable identifier that flows to estimating PDFs.</span>
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">
              Owner
              <span className="mt-1 block text-xs font-normal text-gray-500">Defaults to creator. User / estimator roles limited by plan.</span>
            </label>
            <label className="text-sm font-medium text-gray-700">
              Assigned estimator
              <span className="mt-1 block text-xs font-normal text-gray-500">Optional but strongly encouraged.</span>
            </label>
          </div>
          <label className="text-sm font-medium text-gray-700">
            Notes
            <span className="mt-1 block text-xs font-normal text-gray-500">Internal context captured in immutable activity logs.</span>
          </label>
          <div className="flex justify-end gap-3">
            <Link
              href="/deals"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </Link>
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700" disabled>
              Save deal (wires soon)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
