import { ReactNode } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import AppShell from '@/components/app-shell'
import { authOptions } from '@/lib/auth'
import { planAllowsFeature, type PlanKey } from '@/lib/billing/planTiers'

export default async function ComplianceLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login')
  }

  if (!['admin', 'owner'].includes(session.user.role as string)) {
    redirect('/dashboard/user')
  }

  const planKey = (session.user.planKey as PlanKey) ?? 'starter'
  const hasCompliance =
    planAllowsFeature(planKey, 'compliance_core') || planAllowsFeature(planKey, 'advanced_compliance')

  if (!hasCompliance) {
    redirect('/upgrade?feature=compliance')
  }

  return (
    <AppShell userRole={session.user.role as any} userName={session.user.name ?? undefined}>
      <div className="min-h-screen bg-slate-50 p-6">
        {children}
      </div>
    </AppShell>
  )
}
