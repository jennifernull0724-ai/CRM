import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ContactAnalyticsCommand } from '@/app/dashboard/_components/contact-analytics-command'
import { AssetSummaryPanel } from '@/app/dashboard/_components/asset-summary-panel'
import { getAssetDashboardSummary } from '@/lib/assets/registry'

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

  const summary = await getAssetDashboardSummary(session.user.companyId)

  return (
    <>
      <ContactAnalyticsCommand variant="owner" />
      <AssetSummaryPanel summary={summary} role="owner" />
    </>
  )
}
