import { ReactNode } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/shells/dashboard-shell'
import { authOptions } from '@/lib/auth'
import { planAllowsFeature, type PlanKey } from '@/lib/billing/planTiers'
import { loadStandardSettings } from '@/lib/dashboard/standardSettings'

export default async function ComplianceLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login')
  }

  if (!session.user.companyId) {
    redirect('/signup')
  }

  const normalizedRole = (session.user.role as string).toLowerCase()

  if (!['admin', 'owner'].includes(normalizedRole)) {
    redirect('/app')
  }

  const planKey = (session.user.planKey as PlanKey) ?? 'starter'
  const hasCompliance =
    planAllowsFeature(planKey, 'compliance_core') || planAllowsFeature(planKey, 'advanced_compliance')

  if (!hasCompliance) {
    redirect('/upgrade?feature=compliance')
  }

  const standardSettings = await loadStandardSettings(session.user.companyId)

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
