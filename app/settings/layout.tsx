import type { ReactNode } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/shells/dashboard-shell'
import { TrialShell } from '@/components/shells/trial-shell'
import { authOptions } from '@/lib/auth'
import { loadStandardSettings } from '@/lib/dashboard/standardSettings'
import type { PlanKey } from '@/lib/billing/planTiers'

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/login')
  }

  if (!session.user.companyId) {
    redirect('/signup')
  }

  const normalizedRole = (session.user.role as string | undefined)?.toLowerCase()
  const planKey = (session.user.planKey as PlanKey) ?? 'starter'

  const standardSettings = await loadStandardSettings(session.user.companyId)

  // Trial users use Trial shell
  if (planKey === 'starter') {
    return (
      <TrialShell companyLogoUrl={standardSettings.branding.uiLogoUrl} userName={session.user.name ?? undefined}>
        <div className="min-h-screen bg-slate-50 p-6">{children}</div>
      </TrialShell>
    )
  }

  // Paid users must be owner/admin to access settings hub
  if (!normalizedRole || !['owner', 'admin'].includes(normalizedRole)) {
    redirect('/app')
  }

  return (
    <DashboardShell
      role={normalizedRole as 'owner' | 'admin'}
      userName={session.user.name ?? undefined}
      companyLogoUrl={standardSettings.branding.uiLogoUrl}
    >
      <div className="min-h-screen bg-slate-50 p-6">{children}</div>
    </DashboardShell>
  )
}
