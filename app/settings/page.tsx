import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import type { PlanKey } from '@/lib/billing/planTiers'

const TRIAL_SETTINGS = [
  { title: 'Profile & Email', href: '/settings/profile', description: 'Update your profile and configure email integration.' },
]

const PAID_SETTINGS = [
  { title: 'Profile & Email', href: '/settings/profile', description: 'Personal info, email integration, signature block.' },
  { title: 'Branding', href: '/settings/branding', description: 'Owner/Admin logo management for the shell and PDFs.' },
  { title: 'Estimating', href: '/estimating/settings', description: 'Templates, presets, and branding for estimating.' },
  { title: 'Billing', href: '/settings/billing', description: 'Plan, seats, upgrade, Stripe customer portal.' },
]

export default async function SettingsHubPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.companyId) {
    redirect('/login')
  }

  const planKey = (session.user.planKey as PlanKey) ?? 'starter'
  const isTrial = planKey === 'starter'
  const settingsGroups = isTrial ? TRIAL_SETTINGS : PAID_SETTINGS

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        <header>
          <p className="text-sm uppercase tracking-wide text-slate-500">Settings</p>
          <h1 className="text-3xl font-bold text-slate-900">{isTrial ? 'Your settings' : 'Workspace settings'}</h1>
          <p className="text-slate-600">{isTrial ? 'Update your profile and email preferences.' : 'Single entry point for profile, estimating, and billing controls.'}</p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {settingsGroups.map((group) => (
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
