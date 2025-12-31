import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { resolveRoleDestination } from '@/lib/auth/roleDestinations'
import { TrialShell } from '@/components/shells/trial-shell'
import { TrialDashboard } from '@/app/dashboard/_components/trial-dashboard'
import { loadTrialDashboardData } from '@/lib/dashboard/trialDashboard'
import type { PlanKey } from '@/lib/billing/planTiers'

export const dynamic = 'force-dynamic'

export default async function TrialDashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login?from=/dashboard/trial')
  }

  if (!session.user.companyId) {
    redirect('/signup')
  }

  const planKey = (session.user.planKey as PlanKey) ?? 'starter'
  if (planKey !== 'starter') {
    redirect(resolveRoleDestination(session.user.role))
  }

  const trialEndsAt = session.user.starterExpiresAt ? new Date(session.user.starterExpiresAt) : null
  const trialData = await loadTrialDashboardData({ userId: session.user.id, companyId: session.user.companyId })

  return (
    <TrialShell companyLogoUrl={null} userName={session.user.name ?? session.user.email ?? undefined}>
      <TrialDashboard data={trialData} trialEndsAt={trialEndsAt} />
    </TrialShell>
  )
}
