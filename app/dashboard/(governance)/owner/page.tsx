import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ContactAnalyticsCommand } from '@/app/dashboard/_components/contact-analytics-command'
import { AssetSummaryPanel } from '@/app/dashboard/_components/asset-summary-panel'
import { ControlPlaneDashboard } from '@/app/dashboard/_components/control-plane-dashboard'
import { StandardSettingsQuickLinks } from '@/app/dashboard/_components/standard-settings-quick-links'
import { TrialDashboard } from '@/app/dashboard/_components/trial-dashboard'
import { loadTrialDashboardData } from '@/lib/dashboard/trialDashboard'
import type { PlanKey } from '@/lib/billing/planTiers'

export default async function OwnerDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login?from=/dashboard/owner')
  }

  if (!session.user.companyId) {
    redirect('/signup')
  }

  const role = session.user.role.toLowerCase()

  if (role !== 'owner') {
    redirect('/dashboard/admin')
  }

  const planKey = (session.user.planKey as PlanKey) ?? 'starter'

  if (planKey === 'starter') {
    redirect('/dashboard/trial')
  }

  const payload = await fetchOwnerDashboard()

  return (
    <>
      <ControlPlaneDashboard variant="owner" data={payload.data} planKey={payload.planKey} viewer={payload.viewer} />
      <StandardSettingsQuickLinks snapshot={payload.standardSettings} role="owner" />
      <ContactAnalyticsCommand variant="owner" data={payload.contactAnalytics} />
      <AssetSummaryPanel summary={payload.assetSummary} role="owner" />
    </>
  )
}

async function fetchOwnerDashboard() {
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host')
  const protocol = headerList.get('x-forwarded-proto') ?? 'http'

  if (!host) {
    throw new Error('Missing host header for owner dashboard request')
  }

  const cookieStore = await cookies()
  const serializedCookies = cookieStore.getAll().map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')
  const response = await fetch(`${protocol}://${host}/api/dashboard/owner`, {
    method: 'GET',
    headers: serializedCookies ? { Cookie: serializedCookies } : undefined,
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Unable to load owner dashboard analytics')
  }

  return response.json()
}
