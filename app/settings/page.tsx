import Link from 'next/link'

const SETTINGS_GROUPS = [
  { title: 'Profile', href: '/settings/profile', description: 'Personal info, email integration, signature block.' },
  { title: 'Estimating', href: '/settings/estimating', description: 'Templates, presets, logo uploads, defaults.' },
  { title: 'Billing', href: '/settings/billing', description: 'Plan, seats, upgrade, Stripe customer portal.' },
]

export default function SettingsHubPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        <header>
          <p className="text-sm uppercase tracking-wide text-slate-500">Settings</p>
          <h1 className="text-3xl font-bold text-slate-900">Workspace settings</h1>
          <p className="text-slate-600">Single entry point for profile, estimating, and billing controls.</p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {SETTINGS_GROUPS.map((group) => (
            <Link
              key={group.title}
              href={group.href}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-400"
            >
              <p className="text-sm uppercase tracking-wide text-slate-500">{group.title}</p>
              <p className="text-sm text-slate-600 mt-2">{group.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
